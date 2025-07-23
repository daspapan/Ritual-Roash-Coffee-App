#!/bin/bash
set -x

source ${PWD}/next-app/.env

echo $DATABASE_URL

sleep 5

docker-compose -f next-app/docker-compose.yaml up -d postgres pgadmin4 app

./monit.sh
