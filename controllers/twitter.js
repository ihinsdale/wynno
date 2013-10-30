var Tweet = require('../models/Tweet.js').Tweet;

// Fetch new tweets from Twitter API
exports.fetch = function(TweetModel, id, callback) {
  console.log('fetching tweets since', id);
  var twit = require('../config/config.js').twit();
  var options = {count: 200};
  if (id) {
    options.since_id = id;
  }
  twit.get('https://api.twitter.com/1.1/statuses/home_timeline.json', options, function(error, data) {
    console.log('number of tweets:', data.length);
    if (callback) {
      callback(TweetModel, data, data.length - 1);
    }
  });
};



