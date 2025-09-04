#!/bin/sh
set -x 

source .env

CLUSTER_NAME=RRC-Dev-app-cluster
SERVICE_NAME=RRC-Dev-FargateStack-RRCDevFargateService6A67F136-ZiSupmTSE7nr
TASK_DEFINITION_NAME=arn:aws:ecs:ap-south-1:919620897356:task-definition/RRCDevFargateStackRRCDevtaskdefinition41139C05:14
# arn:aws:ecs:ap-south-1:919620897356:task-definition/RRCDevFargateStackRRCDevtaskdefinition41139C05:14

## stop docker
# docker stop ${DOCKER_IMG_APP_NAME}

## Remove docker container
# docker rm -f ${DOCKER_IMG_APP_NAME}

## Remove docker image containers
# docker rmi -f $(docker images ${DOCKER_IMG_APP_NAME} -q)


# Build docker containers
# docker build --platform=linux/amd64 -t ${DOCKER_IMG_APP_NAME}:${DOCKER_IMG_APP_VER} . 


aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 919620897356.dkr.ecr.ap-south-1.amazonaws.com


docker tag ${DOCKER_IMG_APP_NAME}:${DOCKER_IMG_APP_VER} 919620897356.dkr.ecr.ap-south-1.amazonaws.com/my-todo-nextjs-app:latest


docker push 919620897356.dkr.ecr.ap-south-1.amazonaws.com/my-todo-nextjs-app:latest


aws ecs update-service --cluster $CLUSTER_NAME --service $SERVICE_NAME --task-definition $TASK_DEFINITION_NAME --force-new-deployment

