var Tweet = require('../models/Tweet.js').Tweet;
var User = require('../models/User.js').User;
var _ = require('../node_modules/underscore/underscore-min.js')

// function to save a tweet to the db
exports.saveTweet = function(tweet, callback) {
  console.log('tweet id', tweet.id_str, 'created at', tweet.created_at);

  // add info to tweet object and clean before storing in db
  tweet = processTweet(tweet);

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

// defines fields on tweet which are used in rendering the tweet
// also unescapes tweet text like &amp;
processTweet = function(tweet) {
  tweet.__p = null;
  tweet.__vote = null;
  // if the text is a retweet, the tweet rendered to the user
  // should look like the original tweet that has been retweeted
  if (tweet.retweeted_status) {
    tweet.__text = _.unescape(tweet.retweeted_status.text);
    delete tweet.retweeted_status.text;
    tweet.__user = tweet.retweeted_status.user;
    delete tweet.retweeted_status.user;
    tweet.__created_at = tweet.retweeted_status.created_at;
    delete tweet.retweeted_status.created_at;
    tweet.__retweeter = tweet.user;
    delete tweet.user;
    tweet.__id_str = tweet.retweeted_status.id_str;
    delete tweet.retweeted_status.id_str;
  } else {
    tweet.__text = _.unescape(tweet.text);
    delete tweet.text;
    tweet.__user = tweet.user;
    delete tweet.user;
    tweet.__created_at = tweet.created_at;
    delete tweet.created_at;
    tweet.__id_str = tweet.id_str;
    //note we do not want to delete the id_str of the retweeting tweet
    //because that is our marker for requests to the API
  }
  return tweet;
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

var renderedTweetFields = '_id __p __vote __text __created_at __user __retweeter __id_str';

exports.findAllTweets = function(callback) {
  Tweet.find({}, renderedTweetFields, { sort: { _id: -1 } }, function(err, docs) {
    if (err) {
      console.log('error grabbing all tweets');
    } else {
      console.log('the docs look like:', docs);
      callback(docs);
    }
  });
};

exports.findTweetsSince_id = function(tweet_id, callback) {
  //tweet_id must be a db record id, i.e. _id, not a Twitter API id
  var criteria = {};
  if (tweet_id) {
    criteria._id = {$gt: tweet_id};
  }
  Tweet.find(criteria, renderedTweetFields, { sort: { _id: -1 } }, function(err, docs) {
    if (err) {
      console.log('error grabbing new tweets');
    } else {
      console.log('new tweets look like', docs);
      callback(null, docs);
    }
  });
};

exports.saveVote = function(tweet_id, vote, callback) {
  //tweet_id must be a db record id, i.e. _id, not a Twitter API id

  // prevent any malicious $-sign input
  if (tweet_id.indexOf('$') !== -1 || vote.indexOf('$') !== -1) {
    callback('invalid input');
  } else {
    Tweet.update({_id: tweet_id}, {__vote: vote}, {}, function (err, numberAffected, raw) {
      if (err) {
        console.log('error updating tweet', tweet_id);
        callback(err);
      } else {
        console.log('The number of updated documents was %d', numberAffected);
        console.log('The raw response from Mongo was ', raw);
        callback(null);
      }
    });
  }
};

exports.saveSetting = function(user_id, add_or_remove, user_or_word, mute_or_protect, input, callback) {
  var addToList = function(list) {
    User.findById(user_id, list, function(err, doc) {
      if (err) {
        console.log('error adding', input, 'as a', mute_or_protect, user_or_word);
      } else {
        // if user/word isn't already in list, add him
        if (doc[list].indexOf(input) === -1) {
          var what = {};
          what[list] = input;
          doc.update({$push: what}, function(err, numberAffected, raw) {
            if (err) {
              console.log('error adding', input, 'as a', mute_or_protect, user_or_word);
              callback(err);
            } else {
              console.log('The number of updated documents was %d', numberAffected);
              console.log('The raw response from Mongo was ', raw);
              callback(null);
            }
          });
        // if user/word is already in list, don't need to do anything
        } else {
          console.log(user_or_word, 'already in list, didnt need to add');
          callback(null);
        }
      }
    });
  };

  var removeFromList = function(list) {
    User.findById(user_id, list, function(err, doc) {
      if (err) {
        console.log('error removing', input, 'as a', mute_or_protect, user_or_word);
      } else {
        var location = doc[list].indexOf(input)
        // if user/word isn't in list, don't need to do anything
        if (doc[list].indexOf(input) === -1) {
          callback(null);
        } else {
          var what = {};
          what[list] = doc[list].slice(0,location).concat(doc[list].slice(location + 1));
          doc.update(what, function(err, numberAffected, raw) {
            if (err) {
              console.log('error removing', input, 'as a', mute_or_protect, user_or_word);
              callback(err);
            } else {
              console.log('The number of updated documents was %d', numberAffected);
              console.log('The raw response from Mongo was ', raw);
              callback(null);
            }
          });
        }
      }
    });
  };

  if (add_or_remove.indexOf('$') !== -1 || user_or_word.indexOf('$') !== -1 || mute_or_protect.indexOf('$') !== -1) {
    callback('invalid input');
    // ALSO CHECK THAT USER_ID IS THE CURRENTLY LOGGED IN USER
  } else {
    if (add_or_remove === 'add') {
      if (user_or_word === 'user') {
        if (mute_or_protect === 'mute') {
          addToList('mutedUsers');
        } else if (mute_or_protect === 'protect') {
          addToList('protectedUsers');
        } else {
          callback('improperly specified request');
        }
      } else if (user_or_word === 'word') {
        if (mute_or_protect === 'mute') {
          addToList('mutedWords');
        } else if (mute_or_protect === 'protect') {
          addToList('protectedWords');
        } else {
          callback('improperly specified request');
        }
      } else {
        callback('improperly specified request');
      }
    } else if (add_or_remove === 'remove') {
      if (user_or_word === 'user') {
        if (mute_or_protect === 'mute') {
          removeFromList('mutedUsers');
        } else if (mute_or_protect === 'protect') {
          removeFromList('protectedUsers');
        } else {
          callback('improperly specified request');
        }
      } else if (user_or_word === 'word') {
        if (mute_or_protect === 'mute') {
          removeFromList('mutedWords');
        } else if (mute_or_protect === 'protect') {
          removeFromList('protectedWords');
        } else {
          callback('improperly specified request');
        }
      } else {
        callback('improperly specified request');
      }
    } else {
      callback('improperly specified request');
    }
  }
};

exports.createUser = function(user, callback) {
  var newUser = new User(user);
  newUser.save(function(error, newUser) {
    if (error) {
      callback('error creating user');
    } else {
      console.log('Created record for new user',newUser.email, 'with _id', newUser._id, 'in db');
      callback(null);
    }
  });
};

exports.getSettings = function(user_id, callback) {
  User.findById(user_id, 'mutedUsers protectedUsers mutedWords protectedWords', function(err, doc) {
    if (err) {
      console.log('error finding user', user_id, 'settings');
      callback(err);
    } else {
      console.log('user settings look like', doc);
      callback(null, doc);
    }
  });
};
