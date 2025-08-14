
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import path from 'path';
import { Duration } from 'aws-cdk-lib';

type CreateFunctionsProps = {
    appName: string;
    stageName: string;
    awsRegion: string;
    vpc: ec2.Vpc;
    vpcRole: iam.Role;
    dbName: string;
    dbSecret: secretsmanager.Secret;
    database: rds.DatabaseInstance;
    lambdaRole: iam.Role;
    applicationSG: ec2.SecurityGroup;
}


export function createFunctions(scope: Construct, props: CreateFunctionsProps){

    const secretArn = props.dbSecret.secretArn;
    const endpoint = props.database.instanceEndpoint;

    // aws logs tail /aws/lambda/RRC-Dev-PingFunc --follow
    const pingFunc = new NodejsFunction(scope, `${props.appName}-PingFunc`, {
        functionName: `${props.appName}-PingFunc`,
        runtime: Runtime.NODEJS_22_X,
        timeout: Duration.minutes(1),
        handler: "handler",
        vpc: props.vpc,
        role: props.vpcRole,
        vpcSubnets: { subnets: props.vpc.privateSubnets },
        entry: path.join(
            __dirname,
            './func/ping/index.ts'
        ),
        environment: {
            APP_NAME: props.appName
        },
    });

    // aws logs tail /aws/lambda/RRC-Dev-${name}Func --follow
    const createResolverFunc = (name: string, entry: string) => new NodejsFunction(scope, `${props.appName}-${name}Func`, {
        functionName: `${props.appName}-Create${name}Func`,
        entry: path.join(
            __dirname,
            `./func/${entry}`
        ),
        bundling: {
            externalModules: ['pg-native']
        },
        runtime: Runtime.NODEJS_22_X,
        timeout: Duration.minutes(2),
        handler: "handler",
        vpc: props.vpc,
        role: props.vpcRole,
        vpcSubnets: { subnets: props.vpc.isolatedSubnets },
        securityGroups: [ props.applicationSG],
        environment: {
            APP_NAME: props.appName,
            RDS_ARN: props.database.secret!.secretArn,
            HOST: props.database.dbInstanceEndpointAddress,
            CREDENTIALS_ARN: props.dbSecret.secretArn,
            DATABASE_NAME: props.dbName,
        },
    });

    // Instantiate new DB with user and permission also add table.
    // aws logs tail /aws/lambda/RRC-Dev-InstantiateFunc --follow
    const instantiate = createResolverFunc('Instantiate', 'pg/instantiate.ts')
    instantiate.node.addDependency(props.database);

    // aws logs tail /aws/lambda/RRC-Dev-AddBookFunc --follow
    const addBook = createResolverFunc('AddBook', 'pg/add-book.ts')
    instantiate.node.addDependency(props.database);

    // aws logs tail /aws/lambda/RRC-Dev-GetBooksFunc --follow
    const getBooks = createResolverFunc('GetBooks', 'pg/get-books.ts')
    instantiate.node.addDependency(props.database);


    // Custom Resource to execute initiate function.
    const customResource = new cr.AwsCustomResource(scope, `${props.appName}-TriggerInstantiateFunc`, {
        functionName: `${props.appName}-Trigger-Instantiate-Func`,
        role: props.vpcRole,
        onUpdate: {
            service: 'Lambda',
            action: 'invoke',
            parameters: {
                FunctionName: instantiate.functionName,
            },
            physicalResourceId: cr.PhysicalResourceId.of(`${props.appName}-TriggerInstantiateFunc`),
        },
        policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
            resources: [instantiate.functionArn],
        }),
    });
    customResource.node.addDependency(instantiate)
    

    return { pingFunc, instantiate, addBook, getBooks }

}