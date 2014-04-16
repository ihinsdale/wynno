#!/bin/bash

# NOTE NOT ACTUALLY USING THIS FILE AS PART OF DEV WORKFLOW (4/16/14)

# Script which commits a "staging" version of the wynno code, i.e. the
# dist folder but which will run in a NODE_ENV=dev environment

# NOTE THAT BECAUSE RELATIVE PATHS ARE USED, THIS SCRIPT MUST BE RUN FROM
# THE IMMEDIATE FOLDER, I.E. WITHIN THE manual DIRECTORY

# The wynno-staging repo consists of everything in /dist which is not gitignored

# First we copy over everything
# (Assumes wynno-staging dir is at same level as wynno dir)
cp -R ../../dist ../../../wynno-staging

# Then we remove files listed in gitignore
while read line; do
  rm -r ../../../wynno-staging/$line
done < ../../.gitignore

cd ../../../wynno-staging
git add .
echo "Enter a commit message for this push to the wynno-staging repo master branch:"
read commit_message
git commit -m "$commit_message"
git push origin master
# Admin will need to enter their GitHub credentials at this point
