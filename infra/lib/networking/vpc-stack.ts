import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

type APIGatewayProps = {
    appName: string;
}

export function createVPC(scope: Construct, props: APIGatewayProps) {

    // 1. Create VPC
    const vpc: Vpc = new Vpc(scope, `${props.appName}-VPC`, {
        maxAzs: 2, // Deploy across two Availability Zones
        natGateways: 1, // <--- THIS IS THE KEY CHANGE for a single NAT Gateway
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

    return vpc

}