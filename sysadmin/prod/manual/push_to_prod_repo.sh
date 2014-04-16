#!/bin/bash

# Script which commits the production code and sysadmin scripting which
# is needed on the wynno-gateway instance in order to deploy the app, to
# its own repo (wynno-prod-admin) which is then pushed to GitHub and
# can then be pulled from the wynno-gateway instance

# NOTE THAT BECAUSE RELATIVE PATHS ARE USED, THIS SCRIPT MUST BE RUN FROM
# THE IMMEDIATE FOLDER, I.E. WITHIN THE manual DIRECTORY

# The wynno-prod-admin repo consists of everything in /dist which is not
# gitignored and everything in sysadmin/prod which is not gitignored.

# First we copy over everything
# (Assumes wynno-prod-sysadmin dir is at same level as wynno dir)
cp -R ../../../dist ../../../../wynno-prod-admin
mkdir ../../../../wynno-prod-admin/sysadmin
cp -R ../../prod ../../../../wynno-prod-admin/sysadmin

# Then we remove files listed in gitignore
while read line; do
  rm -r ../../../../wynno-prod-admin/$line
done < ../../../.gitignore

cd ../../../../wynno-prod-admin
git add .
echo "Enter a commit message for this push to the wynno-prod-admin repo master branch:"
read commit_message
git commit -m "$commit_message"
git push origin master
# Admin will need to enter their GitHub credentials at this point
