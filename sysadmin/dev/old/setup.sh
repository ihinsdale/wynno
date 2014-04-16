#!/bin/bash
# Simple setup.sh for configuring Ubuntu 12.04 LTS VPS for wynno

# set the NODE_ENV environment variable to 'dev'
export NODE_ENV=dev

sudo apt-get update
sudo apt-get upgrade
sudo apt-get install build-essential
sudo apt-get install screen

sudo apt-get install fail2ban

# Install MongoDB
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | sudo tee /etc/apt/sources.list.d/mongodb.list
sudo apt-get update
sudo apt-get install mongodb-10gen

# Install Redis
# per https://www.digitalocean.com/community/articles/how-to-install-and-use-redis
sudo apt-get install redis-server

# Install Python dependencies
sudo apt-get install python-setuptools
sudo apt-get install python-pip
sudo apt-get install python-dev

sudo pip install virtualenv

# create environment for python installations
virtualenv --distribute wynno-env
cd wynno
source bin/activate

sudo apt-get install libzmq-dev
sudo pip install pyzmq

sudo pip install pymongo

sudo pip install -U numpy
sudo apt-get install python-scipy
sudo pip install -U pyyaml nltk

sudo apt-get install libevent-dev
sudo pip install zerorpc

sudo pip install -U scikit-learn

sudo apt-get install -y python-pygraphviz
sudo apt-get install python-pydot # don't use pip for this, there's a bug

sudo pip install unidecode


# Install additional nltk packages
python
import nltk
nltk.download()
d
punkt
d
stopwords
q
exit()

# Install nvm: node-version manager
# https://github.com/creationix/nvm
sudo apt-get install -y git
sudo apt-get install -y curl
curl https://raw.github.com/creationix/nvm/master/install.sh | sh

# Load nvm and install latest production node
source ~/.nvm/nvm.sh
nvm install v0.10.26
nvm use v0.10.26
# Install node dependencies
npm install -g

# Install nginx
sudo apt-get install nginx

# Next
# Setup DB accounts
# Copy nginx.conf to its necessary /etc location and restart nginx
# Open up screen session and make sure redis is running, Mongo, Python, node, nginx
