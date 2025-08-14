
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
// import { CdkResourceInitializer } from 'aws-cdk-lib/cdk-resource-initializer'
import { Duration, RemovalPolicy } from 'aws-cdk-lib';

type RDSProps = {
    appName: string;
    dbUser: string;
    dbName: string;
    vpc: ec2.Vpc;
    vpcRole: iam.Role;
    dataSecurityGroup: ec2.SecurityGroup;
}

export function createRDS(scope: Construct, props: RDSProps) {

    const dbSecret = new secretsmanager.Secret(scope, `${props.appName}-DBSecret`, {
        secretName: `${props.appName}-db-credentials`,
        description: 'My ToDo application secret credentials',
        generateSecretString: {
            secretStringTemplate: JSON.stringify({
                username: props.dbUser,
                dbName: props.dbName,
            }),
            excludeCharacters: '%\'"`@\\',
            generateStringKey: 'password',
        },
        removalPolicy: RemovalPolicy.DESTROY
    })

    // Lambda Role with S3 Access
	/* const lambdaRole = new iam.Role(scope, `${props.appName}-LambdaDBSecretAccessRole`, {
		assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
	});

    lambdaRole.addManagedPolicy(
		iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
	); */
  
	dbSecret.grantRead(props.vpcRole);


    const database = new rds.DatabaseInstance(scope, `${props.appName}-PostgresDB`, {
        vpc: props.vpc,
        securityGroups: [props.dataSecurityGroup],
        vpcSubnets: {
            subnets: props.vpc.isolatedSubnets, // Deploy in isolated subnets
        },
        // availabilityZone: props.vpc.isolatedSubnets[0].availabilityZone, // Dont need to mention it.
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.SMALL), // T3.micro for dev/test
        engine: rds.DatabaseInstanceEngine.postgres({
            version: rds.PostgresEngineVersion.VER_16,
        }),
        // port: 5432,
        instanceIdentifier: `${props.appName}-DB-Instance`,
        allocatedStorage: 10, // GB
        maxAllocatedStorage: 10,
        deleteAutomatedBackups: true,
        // backupRetention: Duration.millis(0),
        credentials: rds.Credentials.fromSecret(dbSecret),
        publiclyAccessible: false, // Crucial for security
        multiAz: false, // For dev, change to true for prod for high availability
        removalPolicy: RemovalPolicy.DESTROY, // For dev, change to RETAIN for prod
    });

    // Allow Next.js app to connect to the database
    database.connections.allowFrom(
        ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
        ec2.Port.tcp(5432),
        'Allow Fargate app to connect to PostgreSQL'
    );

    database.secret?.grantRead(props.vpcRole);

    // Initialize the RDS instance using CdkResourceInitializer
    /* new CdkResourceInitializer(scope, `${props.appName}-RdsInitializer`, {
        sqlStatements: [
            'CREATE DATABASE myappdb;',
            'CREATE USER \'myuser\' IDENTIFIED BY \'mypassword\';',
            'GRANT ALL PRIVILEGES ON myappdb.* TO \'myuser\';',
            // ... more SQL statements
        ],
        // Pass the database instance to the initializer
        resource: database, 
    }); */

    return { dbSecret, database}

}