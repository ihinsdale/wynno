#!/bin/bash
# Simple setup.sh for configuring Ubuntu 12.04 LTS EC2 instance

sudo apt-get update
sudo apt-get install build-essential

# Install MongoDB
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | sudo tee /etc/apt/sources.list.d/mongodb.list
sudo apt-get update
sudo apt-get install mongodb-10gen

# Install Python dependencies
sudo install python-setuptools
sudo easy_install pip

sudo apt-get install libzmq-dev
sudo pip install pyzmq

sudo pip install pymongo

sudo pip install -U numpy
sudo pip install -U pyyaml nltk

sudo pip install zerorpc

# Install nvm: node-version manager
# https://github.com/creationix/nvm
sudo apt-get install -y git
sudo apt-get install -y curl
curl https://raw.github.com/creationix/nvm/master/install.sh | sh

# Load nvm and install latest production node
source $HOME/.nvm/nvm.sh
nvm install v0.10.21
nvm use v0.10.21

# Install jshint to allow checking of JS code within emacs
# http://jshint.com/
# npm install -g jshint

# Install rlwrap to provide libreadline features with node
# See: http://nodejs.org/api/repl.html#repl_repl
# sudo apt-get install -y rlwrap

# Install emacs24
# https://launchpad.net/~cassou/+archive/emacs
#sudo add-apt-repository -y ppa:cassou/emacs
#sudo apt-get -qq update
#sudo apt-get install -y emacs24-nox emacs24-el emacs24-common-non-dfsg

# Install Heroku toolbelt
# https://toolbelt.heroku.com/debian
wget -qO- https://toolbelt.heroku.com/install-ubuntu.sh | sh

# git pull and install dotfiles as well
# cd $HOME
# if [ -d ./dotfiles/ ]; then
#     mv dotfiles dotfiles.old
# fi
# if [ -d .emacs.d/ ]; then
#     mv .emacs.d .emacs.d~
# fi
# git clone https://github.com/startup-class/dotfiles.git
# ln -sb dotfiles/.screenrc .
# ln -sb dotfiles/.bash_profile .
# ln -sb dotfiles/.bashrc .
# ln -sb dotfiles/.bashrc_custom .
# ln -sf dotfiles/.emacs.d .