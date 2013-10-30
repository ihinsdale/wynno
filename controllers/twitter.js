var Tweet = require('../models/Tweet.js').Tweet;

exports.fetchAndSave = function(callback) {
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
    } else if (callback) {
      callback();
    }
  };

  var incStrNum = function(n) { // courtesy of http://webapplog.com/decreasing-64-bit-tweet-id-in-javascript/
    n = n.toString(); // but n should be passed in as a string
    var result = n;
    var i = n.length - 1;
    while (i > -1) {
      if (n[i] === "9") {
        result = result.substring(0,i) + "0" + result.substring(i + 1);
        i--;
      }
      else {
        result=result.substring(0,i)+(parseInt(n[i],10)+1).toString()+result.substring(i+1);
        return result;
      }
    }
    return result;
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
      options.since_id = incStrNum(item.id_str); // this incrementing performed because since_id is actually inclusive,
      // contra the Twitter API docs. Cf. https://dev.twitter.com/discussions/11084
      console.log(options);
    }
    twit.get('https://api.twitter.com/1.1/statuses/home_timeline.json', options, function(error, data) {
      console.log('number of tweets:', data.length);
      saveSync(Tweet, data, data.length - 1);
    });
  });
}