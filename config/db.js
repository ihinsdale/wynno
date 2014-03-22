'use strict';

var credentials = require('./keys.json').db;
var mongoose = require('mongoose');

module.exports = function(app) {
  // Setup DB connection
  var dbConnUrl = process.env.MONGOHQ_URL || 'mongodb://' + credentials.username + ':' + credentials.password + '@127.0.0.1:27017/wynno-dev';

  app.set('dbConnUrl',dbConnUrl);
  mongoose.connect(dbConnUrl);
  var db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error:'));

  // Once database connection is open, go back and launch the server
  db.once('open', function() {
    require('../app.js')(app);
  });

};
