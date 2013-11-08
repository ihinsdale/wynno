#!/bin/bash
# launch the python server and the node server

# Install node dependencies
npm install

# then launch
python python/server.py & nodemon app.js