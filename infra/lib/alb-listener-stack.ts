import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';
import { CDKContext } from '../types';
import { Certificate } from 'crypto';

export interface AlbListenerStackProps extends cdk.StackProps {
    alb: elbv2.ApplicationLoadBalancer;
    certificate: acm.ICertificate;
    fargateService: ecs.FargateService;
}

export class AlbListenerStack extends cdk.Stack {

    public readonly alb: elbv2.ApplicationLoadBalancer;

    constructor(scope: Construct, id: string, props: AlbListenerStackProps, context: CDKContext){
        super(scope, id, props);

        const appName = `${context.appName}-${context.stage}`;
        const appStage = `${context.stage}`
        const domainName = `${context.hosting.domainName}`
        const dbName = `${context.hosting.dbName}`

        const { alb, certificate, fargateService } = props;



        const listener = alb.addListener(`${appName}-HttpListener`, {
            port: 443,
            open: true,
            certificates: [certificate],
        });

        listener.addTargets(`${appName}-FargateTarget`, {
            port: 80,
            targets: [fargateService],
            protocol: elbv2.ApplicationProtocol.HTTP,
        });


        // Example of adding a listener and accessing its ARN
        // const listener = alb.addListener('HttpListener', { port: 80 });
        new cdk.CfnOutput(this, 'ListenerArnOutput', {
            value: listener.listenerArn,
            description: 'The ARN of the ALB HTTP Listener',
        });

    }

}