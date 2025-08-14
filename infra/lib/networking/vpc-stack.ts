import { InterfaceVpcEndpointAwsService, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { CompositePrincipal, Effect, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

type APIGatewayProps = {
    appName: string;
}

export function createVPC(scope: Construct, props: APIGatewayProps) {

    // 1. Create VPC
    const vpc: Vpc = new Vpc(scope, `${props.appName}-VPC`, {
        maxAzs: 2, // Deploy across two Availability Zones
        natGateways: 0, // <--- THIS IS THE KEY CHANGE for a single NAT Gateway
        subnetConfiguration: [
            {
                cidrMask: 24,
                name: 'Public',
                subnetType: SubnetType.PUBLIC,
            },
            {
                cidrMask: 24,
                name: 'Application',
                subnetType: SubnetType.PRIVATE_WITH_EGRESS, // Fargate needs egress for pulling images and updates
            },
            {
                cidrMask: 24,
                name: 'Data',
                subnetType: SubnetType.PRIVATE_ISOLATED, // Database should be isolated
            },
        ],
        // Enable DNS hostnames and support for VPC endpoints
        enableDnsHostnames: true,
        enableDnsSupport: true,
    });


    const vpcRole = new Role(scope, `${props.appName}-Role`, {
        roleName: `${props.appName}-VPC-Role`,
        description: 'Role used in the VPC stack',
        assumedBy: new CompositePrincipal(
            new ServicePrincipal('ec2.amazonaws.com'),
            new ServicePrincipal('lambda.amazonaws.com'),
            new ServicePrincipal('ecs-tasks.amazonaws.com')
        )
    })
    vpcRole.addToPolicy(
        new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'cloudwatch:PutMetricData',
                "ec2:CreateNetworkInterface",
                "ec2:DescribeNetworkInterfaces",
                "ec2:DeleteNetworkInterface",
                "ec2:DescribeInstances",
                "ec2:DescribeSubnets",
                "ec2:DescribeSecurityGroups",
                "ec2:DescribeRouteTables",
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                'lambda:InvokeFunction',
                'secretsmanager:GetSecretValue',
                'kms:decrypt',
                'rds-db:connect'
            ],
            resources: ['*']
        })
    )

    

    return {vpc, vpcRole}

}