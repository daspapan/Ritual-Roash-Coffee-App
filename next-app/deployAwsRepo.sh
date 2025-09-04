#!/bin/sh
set -x 

source .env



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

