import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { CDKContext } from '../types';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as pipeline from 'aws-cdk-lib/pipelines';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';
import { FargateStack } from './fargate-v2-stack';
import { AuthStack } from './auth-stack';


/* 
GitHub Token : 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
Source Youtube Video : https://www.youtube.com/watch?v=Z3YNjMxuN9U&t=683s
*/


export interface PipelineV2StageProps extends cdk.StageProps {
    stageName: string
    vpc: ec2.Vpc;
    rdsInstance: rds.DatabaseInstance;
    rdsSecret: secretsmanager.Secret;
    mediaBucket: s3.Bucket;
    publicSecurityGroup: ec2.SecurityGroup;
    privateSecurityGroup: ec2.SecurityGroup; // For Lambda
}


export class PipelineV2Stage extends cdk.Stage {
    constructor(scope: Construct, id: string, props: PipelineV2StageProps, context: CDKContext){
        super(scope, id, props)

        const appName = `${context.appName}-${context.stage}`;

        const {vpc, rdsInstance, rdsSecret, publicSecurityGroup, privateSecurityGroup, mediaBucket} = props

        new AuthStack(
            this, 
            `${appName}-AuthV2Stack`, 
            {
                stackName: `${appName}-AuthV2Stack`, 
                env: context.env
            }, 
            context
        )

        /*

        new FargateStack(
            this,
            `${appName}-FargateStack`, 
            {
                stackName: `${appName}-FargateStack`, 
                env: context.env, 
                vpc,
                privateSecurityGroup, 
                publicSecurityGroup,
                rdsInstance,
                rdsSecret,
                mediaBucket,
            },
            context
        )

        */
    }
}


export interface PipelineV2StackProps extends cdk.StackProps {
    fargateService: ecs.FargateService;
    ecrRepository: ecr.Repository;
    vpc: ec2.Vpc;
    rdsInstance: rds.DatabaseInstance;
    rdsSecret: secretsmanager.Secret;
    mediaBucket: s3.Bucket;
    publicSecurityGroup: ec2.SecurityGroup;
    privateSecurityGroup: ec2.SecurityGroup; // For Lambda
}

export class PipelineV2Stack extends cdk.Stack {

    public readonly githubSecret: secretsmanager.Secret;

    constructor(scope: Construct, id: string, props: PipelineV2StackProps, context: CDKContext){
        super(scope, id, props);

        const appName = `${context.appName}-${context.stage}`;
        const appStage = `${context.stage}`
        const dbName = `${context.hosting.dbName}`
        const tokenName = `${context.hosting.ghTokenName}`
        const token = `${context.hosting.ghToken}`
        const owner = `${context.hosting.ghOwner}`
        const repo = `${context.hosting.ghRepo}`
        const branch = `${context.hosting.ghBranch}` || 'main'

        
        // const {vpc, rdsInstance, rdsSecret, publicSecurityGroup, privateSecurityGroup, mediaBucket} = props
        const { fargateService, ecrRepository } = props;


        // ─────────────────────────────────────────────────────────────
        // CONFIG (change these for your repo/app)
        // ─────────────────────────────────────────────────────────────
        /* 


        

        

        const oauthToken = secretsmanager.Secret.fromSecretNameV2(
            this, 'GithubToken', github.oauthSecretName
        );

        


        

        const buildRole = new iam.Role(this, 'CodeBuildDeployRole', {
          assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
          inlinePolicies: {
            // Grant necessary permissions for deployment, e.g., CloudFormation, S3, Lambda, etc.
            DeploymentPermissions: new iam.PolicyDocument({
              statements: [
                new iam.PolicyStatement({
                  actions: ['cloudformation:*', 's3:*', 'lambda:*', 'codepipeline:*'], // Adjust permissions based on your deployment needs
                  resources: ['*'], // Scope down resources as much as possible for security
                }),
              ],
            }),
          },
        });

        


        

        
        
        */


        const git_input = pipeline.CodePipelineSource.connection(
            `${owner}/${repo}`, `${branch}`, {
                connectionArn: `arn:aws:codeconnections:ap-south-1:919620897356:connection/d499b4b1-326e-4edf-8adb-8214c4f15d0f`,
                triggerOnPush: true,
            }
        )

        const github = {
            owner,
            repo,
            branch,
            // Create a secret in Secrets Manager named 'github-token' that contains your Personal Access Token
            // with repo:read permissions (fine-grained PAT recommended).
            oauthSecretName: 'github-token-3',
        };

        // ─────────────────────────────────────────────────────────────
        // CODEPIPELINE (GitHub OAuth → Build → ECS Deploy)
        // ─────────────────────────────────────────────────────────────
        const sourceOutput = new codepipeline.Artifact('SourceArtifact');
        const buildOutput = new codepipeline.Artifact('BuildArtifact');

        const sourceAction = new codepipeline_actions.GitHubSourceAction({
            actionName: 'GitHubSource',
            owner: github.owner,
            repo: github.repo,
            branch: github.branch,
            oauthToken: cdk.SecretValue.secretsManager(github.oauthSecretName),
            output: sourceOutput,
            trigger: codepipeline_actions.GitHubTrigger.WEBHOOK,
        });


        


        // ─────────────────────────────────────────────────────────────
        // CODEBUILD PROJECT
        // ─────────────────────────────────────────────────────────────
        const project = new codebuild.PipelineProject(this, `${appName}-BuildProject`, {
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
                privileged: true, // Docker-in-Docker
            },
            environmentVariables: {
                ACCOUNT_ID: {value: context.env.account},
                REGION: {value: context.env.region},
                ECR_REPO_URI: { value: ecrRepository.repositoryUri },
                CLUSTER_NAME: {value: fargateService.cluster.clusterName},
                SERVICE_NAME: {value: fargateService.serviceName},
                REPOSITORY_URI: { value: ecrRepository.repositoryUri },
                CONTAINER_NAME: { value: "my-todo-nextjs-app" },
            },
            // Using buildspec file at repo root (below)
            buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec.yaml'),
            timeout: cdk.Duration.minutes(30),
        });
        ecrRepository.grantPullPush(project)

