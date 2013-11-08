#!/bin/bash
# launch the python server and the node server

# Launch the MongoDB instance
sudo service mongodb start

# Install node dependencies
npm install

# then launch python and node servers
python python/server.py & nodemon app.js