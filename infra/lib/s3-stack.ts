import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { CDKContext } from '../types';
import path from 'path';

export interface S3StackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
    privateSecurityGroup: ec2.SecurityGroup; // For Lambda
    nodeJsLayer: lambda.LayerVersion;
}

export class S3Stack extends cdk.Stack {

    public readonly uploadBucket: s3.Bucket;
    public readonly imageHandlerLambda: lambda.Function

    constructor(scope: Construct, id: string, props: S3StackProps, context: CDKContext){
        super(scope, id, props);

        const appName = `${context.appName}-${context.stage}`;
        const appStage = `${context.stage}`
        const dbName = `${context.hosting.dbName}`

        const { vpc, privateSecurityGroup, nodeJsLayer } = props;


        // S3 Bucket for images
        this.uploadBucket = new s3.Bucket(this, `${appName}-ImageBucket`, {
            bucketName: `${appName.toLocaleLowerCase()}-my-images-${this.account}-${this.region}`, // Unique name
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // Highly recommended for private buckets
            autoDeleteObjects: true, // For dev, change to false for prod
            removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev, change to RETAIN for prod
            // Enable CORS for direct client uploads
            cors: [
                {
                    allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.POST],
                    allowedOrigins: ['*'], // Restrict to your Next.js app's domain in production
                    allowedHeaders: ['*'],
                    exposedHeaders: ['ETag'],
                },
            ],
            // Optional: Set a lifecycle rule to clean up incomplete multipart uploads
            lifecycleRules: [
                {
                    abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
                },
            ],
        });


        // IAM Role for Image Handler Lambda
        const imageHandlerLambdaRole = new iam.Role(this, `${appName}-ImageHandlerLambdaRole`, {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            description: 'Role for image handler Lambda to interact with S3'
        });
        imageHandlerLambdaRole.addToPolicy(
            new iam.PolicyStatement({
                actions: ['s3:PutObject', 's3:GetObject'], // Lambda generates URL for PUT, can also get for verification
                resources: [this.uploadBucket.bucketArn, `${this.uploadBucket.bucketArn}/*`],
            })
        );
        imageHandlerLambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'));

        // Grant S3 permissions for presigned URL generation (PutObject, GetObject)
        this.uploadBucket.grantPut(imageHandlerLambdaRole); // For uploads
        this.uploadBucket.grantRead(imageHandlerLambdaRole); // For downloads (if presigning get)
        this.uploadBucket.grantReadWrite(imageHandlerLambdaRole);



        this.imageHandlerLambda = new lambda.Function(this, `${appName}-ImageHandlerLambda`, {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, './lambda/image-handler/dist')),
            vpc: vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            securityGroups: [privateSecurityGroup],
            environment: {
                IMAGE_BUCKET_NAME: this.uploadBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(15),
            memorySize: 128,
            role: imageHandlerLambdaRole,
            architecture: lambda.Architecture.ARM_64,
            layers: [nodeJsLayer],
        });

        // 3. Grant the Lambda function permissions to S3
        /* this.imageHandlerLambda.addToRolePolicy(
            new iam.PolicyStatement({
                actions: ['s3:PutObject', 's3:AbortMultipartUpload', 's3:ListMultipartUploads'],
                resources: [this.uploadBucket.bucketArn, this.uploadBucket.arnForObjects('*')],
            })
        ); */


        new cdk.CfnOutput(this, 'UploadBucketName', { value: this.uploadBucket.bucketName });
        new cdk.CfnOutput(this, 'ImageHandlerLambdaName', { value: this.imageHandlerLambda.functionName });
        
    }

}