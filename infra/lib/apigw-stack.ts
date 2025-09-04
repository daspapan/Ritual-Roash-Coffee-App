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
    pgCrudOpsHandlerLambda: Function;
    todosCrudOpsHandlerLambda: Function;
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
            binaryMediaTypes: ['*/*'], // Essential for API Gateway to correctly handle binary types
        });
        

        const healthIntegration = new apigw.LambdaIntegration(props.pingHandlerLambda);
        const pingResource = this.api.root.addResource('health').addResource('ping');
        pingResource.addMethod('GET', healthIntegration);



        // PostgreSQL CRUD Handler
        const pgCrudIntegration = new apigw.LambdaIntegration(props.pgCrudOpsHandlerLambda)
        const pgCrudResource = this.api.root.addResource('crud');
        const pgPingResource = pgCrudResource.addResource('ping');
        pgPingResource.addMethod('GET', pgCrudIntegration)
        pgCrudResource.addMethod('POST', new apigw.LambdaIntegration(props.pgCrudOpsHandlerLambda));
        pgCrudResource.addMethod('GET', new apigw.LambdaIntegration(props.pgCrudOpsHandlerLambda));

        const pgCrudByIdResource = pgCrudResource.addResource('{id}');
        pgCrudByIdResource.addMethod('GET', new apigw.LambdaIntegration(props.pgCrudOpsHandlerLambda));
        pgCrudByIdResource.addMethod('PUT', new apigw.LambdaIntegration(props.pgCrudOpsHandlerLambda));
        pgCrudByIdResource.addMethod('DELETE', new apigw.LambdaIntegration(props.pgCrudOpsHandlerLambda));


        // Todo's List CRUD Handler
        const todosCrudIntegration = new apigw.LambdaIntegration(props.todosCrudOpsHandlerLambda)
        const todosResource = this.api.root.addResource('todos');
        const todosPingResource = todosResource.addResource('ping');
        todosPingResource.addMethod('GET', todosCrudIntegration)
        todosResource.addMethod('POST', todosCrudIntegration);
        todosResource.addMethod('GET', todosCrudIntegration);

        const todoByIdResource = todosResource.addResource('{id}');
        todoByIdResource.addMethod('GET', todosCrudIntegration);
        todoByIdResource.addMethod('PUT', todosCrudIntegration);
        todoByIdResource.addMethod('DELETE', todosCrudIntegration);

        
        // Integration for Image Handler Lambda
        const imagesIntegration = new apigw.LambdaIntegration(props.imageHandlerLambda);
        const mediaResource = this.api.root.addResource('media');
        const imagesUploadResource = mediaResource.addResource('upload-url');
        imagesUploadResource.addMethod('POST', imagesIntegration); // Get presigned upload URL
        const imagesDownloadResource = mediaResource.addResource('download-url');
        imagesDownloadResource.addMethod('POST', imagesIntegration); // Get presigned download URL
        
        new cdk.CfnOutput(this, 'ApiGatewayEndpoint', {
            value: this.api.url,
            description: 'API Gateway Endpoint URL',
        });

        

    }

}