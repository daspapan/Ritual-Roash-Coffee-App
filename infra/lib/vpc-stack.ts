import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { CDKContext } from '../types';

export class VpcStack extends cdk.Stack {

    public readonly vpc: ec2.Vpc;
    public readonly publicSecurityGroup: ec2.SecurityGroup;
    public readonly privateSecurityGroup: ec2.SecurityGroup;
    public readonly isolatedSecurityGroup: ec2.SecurityGroup; // For RDS

    constructor(scope: Construct, id: string, props: cdk.StackProps, context: CDKContext){
        super(scope, id, props);

        const appName = `${context.appName}-${context.stage}`;
        // const appStage = `${context.stage}`
        // const dbName = `${context.hosting.dbName}`

        // VPC without NAT Gateway
        this.vpc = new ec2.Vpc(this, `${appName}-VPC`, {
            maxAzs: 2, // Use 2 Availability Zones for resilience
            // Disable NAT Gateway creation
            natGateways: 0,
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'Public',
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 24,
                    name: 'PrivateForFargate', // Subnet for Fargate tasks
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, // Needs egress via endpoints
                },
                {
                    cidrMask: 24,
                    name: 'IsolatedForRDS', // Subnet for RDS, no direct internet access
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                },
            ],
        });

        // --- Security Groups ---
        this.publicSecurityGroup = new ec2.SecurityGroup(this, `${appName}-PublicSG`, {
            vpc: this.vpc,
            description: 'Security Group for Public-facing resources (e.g., Load Balancer)',
            allowAllOutbound: true, // Typically allows outbound for external access
        });
        this.publicSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP from anywhere');
        this.publicSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS from anywhere');

        this.privateSecurityGroup = new ec2.SecurityGroup(this, `${appName}-PrivateSG`, {
            vpc: this.vpc,
            description: 'Security Group for Private resources (e.g., Fargate Tasks, API Gateway VPC Link)',
            allowAllOutbound: true, // Initially allow all outbound for simplicity, refine as needed
        });
        // Private SG needs to allow inbound from Public SG (e.g., ALB to Fargate)
        this.privateSecurityGroup.addIngressRule(this.publicSecurityGroup, ec2.Port.allTcp(), 'Allow inbound from Public SG');

        this.isolatedSecurityGroup = new ec2.SecurityGroup(this, `${appName}-IsolatedSG`, {
            vpc: this.vpc,
            description: 'Security Group for Isolated resources (e.g., RDS PostgreSQL)',
            allowAllOutbound: false, // RDS should generally not have outbound internet access
        });
        // Isolated SG needs to allow inbound from Private SG (Lambda/Fargate to RDS)
        this.isolatedSecurityGroup.addIngressRule(this.privateSecurityGroup, ec2.Port.tcp(5432), 'Allow inbound from Private SG (PostgreSQL)');


        // --- Interface VPC Endpoints (for private subnet access to AWS services) ---
        // Lambda Endpoint
        new ec2.InterfaceVpcEndpoint(this, `${appName}-LambdaVpcEndpoint`, {
            vpc: this.vpc,
            service: ec2.InterfaceVpcEndpointAwsService.LAMBDA,
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }, // Place in private subnets
            securityGroups: [this.privateSecurityGroup],
            privateDnsEnabled: true,
        });

        // Secrets Manager Endpoint
        new ec2.InterfaceVpcEndpoint(this, `${appName}-SecretsManagerVpcEndpoint`, {
            vpc: this.vpc,
            service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            securityGroups: [this.privateSecurityGroup],
            privateDnsEnabled: true,
        });

        // S3 Gateway Endpoint (S3 uses a Gateway endpoint, not an Interface endpoint)
        // Gateway endpoints are added directly to the route table of the subnets.
        this.vpc.addGatewayEndpoint(`${appName}-S3GatewayEndpoint`, {
            service: ec2.GatewayVpcEndpointAwsService.S3,
            // All subnets that need S3 access without NAT Gateway
            subnets: [
                { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
                { subnetType: ec2.SubnetType.PRIVATE_ISOLATED }
            ],
        });

        // Note: If Fargate needs to pull images from ECR, you'll need ECR/ECR_DOCKER endpoints.
        // ECR_DOCKER Endpoint
        new ec2.InterfaceVpcEndpoint(this, `${appName}-EcrDockerVpcEndpoint`, {
            vpc: this.vpc,
            service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            securityGroups: [this.privateSecurityGroup],
            privateDnsEnabled: true,
        });

        // ECR API Endpoint
        new ec2.InterfaceVpcEndpoint(this, `${appName}-EcrApiVpcEndpoint`, {
            vpc: this.vpc,
            service: ec2.InterfaceVpcEndpointAwsService.ECR,
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            securityGroups: [this.privateSecurityGroup],
            privateDnsEnabled: true,
        });

        // CloudWatch Logs Endpoint (Lambda needs this for logging)
        new ec2.InterfaceVpcEndpoint(this, `${appName}-CloudWatchLogsVpcEndpoint`, {
            vpc: this.vpc,
            service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            securityGroups: [this.privateSecurityGroup],
            privateDnsEnabled: true,
        });

        new cdk.CfnOutput(this, 'VpcId', { value: this.vpc.vpcId, description: 'The ID of the VPC',});

    }

}