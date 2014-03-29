'use strict';

var credentials = require('./keys.json');
var mongoose = require('mongoose');

module.exports = function(app) {
  var env = app.get('env');
  // Setup MongoDB connection
  var dbConnUrl = 'mongodb://' + credentials[env].db.username + ':' + credentials[env].db.password + '@'+ credentials[env].db.host + ':' + credentials[env].db.port + '/wynno-' + env;

  app.set('dbConnUrl',dbConnUrl);
  mongoose.connect(dbConnUrl);
  var db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error:'));

  // Once MongoDB database connection is open, launch server
  db.once('open', function() {
    require('../../server.js')(app);
  });

};
