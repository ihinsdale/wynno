var mongoose = require('mongoose');

module.exports = function(app) {
  // Setup DB connection
  var dblink = app.set('db-uri');
  mongoose.connect(dblink);

  // Setup models
  mongoose.model('Tweet', require('../models/Tweet.js'));
}