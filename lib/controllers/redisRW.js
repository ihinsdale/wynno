// note this file only treats interaction with Redis for the purpose of tracking
// a user's last call to the Twitter API.
// use of Redis for managing user sessions is done in config/middleware.js

var redis = require('redis');
var credentials = require('../config/keys.json');

var client = redis.createClient(credentials.redis.port, credentials.redis.localhost);
// Switch to the database specfically for fetching
client.select(credentials.redis.dbs.fetching, function() {}); // I don't think we need this callback, 
// even though the command is ultimately asynchronous

exports.checkRateLimiting = function(user_id, callback) {
  console.log('typeof user_id inside checkRateLimiting is:', typeof user_id);
  // user_id is an ObjectId so we need to stringify it
  client.get(user_id.toString(), function(err, reply) {
    var timeOfLastFetch = parseInt(reply);
    if (err) {
      console.log('There was an error checking if the user needs to wait before fetching from Twitter.');
      callback(err);
    // if the reply can be parsed to an integer, then user needs to wait before fetching
    // we don't need to check how long it's been since timeOfLastFetch, because our keys expire after 60 seconds
    } else if (timeOfLastFetch) {
      var timeSinceLastFetch = new Date().getTime() - timeOfLastFetch;
      callback('Please try again in ' + Math.ceil((61000 - timeSinceLastFetch)/1000).toString() + ' seconds. Currently unable to fetch new tweets due to Twitter API rate limiting.');
    // otherwise the request to Twitter can proceed
    } else {
      callback(null);
    }
  });
};

exports.setRateLimiter = function(user_id, callback) {
  // user_id is an ObjectId so we need to stringify it
  client.multi()
  .set(user_id.toString(), new Date().getTime().toString())
  .expire(user_id.toString(), 60) // we only need to keep the record for 60 seconds, because user is allowed 15 requests in 15 minutes
  .exec(function(err, replies) {
    if (err) {
      console.log("There was an error recording the time of user's call to Twitter API.");
      callback(err);
    } else {
      callback(null);
    }
  });
};
