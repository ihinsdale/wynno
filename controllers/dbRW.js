var Tweet = require('../models/Tweet.js').Tweet;

// function to save a tweet to the db
exports.saveTweet = function(tweet, callback) {
  console.log('tweet id', tweet.id_str, 'created at', tweet.created_at);
  // create tweet document and save it to the database
  var tweetDoc = new Tweet(tweet);
  tweetDoc.save(function(error, tweetDoc) {
    if (error) {
      console.log('Error saving tweet', tweetDoc.id_str, 'to db');
    } else {
      console.log('Saved tweet',tweetDoc.id_str, 'to db');
      callback();
    }
  });
}

exports.lastTweetId = function(callback) {
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

  Tweet.findOne().sort('-_id').exec(function(err, item) {
    var id;
    if (err) {
      console.log('Error searching collection for a record');
    } else if (item === null) {
      console.log('Collection has no records');
    } else {
      console.log('last tweets id string is', item.id_str);
      id = incStrNum(item.id_str);
    }
    callback(null, id);
      // this incrementing performed because since_id is actually inclusive,
      // contra the Twitter API docs. Cf. https://dev.twitter.com/discussions/11084
  });
}

exports.findAllTweets = function(callback) {
  Tweet.find({}, 'text', {}, function(err, docs) {
    if (err) {
      console.log('error grabbing all tweets');
    } else {
      console.log('the docs look like:', docs);
      callback(docs);
    }
  });
};
