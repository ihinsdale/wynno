'use strict';

var express = require('express');

module.exports = function(app) {
  if (app.get('env') === 'dev') {
    app.use(express.errorHandler());
  } else if (app.get('env') === 'prod') {
  }
};