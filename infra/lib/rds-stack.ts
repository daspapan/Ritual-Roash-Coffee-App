import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { CDKContext } from '../types';

export interface RdsStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
    isolatedSecurityGroup: ec2.SecurityGroup; // For Lambda
}

export class RdsStack extends cdk.Stack {

    public readonly rdsInstance: rds.DatabaseInstance;
    public readonly rdsSecret: secretsmanager.Secret;
    public readonly databaseName: string;

    constructor(scope: Construct, id: string, props: RdsStackProps, context: CDKContext){
        super(scope, id, props);

        const appName = `${context.appName}-${context.stage}`;
        const appStage = `${context.stage}`
        const dbName = `${context.hosting.dbName}`
        const dbUser = `${context.hosting.dbUser}`
        const { vpc, isolatedSecurityGroup } = props;

        this.rdsSecret = new secretsmanager.Secret(this, `${appName}-DBSecret`, {
            secretName: `${appName}-db-credentials`,
            description: 'My ToDo application secret credentials',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({
                    username: dbUser,
                }),
                excludeCharacters: '%\'"`@\\',
                excludePunctuation: true,
                includeSpace: false,
                generateStringKey: 'password',
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY
        })

        // aws secretsmanager get-secret-value --secret-id arn:aws:secretsmanager:ap-south-1:919620897356:secret:RRC-Dev-db-credentials-qAlbRG



        this.rdsInstance = new rds.DatabaseInstance(this, `${appName}-PostgresDB`, {
            vpc: vpc,
            securityGroups: [isolatedSecurityGroup],
            vpcSubnets: {
                // subnets: vpc.isolatedSubnets, // Deploy in isolated subnets
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED
            },
            // availabilityZone: props.vpc.isolatedSubnets[0].availabilityZone, // Dont need to mention it.
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.SMALL), // T3.micro for dev/test
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_16,
            }),
            port: 5432,
            instanceIdentifier: `${appName}-DB-Instance`,
            databaseName: dbName,
            allocatedStorage: 10, // GB
            maxAllocatedStorage: 10,
            deleteAutomatedBackups: true,
            // backupRetention: Duration.millis(0),
            credentials: rds.Credentials.fromSecret(this.rdsSecret),
            publiclyAccessible: false, // Crucial for security
            multiAz: false, // For dev, change to true for prod for high availability
            removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev, change to RETAIN for prod
        });

        // psql -h rrc-dev-db-instance.c6rebnexgqyq.ap-south-1.rds.amazonaws.com -U postgres -p 5432 todoslist


         // Output RDS endpoint and secret ARN
        new cdk.CfnOutput(this, 'RdsEndpointAddress', { value: this.rdsInstance.instanceEndpoint.hostname }); 
        new cdk.CfnOutput(this, 'RdsSecretArn', { value: this.rdsSecret.secretArn });

    }
}