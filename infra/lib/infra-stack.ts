import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { CDKContext } from '../types';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { createVPC } from './networking/vpc-stack';
import { createSecurityGroup } from './security/vpc-sg-stack';
import { createECRRepository } from './repository/ecr-repo';
import { createRDS } from './database/rds-stack';
import { createFargate } from './Fargate/fargate-stack';
import { createFunctions } from './compute/functions';


export interface ImageStackProps extends cdk.StackProps {
    vpc?: ec2.Vpc;
    privateSecurityGroup?: ec2.SecurityGroup; // For Lambda
}

export class InfraStack extends cdk.Stack {

    constructor(scope: Construct, id: string, props: cdk.StackProps, context: CDKContext){
        super(scope, id, props);

        const appName = `${context.appName}-${context.stage}`;
        const appStage = `${context.stage}`
        const dbName = `${context.hosting.dbName}`

        console.log(`========================================================`)
        console.log(`App-Name -> ${appName}`, `App-Stage => ${appStage}`)
        console.log(JSON.stringify(context, null, 2))
        console.log(`========================================================`)

        // Networking
        const {vpc, vpcRole} = createVPC(this, {appName: appName, })

        // Security Group
        const securityGroup = createSecurityGroup(this, {appName: appName, vpc: vpc})

        // Repository
        const ecrRepository = createECRRepository(this, {appName, appStage})

        // RDS - Database
        const rds = createRDS(this, {
            appName, 
            vpc, 
            vpcRole,
            dbUser: context.hosting.dbUser, 
            dbName: context.hosting.dbName,
            dataSecurityGroup: securityGroup.dataSecurityGroup,
        })

        // ECS - Fargate
        const fargate = createFargate(this, {
            appName,
            appStage,
            dbName,
            vpc,
            appRepository: ecrRepository,
            dbSecret: rds.dbSecret,
            database: rds.database,
        })


        // NodejsFunction & LambdaFunction
        const computeStack = createFunctions(this, {
            appName: appName,
            stageName: context.stage,
            awsRegion: context.env.region,
            vpc,
            vpcRole,
            dbName,
            dbSecret: rds.dbSecret,
            database: rds.database,
            lambdaRole: vpcRole,
            applicationSG: securityGroup.applicationSecurityGroup,
        }); 


        // AWS Settings
        new cdk.CfnOutput(this, 'Region', {value: this.region})


        // Networking
        new cdk.CfnOutput(this, 'VpcId', {
            value: vpc.vpcId,
            description: 'The ID of the VPC',
        });
        vpc.publicSubnets.forEach((subnet, index) => {
            new cdk.CfnOutput(this, `Subnet${index + 1}IdPublic`, {
                value: subnet.subnetId,
                description: `ID of Public Subnet ${index + 1}`,
            });
        });
        vpc.privateSubnets.forEach((subnet, index) => {
            new cdk.CfnOutput(this, `Subnet${index + 1}IdApplication`, {
                value: subnet.subnetId,
                description: `ID of Application Subnet ${index + 1} (PrivateWithEgress)`,
            });
        });
        vpc.isolatedSubnets.forEach((subnet, index) => {
            new cdk.CfnOutput(this, `Subnet${index + 1}IdData`, {
                value: subnet.subnetId,
                description: `ID of Data Subnet ${index + 1} (PrivateIsolated)`,
            });
        });


        // Security Group
        new cdk.CfnOutput(this, 'SecurityGroupIdPublic', {
            value: securityGroup.publicSecurityGroup.securityGroupId,
            description: 'The ID of the Public Security Group',
        });
        new cdk.CfnOutput(this, 'SecurityGroupIdApplication', {
            value: securityGroup.applicationSecurityGroup.securityGroupId,
            description: 'The ID of the Application Security Group',
        });
        new cdk.CfnOutput(this, 'SecurityGroupIdData', {
            value: securityGroup.dataSecurityGroup.securityGroupId,
            description: 'The ID of the Data Security Group',
        }); 


        // Repository
        new cdk.CfnOutput(this, 'RepositoryEcrUri', {
            value: ecrRepository.repositoryUri,
            description: 'The URI of the Amazon ECR private repository',
        });


        // Output the Load Balancer URL
        new cdk.CfnOutput(this, 'LoadBalancerDNS', {
            value: fargate.fargateService.loadBalancer.loadBalancerDnsName,
            description: 'The URL of the application load balancer',
        });

        // Database
        new cdk.CfnOutput(this, "DatabaseHostname", {
            value: rds.database.instanceEndpoint.hostname,
            description: 'The Database Hostname',
        })
        new cdk.CfnOutput(this, "DatabasePort", {
            value: rds.database.instanceEndpoint.port.toString(),
            description: 'The Database Port',
        })

    }

}

// / AWS CDK using TypeScript postgress RDS  programmatically adding database, user and table