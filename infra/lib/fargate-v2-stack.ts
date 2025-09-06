import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import { Construct } from 'constructs';
import { CDKContext } from '../types';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { DockerImageName, ECRDeployment } from 'cdk-ecr-deployment'
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import path from 'path';

export interface FargateStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
    rdsInstance: rds.DatabaseInstance;
    rdsSecret: Secret;
    mediaBucket: s3.Bucket;
    publicSecurityGroup: ec2.SecurityGroup;
    privateSecurityGroup: ec2.SecurityGroup; // For Lambda
    cognitoUserPoolId?: any;
    cognitoAppClientId?: any;
}

export class FargateStack extends cdk.Stack {

    public readonly ecrRepository: ecr.Repository;
    public readonly fargateService: ecs.FargateService;
    public readonly alb: elbv2.ApplicationLoadBalancer;

    constructor(scope: Construct, id: string, props: FargateStackProps, context: CDKContext){
        super(scope, id, props);

        const appName = `${context.appName}-${context.stage}`;
        const appStage = `${context.stage}`
        const dbName = `${context.hosting.dbName}`

        const { vpc, rdsInstance, rdsSecret, mediaBucket, privateSecurityGroup, publicSecurityGroup, cognitoUserPoolId, cognitoAppClientId } = props;

        // Create a private ECR repository
        this.ecrRepository = new ecr.Repository(this, `${appName}-fargate-private-repo`, {
            repositoryName: 'my-todo-nextjs-app', // Choose a meaningful name for your repository
            imageTagMutability: ecr.TagMutability.MUTABLE, // Or IMMUTABLE for stricter control
            // By default, ECR repositories are private. No explicit 'visibility' setting is needed.
            // If you wanted a public repository, you'd use `ecr.PublicRepository` instead.
            lifecycleRules: [{maxImageCount: 5}],
            emptyOnDelete: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });
    
        const imageAsset = new DockerImageAsset(this, `${appName}-docker-image`, {
            directory: path.join(__dirname, '../../next-app'),
            displayName: `${appName}-todos-docker-image`
        })
    
        new ECRDeployment(this, `${appName}-DeployDockerImage1`, {
            src: new DockerImageName(imageAsset.imageUri),
            dest: new DockerImageName(`${this.ecrRepository.repositoryUri}`),
        });


        const cluster = new ecs.Cluster(this, `${appName}-Cluster`, {
            vpc: vpc,
            clusterName: `${appName}-app-cluster`,
            enableFargateCapacityProviders: true, // fresh added.
        });


        const taskDefinition = new ecs.FargateTaskDefinition(this, `${appName}-task-definition`, {
            cpu: 256,
            memoryLimitMiB: 512,
            runtimePlatform: {
                cpuArchitecture: ecs.CpuArchitecture.ARM64 // Or X86_64
            },
        });


        const container = taskDefinition.addContainer(`${appName}-container`, {
            image: ecs.ContainerImage.fromEcrRepository(this.ecrRepository, 'latest'),
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: `${appName}-todo-nextjs-app`,
            }),
            environment: {
                DATABASE_URL: `postgres://${rdsSecret.secretValueFromJson('username').unsafeUnwrap()}:${rdsSecret.secretValueFromJson('password').unsafeUnwrap()}@${rdsInstance.instanceEndpoint.hostname}:${rdsInstance.instanceEndpoint.port}/${dbName}`,
                POSTGRES_ADDR: rdsInstance.instanceEndpoint.socketAddress,
                POSTGRES_HOST: `${rdsInstance.instanceEndpoint.hostname}`,
                POSTGRES_PORT: `${rdsInstance.instanceEndpoint.port}`,
                // NEXT_PUBLIC_POSTGRES_USER: `${rdsSecret.secretValueFromJson('username').unsafeUnwrap()}`,
                // NEXT_PUBLIC_POSTGRES_PASS: `${rdsSecret.secretValueFromJson('password').unsafeUnwrap()}`,
                POSTGRES_DB: `${dbName}`,
                NODE_ENV: 'staging',
                NEXT_PUBLIC_APP_ENV: 'staging',
                NEXT_PUBLIC_DEBUG: 'true',
                NEXT_PUBLIC_PLATFORM: 'awscloud',
                NEXT_PUBLIC_FILE_STORAGE: 'S3',
                S3_BUCKET_NAME: mediaBucket.bucketName,
                COGNITO_USER_POOL_ID: '...', // Pass from Cognito construct
                COGNITO_APP_CLIENT_ID: '...', // Pass from Cognito construct
            },
            secrets: {
                // It's generally better to pass sensitive data via Secrets Manager for production
                // For simplicity here, we're building the URL directly, but for true prod
                // you'd retrieve individual secret components more securely.
                // Example for a single secret:
                // PG_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, 'password')
                POSTGRES_USER: ecs.Secret.fromSecretsManager(rdsSecret, 'username'),
                POSTGRES_PASS: ecs.Secret.fromSecretsManager(rdsSecret, 'password'),
                DATABASE_SECRET: ecs.Secret.fromSecretsManager(rdsSecret, 'password'),
                // DATABASE_URL: `postgres://${ecs.Secret.fromSecretsManager(rdsSecret, 'username')}:${ecs.Secret.fromSecretsManager(rdsSecret, 'password')}@${rdsInstance.instanceEndpoint.hostname}:${rdsInstance.instanceEndpoint.port}/${dbName}`,
            },
        });
        container.addPortMappings({ containerPort: 3000 });
        // container.imageName


        // Add IAM permissions for the Fargate Task to access S3 and Secrets Manager
        taskDefinition.addToTaskRolePolicy(new iam.PolicyStatement({
            actions: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
            resources: [rdsSecret.secretArn],
        }));
        mediaBucket.grantReadWrite(taskDefinition.taskRole);
    

        this.fargateService = new ecs.FargateService(this, `${appName}-FargateService`, {
            desiredCount: 1,
            cluster,
            taskDefinition,
            assignPublicIp: false,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            securityGroups: [privateSecurityGroup]
        });



        const certificate = acm.Certificate.fromCertificateArn(this, `${appName}-Certificate`, `arn:aws:acm:${context.env.region}:${context.env.account}:certificate/${context.hosting.certificateArn}`)

        this.alb = new elbv2.ApplicationLoadBalancer(this, `${appName}-ALB`, {
            vpc,
            internetFacing: true,
            vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC }, // ALB in public subnets
            securityGroup: publicSecurityGroup,
        });

        const listener = this.alb.addListener(`${appName}-HttpListener`, {
            port: 443,
            open: true,
            certificates: [certificate],
        });

        listener.addTargets(`${appName}-FargateTarget`, {
            port: 80,
            targets: [this.fargateService],
            protocol: elbv2.ApplicationProtocol.HTTP,
        });



    
        // new cdk.CfnOutput(this, 'ImageBucketName', { value: this.imageBucket.bucketName });
        new cdk.CfnOutput(this, 'RepositoryEcrUri', {
            value: this.ecrRepository.repositoryUri, 
            description: 'The URI of the Amazon ECR private repository',
        });

        // Output the Load Balancer URL
        new cdk.CfnOutput(this, 'FargateServiceName', {
            value: this.fargateService.serviceName,
            description: 'Fargate Service Name',
        });
        new cdk.CfnOutput(this, 'FargateServiceArn', {
            value: this.fargateService.serviceArn,
            description: 'Fargate Service Arn',
        });


        // Accessing outputs
        new cdk.CfnOutput(this, 'AlbArnOutput', {
            value: this.alb.loadBalancerArn,
            description: 'The ARN of the Application Load Balancer.',
        });

        new cdk.CfnOutput(this, 'AlbDnsNameOutput', {
            value: this.alb.loadBalancerDnsName,
            description: 'The DNS name of the Application Load Balancer.',
        });

        new cdk.CfnOutput(this, 'ClusterNameOutput', {
            value: this.fargateService.cluster.clusterName,
            description: 'The fargate cluster name.',
        });

        new cdk.CfnOutput(this, 'ServiceNameOutput', {
            value: this.fargateService.serviceName,
            description: 'The fargate service name.',
        });

        // Example of adding a listener and accessing its ARN
        // const listener = alb.addListener('HttpListener', { port: 80 });
        new cdk.CfnOutput(this, 'ListenerArnOutput', {
            value: listener.listenerArn,
            description: 'The ARN of the ALB HTTP Listener.',
        });

    }

}