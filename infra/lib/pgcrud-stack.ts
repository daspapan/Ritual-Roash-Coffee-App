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

export interface PgCrudStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
    rdsSecret: Secret;
    privateSecurityGroup: ec2.SecurityGroup; // For Lambda
    nodeJsLayer: LayerVersion;
    dbInitializerLambdaRole: iam.Role;
}

export class PgCrudStack extends cdk.Stack {

    public readonly pgCrudOpsHandlerLambda: NodejsFunction

    constructor(scope: Construct, id: string, props: PgCrudStackProps, context: CDKContext){
        super(scope, id, props);

        const appName = `${context.appName}-${context.stage}`;
        const appStage = `${context.stage}`
        const dbName = `${context.hosting.dbName}`

        const { vpc, rdsSecret, privateSecurityGroup, nodeJsLayer, dbInitializerLambdaRole } = props;


        // IAM Role for Image Handler Lambda
        /* const pgCrudOpsHandlerLambdaRole = new iam.Role(this, `${appName}-PgCrudOpsHandlerLambdaRole`, {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            description: 'Role for CRUD Ops handler Lambda to interact with Postgres RDS'
        });
        pgCrudOpsHandlerLambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'));
        rdsSecret.grantRead(pgCrudOpsHandlerLambdaRole); */


        


        this.pgCrudOpsHandlerLambda = new NodejsFunction(this, `${appName}-PgCrudOpsHandlerLambda`, {
            runtime: Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: Code.fromAsset(path.join(__dirname, './lambda/pg-crud-handler/dist')),
            vpc: vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            securityGroups: [privateSecurityGroup],
            environment: {
                APP_NAME: `${appName}`,
                RDS_SECRET_ARN: rdsSecret.secretArn,
                DB_NAME: dbName,
            },
            timeout: cdk.Duration.seconds(15),
            memorySize: 128,
            role: dbInitializerLambdaRole,
            architecture: Architecture.ARM_64,
            layers: [nodeJsLayer]
        });


        new cdk.CfnOutput(this, 'PgCrudOpsHandlerLambdaName', {value: this.pgCrudOpsHandlerLambda.functionName})


    }

}