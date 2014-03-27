// note this file only treats interaction with Redis for the purpose of tracking
// a user's last call to the Twitter API.
// use of Redis for managing user sessions is done in config/middleware.js

var redis = require('redis');
var credentials = require('../config/keys.json');

var client = redis.createClient(credentials.redis.port, credentials.redis.localhost);
// Switch to the database specfically for fetching
client.select(credentials.redis.dbs.fetching, function() {}); // I don't think we need this callback, 
// even though the command is ultimately asynchronous

exports.checkRateLimitingAndSetIfNone = function(user_id, callback) {
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
    // otherwise we want to set a rate limiter, then proceed with the request to Twitter
    // note we want to set a rate limiter before the request is made AND afterwards as a way of blocking
    // any other requests that could theoretically be made before the call to the Twitter API has returned
    // and the rate limiting after that call has been set up 
    } else {
      setRateLimiter(user_id, callback);
    }
  });
};

var setRateLimiter;
exports.setRateLimiter = setRateLimiter = function(user_id, callback) {
  // user_id is an ObjectId so we need to stringify it
  // we only need to keep the record for 60 seconds, because user is allowed 15 requests in 15 minutes
  client.setex(user_id.toString(), 60, new Date().getTime().toString(), function(err, reply) {
    if (err) {
      console.log("There was an error recording the time of user's call to Twitter API.");
      callback(err);
    } else {
      callback(null);
    }
  });
};
