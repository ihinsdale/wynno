#!/bin/bash
# Simple setup.sh for configuring Ubuntu 12.04 LTS EC2 instance

sudo apt-get update
sudo apt-get install build-essential
sudo apt-get install screen
sudo apt-get install lvm2
sudo apt-get install mdadm

# Install MongoDB
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | sudo tee /etc/apt/sources.list.d/mongodb.list
sudo apt-get update
sudo apt-get install mongodb-10gen

# Install Python dependencies
sudo apt-get install python-setuptools
sudo apt-get install python-pip
sudo apt-get install python-dev

sudo apt-get install libzmq-dev
sudo pip install pyzmq

sudo pip install pymongo

sudo pip install -U numpy
sudo pip install -U pyyaml nltk

sudo apt-get install libevent-dev
sudo pip install zerorpc

sudo pip install -U scikit-learn

# Install additional nltk packages
# python
# import nltk
# nltk.download()
# d
# punkt
# stopwords

# Install nvm: node-version manager
# https://github.com/creationix/nvm
sudo apt-get install -y git
sudo apt-get install -y curl
curl https://raw.github.com/creationix/nvm/master/install.sh | sh

# Load nvm and install latest production node
source $HOME/.nvm/nvm.sh
sudo nvm install v0.10.22
sudo nvm use v0.10.22


