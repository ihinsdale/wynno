#!/bin/bash
# Script for creating a completely fresh production version of wynno
set -e # Exit the script immediately upon error


# 1. Check if the hostnames of the DO droplets to be created already exist

#      Set API keys for DigitalOcean as env variables
export DO_API_KEY=38671d2f4cb02f0bb9b79a7af901e008
export DO_CLIENT_ID=e70b7609d9c9b65b4278752f63467502

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
python -c "import pyhelpers; pyhelpers.delete_samenamed_keys()"

#      With the key namespace clear, upload the new public keys
python -c "import pyhelpers; pyhelpers.upload_keys()"


# 4. Create the new droplets

python -c "import pyhelpers; pyhelpers.create_droplets()"


# 5. Generate the inventory file based on these new droplets

#      Wait a few seconds for the new droplets to all get assigned IP addresses
echo "Waiting two minutes for creation of new DO droplets to finish."
sleep 2m

#      (The Ansible digital_ocean plugin was able on my Mac to do this using:
#          python digital_ocean --droplets | python -mjson.tool > dynamic_inventory.json
#      However this command encountered an error when running this script on Ubuntu on the wynno-gateway VPS.
#      So I have just created a helper function to create my own dynamic_inventory.json
#      Which looks exactly the same. Except my own dynamic_inventory also only includes
#      the droplets which are newly created, i.e. the ones in new_droplets_config.json)
python -c "import pyhelpers; print pyhelpers.get_dynamic_new_inventory()" | python -mjson.tool > dynamic_inventory.json

#      Next use that JSON file to create the production inventory file which Ansible will use
python -c "import pyhelpers; pyhelpers.create_ansible_production_file()"

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


# 7. Run the main Ansible playbook, configuring all the servers

#      We'll first verify that when we SSH into the new servers, we're SSHing
#      in to the ones we think we are
python -c "import pyhelpers; pyhelpers.create_ips_file()"
while read line; do
  hostname="$( cut -d ' ' -f 1 <<< "$line" )"
  ip="$( cut -d ' ' -f 2 <<< "$line" )"
#      First we clear out the IP addresses of each server from the known_hosts file
#      This is necessary because DigitalOcean tends to reuse IP addresses
  ssh-keygen -f ~/.ssh/known_hosts -R $ip
#      Now try to SSH in, and compare the fingerprint to what we expect given the
#      public key from the keypair we created
  echo "Checking ${hostname}'s public key..."
  keyscan="`ssh-keyscan -p 22 $ip 2>/dev/null`"
  server_pub_key="$( cut -d ' ' -f 2- <<< "$keyscan" )"
  my_pub_key="$(cat ../keys/hostname.pub)"
  if [ server_pub_key == my_pub_key ]
  then
    echo "It matches the key we created."
    echo 'yes' | ssh -p 22 -i ../keys/$hostname -T root@$ip
  else
    echo "Whoa! DANGER: ${hostname}'s public key retrieved via ssh-keyscan did not match the public key we created."
    exit 3
  fi
done < ips

exit

#      Now we run the playbook
ansible-playbook -i ../production ../site.yml --ask-vault-pass -vvvv


# 8. With the servers up and ready, use AWS Route 53 to point the DNS record for (www.)wynno.com to the nginx1 droplet

#      Actually, this doesn't need to be automated, because pointing the DNS records to the correct IP should be a
#      one-time deal. That's because I have agreed with DO that 192.241.189.84 is reserved to my account. So the DNS
#      records can permanently point there, and whenever I create a new nginx droplet, I just need to have DO support
#      assign it that IP address.
