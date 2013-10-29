var mongoose = require('mongoose');
var url = require('url');

module.exports = function(app) {
  // Setup DB connection
  var dbConnUrl = process.env.MONGOHQ_URL || 'mongodb://127.0.0.1:27017';
  var host = url.parse(dbConnUrl).hostname;
  var port = new Number(url.parse(dbConnUrl).port);

  app.set('dbConnUrl',dbConnUrl);
  mongoose.connect(dbConnUrl);
  var db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error:'));
  db.once('open', function() {
    // Create the server
    require('../app.js')(app);
  });

  // Setup models
  mongoose.model('Tweet', require('../models/Tweet.js').tweetSchema);
};