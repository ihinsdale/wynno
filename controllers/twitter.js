var keys = require('../config/keys.json').twitter;
var Twitter = require('ntwitter');

exports.timeOfLastFetch = null;

// Fetch new tweets from Twitter API
exports.fetch = function(user_id, token, tokenSecret, id, _id, callback) {
  console.log('fetching tweets since', id);
  var options = {count: 195};
  if (id) {
    options.since_id = id;
    console.log('Twitter id of last tweet, as sent in fetch call to Twitter API:', options.since_id);
    console.log('type of that id:', typeof options.since_id);
  }
  var twit = new Twitter({
    consumer_key: keys.consumer_key,
    consumer_secret: keys.consumer_secret,
    access_token_key: token,
    access_token_secret: tokenSecret
  });
  twit.get('https://api.twitter.com/1.1/statuses/home_timeline.json', options, function(error, data) {
    console.log('time of last fetch before this one:', exports.timeOfLastFetch);
    exports.timeOfLastFetch = new Date().getTime();
    console.log('time of last fetch now:', exports.timeOfLastFetch);
    if (error) {
      console.log('there was an error getting tweets from Twitter API:', error);
    } else {
      console.log('number of tweets:', data.length);
      callback(null, user_id, data, _id);
    }
  });
};



