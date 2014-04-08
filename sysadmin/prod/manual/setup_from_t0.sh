#!/bin/bash
# Script for creating a completely fresh production version of wynno
set -e # Exit the script immediately upon error

# 1. Check that none of the hostnames of the DO droplets to be created already exist
#      So first we need to be able to get the current inventory from the DO API
#      If we don't already have the DigitalOcean inventory plugin for Ansible, get it:
if [ ! -f digital_ocean ]; then
#      Get the Ansible plugin which can dynamically generate an inventory file with my servers on DigitalOcean
  curl https://raw.githubusercontent.com/ansible/ansible/release1.5.4/plugins/inventory/digital_ocean.ini > digital_ocean.ini
  curl https://raw.githubusercontent.com/ansible/ansible/release1.5.4/plugins/inventory/digital_ocean.py > digital_ocean
#      Make the script executable
  chmod +x digital_ocean
fi
#      Install dopy if not already - required by digital_ocean
sudo pip list > pip_packages
if grep -q "dopy" pip_packages
then
  echo "dopy already installed."
else
  echo "Installing dopy."
  sudo pip install dopy
fi
#      Set API keys for DigitalOcean as env variables
export DO_API_KEY=38671d2f4cb02f0bb9b79a7af901e008
export DO_CLIENT_ID=e70b7609d9c9b65b4278752f63467502

#      Save JSON for all DO droplets in a file
python digital_ocean --list > preexisting_droplets.json

python -c "import pyhelpers; pyhelpers.check_preexisting_droplet_namespace()"

#rm preexisting_droplets.json

# 2. Generate new RSA keypairs for each server to be created
#      First generate a simple file with the hostnames to be created on separate lines
python -c "import pyhelpers; pyhelpers.create_hostnames_file()"
while read hostname; do
#      Now for each line, i.e. hostname, in hostnames, remove preexisting local public and private keys with the same name
  if [ -f ../keys/$hostname ]; then
    rm ../keys/$hostname
  fi
  if [ -f ../keys/$hostname.pub ]; then
    rm ../keys/$hostname.pub
  fi
#      And generate a new keypair with the name
  ssh-keygen -t rsa -f ../keys/$hostname
done < hostnames

# 3. Upload the just-created public keys to DO
#      First delete any keys that have the same names as the hostnames that will be created
#      We'll use a Python script to do the actual deleting--it's easier to work with JSON in Python
#      We need to install the requests library if it doesn't already exist
if grep -q "requests" pip_packages
then
  echo "requests Python library already installed."
else
  echo "Installing requests Python library."
  sudo pip install requests
fi
#      Now we can do the deleting
python -c "import pyhelpers; pyhelpers.delete_samenamed_keys()"

#      With the key namespace clear, upload the new public keys
python -c "import pyhelpers; pyhelpers.upload_keys()"

# 4. Create the new droplets
python -c "import pyhelpers; pyhelpers.create_droplets()"

# 5. Generate the inventory file based on these new droplets
#ansible -m ping -u root -i digital_ocean all # Cf. http://sendgrid.com/blog/ansible-and-digital-ocean/



# Update dist/lib/config/keys.json with addresses of servers
# or else set environment variables on each server as necessary with addresses of servers they need to talk to
# and update app to use these env variables
# TODO

# Run the main Ansible playbook
#ansible-playbook -i production site.yml -e ansible_ssh_port=22
# we provide the extra variable of ansible_ssh_port set to 22 so that the first 

# point Amazon Route 53 to the address of the nginx server
# TODO
