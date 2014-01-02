#!/bin/bash

node -e 'console.log (process.env.NODE_ENV)'
node -e 'console.log (process.env.HOSTNAME)'
node -e 'console.log (process.env.PORT)'

$ NODE_ENV = test node -e 'console.log (process.env.NODE_ENV)'
$ HOSTNAME = something node -e 'console.log (process.env.HOSTNAME)'
$ PORT = 4000 node -e 'console.log (process.env.PORT)'

