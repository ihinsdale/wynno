'use strict';

var Tweet = require('../models/Tweet.js').Tweet;
var User = require('../models/User.js').User;
var Feedback = require('../models/Feedback.js').Feedback;
var Filter = require('../models/Filter.js').Filter;
var _ = require('../node_modules/underscore/underscore-min.js');

// function to save a tweet to the db
exports.saveTweet = function(user_id, tweet, callback) {
  // *_id must be a db record id, i.e. _id, not a Twitter API id
  console.log('tweet id', tweet.id_str, 'created at', tweet.created_at);

  // add info to tweet object and clean before storing in db
  tweet = processTweet(user_id, tweet);

  // create tweet document and save it to the database
  var tweetDoc = new Tweet(tweet);
  tweetDoc.save(function(error, tweetDoc) {
    if (error) {
      console.log('Error saving tweet', tweetDoc.id_str, 'to db');
      callback('Error saving tweet', tweetDoc.id_str, 'to db');
    } else {
      console.log('Saved tweet',tweetDoc.id_str, 'to db');
      callback(null);
    }
  });
};

// defines fields on tweet which are used in rendering the tweet
// also unescapes tweet text like &amp;
var processTweet = function(user_id, tweet) {
  tweet.user_id = user_id;
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
    tweet.__entities = tweet.retweeted_status.entities;
    delete tweet.retweeted_status.entities;
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
    tweet.__entities = tweet.entities;
    delete tweet.entities;
  }
  return tweet;
};

exports.lastTweetId = function(user_id, callback) {
  // *_id must be a db record id, i.e. _id, not a Twitter API id

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

  // TODO: refactor this so that last tweet id is stored as a field in the User schema
  //       so that we don't have to sort through all user's tweets just to find the last one
  Tweet.find({ user_id: user_id }, 'id_str _id', { sort: { _id: -1}, limit: 1 }, function(err, docs) {
    var id;
    var _id;
    if (err) {
      console.log('Error searching collection for a record');
    } else if (!docs.length) {
      console.log('Collection has no records for user', user_id);
      id = null;
      _id = null;
    } else {
      var item = docs[0];
      console.log('item looks like:', item);
      console.log('last tweets id string is', item.id_str);
      id = incStrNum(item.id_str);
      _id = item._id
      console.log('last tweets db id is:', _id);
    }
    callback(null, user_id, id, _id);
    // this incrementing performed because since_id is actually inclusive,
    // contra the Twitter API docs. Cf. https://dev.twitter.com/discussions/11084
  });
}

var renderedTweetFields = '_id __p __vote __text __created_at __user __retweeter __id_str __entities';

exports.findTweetsBefore_id = function(user_id, tweet_id, callback) {
  // *_id must be a db record id, i.e. _id, not a Twitter API id
  var criteria = { user_id: user_id };
  if (tweet_id !== '0') {
    criteria._id = {$lt: tweet_id};
  }
  Tweet.find(criteria, renderedTweetFields, { sort: { _id: -1 }, limit: 50 }, function(err, docs) {
    if (err) {
      console.log('error grabbing tweets');
    } else {
      callback(null, docs);
    }
  });
};

exports.findTweetsSince_id = function(user_id, tweet_id, callback) {
  // *_id must be a db record id, i.e. _id, not a Twitter API id
  var criteria = {user_id: user_id};
  if (tweet_id !== undefined) {
    // if tweet_id is not null, we restrict to tweets since it
    // if it is null that means user has never stored tweets in db before, so we grab all tweets for user
    if (tweet_id) { 
      criteria._id = {$gt: tweet_id};
    }
    Tweet.find(criteria, renderedTweetFields, { sort: { _id: -1 } }, function(err, docs) {
      if (err) {
        console.log('error grabbing tweets:', err);
        callback(err);
      } else {
        callback(null, docs);
      }
    });
  } else {
    callback('No tweet_id provided');
  }
};

exports.saveVote = function(user_id, tweet_id, vote, callback) {
  // *_id must be a db record id, i.e. _id, not a Twitter API id

  // querying by user_id not necessary
  Tweet.update({ _id: tweet_id }, { __vote: vote }, {}, function (err, numberAffected, raw) {
    if (err) {
      console.log('error updating tweet', tweet_id);
      callback(err);
    } else {
      console.log('The number of updated documents was %d', numberAffected);
      console.log('The raw response from Mongo was ', raw);
      callback(null);
    }
  });
};

