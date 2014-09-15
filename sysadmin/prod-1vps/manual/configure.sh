#!/bin/bash
# Script for configuring infrastructure created by create_infra.sh. This deploys wynno.
set -e # Exit the script immediately upon error

# 7. Run the main Ansible playbook, configuring all the servers

#      First we clear out the IP addresses of each server from the known_hosts file
#      This is necessary because DigitalOcean tends to reuse IP addresses

echo "Are you configuring infrastructure created by create_infra.sh? If so, enter YES"
read first_input
if [ $first_input == "YES" ]
then
  python -c "import pyhelpers; pyhelpers.create_ips_file()"
else
  echo "Leaving ips file as-is."
fi

while read line; do
  hostname="$( cut -d ' ' -f 1 <<< "$line" )"
  ip="$( cut -d ' ' -f 2 <<< "$line" )"
  ssh-keygen -f ~/.ssh/known_hosts -R $ip
done < ips

#      Now we run the playbook
echo "If this is a real live production deployment (as opposed to a practice setup"
echo "of a production deployment), admin will want to verify the fingerprints of each"
echo "server before answering 'yes' to trust each host at the start of the playbook."
ansible-playbook -i ../production ../site.yml --ask-vault-pass -vvvv


# 8. With the servers up and ready, use AWS Route 53 to point the DNS record for (www.)wynno.com to the nginx1 droplet

#      Actually, this doesn't need to be automated, because pointing the DNS records to the correct IP should be a
#      one-time deal. That's because I have agreed with DO that 192.241.189.84 is reserved to my account. So the DNS
#      records can permanently point there, and whenever I create a new nginx droplet, I just need to have DO support
#      assign it that IP address.
