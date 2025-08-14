import { Stack, StackProps, Duration, CustomResource, RemovalPolicy } from 'aws-cdk-lib';
import { Vpc, SecurityGroup, SubnetType, Peer, Port } from 'aws-cdk-lib/aws-ec2';
import { Function, Runtime, Code, Architecture, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Role, ServicePrincipal, ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { DatabaseInstance } from 'aws-cdk-lib/aws-rds';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import * as path from 'path';
import * as ec2 from 'aws-cdk-lib/aws-ec2'; // Make sure to import ec2
import { Construct } from 'constructs';
import { CDKContext } from '../types';

export interface DbInitLambdaStackProps extends StackProps {
    vpc: Vpc;
    rdsInstance: DatabaseInstance;
    rdsSecret: Secret;
    privateSecurityGroup: SecurityGroup; // For Lambda
    isolatedSecurityGroup: SecurityGroup; // For RDS
}

export class DbInitLambdaStack extends Stack {

    public readonly nodeJsLayer: LayerVersion;
    public readonly dbInitializerLambdaRole: Role;

    constructor(scope: Construct, id: string, props: DbInitLambdaStackProps, context: CDKContext){
        super(scope, id, props);

        const appName = `${context.appName}-${context.stage}`;
        const appStage = `${context.stage}`
        const dbName = `${context.hosting.dbName}`
        const dbUser = `${context.hosting.dbUser}`
        const { vpc, rdsInstance, rdsSecret, privateSecurityGroup, isolatedSecurityGroup } = props;
        const dbPass = `mRCCnEBD3l7Kiz8ZlVtly62cT9u2tpQu`;
        // console.log(`${rdsSecret.secretValueFromJson('password').toString()}`)
        // console.log(rdsSecret.secretValue)
        // console.log(dbPass)

        // IAM Role for DB Initializer Lambda
        this.dbInitializerLambdaRole = new Role(this, `${appName}-DbInitializerLambdaRole`, {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            description: 'Role for Lambda to initialize RDS database using Secrets Manager',
        });
        this.dbInitializerLambdaRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'));
        rdsSecret.grantRead(this.dbInitializerLambdaRole);


        this.nodeJsLayer = new LayerVersion(this, `${appName}-PgLambda`, {
            code: Code.fromAsset(path.join(__dirname, './lambda/layers')),
            compatibleRuntimes: [Runtime.NODEJS_20_X],
            description: 'PostgresQL pg client library.',
            removalPolicy: RemovalPolicy.DESTROY
        })


        // Custom Resource Provider Lambda
        
        const dbInitializerLambda = new Function(this, `${appName}-DbInitializerLambda`, {
            runtime: Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: Code.fromAsset(path.join(__dirname, './lambda/rds-handler/dist')), 
            vpc: vpc,
            vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
            securityGroups: [privateSecurityGroup], // Lambda uses private SG
            environment: {
                RDS_SECRET_ARN: rdsSecret.secretArn,
                RDS_ENDPOINT: rdsInstance.instanceEndpoint.hostname,
                RDS_PORT: rdsInstance.instanceEndpoint.port.toString(),
                INITIAL_DB_NAME: dbName, // 'appdb'
            },
            timeout: Duration.minutes(5),
            memorySize: 256,
            role: this.dbInitializerLambdaRole,
            architecture: Architecture.ARM_64,
            layers: [this.nodeJsLayer]
        });

        

        // Custom Resource Provider
        const dbInitializerProvider = new Provider(this, `${appName}-DbInitializerProvider`, {
            onEventHandler: dbInitializerLambda,
        });

        

        new CustomResource(this, `${appName}-DatabaseInitializer`, {
            serviceToken: dbInitializerProvider.serviceToken,
            properties: {
                // These properties are passed to the Lambda handler
                sqlCommands: [
                    // Create a new application database (if not already created by RDS's `databaseName`)
                    // If your `databaseName` in RDS is 'appdb', this step is redundant for 'appdb'.
                    // Consider creating a *different* database if `appdb` is for master access.
                    // Example: `CREATE DATABASE my_app_data;`

                    // Create an application user
                    // IMPORTANT: Fetching the password from the master secret and using it for app_user is NOT ideal for production.
                    // In a real app, you'd create another Secrets Manager secret for `app_user` and pass its ARN to this Lambda.
                    `CREATE USER app_user WITH ENCRYPTED PASSWORD '${dbPass}';`,

                    // Grant privileges on the initial database (appdb) to the app_user
                    // This allows app_user to connect to appdb.
                    `GRANT CONNECT ON DATABASE ${dbName} TO app_user;`,

                    // Create tables within the initial database (appdb) for demonstration
                    // PostgreSQL table names are case-sensitive if quoted, best to use lowercase without quotes.
                    `CREATE TABLE IF NOT EXISTS public.products (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        description TEXT,
                        price DECIMAL(10, 2) NOT NULL,
                        image_url VARCHAR(2048),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );`,
                    `CREATE TABLE IF NOT EXISTS public.images (
                        id SERIAL PRIMARY KEY,
                        product_id INTEGER REFERENCES public.products(id),
                        s3_key VARCHAR(255) NOT NULL,
                        upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );`,

                    // Grant privileges on tables/sequences in public schema for app_user
                    // These grants must happen *after* the tables are created.
                    `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;`,
                    `GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;`, // For SERIAL columns
                ],
            },
        });

        
        
    }
}