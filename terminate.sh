#!/bin/bash
set -x



docker-compose -f next-app/docker-compose.yaml kill 2>&1
docker-compose -f next-app/docker-compose.yaml down --volumes 2>&1
