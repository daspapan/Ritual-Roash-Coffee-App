import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CDKContext } from '../types';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';


export class InfraStack extends cdk.Stack {

    constructor(scope: Construct, id: string, props: cdk.StackProps, context: CDKContext){
        super(scope, id, props);

        const appName = `${context.appName}-${context.stage}`;
        console.log(`AppName -> ${appName}`)


        console.log(JSON.stringify(context, null, 2))


        // AWS Settings
        new cdk.CfnOutput(this, 'Region', {value: this.region})

    }

}