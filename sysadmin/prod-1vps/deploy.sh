#!/bin/bash

APP_DIR="/Users/ian/Documents/development/wynno/wynno"

cd $APP_DIR/sysadmin/dev

echo ""
echo "Deploying code to wynno-prod server:"
echo ""

ansible-playbook -i production upgrade_app_code.yml --ask-vault-pass -vvvv -e ansible_ssh_port=202
