import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

type FargateProps = {
    appName: string;
    appStage: string;
    dbName: string;
    vpc: ec2.Vpc;
    appRepository: ecr.Repository;
    dbSecret: secretsmanager.Secret;
    database: rds.DatabaseInstance;
}

export function createFargate(scope: Construct, props: FargateProps) {

    const cluster = new ecs.Cluster(scope, `${props.appName}-Cluster`, {
        vpc: props.vpc,
        clusterName: `${props.appName}-app-cluster`,
    });

    const fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(scope, `${props.appName}-Fargate-Service`, {
        cluster,
        cpu: 256, // .25 vCPU
        memoryLimitMiB: 512, // .5 GB
        desiredCount: 1,
        publicLoadBalancer: true, // Expose to internet via ALB
        runtimePlatform: {
            cpuArchitecture: ecs.CpuArchitecture.ARM64 // Or X86_64
        },
        taskImageOptions: {
            image: ecs.ContainerImage.fromEcrRepository(props.appRepository, 'latest'),
            containerPort: 3001,
            environment: {
                DATABASE_URL: `postgres://${props.dbSecret.secretValueFromJson('username').unsafeUnwrap()}:${props.dbSecret.secretValueFromJson('password').unsafeUnwrap()}@${props.database.instanceEndpoint.hostname}:${props.database.instanceEndpoint.port}/${props.dbName}`,
                POSTGRES_HOST: `${props.database.instanceEndpoint.hostname}`,
                POSTGRES_USER: `${props.dbSecret.secretValueFromJson('username').unsafeUnwrap()}`,
                POSTGRES_PASS: `${props.dbSecret.secretValueFromJson('password').unsafeUnwrap()}`,
                POSTGRES_DB: `${props.dbName}`
            },
            // secrets: {
            // It's generally better to pass sensitive data via Secrets Manager for production
            // For simplicity here, we're building the URL directly, but for true prod
            // you'd retrieve individual secret components more securely.
            // Example for a single secret:
            // PG_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, 'password')
            // },
        },
        assignPublicIp: true, // Fargate tasks in public subnets need this for egress
        taskSubnets: {
            subnetType: ec2.SubnetType.PUBLIC, // Deploy Fargate tasks in public subnets
        },
    });

    // Health check for the ALB
    /* fargateService.targetGroup.configureHealthCheck({
        path: '/', // Or a specific health check endpoint in your Next.js app
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        unhealthyThresholdCount: 2,
        healthyHttpCodes: '200',
    });*/


    // Grant Task IAM role permissions to read secrets
    fargateService.taskDefinition.taskRole.addToPrincipalPolicy(
        new iam.PolicyStatement({
            actions: ['secretsmanager:GetSecretValue'],
            resources: [props.dbSecret.secretArn],
        })
    );

    return {cluster, fargateService}

}