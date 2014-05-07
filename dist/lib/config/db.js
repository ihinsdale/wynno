'use strict';

var env = process.env.NODE_ENV;
var credentials = require('./keys/' + env + '/node.json');
var mongoose = require('mongoose');

module.exports = function(app) {
  // Setup MongoDB connection
  var dbConnUrl = 'mongodb://' + credentials.db.username + ':' + credentials.db.password + '@'+ credentials.db.host + ':' + credentials.db.port + '/wynno-' + env;

  app.set('dbConnUrl',dbConnUrl);
  mongoose.connect(dbConnUrl);
  var db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error:'));

  // Once MongoDB database connection is open, launch server
  // (potentially want to do something similar with the Redis connection, i.e. make launching server dependent
  //  on connection being open and established)
  db.once('open', function() {
    require('../../server.js')(app);
  });

};
