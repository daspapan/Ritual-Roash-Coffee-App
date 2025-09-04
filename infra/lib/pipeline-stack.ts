import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { CDKContext } from '../types';
import * as pipeline from 'aws-cdk-lib/pipelines';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import { FargateStack } from './fargate-v2-stack';
import { AuthStack } from './auth-stack';


/* 
GitHub Token : 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
Source Youtube Video : https://www.youtube.com/watch?v=Z3YNjMxuN9U&t=683s
*/


export interface PipelineStageProps extends cdk.StageProps {
    stageName: string
}

export class PipelineStage extends cdk.Stage {
    constructor(scope: Construct, id: string, props: PipelineStageProps, context: CDKContext){
        super(scope, id, props)

        const appName = `${context.appName}-${context.stage}`;

        new AuthStack(
            this, 
            `${appName}-AuthStack`, 
            {
                stackName: `${appName}-AuthStack`, 
                env: context.env
            }, 
            context
        )
    }
}


export interface PipelineStackProps extends cdk.StackProps {
    fargateService: ecs.FargateService;
    ecrRepository: ecr.Repository;
}

export class PipelineStack extends cdk.Stack {

    public readonly githubSecret: secretsmanager.Secret;

    constructor(scope: Construct, id: string, props: PipelineStackProps, context: CDKContext){
        super(scope, id, props);

        const appName = `${context.appName}-${context.stage}`;
        const appStage = `${context.stage}`
        const dbName = `${context.hosting.dbName}`
        const tokenName = `${context.hosting.ghTokenName}`
        const token = `${context.hosting.ghToken}`
        const owner = `${context.hosting.ghOwner}`
        const repo = `${context.hosting.ghRepo}`
        const branch = `${context.hosting.ghBranch}` || 'main'

        // const pipeline = new codepipeline.Pipeline(this, `${appName}-Pipeline`);
        // const sourceOutput = new codepipeline.Artifact();
        // const buildOutput = new codepipeline.Artifact();


        const { fargateService, ecrRepository } = props;


        // Retrieve GitHub token from AWS Secrets Manager
        const githubToken = secretsmanager.Secret.fromSecretNameV2(this, 'GitHubTokenSecret', 'github-token-1');


        const fargatePipeline = new pipeline.CodePipeline(this, `${appName}-Pipeline`, {
            pipelineName: `${appName}-Fargate-Pipeline`,
            synth: new pipeline.ShellStep(`${appName}-Synth`, {
                input: pipeline.CodePipelineSource.gitHub(`${owner}/${repo}`, `${branch}`),
                commands: [
                    'cd next-app',
                    'npm ci',
                    'npm run build'
                ],
                primaryOutputDirectory: 'next-app/.next',
            }),
            selfMutation: true,
        })

        
        /* const deployStage = new cdk.Stage(this, `${appName}-Deploy`, {
            env: context.env,
        });*/


        // const nextjsFargateApp = new FargateStack(deployStage, 'NextjsFargateApp', {...props}, {...context});


        // Add a Docker build and push step
        // 919620897356.dkr.ecr.ap-south-1.amazonaws.com/
        const dockerBuildStep = new pipeline.ShellStep(`${appName}-DockerBuildAndPush`, {
            commands: [
                'cd next-app', // Change to your frontend directory
                'npm ci',
                'npm run build',
                'echo "Login in to Amazon ECR..."',
                'aws --version',
                'echo "ACCOUNT_ID:`$ACCOUNT_ID` - REGION: `$REGION`"',
                'aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com',
                'docker build -t $ECR_REPO_URI:latest .',
                'docker tag $ECR_REPO_URI:latest $ECR_REPO_URI:latest',
                'docker push $ECR_REPO_URI:latest',
            ],
            env: {
                ACCOUNT_ID: `${context.env.account}`,
                REGION: `${context.env.region}`,
                CONTAINER_NAME: "my-todo-nextjs-app",
                ECR_REPO_URI: ecrRepository.repositoryUri,
            }

        });


        // Add a deployment step
        const fargateDeployStep = new pipeline.ShellStep('FargateDeploy', {
            commands: [
                'echo "Updating fargate service on `date`',
                'echo "Updating fargate service..."',
                `aws ecs update-service --cluster $CLUSTER_NAME --service $SERVICE_NAME --force-new-deployment`,
            ],
            env: {
                CLUSTER_NAME: fargateService.cluster.clusterName,
                SERVICE_NAME: fargateService.serviceName,
            }
        });
            
        fargatePipeline.addStage(new PipelineStage(this, `${appName}-${appStage}`, {stageName: appStage,}, {...context}), {
            post: [new pipeline.ManualApprovalStep('Approval'), dockerBuildStep, fargateDeployStep],
        }); 
    


        

        /*

        this.githubSecret = new secretsmanager.Secret(this, `${appName}-GitHubSecret`, {
            secretName: `${tokenName}`,
            description: 'GitHub Personal Access Token for CI/CD',
            secretStringValue: cdk.SecretValue.unsafePlainText(`${token}`), // The actual token value
            removalPolicy: cdk.RemovalPolicy.DESTROY
        }) */

        // const githubToken = cdk.SecretValue.secretsManager(githubToken.secretName)


        // 1. Source Stage: Fetch code from a repository
        /* const sourceAction = new codepipeline_actions.GitHubSourceAction({
            actionName: `${appName}-GithubSource`,
            owner,
            repo,
            oauthToken: cdk.SecretValue.secretsManager(githubToken.secretName),
            output: sourceOutput,
            branch,
        });
        pipeline.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)
        pipeline.addStage({
            stageName: `${appStage}-Source`,
            actions: [sourceAction],
        });


        // 2. Build Stage: Build Docker image and push to ECR
        const buildProject = new codebuild.PipelineProject(this, 'NextjsBuild', {
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_6_0,
                privileged: true,
            },
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    install: {
                        commands: [
                            'echo "Change directory to next-app"',
                            'cd next-app'
                        ], 
                    },
                    pre_build: {
                        commands: [
                            'echo "Login in to Amazon ECR..."',
                            'aws --version',
                            'echo "AWS_ACCOUNT_ID:`$AWS_ACCOUNT_ID` - AWS_REGION: `$AWS_REGION`"',
                            'aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com',
                        ],
                    },
                    build: {
                        commands: [
                            'echo "Build started on `date`',
                            'echo "Build Next.js Docker image..."',
                            'docker build -t $ECR_REPO_URI:latest .',
                            'docker tag $ECR_REPO_URI:latest $ECR_REPO_URI:latest'
                        ],
                    },
                    post_build: {
                        commands: [
                            'echo "Build complete on `date`',
                            'echo "Pushing Docker image to ECR..."',
                            'docker push $ECR_REPO_URI:latest',
                            'echo "Updating fargate service on `date`',
                            'echo "Updating fargate service... $CLUSTER_NAME - $SERVICE_NAME"',
                            `aws ecs update-service --cluster $CLUSTER_NAME --service $SERVICE_NAME --force-new-deployment`,
                            'echo "Writing image definitions file..."',
                            'printf \'[{"name","%s","imageUri":"%s"}]\' "$CONTAINER_NAME $ECR_REPO_URI:latest" > image.json',
                        ],
                    },
                },
                artifacts: {
                    files: ['image.json'],
                },
            }),
        });
            // Add IAM policy for CodeBuild to push to ECR
        buildProject.addToRolePolicy(new iam.PolicyStatement({
            actions: ['ecr:GetAuthorizationToken', 'ecr:BatchCheckLayerAvailability', 'ecr:PutImage', 'ecr:InitiateLayerUpload', 'ecr:UploadLayerPart', 'ecr:CompleteLayerUpload'],
            resources: ['*'], // Be more specific with resource ARN in production
        }));

        pipeline.addStage({
            stageName: `${appStage}-Build`,
            actions: [
                new codepipeline_actions.CodeBuildAction({
                    actionName: 'DockerBuild',
                    project: buildProject,
                    input: sourceOutput,
                    outputs: [buildOutput],
                    environmentVariables: {
                        'AWS_ACCOUNT_ID': {value: context.env.account},
                        'AWS_REGION': {value: context.env.region},
                        'CONTAINER_NAME': {value: "my-todo-nextjs-app"},
                        'ECR_REPO_URI': { value: ecrRepository.repositoryUri },
                        'CLUSTER_NAME': {value: fargateService.cluster.clusterName},
                        'SERVICE_NAME': {value: fargateService.serviceName},
                    },
                }),
            ],
        });



        // 3. Deploy Stage: Deploy the new image to the Fargate service
        pipeline.addStage({
            stageName: `${appStage}-Deploy`,
            actions: [
                new codepipeline_actions.EcsDeployAction({
                    actionName: 'FargateDeploy',
                    service: fargateService,
                    input: buildOutput,
                }),
            ],
        }); */





        // new cdk.CfnOutput(this, 'HealthHandlerLambdaName', {value: this.pingHandlerLambda.functionName})


    }

}