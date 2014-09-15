#!/bin/bash
# Script for setting up the public-facing wynno server, powered by nginx

# Set the hostname
echo "wynno-prod" > /etc/hostname
hostname -F /etc/hostname
hostname # verify that hostname has been set correctly

# Set the server time zone and verify
dpkg-reconfigure tzdata
date

# Update packages and kernel
sudo apt-get update
sudo apt-get upgrade

# Install and configure firewall via ufw
sudo apt-get install ufw
sudo ufw status
sudo ufw default deny incoming # set default to deny all incoming connections
sudo ufw default allow outgoing # allow outgoing connections
sudo ufw allow 202/tcp # for ssh connection. can add “from <ip address>” to restrict to my local ip if static
sudo ufw allow 80/tcp # for HTTP connections
sudo ufw allow 443/tcp # for HTTPS connections
sudo ufw enable
sudo ufw status verbose

# Install fail2ban
sudo apt-get install fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local # make a copy of the fail2ban config file
sudo nano /etc/fail2ban/jail.local
#[add local ip address separated by a space, to the line called ignoreip, in order to whitelist myself]
#[check what port is...if it’s 22 by default, that should be changed to 202 because that’s the new ssh port.]
#[save and close]
sudo service fail2ban restart

# Set up user who will ssh in in future
adduser chilladmin
usermod -a -G sudo chilladmin

# Set up key-based authentication; 
# TODO 
# Cf. https://www.digitalocean.com/community/articles/how-to-set-up-ssh-keys--2

# Disable remote root login and change the SSH port
sudo nano /etc/ssh/sshd_config
#[set Port to 202, the new ssh port (rather than default 22. The SSH port should always be < 1024, so that it is privileged]
#[set PermitRootLogin to No]
#[save the file]
sudo service ssh restart

# Now terminate connection and ssh back in using new user and key-based auth
exit
