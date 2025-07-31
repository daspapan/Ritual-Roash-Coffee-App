
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { RemovalPolicy } from 'aws-cdk-lib';

type RDSProps = {
    appName: string;
    vpc: ec2.Vpc
}

export function createRDS(scope: Construct, props: RDSProps) {

    const dbSecret = new secretsmanager.Secret(scope, `${props.appName}-DBSecret`, {
        secretName: `${props.appName}-db-credentials`,
        description: 'My ToDo application secret credentials',
        generateSecretString: {
            secretStringTemplate: JSON.stringify({
                username: 'dbuser',
            }),
            excludeCharacters: '%\'"`@\\',
            generateStringKey: 'password',
        },
        removalPolicy: RemovalPolicy.DESTROY
    })


    const database = new rds.DatabaseInstance(scope, `${props.appName}-PostgresDB`, {
        engine: rds.DatabaseInstanceEngine.postgres({
            version: rds.PostgresEngineVersion.VER_16,
        }),
        vpc: props.vpc,
        credentials: rds.Credentials.fromSecret(dbSecret),
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO), // T3.micro for dev/test
        allocatedStorage: 20, // GB
        maxAllocatedStorage: 100,
        vpcSubnets: {
            subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // Deploy in isolated subnets
        },
        removalPolicy: RemovalPolicy.DESTROY, // For dev, change to RETAIN for prod
        multiAz: false, // For dev, change to true for prod for high availability
        publiclyAccessible: false, // Crucial for security
    });

    // Allow Next.js app to connect to the database
    database.connections.allowFrom(
        ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
        ec2.Port.tcp(5432),
        'Allow Fargate app to connect to PostgreSQL'
    );

    return { dbSecret, database }

}