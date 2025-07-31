import { RemovalPolicy } from 'aws-cdk-lib';
import { Repository, TagMutability } from 'aws-cdk-lib/aws-ecr';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import { DockerImageName, ECRDeployment } from 'cdk-ecr-deployment'
import { Construct } from 'constructs';
import path from 'path';

type ECRRepositoryProps = {
    appName: string;
    appStage: string;
}

export function createECRRepository(scope: Construct, props: ECRRepositoryProps) {

    // Create a private ECR repository
    const ecrRepository = new Repository(scope, `${props.appName}-fargate-private-repo`, {
        repositoryName: 'my-fargate-app-images', // Choose a meaningful name for your repository
        imageTagMutability: TagMutability.MUTABLE, // Or IMMUTABLE for stricter control
        // By default, ECR repositories are private. No explicit 'visibility' setting is needed.
        // If you wanted a public repository, you'd use `ecr.PublicRepository` instead.
        emptyOnDelete: true,
        removalPolicy: RemovalPolicy.DESTROY
    });

    const imageAsset = new DockerImageAsset(scope, `${props.appName}-docker-image`, {
        directory: path.join(__dirname, '../../../next-app'),
    })

    new ECRDeployment(scope, 'DeployDockerImage1', {
        src: new DockerImageName(imageAsset.imageUri),
        dest: new DockerImageName(`${ecrRepository.repositoryUri}`),
    });

    return ecrRepository

}