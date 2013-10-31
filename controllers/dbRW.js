var Tweet = require('../models/Tweet.js').Tweet;

// function to save a tweet to the db
exports.saveTweet = function(tweet, callback) {
  console.log('tweet id', tweet.id_str, 'created at', tweet.created_at);
  console.log('tweet text is', tweet.text);
  
  // add info to tweet object before storing in db
  tweet.__p = null;
  tweet.__vote = null;
  if (tweet.retweeted_status) {
    tweet.__origtext = tweet.retweeted_status.text;
  } else {
    tweet.__origtext = tweet.text;
  }
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
};

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
    var _id;
    if (err) {
      console.log('Error searching collection for a record');
    } else if (item === null) {
      console.log('Collection has no records');
      id = null;
      _id = null;
    } else {
      console.log('last tweets id string is', item.id_str);
      id = incStrNum(item.id_str);
      _id = item._id
    }
    callback(null, id, _id);
      // this incrementing performed because since_id is actually inclusive,
      // contra the Twitter API docs. Cf. https://dev.twitter.com/discussions/11084
  });
}

exports.findAllTweets = function(callback) {
  Tweet.find({}, '__origtext', { sort: { _id: -1 } }, function(err, docs) {
    if (err) {
      console.log('error grabbing all tweets');
    } else {
      console.log('the docs look like:', docs);
      callback(docs);
    }
  });
};

exports.findTweetsSince_id = function(tweet_id, callback) {
  var criteria = {};
  if (tweet_id) {
    criteria._id = {$gt: tweet_id};
  }
  Tweet.find(criteria, '__origtext', { sort: { _id: -1 } }, function(err, docs) {
    if (err) {
      console.log('error grabbing new tweets');
    } else {
      console.log('new tweets look like', docs);
      callback(null, docs);
    }
  });
};
