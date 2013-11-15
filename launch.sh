#!/bin/bash
# launch the python server and the node server

# Launch the MongoDB instance
sudo service mongodb stop
sudo /usr/bin/mongod -- dbpath ~/db/data # assumes EBS drive has been mounted to /db and /data subdirectory created
# see http://www.murvinlai.com/nodejs--mongodb-on-aws.html for procedure

# For initial deployment, mongorestore the db from the dump folder
mongorestore --db wynno-dev

# Install node dependencies
npm install -g

# then launch python and node servers
python python/server.py & nodemon app.js