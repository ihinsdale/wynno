#!/bin/bash

# **For use with rolling_upgrade_app_code.yml**

# Script to record filenames that are in /apptemp which are also in
# /public after just running copy_code.yml, because these are files
# which we're not going to copy over into /public, and which we
# therefore don't want to remove from /public later

# Note that it uses a file called same_filenames created by note_same_filenames.sh

cd /home/deploy/apptemp

# Loop through js files
shopt -s nullglob # This line is important for making sure we don't erroneously
# do something with '*.js' if there are no js files in the dir
for f in *.js
do
  if [ -f /home/deploy/wynno/dist/public/scripts/$f ]
  then
    echo "${f}" >> same_filenames
  fi
done

# Loop through css files
for f in *.css
do
  if [ -f /home/deploy/wynno/dist/public/styles/$f ]
  then
    echo "${f}" >> same_filenames
  fi
done

# Loop through font files within the /fonts subdir
cd fonts
for f in *
do
  if [ -f /home/deploy/wynno/dist/public/styles/fonts/$f ]
  then
    echo "${f}" >> ../same_filenames
  fi
done
cd ..
