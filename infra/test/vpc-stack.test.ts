import * as cdk from 'aws-cdk-lib';
import * as gitBranch from 'git-branch';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { CDKContext } from '../types';
import { VpcStack } from '../lib/vpc-stack';


const currentBranch = process.env.AWS_BRANCH || gitBranch.sync();

describe('VPC Construct', () => {

    let stack : VpcStack;
    let app: cdk.App;
    let appName: string;

    beforeEach(() => {
        // This function will run before each 'test' block in this describe block
        app = new cdk.App();

        const globals = app.node.tryGetContext('globals') || {}
        const branchConfig = app.node.tryGetContext(currentBranch);
        const context: CDKContext & cdk.StackProps = {
            branch: currentBranch,
            ...globals,
            ...branchConfig
        }
        console.log(`Context -> ${JSON.stringify(context)}`);

        appName = `${context.appName}-${context.stage}`

        stack = new VpcStack(
            app, 
            `${appName}-VpcStack`, 
            { 
                stackName: `${appName}-VpcStack`, 
                env: context.env 
            }, 
            context
        );
    });
    
    test('VPC and Subnets are created correctly', () => {
        
        const template = Template.fromStack(stack);

        template.hasResourceProperties('AWS::EC2::VPC', {
            CidrBlock: '10.0.0.0/16',
            EnableDnsHostnames: true,
            EnableDnsSupport: true,
        });

        template.resourceCountIs('AWS::EC2::Subnet', 6); // Assuming 2 AZs, so 2 subnets
        template.hasResourceProperties('AWS::EC2::InternetGateway', {}); // Check for IGW presence
    });



    test('VPC with custom name', () => {
        
        const template = Template.fromStack(stack);

        template.hasResourceProperties('AWS::EC2::VPC', {
            Tags: [
                { Key: 'Name', Value: 'RRC-Dev-VpcStack/RRC-Dev-VPC' },
            ],
        });
        
    });

    
});
