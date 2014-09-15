#!/bin/bash

# Turn off password authentication
sudo nano /etc/ssh/sshd_config
#[set ChallengeResponseAuthentication to no]
#[set PasswordAuthentication to no]
#[set UsePAM to no]
#[set PubkeyAuthentication to yes]
sudo service ssh restart

# Install nginx
sudo -s
nginx=stable # use nginx=development for latest development version
add-apt-repository ppa:nginx/$nginx
apt-get update 
apt-get install nginx

exit
