#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as gitBranch from 'git-branch';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { CDKContext } from '../types';
import { InfraStack } from '../lib/infra-stack';
import { ImageStack } from '../lib/image-stack';
import { VpcStack } from '../lib/vpc-stack';
import { ApiGwStack } from '../lib/apigw-stack';
import { RdsStack } from '../lib/rds-stack';
import { DbInitLambdaStack } from '../lib/db-init-stack';
import { PgCrudStack } from '../lib/pgcrud-stack';

const app = new cdk.App();

const currentBranch = process.env.AWS_BRANCH || gitBranch.sync();
console.log(`Deploying on branch -> ${currentBranch}`);
const globals = app.node.tryGetContext('globals') || {}
console.log(`Globals -> ${JSON.stringify(globals)}`);
const branchConfig = app.node.tryGetContext(currentBranch);
console.log(`Branch config -> ${JSON.stringify(branchConfig)}`);


if(!branchConfig){
    throw new Error(`No configuration found for branch: ${currentBranch}`)
}

const context: CDKContext & cdk.StackProps = {
    branch: currentBranch,
    ...globals,
    ...branchConfig
}

console.log(`Context -> ${JSON.stringify(context)}`);

const appName = `${context.appName}-${context.stage}`
const stackName = `${appName}-Stack`


// 1. Virtual Private Cloud
const vpcStack = new VpcStack(app, `${appName}-VpcStack`, { stackName: `${appName}-VpcStack`, env: context.env }, context)



// 2. RDS PostgreSQL Database
const rdsStack = new RdsStack(
    app, 
    `${appName}-AppRdsStack`, {
        stackName: `${appName}-AppRdsSecretStack`, 
        env: context.env, 
        vpc: vpcStack.vpc,
        isolatedSecurityGroup: vpcStack.isolatedSecurityGroup,
    },
    context
);
// Ensure RDS is deployed after VPC
rdsStack.addDependency(vpcStack);




const imageStack = new ImageStack(
    app, 
    `${appName}-AppImageLambdaStack`, 
    { 
        stackName: `${appName}-AppImageLambdaStack`, 
        env: context.env, 
        vpc: vpcStack.vpc, 
        rdsSecret: rdsStack.rdsSecret,
        privateSecurityGroup: vpcStack.privateSecurityGroup, 
    }, 
    context
)
imageStack.addDependency(rdsStack)




// 3. Database Initializer Lambda (Custom Resource)
const dbInitLambdaStack = new DbInitLambdaStack(
    app, 
    `${appName}-AppDbInitLambdaStack`, 
    {
        stackName: `${appName}-AppDbInitLambdaRoleStack`, 
        env: context.env, 
        vpc: vpcStack.vpc,
        rdsInstance: rdsStack.rdsInstance,
        rdsSecret: rdsStack.rdsSecret,
        privateSecurityGroup: vpcStack.privateSecurityGroup,
        isolatedSecurityGroup: vpcStack.isolatedSecurityGroup,
        // nodeJsLayer: imageStack.nodeJsLayer,
    },
    context
); 
// Ensure DB initialization happens after RDS is ready
dbInitLambdaStack.addDependency(imageStack); 



const pgCrudOpsStack = new PgCrudStack(
    app, 
    `${appName}-PgCrudOpsLambdaStack`, 
    {
        stackName: `${appName}-PgCrudOpsLambdaStack`, 
        env: context.env, 
        vpc: vpcStack.vpc, 
        rdsSecret: rdsStack.rdsSecret,
        privateSecurityGroup: vpcStack.privateSecurityGroup, 
        nodeJsLayer: dbInitLambdaStack.nodeJsLayer,
        dbInitializerLambdaRole: dbInitLambdaStack.dbInitializerLambdaRole
    }, 
    context 
)
pgCrudOpsStack.addDependency(imageStack)


/*const infraStack = new InfraStack(
    app, 
    stackName, 
    { 
        stackName, 
        env: context.env 
    }, 
    context
)
infraStack.addDependency(vpcStack);*/




const apiStack = new ApiGwStack(
    app, 
    `${appName}-ApiGateway`, 
    { 
        stackName: `${appName}-ApiGateway`, 
        env: context.env, 
        imageHandlerLambda: imageStack.imageHandlerLambda,
        pingHandlerLambda: imageStack.pingHandlerLambda,
        // pingNodeJsHandlerLambda: imageStack.pingNodeJsHandlerLambda,
        pgCrudOpsHandlerLambda: pgCrudOpsStack.pgCrudOpsHandlerLambda,
    }, 
    context
)
// apiStack.addDependency(imageStack)
apiStack.addDependency(pgCrudOpsStack)

