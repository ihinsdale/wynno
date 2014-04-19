#!/bin/bash

# Script for part 1 of setting up the VPS from which Ansible will be run to setup
# a fresh version of wynno and through which all SSH administration of wynno
# nodes must be done

# Update software
sudo apt-get update
sudo apt-get upgrade
sudo apt-get install linux-virtual # to install the packages that always get held back

# Install Git
sudo apt-get install git-core

# Install Ansible
sudo apt-get install python-software-properties
sudo apt-add-repository ppa:rquillo/ansible
sudo apt-get update
sudo apt-get install ansible
# Ansible (vault) needs a newer version of pycrypto
sudo apt-get install python-pip
sudo apt-get install build-essential
sudo apt-get install python-dev
sudo pip install pycrypto --upgrade

# Change the SSH port from 22 to 202
# (after this, will of course need to change SSH connection port on local machine to 202)
# (also need to update AWS security group so that only port 202 is open)
sudo sed -i 's/Port 22/Port 202/g' /etc/ssh/sshd_config
# Disallow root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/g' /etc/ssh/sshd_config
# Would have thought I should disable UsePAM like so:
#sudo sed -i 's/UsePAM yes/UsePAM no/g' /etc/ssh/sshd_config
# but doing so prevented me from being able to SSH back in on the new port 202, so I guess
# we'll ignore that for now. All the other password authentication settings for SSH are set to no.
# Restart SSH
sudo service ssh restart

# System needs reboot now (due to updating linux-virtual kernel I believe)
sudo reboot

# (Then SSH back in to this VPS on port 202,
# clone the wynno repo manually
# and run setup_from_t0.sh)
