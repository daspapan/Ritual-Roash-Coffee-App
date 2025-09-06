import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as iam from 'aws-cdk-lib/aws-iam';
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
}

export class FargateStack extends cdk.Stack {

    public readonly ecrRepository: ecr.Repository;
    public readonly fargateService: ecs_patterns.ApplicationLoadBalancedFargateService;

    constructor(scope: Construct, id: string, props: FargateStackProps, context: CDKContext){
        super(scope, id, props);

        const appName = `${context.appName}-${context.stage}`;
        const appStage = `${context.stage}`
        const dbName = `${context.hosting.dbName}`

        const { vpc, rdsInstance, rdsSecret } = props;

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
        });
    
        this.fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, `${appName}-Fargate-Service`, {
            cluster,
            cpu: 256, // .25 vCPU
            memoryLimitMiB: 512, // .5 GB
            desiredCount: 1,
            publicLoadBalancer: true, // Expose to internet via ALB
            runtimePlatform: {
                cpuArchitecture: ecs.CpuArchitecture.ARM64 // Or X86_64
            },
            taskImageOptions: {
                image: ecs.ContainerImage.fromEcrRepository(this.ecrRepository, 'latest'),
                containerPort: 3001,
                environment: {
                    DATABASE_URL: `postgres://${rdsSecret.secretValueFromJson('username').unsafeUnwrap()}:${rdsSecret.secretValueFromJson('password').unsafeUnwrap()}@${rdsInstance.instanceEndpoint.hostname}:${rdsInstance.instanceEndpoint.port}/${dbName}`,
                    POSTGRES_HOST: `${rdsInstance.instanceEndpoint.hostname}`,
                    POSTGRES_PORT: `${rdsInstance.instanceEndpoint.port}`,
                    // NEXT_PUBLIC_POSTGRES_USER: `${rdsSecret.secretValueFromJson('username').unsafeUnwrap()}`,
                    // NEXT_PUBLIC_POSTGRES_PASS: `${rdsSecret.secretValueFromJson('password').unsafeUnwrap()}`,
                    POSTGRES_DB: `${dbName}`,
                    NODE_ENV: 'staging',
                    NEXT_PUBLIC_APP_ENV: 'staging',
                    NEXT_PUBLIC_DEBUG: 'true',
                    NEXT_PUBLIC_PLATFORM: 'fargate',
                    NEXT_PUBLIC_FILE_STORAGE: 's3',
                },
                secrets: {
                    // It's generally better to pass sensitive data via Secrets Manager for production
                    // For simplicity here, we're building the URL directly, but for true prod
                    // you'd retrieve individual secret components more securely.
                    // Example for a single secret:
                    // PG_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, 'password')
                    POSTGRES_USER: ecs.Secret.fromSecretsManager(rdsSecret, 'username'),
                    POSTGRES_PASS: ecs.Secret.fromSecretsManager(rdsSecret, 'password')
                },
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
        this.fargateService.taskDefinition.taskRole.addToPrincipalPolicy(
            new iam.PolicyStatement({
                actions: ['secretsmanager:GetSecretValue'],
                resources: [rdsSecret.secretArn],
            })
        );



    
        // new cdk.CfnOutput(this, 'ImageBucketName', { value: this.imageBucket.bucketName });
        new cdk.CfnOutput(this, 'RepositoryEcrUri', {
            value: this.ecrRepository.repositoryUri, 
            description: 'The URI of the Amazon ECR private repository',
        });

        // Output the Load Balancer URL
        new cdk.CfnOutput(this, 'LoadBalancerDNS', {
            value: this.fargateService.loadBalancer.loadBalancerDnsName,
            description: 'The URL of the application load balancer',
        });

        

    }

}