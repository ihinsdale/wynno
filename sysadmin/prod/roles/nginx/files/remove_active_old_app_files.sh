#!/bin/bash

# **For use with rolling_upgrade_app_code.yml**

# Script to delete files in the old app code files in the apptemp directory that
# were actually copied into the /public directory served to the public
# i.e. note it's important that we don't want to remove files with the same names as
# files that were present in /public originally

cd /home/deploy/apptemp

# Loop through js files
shopt -s nullglob # This line is important for making sure we don't erroneously
# do something with '*.js' if there are no js files in the dir
for f in *.js
do
  if [ ! `grep -q "${f}" same_filenames` ]
  then
    echo "Removing ${f} from /scripts because it's obsolete app code"
    sudo rm /home/deploy/wynno/dist/public/scripts/$f
  else
    echo "Not removing file ${f} from /scripts because it's the latest app code"
  fi
done

# Loop through css files
for f in *.css
do
  if [ ! `grep -q "${f}" same_filenames` ]
  then
    echo "Removing ${f} from /styles because it's obsolete app code"
    sudo rm /home/deploy/wynno/dist/public/styles/$f
  else
    echo "Not removing file ${f} from /styles because it's the latest app code"
  fi
done

# Loop through font files within the /fonts subdir
cd fonts
for f in *
do
  if [ ! `grep -q "${f}" ../same_filenames` ]
  then
    echo "Removing ${f} from /styles/fonts because it's obsolete app code"
    sudo rm /home/deploy/wynno/dist/public/styles/fonts/$f
  else
    echo "Not removing file ${f} from /styles/fonts because it's the latest app code"
  fi
done
cd ..
