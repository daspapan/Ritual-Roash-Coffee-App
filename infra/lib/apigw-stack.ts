import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import { CDKContext } from '../types';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export interface ApiGwStackProps extends cdk.StackProps {
    imageHandlerLambda: Function; // For Lambda
    pingHandlerLambda: Function;
    // pingNodeJsHandlerLambda?: NodejsFunction;
    pgCrudOpsHandlerLambda: Function;
}

export class ApiGwStack extends cdk.Stack {

    public readonly api: apigw.RestApi;

    constructor(scope: Construct, id: string, props: ApiGwStackProps, context: CDKContext){
        super(scope, id, props);

        const appName = `${context.appName}-${context.stage}`;
        const appStage = `${context.stage}`


        // --- API Gateway to expose Lambdas ---
        this.api = new apigw.RestApi(this, `${appName}-ProductImageApi`, {
            restApiName: `${appName} Product Image Service`,
            description: 'API for managing products and images.',
            deployOptions: {
                stageName: `${appStage.toLocaleLowerCase()}`,
            },
            endpointTypes: [apigw.EndpointType.REGIONAL],
        });
        

        const healthIntegration = new apigw.LambdaIntegration(props.pingHandlerLambda);
        const pingResource = this.api.root.addResource('health').addResource('ping');
        pingResource.addMethod('GET', healthIntegration);


        // 
        // Integration for CRUD Operation on PostgreSQL Database
        //
        // const pgCrudIntegration = new apigw.LambdaIntegration(props.pgCrudOpsHandlerLambda);
        // const pgPingResource = this.api.root.addResource('crud').addResource('ping');
        // pgPingResource.addMethod('GET', pgCrudIntegration);
        // const pgCreateResource = this.api.root.addResource('crud').addResource('create');
        // pgCreateResource.addMethod('POST', pgCrudIntegration);
        // const pgReadResource = this.api.root.addResource('crud').addResource('read');
        // pgReadResource.addMethod('GET', pgCrudIntegration);
        // const pgReadAllResource = this.api.root.addResource('crud').addResource('read-all');
        // pgReadAllResource.addMethod('GET', pgCrudIntegration);
        // const pgUpdateResource = this.api.root.addResource('crud').addResource('update');
        // pgUpdateResource.addMethod('UPDATE', pgCrudIntegration);
        // const pgDeleteResource = this.api.root.addResource('crud').addResource('delete');
        // pgDeleteResource.addMethod('DELETE', pgCrudIntegration);

        const pgCrudIntegration = new apigw.LambdaIntegration(props.pgCrudOpsHandlerLambda)
        const todosResource = this.api.root.addResource('crud');
        const pgPingResource = todosResource.addResource('ping');
        pgPingResource.addMethod('GET', pgCrudIntegration)
        todosResource.addMethod('POST', new apigw.LambdaIntegration(props.pgCrudOpsHandlerLambda));
        todosResource.addMethod('GET', new apigw.LambdaIntegration(props.pgCrudOpsHandlerLambda));

        const todoByIdResource = todosResource.addResource('{id}');
        todoByIdResource.addMethod('GET', new apigw.LambdaIntegration(props.pgCrudOpsHandlerLambda));
        todoByIdResource.addMethod('PUT', new apigw.LambdaIntegration(props.pgCrudOpsHandlerLambda));
        todoByIdResource.addMethod('DELETE', new apigw.LambdaIntegration(props.pgCrudOpsHandlerLambda));

        
        // Integration for Image Handler Lambda
        const imagesIntegration = new apigw.LambdaIntegration(props.imageHandlerLambda);
        const imagesUploadResource = this.api.root.addResource('media').addResource('upload-url');
        imagesUploadResource.addMethod('PUT', imagesIntegration); // Get presigned upload URL
        const imagesDownloadResource = this.api.root.addResource('image').addResource('download-url');
        imagesDownloadResource.addMethod('POST', imagesIntegration); // Get presigned download URL
        
        new cdk.CfnOutput(this, 'ApiGatewayEndpoint', {
            value: this.api.url,
            description: 'API Gateway Endpoint URL',
        });

        

    }

}