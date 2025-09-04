#!/bin/bash
set -x

rm -R next-app/public/uploads
mkdir -p next-app/public/uploads

docker-compose -f next-app/docker-compose.yaml kill 2>&1
docker-compose -f next-app/docker-compose.yaml down --volumes 2>&1

docker volume prune --all
# docker system prune --volumes --all