exports.saveFilter = function(user_id, draftFilter, revisionOf_id, callback) {
  draftFilter.creator = user_id;
  draftFilter.revision_of = revisionOf_id;
  Filter.create(draftFilter, function(err, doc) {
    if (err) {
      console.log('Error saving filter to db.');
      callback(err);
    } else {
      User.findByIdAndUpdate(user_id, { $push: { activeFilters: doc } }, function(err, user) {
        if (err) {
          console.log('Error finding user whose new filter this is.');
          callback(err);
        } else {
          console.log('Successfully saved new filter for user.');
          callback(null);
        }
      })
    }
  });
};

exports.disableFilter = function(user_id, activeFiltersIndex, filter_id, callback) {
  User.findByIdAndUpdate(user_id, { $push: { disabledFilters: { activeFilters: { _id: filter_id } } }, $pull: { activeFilters: { _id: filter_id } } }, function(err, doc) {
    if (err) {
      console.log('Error finding user whose filter to disable.');
      callback(err);
    } else {
      console.log("User's active filters now are:", doc.activeFilters);
      console.log("User's disabled filters now are:", doc.disabledFilters);
      callback(null);
    }
  });
};

exports.findUser = function(user_id, callback) {
  User.findById(user_id, function(err, user) {
    console.log('findUser found user:', user);
    if(!err) {
      callback(null, user);
    } else {
      callback(err, null);
    }
  });
};

exports.registerUser = function(user, callback) {
  // following passport.js signature: http://passportjs.org/guide/twitter/
  console.log('user inside registerUser looks like:', user);
  User.findOneAndUpdate({ tw_id: user.tw_id }, { 
    tw_name: user.tw_name,
    tw_screen_name: user.tw_screen_name,
    tw_profile_image_url: user.tw_profile_image_url,
    tw_access_token: user.tw_access_token,
    tw_access_secret: user.tw_access_secret
  }, function(err, doc) {
    if (err) {
      console.log('Error finding user.');
      callback(err);
    } else if (doc === null) {
      // if user not found, create a new one
      // we don't want to use the upsert option in findOneAndUpdate to do this, because
      // that does not create the default values for joined_at, etc.
      User.create({
        tw_id: user.tw_id,
        tw_name: user.tw_name,
        tw_screen_name: user.tw_screen_name,
        tw_profile_image_url: user.tw_profile_image_url,
        tw_access_token: user.tw_access_token,
        tw_access_secret: user.tw_access_secret
      }, function(err2, doc2) {
        if (err2) {
          console.log('Error creating user.');
          callback(err2);
        } else {
          console.log('New user is:', doc2); // don't need to send whole doc, should limit results sent to the fields necessary
          callback(null, doc2); // as prescribed by passport.js
        }
      });
    } else {
      console.log('User is:', doc); // don't need to send whole doc, should limit results sent to the fields necessary
      callback(null, doc); // as prescribed by passport.js
    }
  });
};

exports.getSettings = function(user_id, tweetsToPassOn, callback) {
  User.findById(user_id, 'activeFilters disabledFilters', function(err, doc) {
    if (err) {
      console.log('error finding user', user_id, 'settings');
      callback(err);
    } else {
      console.log('user settings look like', doc);
      callback(null, tweetsToPassOn, doc);
    }
  });
};

exports.saveFeedback = function(user_id, feedback, email, callback) {
  if (!feedback) {
    callback('No feedback to save to the db provided.');
  }
  var feedbackDoc = new Feedback({ user_id: user_id, feedback: feedback, email: email });
  feedbackDoc.save(function(error, feedbackDoc) {
    if (error) {
      console.log('Error saving feedback to db');
      callback('Error saving feedback to db');
    } else {
      console.log('Saved feedback to db');
      callback(null);
    }
  });
};

exports.saveAgreement = function(user_id, agreement, callback) {
  // agreement should always be true, because default value saved in user is false
  User.findByIdAndUpdate(user_id, { agreed_terms: agreement, agreed_terms_at: new Date() }, function(err, doc) {
    if (err) {
      console.log('Error saving agreement to db');
      callback(err);
    } else {
      console.log('Saved agreement to db.');
      callback(null);
    }
  });
}
