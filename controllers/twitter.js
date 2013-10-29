var Tweet = require('../models/Tweet.js').Tweet;

exports.fetchAndSave = function() {
  // function to synchronously save the tweets in an array to the db
  var saveSync = function(TweetModel, array, counter) {
    if (counter >= 0) {
      console.log('tweet id', array[counter].id_str, 'created at', array[counter].created_at);
      var tweet = new TweetModel(array[counter]);
      tweet.save(function(error, tweet) {
        if (error) {
          console.log('Error saving tweet', tweet.id_str, 'to db');
        } else {
          console.log('Saved tweet',tweet.id_str, 'to db');
          saveSync(TweetModel, array, counter - 1);
        }
      });
    }
  };

  var twit = require('../config/config.js').twit();

  var options = {count: 200};
  Tweet.findOne().sort('-_id').exec(function(err, item) {
    console.log('last tweets id string is', item.id_str);
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
      saveSync(Tweet, data, data.length - 1);
    });
  });
}