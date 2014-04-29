#!/bin/bash

# Script which commits the production code and sysadmin scripting which
# is needed on the wynno-gateway instance in order to deploy the app, to
# its own repo (wynno-prod-admin) which is then pushed to GitHub and
# can then be pulled from the wynno-gateway instance

# Set the paths here to the wynno (i.e. the source) and wynno-prod-admin repos

PATH_TO_WYNNO_PROD_ADMIN_REPO="/Users/ian/Documents/development/wynno/wynno-prod-admin"
PATH_TO_TEMP_WYNNO_CLONE_DIR="/Users/ian/Documents/development/wynno/temp-wynno-clone"
PATH_TO_WYNNO_SOURCE_REPO="${PATH_TO_TEMP_WYNNO_CLONE_DIR}/wynno"

# The wynno-prod-admin repo consists of everything in /dist which is not
# gitignored and everything in sysadmin/prod which is not gitignored.

# First we clear out the existing files in wynno-prod-admin (except for .git of course)
# This is necessary so that files which are removed from the wynno repository
# are also removed in the wynno-prod-admin repo
rm $PATH_TO_WYNNO_PROD_ADMIN_REPO/README.md
rm -rf $PATH_TO_WYNNO_PROD_ADMIN_REPO/dist
rm -rf $PATH_TO_WYNNO_PROD_ADMIN_REPO/sysadmin

# Next we clone the wynno repository into /temp-wynno-clone
# Cloning wynno insures that what gets put in wynno-prod-admin is the last commit
# to the master branch of the wynno repo. This eliminates the risk of copying to
# wynno-prod-admin any uncommitted or non-master-branch changes that have been made
# to the wynno repo
cd $PATH_TO_TEMP_WYNNO_CLONE_DIR
git clone git@github:ihinsdale/wynno.git # note this requires an entry for HostName github in ~/.ssh/config
cd wynno
git checkout master

# Next we copy over the necessary files from our temp-wynno-clone
cp -R $PATH_TO_WYNNO_SOURCE_REPO/dist $PATH_TO_WYNNO_PROD_ADMIN_REPO
mkdir $PATH_TO_WYNNO_PROD_ADMIN_REPO/sysadmin
cp -R $PATH_TO_WYNNO_SOURCE_REPO/sysadmin/prod $PATH_TO_WYNNO_PROD_ADMIN_REPO/sysadmin

# Then we remove files listed in gitignore
# (Which is actually unnecessary because since we are using a cloned copy of wynno repo as the source
# and that cloned copy hasn't had any gitignored things copied into it, there are no files that will be
# removed by this step. Still, we'll leave it just for security.)
while read line; do
  rm -r $PATH_TO_WYNNO_PROD_ADMIN_REPO/$line
done < $PATH_TO_WYNNO_SOURCE_REPO/.gitignore

cd $PATH_TO_WYNNO_PROD_ADMIN_REPO
git add --all .
last_line_of_master_log=`tail -r -n 1 $PATH_TO_WYNNO_SOURCE_REPO/.git/logs/refs/heads/master`
last_commit_hash="$( cut -d ' ' -f 2 <<< $last_line_of_master_log )"
git commit -m "Through master commit ${last_commit_hash}"
git push origin master
