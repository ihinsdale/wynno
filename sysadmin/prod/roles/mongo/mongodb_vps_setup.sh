#!/bin/bash
# To setup a VPS dedicated to hosting the MongoDB for wynno, running Ubuntu 12.04 LTS

#set -e # script will exit if any command throws an error

sudo apt-get update
sudo apt-get upgrade

sudo apt-get install build-essential
sudo apt-get install screen

# MongoDB

# Install 
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | sudo tee /etc/apt/sources.list.d/mongodb.list
sudo apt-get update
sudo apt-get install mongodb-10gen

# Set up Mongo db roles
cd ~
sudo mkdir db
cd db
sudo mkdir data
# Make a user:group called mongo that will own this ~/db/data folder
# so that mongo can make the journal folder as big as it needs to be 
# (previously, on EC2, an error was being thrown complaining there wasn't enough space)
sudo chown mongod:mongod ~/db/data
mongod --dbpath ~/db/data &
PID=$!
sleep 2
# First setup the userAdminAnyDatabase user, which should only be used to control user accounts, not actually read or write to the db
cd ~/setup_scripts
mongo < create_master_mongo_user.js
sleep 4
kill -INT $PID
mongod --auth --dbpath ~/db/data &
PID=$!
sleep 2
# Now create a user who will write to the db
mongo < create_write_mongo_user.js
sleep 4
kill -INT $PID

# Redis

# Install
#sudo apt-get install redis-server
# To set Redis to automatically start at boot:
#sudo update-rc.d redis_6379 defaults
# More 'proper' Redis install instructions can be found here: http://redis.io/topics/quickstart

# Configure security settings
# e.g. connections should only be accepted on the Mongo db port from the web servers and Python machine

# Set Mongo and Redis to start automatically at boot
# (TODO - make a shell script which launches them)

# Launch the Mongo server, which is now ready
sudo service mongodb stop # just in case it isn't already stopped...:)
mongod --auth --dbpath ~/db/data
