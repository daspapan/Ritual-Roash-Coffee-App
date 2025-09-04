import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';
import { CDKContext } from '../types';

export interface HostingStackProps extends cdk.StackProps {
    alb: elbv2.ApplicationLoadBalancer;
}

export class HostingStack extends cdk.Stack {

    // public readonly alb: elbv2.ApplicationLoadBalancer;
    // public readonly certificate: acm.ICertificate;

    constructor(scope: Construct, id: string, props: HostingStackProps, context: CDKContext){
        super(scope, id, props);

        const appName = `${context.appName}-${context.stage}`;
        const appStage = `${context.stage}`
        const domainName = `${context.hosting.domainName}`
        const dbName = `${context.hosting.dbName}`

        const { alb } = props;


        // Inside the NextjsFargateStack class constructor
        const hostedZone = route53.HostedZone.fromLookup(this, `${appName}-HostedZone`, {
            domainName, // Replace with your domain
        });

        /* const certificate = new acm.DnsValidatedCertificate(this, `${appName}-Certificate`, {
            domainName,
            hostedZone,
        }); */
        // arn:aws:acm:ap-south-1:919620897356:certificate/ab52a4a1-7f88-4b63-94f5-dba136ecd2b9
        // this.certificate = acm.Certificate.fromCertificateArn(this, `${appName}-Certificate`, `arn:aws:acm:ap-south-1:919620897356:certificate/${context.hosting.certificateArn}`)

        

        new route53.ARecord(this, `${appName}-SubdomainAliasRecord`, {
            zone: hostedZone,
            recordName: `${appStage.toLocaleLowerCase()}.${domainName}`,
            target: route53.RecordTarget.fromAlias(new targets.LoadBalancerTarget(alb)),
        });
        

        

        

    }

}