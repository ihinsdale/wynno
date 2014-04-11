#!/bin/bash

# Script which commits the production code and sysadmin scripting which
# is needed on the wynno-gateway instance in order to deploy the app, to
# its own repo (wynno-prod-sysadmin) which is then pushed to GitHub and
# can then be pulled from the wynno-gateway instance

# The wynno-prod-sysadmin repo consists of everything in /dist which is not
# gitignored and everything in sysadmin/prod which is not gitignored
