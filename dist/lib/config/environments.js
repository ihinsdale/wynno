'use strict';

var express = require('express');

module.exports = function(app) {
  // development only
  if (app.get('env') === 'development') {
    app.set('db-uri', 'mongodb://localhost/app-dev');
    app.use(express.errorHandler());
  } else if (app.get('env') === 'production') {
    app.set('db-uri', 'mongodb://localhost.app-prod');
  }
};