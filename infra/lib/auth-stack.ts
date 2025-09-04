import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { CDKContext } from '../types';

export interface AuthStackProps extends cdk.StackProps {
    vpc?: ec2.Vpc;
}

export class AuthStack extends cdk.Stack {


    constructor(scope: Construct, id: string, props: AuthStackProps, context: CDKContext){
        super(scope, id, props);

        const appName = `${context.appName}-${context.stage}`;
        const appStage = `${context.stage}`
        const dbName = `${context.hosting.dbName}`

        const { vpc } = props;

    }

}