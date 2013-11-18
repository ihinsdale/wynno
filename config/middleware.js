var express = require('express');
var path = require('path');

module.exports = function(app) {
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
  app.use(app.router);
  app.use(require('stylus').middleware(__dirname + '/public'));
  console.log('dirname is', __dirname);
  console.log('path', path.join(__dirname, '..', 'public'));
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use(express.favicon(path.join(__dirname, '..', 'public/app/images/favicon.ico')));
};