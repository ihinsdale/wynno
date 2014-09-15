#!/bin/bash
# Script for creating infrastructure for fresh production version of wynno
set -e # Exit the script immediately upon error


# 1. Check if the hostnames of the DO droplets to be created already exist

#      Set API keys for DigitalOcean as env variables
export DO_API_KEY=38671d2f4cb02f0bb9b79a7af901e008
export DO_CLIENT_ID=e70b7609d9c9b65b4278752f63467502
export DO_TOKEN=7fbe920982a9332935fc47fc403f01663dec3eef3564274f571177a73b9188e5

#      So first we need to be able to get an inventory of the existing droplets from the DO API
#      Which means first we need to install the requests library if it doesn't already exist
#      So we need pip, which may not come with the system Python install if we're on Ubuntu
if [ "${OSTYPE}" == "linux-gnu" ]
then
  sudo apt-get install python-pip
  sudo pip freeze > pip_packages
else
  sudo pip list > pip_packages
fi

if grep -q "requests" pip_packages
then
  echo "requests Python library already installed."
else
  echo "Installing requests Python library."
  sudo pip install requests
fi
python -c "import pyhelpers; pyhelpers.fetch_preexisting_droplets()"

#      Check if the droplet namespace is clear, i.e. no droplets already exist with hostnames of those to be created
RESULT=`python -c "import pyhelpers; print pyhelpers.droplet_namespace_is_clear()"`

#      If namespace isn't clear, allow the user to destroy the same-named preexisting droplets
if [ $RESULT -eq 0 ]; then
  echo "One or more preexisting droplets shares a name with the new droplets."
  echo "Do you wish to destroy the same-named preexisting droplets? If so, enter YES"
  read first_input
  if [ $first_input == "YES" ]
  then
    echo "Are you absolutely sure? If so, enter YES"
    read second_input
    if [ $second_input == "YES" ]
    then
      python -c "import pyhelpers; print pyhelpers.clear_droplet_namespace()"
    else
      echo "Preexisting droplets untouched. Exiting script."
      exit 2
    fi
  else
    echo "Preexisting droplets untouched. Exiting script."
    exit 2
  fi
fi

# 2. Generate new RSA keypairs for each server to be created

#      First generate a simple file with the hostnames to be created on separate lines
python -c "import pyhelpers; pyhelpers.create_hostnames_file()"
while read hostname; do
#      Now for each line, i.e. hostname, in hostnames, remove preexisting local public and private keys with the same name
  if [ -f ~/.ssh/$hostname ]; then
    rm ~/.ssh/$hostname
  fi
  if [ -f ~/.ssh/$hostname.pub ]; then
    rm ~/.ssh/$hostname.pub
  fi
#      And generate a new keypair with the name
  ssh-keygen -t rsa -f ~/.ssh/$hostname -N ''
done < hostnames

# 3. Upload the just-created public keys to DO

#      First delete any keys that have the same names as the hostnames that will be created
#      We'll use a Python script to do the actual deleting--it's easier to work with JSON in Python
python -c "import pyhelpers; pyhelpers.delete_samenamed_keys()"

#      With the key namespace clear, upload the new public keys
python -c "import pyhelpers; pyhelpers.upload_keys()"


# 4. Create the new droplets

python -c "import pyhelpers; pyhelpers.create_droplets()"


# 5. Generate the inventory file based on these new droplets

#      Wait a few seconds for the new droplets to all get assigned IP addresses
echo "Waiting three minutes for creation of new DO droplets to finish."
sleep 180

#      (The Ansible digital_ocean plugin was able on my Mac to do this using:
#          python digital_ocean --droplets | python -mjson.tool > dynamic_inventory.json
#      However this command encountered an error when running this script on Ubuntu on the wynno-gateway VPS.
#      So I have just created a helper function to create my own dynamic_inventory.json
#      Which looks exactly the same. Except my own dynamic_inventory also only includes
#      the droplets which are newly created, i.e. the ones in new_droplets_config.json)
python -c "import pyhelpers; print pyhelpers.get_dynamic_new_inventory()" | python -mjson.tool > dynamic_inventory.json

#      Next use that JSON file to create the production inventory file which Ansible will use
#python -c "import pyhelpers; pyhelpers.create_ansible_production_file()"

# 6. Update json file in dist/lib/keys/prod with IP addresses (public or private as necessary) of droplets

#      Keeping the specification of server addresses within json files, as opposed to using Ansible to set environment
#      variables on each server which are then read by the application, allows us not to need a shell script for the dev version
#      of the app. Granted, we still have to set the NODE_ENV variable. The json approach seems preferable now because it makes it very easy
#      to check what variables the app is using, and because the app is currently architected to use the json approach.

python -c "import pyhelpers; pyhelpers.update_json_keys_ips()"

#      N.B. Updating of IP addresses for upstream nodeservers in nginx.conf file is done using Ansible's template feature
#      It allows handy looping over each nodeserver. We could have instead updated the nginx.conf file using a shell script
#      and the dynamic_inventory.json file. So we're combining approaches: using Ansible jinja templating where that's convenient
#      and using json files for the rest of the intra-app communication. Do I contradict myself? Very well then, I contradict myself.
#      The app is large, it contains multitudes.
