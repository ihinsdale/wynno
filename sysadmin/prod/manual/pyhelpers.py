import json
import requests
import os

preexisting_droplets = json.load(open('preexisting_droplets.json'))
new_droplets = json.load(open('new_droplets_config.json'))

def check_preexisting_droplet_namespace():
  """ Checks the hostnames of the new droplets to be created as specified in new_droplets_config.json,
      against the preexisting droplets. """
  for hostname in new_droplets:
    if hostname in preexisting_droplets:
      raise Exception("Droplet with hostname %s already exists." % hostname)

def create_hostnames_file():
  """ Creates a simple file with one hostname on each line, for each new droplet. For convenient use in the bash shell. """
  with open('hostnames', 'w') as outfile:
    for hostname in new_droplets:
      outfile.write(hostname + '\n')

def delete_samenamed_keys():
  """ Calls the DO API to delete all public keys already existing with DO that share a name with
      the new droplets that are about to be created. """
  my_version_of_preexisting_keys = {}
  payload = {'client_id': os.environ['DO_CLIENT_ID'], 'api_key': os.environ['DO_API_KEY']}
  r = requests.get('https://api.digitalocean.com/ssh_keys/', params=payload)
  preexisting_keys = r.json()['ssh_keys']
  for each in preexisting_keys:
    my_version_of_preexisting_keys[each['name']] = each['id']
  for hostname in new_droplets:
    if hostname in my_version_of_preexisting_keys:
      print "Now removing public key named %s from DO." % hostname
      r = requests.get('https://api.digitalocean.com/ssh_keys/' + str(my_version_of_preexisting_keys[hostname]) + '/destroy/?client_id=' + os.environ['DO_CLIENT_ID'] + '&api_key=' + os.environ['DO_API_KEY'])
      if r.json()['status'] != 'OK':
        raise Exception("There was a problem removing the key.")
      else:
        print "Key successfully removed."

def upload_keys():
  """ Uploads same-named public keys for all new hostnames to DO. """
  key_ids = {}
  for hostname in new_droplets:
    with open(os.path.abspath(os.path.join(os.path.dirname(__file__), '../keys/' + hostname + '.pub')), 'r') as key_file:
      payload = {'name': hostname, 'ssh_pub_key': key_file.readline(), 'client_id': os.environ['DO_CLIENT_ID'], 'api_key': os.environ['DO_API_KEY']}
    r = requests.get('https://api.digitalocean.com/ssh_keys/new/', params=payload)
    res_json = r.json()
    if res_json['status'] != 'OK':
      raise Exception("There was a problem adding the %s key." % hostname)
    else:
      print "Successfully added the %s key." % hostname
      key_ids[hostname] = res_json['ssh_key']['id']
  with open('hostname_ssh_key_ids.json', 'w') as outfile:
    json.dump(key_ids, outfile)

def create_droplets():
  """ Creates a new droplet for each host in hosts_and_ssh_key_ids.json, which is created by upload_keys().
      Therefore should be called after upload_keys().
      Current default settings involve the  """
  hostname_ssh_key_ids = json.load(open('hostname_ssh_key_ids.json'))
  print hostname_ssh_key_ids
  # for host in hostname_ssh_key_ids:
  #   payload = {'name': host, 'ssh_pub_key': key_file.readline(), 'client_id': os.environ['DO_CLIENT_ID'], 'api_key': os.environ['DO_API_KEY']}
  #   r = requests.get('https://api.digitalocean.com/ssh_keys/new/', params=payload)
  #   if r.json()['status'] != 'OK':
  #     raise Exception("There was a problem adding the " + host + " key.")
  #   else:
  #     print "Successfully added the " + host + " key."
