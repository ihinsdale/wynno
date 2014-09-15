#!/bin/bash

APP_DIR="/Users/ian/Documents/development/wynno"

cd $APP_DIR/sysadmin/dev

sh deploy.sh

echo ""
echo "Running express-tests.js with Mocha"
echo ""

cd $APP_DIR/test

export NODE_ENV=dev

mocha express-tests.js
