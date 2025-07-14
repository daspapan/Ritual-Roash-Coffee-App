import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CDKContext } from '../types';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { createVPC } from './networking/vpc-stack';
import { createSecurityGroup } from './security/vpc-sg-stack';
import { createECRRepository } from './repository/ecr-repo';


export class InfraStack extends cdk.Stack {

    constructor(scope: Construct, id: string, props: cdk.StackProps, context: CDKContext){
        super(scope, id, props);

        const appName = `${context.appName}-${context.stage}`;
        console.log(`AppName -> ${appName}`)


        console.log(JSON.stringify(context, null, 2))


        // Networking
        const vpc = createVPC(this, {appName: appName, })

        // Security Group
        const securityGroup = createSecurityGroup(this, {appName: appName, vpc: vpc})

        // Repository
        const ecrRepository = createECRRepository(this, {appName: appName, })




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

    }

}