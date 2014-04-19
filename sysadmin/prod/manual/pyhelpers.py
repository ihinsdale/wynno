import json
import requests
import os
from pprint import pprint
import copy

new_droplets_config = json.load(open('new_droplets_config.json'))
# For use in some of the helper functions, create a version of new_droplets_config that has no category level
new_droplets = {}
for category in new_droplets_config:
  for droplet in new_droplets_config[category]:
    new_droplets[droplet] = new_droplets_config[category][droplet]

def fetch_preexisting_droplets():
  payload = { 'client_id': os.environ['DO_CLIENT_ID'], 'api_key': os.environ['DO_API_KEY'] }
  r = requests.get('https://api.digitalocean.com/droplets/', params=payload)
  res_json = r.json()
  if res_json['status'] != 'OK':
    raise Exception("There was a problem getting the preexisting droplets.")
  else:
    # Convert array of droplet dicts received from DO into dict of droplet dicts
    droplets = {}
    for each in res_json['droplets']:
      droplets[each['name']] = copy.copy(each)
      del droplets[each['name']]['name'] # Remove the name key from the droplet dict
    with open('preexisting_droplets.json', 'w') as outfile:
      json.dump(droplets, outfile)

def droplet_namespace_is_clear():
  """ Checks whether there are any preexisting droplets with the same names as
      the hostnames of the new droplets to be created, as specified in new_droplets_config.json. """
  preexisting_droplets = json.load(open('preexisting_droplets.json'))
  for hostname in new_droplets:
    if hostname in preexisting_droplets:
      return 0
  return 1

def clear_droplet_namespace():
  """ Destroys any preexisting droplets that share names with the new droplets. """
  preexisting_droplets = json.load(open('preexisting_droplets.json'))
  for hostname in new_droplets:
    if hostname in preexisting_droplets:
      # Find the preexisting droplet's id
      droplet_id = preexisting_droplets[hostname]['id']
      # Destroy
      payload = {
        'scrub_data': True, # this becomes scrub_data=True in the request url, which DO seems to accept fine (as opposed to scrub_data=true,
        # for which the requests Python library would require the value of scrub_data here to actually be 'true', i.e. the lowercase string
        # representation of the boolean. Just going to trust that the DO server handles True and true equally well; it does at least reject
        # non-Boolean values. This wouldn't be so important if the thing being controlled here weren't *scrubbing the droplet data*.)
        'client_id': os.environ['DO_CLIENT_ID'],
        'api_key': os.environ['DO_API_KEY']
      }
      r = requests.get('https://api.digitalocean.com/droplets/' + str(droplet_id) + '/destroy/', params=payload)
      if r.json()['status'] != 'OK':
        raise Exception("There was a problem removing the preexisting %s droplet." % hostname)
      else:
        print "Preexisting %s droplet successfully destroyed." % hostname

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
  """ Creates a new droplet for each host in new_droplets_config.json. Uses hosts_and_ssh_key_ids.json, which is created by upload_keys(), to get public key ids for each new droplet.
      Therefore should be called after upload_keys(). """
  hostname_ssh_key_ids = json.load(open('hostname_ssh_key_ids.json'))
  for hostname in new_droplets:
    # Cf. https://developers.digitalocean.com/droplets/
    payload = {
      'name': hostname,
      'size_slug': new_droplets[hostname]['size_slug'],
      'image_slug': new_droplets[hostname]['image_slug'],
      'region_slug': new_droplets[hostname]['region_slug'],
      'ssh_key_ids': hostname_ssh_key_ids[hostname],
      'private_networking': new_droplets[hostname]['private_networking'],
      'backups_enabled': new_droplets[hostname]['backups_enabled'],
      'client_id': os.environ['DO_CLIENT_ID'],
      'api_key': os.environ['DO_API_KEY']
    }
    r = requests.get('https://api.digitalocean.com/droplets/new', params=payload)
    if r.json()['status'] != 'OK':
      raise Exception("There was a problem creating the %s droplet." % hostname)
    else:
      print "Successfully created the %s droplet." % hostname

def get_dynamic_new_inventory():
  """ Returns a JSON string (of an object with a droplets array) containing info about the new DO droplets. """
  payload = { 'client_id': os.environ['DO_CLIENT_ID'], 'api_key': os.environ['DO_API_KEY'] }
  r = requests.get('https://api.digitalocean.com/droplets/', params=payload)
  res_json = r.json()
  if res_json['status'] != 'OK':
    raise Exception("There was a problem getting the DO inventory.")
  else:
    results = { "droplets": [] }
    for each in res_json['droplets']:
      if each['name'] in new_droplets:
        results['droplets'].append(each)
    return json.dumps(results)

def create_ansible_production_file():
  """ Uses dynamic_inventory.json (which was generated outside, in shell script) to
      create Ansible production file with group names, ssh private key paths, etc. """
  dynamic_inventory = json.load(open('dynamic_inventory.json'))
  # Out of dynamic_inventory, make a dictionary with same info but with the new hostnames as keys
  droplets = {}
  for each in dynamic_inventory['droplets']:
    droplets[each['name']] = copy.copy(each)
    del droplets[each['name']]['name'] # Remove the name key from the droplet dict
  with open('dynamic_inventory_dict.json', 'w') as outfile:
    json.dump(droplets, outfile)
  with open('production', 'w') as outfile:
    print droplets
    for category in new_droplets_config:
      outfile.write('[' + category + 'servers]\n')
      for hostname in new_droplets_config[category]:
        print hostname
        outfile.write(hostname + '    ansible_ssh_host=' + droplets[hostname]['ip_address'] + '    ansible_ssh_private_key_file=../keys/' + hostname + '\n')
      outfile.write('\n')

def update_json_keys_ips():
  """ Adds appropriate private IPs of new droplets to the /dist/lib/config/keys/prod/ node.json and python.json files.
      Note we only add to the /dist folder because the /dist version is the only version that gets deployed (and
      that is partly because the nginx configuration even in the 'dev' environment is only set up to work with the /dist folder,
      not the dev versions of the code. """

  node_json_abs_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../dist/lib/config/keys/prod/node.json'))
  python_json_abs_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../dist/lib/config/keys/prod/python.json'))

  node_json = json.load(open(node_json_abs_path))
  python_json = json.load(open(python_json_abs_path))
  dynamic_inventory_dict = json.load(open('dynamic_inventory_dict.json'))

  node_json['db']['host'] = dynamic_inventory_dict['mongo1']['private_ip_address']
  python_json['db']['host'] = dynamic_inventory_dict['mongo1']['private_ip_address']
  node_json['redis']['host'] = dynamic_inventory_dict['redis1']['private_ip_address']
  node_json['python']['host'] = dynamic_inventory_dict['python1']['private_ip_address']

  with open(node_json_abs_path, 'w') as outfile:
    json.dump(node_json, outfile)
  with open(python_json_abs_path, 'w') as outfile:
    json.dump(python_json, outfile)
