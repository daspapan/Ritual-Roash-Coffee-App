#!/bin/sh
set -x 

source .env

#stop docker
docker stop ${DOCKER_IMG_APP_NAME}

# Remove docker container
docker rm -f ${DOCKER_IMG_APP_NAME}

# Remove docker image containers
docker rmi -f $(docker images ${DOCKER_IMG_APP_NAME} -q)


# Build docker containers
docker build --platform=linux/amd64 -t ${DOCKER_IMG_APP_NAME}:${DOCKER_IMG_APP_VER} . 


aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 919620897356.dkr.ecr.ap-south-1.amazonaws.com


# Bring up docker containers
docker-compose -f docker-compose.yaml up -d todoapp
# docker-compose -f docker-compose.yaml up -d ${DOCKER_IMG_APP_NAME}
# docker run -it -p 3001:3001 ${DOCKER_IMG_APP_NAME}

#
# aws ecr-public get-login-password --region ap-south-1 | docker login --username AWS --password-stdin public.ecr.aws
# aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 919620897356.dkr.ecr.ap-south-1.amazonaws.com


# docker volume prune
# docker system prune --volumes --all

