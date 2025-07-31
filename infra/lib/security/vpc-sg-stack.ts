import { Peer, Port, SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

type APIGatewayProps = {
    appName: string;
    vpc: Vpc
}

export function createSecurityGroup(scope: Construct, props: APIGatewayProps) {

    // 2. Create Security Groups

    // Security Group for Public Subnets (e.g., for Load Balancer)
    const publicSecurityGroup = new SecurityGroup(scope, `${props.appName}-Public-SG`, {
        securityGroupName: `${props.appName}-alb-sg`,
        vpc: props.vpc,
        description: 'Security group for public facing resources (e.g., Load Balancer)',
        allowAllOutbound: true, // Allow all outbound traffic by default
    });
    // Example: Allow HTTP/HTTPS inbound from anywhere for a load balancer
    publicSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80), 'Allow HTTP from anywhere');
    publicSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443), 'Allow HTTPS from anywhere');


    // Security Group for Application Subnets (Fargate tasks)
    const applicationSecurityGroup = new SecurityGroup(scope, `${props.appName}-Application-SG`, {
        securityGroupName: `${props.appName}-app-sg`,
        vpc: props.vpc,
        description: 'Security group for Fargate tasks in application subnets',
        allowAllOutbound: true, // Fargate tasks typically need outbound access
    });
    // Allow inbound from the Public SG (e.g., Load Balancer to Fargate)
    applicationSecurityGroup.addIngressRule(
        publicSecurityGroup,
        Port.tcp(8000), // Example port for your Fargate application
        'Allow inbound from Public SG to Fargate app'
    );
    // Allow inbound from itself (for inter-service communication within Fargate)
    applicationSecurityGroup.addIngressRule(
        applicationSecurityGroup,
        Port.allTraffic(),
        'Allow inbound from self (inter-service communication)'
    );


    // Security Group for Data Subnets (MySQL Database)
    const dataSecurityGroup = new SecurityGroup(scope, `${props.appName}-Data-SG`, {
        securityGroupName: `${props.appName}-db-sg`,
        vpc: props.vpc,
        description: 'Security group for MySQL database in data subnets',
        allowAllOutbound: false, // Database typically has restricted outbound
    });
    // Allow inbound from the Application SG (Fargate tasks to MySQL)
    dataSecurityGroup.addIngressRule(
        applicationSecurityGroup,
        Port.tcp(3306), // Default MySQL port
        'Allow inbound from Application SG to MySQL'
    );

    // Allow inbound from the Application SG (Fargate tasks to PostgreSQL)
    dataSecurityGroup.addIngressRule(
        applicationSecurityGroup,
        Port.tcp(5432), // Default PostgreSQL port
        'Allow inbound from Application SG to PostgreSQL'
    );

    return {publicSecurityGroup, applicationSecurityGroup, dataSecurityGroup}

}