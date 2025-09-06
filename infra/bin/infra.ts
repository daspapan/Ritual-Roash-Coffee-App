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
import { S3Stack } from '../lib/s3-stack';
import { FargateStack } from '../lib/fargate-v2-stack';
import { HostingStack } from '../lib/hosting-stack';
import { AlbListenerStack } from '../lib/alb-listener-stack';
import { TodoCrudStack } from '../lib/todocrud-stack';
import { PipelineV2Stack } from '../lib/pipeline-v2-stack';
import { AuthStack } from '../lib/auth-stack';

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

 // [vpcStack] -> [rdsStack] -> [imageStack] -> [dbInitLambdaStack] -> [s3Stack] -> [pgCrudOpsStack] -> [apiStack]





new PipelineV2Stack(
    app,
    `${appName}-PipelineV2Stack`, 
    {
        stackName: `${appName}-PipelineV2Stack`, 
        env: context.env,
    },
    context
)


