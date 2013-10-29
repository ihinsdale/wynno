var Tweet = require('../models/Tweet.js').Tweet;

exports.fetchAndSave = function() {
  var twit = require('../config/config.js').twit();
  var options = {count: 200};
  Tweet.findOne().sort('-id').exec(function(err, item) {
    if (err) {
      console.log('Error searching collection for a record');
    } else if (item === null) {
      console.log('Collection has no records');
    } else {
      options.since_id = item.id;
      console.log(options);
    }
    twit.get('https://api.twitter.com/1.1/statuses/home_timeline.json', options, function(error, data) {
      console.log('number of tweets:', data.length);
      var tweet;
      for (var i = data.length - 1; i >= 0; i--) {
        console.log('tweet #', i, 'was created at', data[i].created_at);
        tweet = new Tweet(data[i]);
        // .save is asynchronous, so tweets will not be saved in exact order
        tweet.save(function(error, tweet) {
          if (error) {
            console.log('Error saving tweet', tweet.id_str, 'to db');
          } else {
            console.log('Saved tweet',tweet.id_str, 'to db');
          }
        });
      }
    });
  });
}