        const buildAction = new codepipeline_actions.CodeBuildAction({
            actionName: 'CodeBuild',
            project,
            input: sourceOutput,
            outputs: [new codepipeline.Artifact("imagedefinitions")],
            executeBatchBuild: false,
        });



        const deployRole = new iam.Role(this, 'EcsDeployRole', {
            assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com'),
        });

        deployRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                'ecs:DescribeServices',
                'ecs:UpdateService',
                'ecs:DescribeTaskDefinition',
                'ecs:RegisterTaskDefinition',
                'ecs:DeregisterTaskDefinition',
                'ecr:*',
                'sts:*',
                'cloudwatch:*',
                'cloudformation:*', 's3:*', 'lambda:*', 'codepipeline:*'
                // ... other necessary permissions for ECR, CloudWatch Logs, etc.
            ],
            resources: ['*'], // Scope down resources for production environments
        }));

        const existingService : ecs.IBaseService = ecs.FargateService.fromFargateServiceAttributes(this, `${appName}-fargate-svc`, {cluster: fargateService.cluster, serviceArn: fargateService.serviceArn }); 

        const deployAction = new codepipeline_actions.EcsDeployAction({
            actionName: 'ECS_Deploy',
            service: existingService,
            input: new codepipeline.Artifact("imagedefinitions"), // expects imagedefinitions.json
            runOrder: 1,
            // imageFile: buildOutput.atPath("imagedefinitions.json"),
            deploymentTimeout: cdk.Duration.minutes(60),
            role: deployRole
        }); 

        new codepipeline.Pipeline(this, `${appName}-FG-Pipeline`, {
            pipelineName: `${appName}-Fargate-Pipeline`,
            pipelineType: codepipeline.PipelineType.V2,
            stages: [
                { stageName: 'Source', actions: [sourceAction] },
                { stageName: 'Build', actions: [buildAction] },
                { stageName: 'Deploy', actions: [deployAction] },
            ], 
            crossAccountKeys: false,
        });

        /*
        const synth_step = new pipeline.ShellStep(`${appName}-Synth`, {
            input: git_input,
            installCommands: [],
            commands: [
                'cd next-app',
                'npm ci',
                'npm run build'
            ],
            primaryOutputDirectory: 'next-app/.next',
        })

        const fargatePipeline = new pipeline.CodePipeline(this, `${appName}-Code-Pipeline`, {
            // pipelineName: `${appName}-Code-Pipeline-Name`,
            selfMutation: true,
            codePipeline: code_pipeline,
            synth: synth_step
        })


        const deployment_wave = fargatePipeline.addWave("DeploymentWave")

        deployment_wave.addStage(
            new PipelineV2Stage(
                this, 
                `${appName}-DeployStage`, 
                {
                    stageName: appStage,
                    vpc,
                    rdsInstance,
                    rdsSecret,
                    mediaBucket,
                    publicSecurityGroup,
                    privateSecurityGroup,
                }, 
                {...context}
            )
        )*/


        // ─────────────────────────────────────────────────────────────
        // OUTPUTS
        // ─────────────────────────────────────────────────────────────
        // new cdk.CfnOutput(this, 'GithubRepo', { value: `${github.owner}/${github.repo} (${github.branch})` });



        // new cdk.CfnOutput(this, 'HealthHandlerLambdaName', {value: this.pingHandlerLambda.functionName})


    }

}