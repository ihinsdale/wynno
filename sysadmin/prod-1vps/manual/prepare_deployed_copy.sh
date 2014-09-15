#!/bin/bash
set -e # Exit the script immediately upon error

# This script mimics, on the local development machine, the creation/updating of the wynno-prod-admin
# repository and the app json keys as if the 1-VPS production deployment used a wynno-gateway
# instance (the 6-VPS deployment used a wynno-gateway instance, and the 1-VPS deployment
# is adapted from that.)

PATH_TO_DEPLOYED="/Users/ian/Documents/development/wynno/deployed"
PATH_TO_WYNNO="/Users/ian/Documents/development/wynno/wynno"

# Get the production code for wynno

cd $PATH_TO_DEPLOYED
rm -rf wynno-prod-admin
git clone https://github.com/ihinsdale/wynno-prod-admin.git

# Copy the app key files

mkdir -p wynno-prod-admin/dist/lib/config/keys/prod
scp $PATH_TO_WYNNO/dist/lib/config/keys/prod/node.json $PATH_TO_DEPLOYED/wynno-prod-admin/dist/lib/config/keys/prod
scp $PATH_TO_WYNNO/dist/lib/config/keys/prod/python.json $PATH_TO_DEPLOYED/wynno-prod-admin/dist/lib/config/keys/prod
