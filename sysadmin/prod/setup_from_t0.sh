#!/bin/bash
# Script for creating a completely fresh production version of wynno

# Generate new RSA keypairs for each server
while read hostname; do
  ssh-keygen -t rsa -f ./keys/$hostname
done < hostnames

# Use Vagrant to dynamically generate the production inventory file and actually provision the DigitalOcean VMs
# TODO

# Update dist/lib/config/keys.json with addresses of servers
# or else set environment variables on each server as necessary with addresses of servers they need to talk to
# and update app to use these env variables
# TODO

# Run the main Ansible playbook
#ansible-playbook -i production site.yml -e ansible_ssh_port=22
# we provide the extra variable of ansible_ssh_port set to 22 so that the first 

# point Amazon Route 53 to the address of the nginx server
# TODO
