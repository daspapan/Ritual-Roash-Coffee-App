import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { CDKContext } from '../types';
import { Architecture, Code, Function, Runtime, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';

export interface ImageStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
    rdsSecret: Secret;
    privateSecurityGroup: ec2.SecurityGroup; // For Lambda
}

export class ImageStack extends cdk.Stack {

    // public readonly imageHandlerLambda: Function;
    public readonly pingHandlerLambda: Function;
    public readonly pingNodeJsHandlerLambda: NodejsFunction;
    // public readonly imageBucket: s3.Bucket;
    // public readonly nodeJsLayer: LayerVersion;

    constructor(scope: Construct, id: string, props: ImageStackProps, context: CDKContext){
        super(scope, id, props);

        const appName = `${context.appName}-${context.stage}`;
        const appStage = `${context.stage}`
        const dbName = `${context.hosting.dbName}`

        const { vpc, rdsSecret, privateSecurityGroup } = props;


        // S3 Bucket for images
        /* this.imageBucket = new s3.Bucket(this, `${appName}-ProductImageBucket`, {
            bucketName: `${appName.toLocaleLowerCase()}-my-product-images-${this.account}-${this.region}`, // Unique name
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // Highly recommended for private buckets
            removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev, change to RETAIN for prod
            autoDeleteObjects: true, // For dev, change to false for prod
        });


        // IAM Role for Image Handler Lambda
        const imageHandlerLambdaRole = new iam.Role(this, `${appName}-ImageHandlerLambdaRole`, {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            description: 'Role for image handler Lambda to interact with S3'
        });
        imageHandlerLambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'));
        rdsSecret.grantRead(imageHandlerLambdaRole);

        // Grant S3 permissions for presigned URL generation (PutObject, GetObject)
        this.imageBucket.grantPut(imageHandlerLambdaRole); // For uploads
        this.imageBucket.grantRead(imageHandlerLambdaRole); // For downloads (if presigning get)

        this.imageHandlerLambda = new Function(this, `${appName}-ImageHandlerLambda`, {
            runtime: Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: Code.fromAsset(path.join(__dirname, './lambda/image-handler/dist')),
            vpc: vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            securityGroups: [privateSecurityGroup],
            environment: {
                IMAGE_BUCKET_NAME: this.imageBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(15),
            memorySize: 128,
            role: imageHandlerLambdaRole,
            architecture: Architecture.ARM_64,
        }); */

        this.pingHandlerLambda = new Function(this, `${appName}-PingHandlerLambda`, {
            runtime: Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: Code.fromAsset(path.join(__dirname, './lambda/health/dist')),
            vpc: vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            securityGroups: [privateSecurityGroup],
            environment: {
                APP_NAME: `${appName}`
            },
            timeout: cdk.Duration.seconds(15),
            memorySize: 128,
            architecture: Architecture.ARM_64,
        });


        /*const nodeJsLayer = new LayerVersion(this, `${appName}-PgLambda`, {
            code: Code.fromAsset(path.join(__dirname, './lambda/layers')),
            compatibleRuntimes: [Runtime.NODEJS_20_X],
            description: 'PostgresQL pg client library.',
            removalPolicy: cdk.RemovalPolicy.DESTROY
        })

        this.pingNodeJsHandlerLambda = new NodejsFunction(this, `${appName}-PingNodeJsHandlerLambda`, {
            runtime: Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: Code.fromAsset(path.join(__dirname, './lambda/health2/dist')),
            vpc: vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            securityGroups: [privateSecurityGroup],
            environment: {
                APP_NAME: `${appName}`,
                RDS_SECRET_ARN: rdsSecret.secretArn,
            },
            timeout: cdk.Duration.seconds(15),
            memorySize: 128,
            role: imageHandlerLambdaRole,
            architecture: Architecture.ARM_64,
            layers: [nodeJsLayer]
        });*/


        /* 
        
        curl --progress-bar -X POST -H "Content-Type: application/json" -d '{"fileName": "/Users/papandas/Desktop/papan.png", "contentType": "image/jpeg", "productId": "1", content: "Hell"}' https://wpsj4zfwfc.execute-api.ap-south-1.amazonaws.com/dev/media/upload-url | jq . 
        
        curl --location 'https://xqo1yr5gf5.execute-api.ap-south-1.amazonaws.com/dev/media/upload-url' --header 'Content-Type: multipart/form-data' --form 'fileName="papan"' --form 'content=@"/Users/papandas/Desktop/Screenshot 2025-08-06 at 2.40.49 PM.png"' --form 'productId="123"' | jq .
        
        */

        // new cdk.CfnOutput(this, 'ImageBucketName', { value: this.imageBucket.bucketName });
        // new cdk.CfnOutput(this, 'ImageHandlerLambdaName', { value: this.imageHandlerLambda.functionName });
        new cdk.CfnOutput(this, 'HealthHandlerLambdaName', {value: this.pingHandlerLambda.functionName})

    }

}