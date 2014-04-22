#!/bin/bash

# Script which commits the production code and sysadmin scripting which
# is needed on the wynno-gateway instance in order to deploy the app, to
# its own repo (wynno-prod-admin) which is then pushed to GitHub and
# can then be pulled from the wynno-gateway instance

# Set the paths here to the wynno and wynno-prod-admin repos
PATH_TO_WYNNO_PROD_ADMIN_REPO="/Users/ian/Documents/development/wynno/wynno-prod-admin"
PATH_TO_WYNNO_REPO="/Users/ian/Documents/development/wynno/wynno"

# The wynno-prod-admin repo consists of everything in /dist which is not
# gitignored and everything in sysadmin/prod which is not gitignored.

# First we clear out the existing files in wynno-prod-admin (except for .git of course)
# This is necessary so that files which are removed from the wynno repository
# are also removed in the wynno-prod-admin repo
rm $PATH_TO_WYNNO_PROD_ADMIN_REPO/README.md
rm -rf $PATH_TO_WYNNO_PROD_ADMIN_REPO/dist
rm -rf $PATH_TO_WYNNO_PROD_ADMIN_REPO/sysadmin

# Next we copy over everything
cp -R $PATH_TO_WYNNO_REPO/dist $PATH_TO_WYNNO_PROD_ADMIN_REPO
mkdir $PATH_TO_WYNNO_PROD_ADMIN_REPO/sysadmin
cp -R $PATH_TO_WYNNO_REPO/sysadmin/prod $PATH_TO_WYNNO_PROD_ADMIN_REPO/sysadmin

# Then we remove files listed in gitignore
while read line; do
  rm -r $PATH_TO_WYNNO_PROD_ADMIN_REPO/$line
done < $PATH_TO_WYNNO_REPO/.gitignore

cd $PATH_TO_WYNNO_PROD_ADMIN_REPO
git add --all .
echo "Enter a commit message for this push to the wynno-prod-admin repo master branch:"
read commit_message
git commit -m "$commit_message"
git push origin master
