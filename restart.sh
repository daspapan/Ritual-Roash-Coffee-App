#!/bin/bash
set -x

source ${PWD}/next-app/.env

docker-compose -f next-app/docker-compose.yaml up -d postgres pgadmin4 

./monit.sh
