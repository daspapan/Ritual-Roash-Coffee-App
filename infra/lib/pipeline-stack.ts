import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { CDKContext } from '../types';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';

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

        const pipeline = new codepipeline.Pipeline(this, `${appName}-Pipeline`);
        const sourceOutput = new codepipeline.Artifact();
        const buildOutput = new codepipeline.Artifact();


        const { fargateService, ecrRepository } = props;


        this.githubSecret = new secretsmanager.Secret(this, `${appName}-GitHubSecret`, {
            secretName: `${tokenName}`,
            description: 'GitHub Personal Access Token for CI/CD',
            secretStringValue: cdk.SecretValue.unsafePlainText(`${token}`), // The actual token value
            removalPolicy: cdk.RemovalPolicy.DESTROY
        })

        const githubToken = cdk.SecretValue.secretsManager(`${tokenName}`)
        console.log("[GITHUB-SECRET]", githubToken)
        console.log("[GITHUB-SECRET]", githubToken)
        console.log("[GITHUB-SECRET]", githubToken)
        console.log("[GITHUB-SECRET]", githubToken)
        console.log("[GITHUB-SECRET]", githubToken)


        // 1. Source Stage: Fetch code from a repository
        const sourceAction = new codepipeline_actions.GitHubSourceAction({
            actionName: `${appName}-GithubSource`,
            owner,
            repo,
            oauthToken: githubToken,
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
                        ]
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
                        'AWS_ACCOUNT_ID': {value: "919620897356"},
                        'AWS_REGION': {value: "ap-south-1"},
                        'CONTAINER_NAME': {value: "helloworld"},
                        'ECR_REPO_URI': { value: ecrRepository.repositoryUri },
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
        });





        // new cdk.CfnOutput(this, 'HealthHandlerLambdaName', {value: this.pingHandlerLambda.functionName})


    }

}