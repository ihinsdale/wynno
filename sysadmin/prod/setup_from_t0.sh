#!/bin/bash
# Script for creating a completely fresh production version of wynno

# Generate new RSA keypairs for each server
# TODO write loop that loops through server hostnames and creates fresh keypair with:
ssh-keygen -t rsa
/Users/ian/Documents/development/wynno/wynno/sysadmin/prod/keys/{{hostname}} [and enter]
[enter]
[enter]

# Use Vagrant to dynamically generate the production inventory file and actually provision the DigitalOcean VMs
# TODO

# Run the main Ansible playbook
ansible-playbook -i production site.yml