'use strict';

var Tweet = require('../models/Tweet.js').Tweet;
var User = require('../models/User.js').User;
var Feedback = require('../models/Feedback.js').Feedback;
var Filter = require('../models/Filter.js').Filter;
var _ = require('../../node_modules/underscore/underscore-min.js');
var rendering = require('./rendering.js');

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
    //note that we do not want to delete the top-level created_at because
    //that tracks how far back in time we've scanned (namely in the case of a tweet which is a retweet)
    //which is important for telling the user Load tweets earlier than hh:mm dd:MM
    tweet.__id_str = tweet.id_str;
    //note we do not want to delete the id_str of the retweeting tweet
    //because that is our marker for requests to the API
    tweet.__entities = tweet.entities;
    delete tweet.entities;
  }
  // the tweet's (Twitter API) id gets replaced as a string, which mongoose-long then stores as 64-bit integer
  tweet.id = tweet.id_str;
  // store a fully HTML rendered version of the tweet text in the db
  // renderedText starts off the same as __text
  tweet.renderedText = tweet.__text;
  // escape the text back to how it came from Twitter
  tweet.renderedText = _.escape(tweet.renderedText);
  // then insert html for urls, media, and user mentions into renderedText
  rendering.renderLinksAndMentions(tweet);
  return tweet;
};

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

exports.updateSecondLatestTweetId = function(user_id, newSecondLatestTweetIdStr, newLatestTweetIdStr, callback) {
  User.findById(user_id, function(err, user) {
    if (err) {
      console.log('Error finding user whose secondLatestTweetIdStr to update.');
      callback(err);
    } else {
      var origLatestTweetIdStr = user.latestTweetIdStr;
      console.log('origLatestTweetIdStr is:', origLatestTweetIdStr);
      if (newSecondLatestTweetIdStr === null) {
        user.secondLatestTweetIdStr = user.latestTweetIdStr;
      } else {
        user.secondLatestTweetIdStr = newSecondLatestTweetIdStr;
      }
      user.latestTweetIdStr = newLatestTweetIdStr;
      user.save(function(error) {
        if (error) {
          console.log('Error saving new secondLatestTweetIdStr.');
          callback(error);
        } else {
          console.log("Successfully updated user's secondLatestTweetIdStr.");
          callback(null, user_id, origLatestTweetIdStr);
        }
      });
    }
  });
};

exports.updateGapMarker = function(user_id, oldestOfMoreRecentTweetsIdStr, newestOfTheOlderTweetsIdStr, callback) {
  // TODO could consolidate this updateGapMarker query with the findTweetsSinceIdAndBeforeId query
  Tweet.findOneAndUpdate({ user_id: user_id, id: oldestOfMoreRecentTweetsIdStr }, {
    gapAfterThis: false,
  }, function(err, doc) {
    if (err) {
      console.log('Error updating gap marker:', err);
      callback(err);
    } else {
      callback(null, user_id, oldestOfMoreRecentTweetsIdStr, newestOfTheOlderTweetsIdStr);
    }
  });
};

exports.getSecondLatestTweetIdForFetching = function(user_id, callback) {
  // user_id must be a db record id, i.e. _id, not a Twitter API user id
  User.findById(user_id, function(err, doc) {
    if (err) {
      console.log('Error finding user whose secondLatestTweetIdStr to grab and increment.');
      callback(err);
    } else {
      console.log('secondLatestTweetIdStr stored in db is:', doc.secondLatestTweetIdStr);
      console.log('latestTweetIdStr stored in db is:', doc.latestTweetIdStr);
      var secondLatestid_str = doc.secondLatestTweetIdStr;
      var latestid_str = doc.latestTweetIdStr;

      // currently disabling incrementing of secondLatestTweetIdStr before fetching new tweets from Twitter,
      // because we will use overlap on this tweet between the new batch and the old tweets to indicate
      // that there are no intervening tweets left to grab
      //var id_str = incStrNum(doc.secondLatestTweetIdStr);
      //console.log('id_str type:', typeof id_str);
      // originally, we were incrementing id_str, because since_id is actually inclusive,
      // contra the Twitter API docs. Cf. https://dev.twitter.com/discussions/11084
      // so we incremented the id of the latest tweet we already have, so that we did't
      // receive a duplicate

      callback(null, user_id, secondLatestid_str, latestid_str);
    }
  });
};

var renderedTweetFields = '_id __p __vote created_at __created_at __user __retweeter __id_str __entities __text renderedText id_str gapAfterThis retweeted_status retweet_count favorite_count coordinates';

exports.findTweetsBeforeId = function(user_id, tweetIdStr, callback) {
  // user_id must be a db record id, i.e. _id, not a Twitter API id
  // tweetIdStr is a Twitter API id_str
  var criteria = { user_id: user_id };
  if (tweetIdStr !== '0') {
    criteria.id = {$lt: tweetIdStr};
  }
  Tweet.find(criteria, renderedTweetFields, { sort: { id: -1 }, limit: 50 }, function(err, docs) {
    if (err) {
      console.log('error grabbing tweets');
    } else {
      callback(null, docs);
    }
  });
};

exports.findTweetsSinceId = function(user_id, tweetIdStr, callback) {
  // user_id must be a db record id, i.e. _id, not a Twitter API id
  // tweetIdStr is a Twitter API id
  var criteria = {user_id: user_id};
  if (tweetIdStr !== undefined) {
    // if tweetId is not null, we restrict to tweets since it
    // if it is null that means user has never stored tweets in db before, so we grab all tweets for user
    if (tweetIdStr) { 
      criteria.id = {$gt: tweetIdStr};
    }
    Tweet.find(criteria, renderedTweetFields, { sort: { id: -1 } }, function(err, docs) {
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

exports.findTweetsSinceIdAndBeforeId = function(user_id, oldestOfMoreRecentTweetsIdStr, newestOfTheOlderTweetsIdStr, callback) {
  Tweet.find({
    user_id: user_id,
    id: {$lt: oldestOfMoreRecentTweetsIdStr, $gt: newestOfTheOlderTweetsIdStr}
  }, renderedTweetFields, { sort: { id: -1 } }, function(err, docs) {
    if (err) {
      console.log('Error finding middle tweets:', err);
      callback(err);
    } else {
      callback(null, docs);
    }
  });
};

exports.saveVote = function(user_id, tweet_id, vote, callback) {
  // *_id must be a db record id, i.e. _id, not a Twitter API id

  Tweet.findByIdAndUpdate(tweet_id, { __vote: vote }, {}, function (err, numberAffected, raw) {
    if (err) {
      console.log('error updating tweet', tweet_id);
      callback(err);
    } else {
      console.log('Recorded vote', vote, 'on tweet', tweet_id, 'successfully.');
      User.findByIdAndUpdate(user_id, { $inc: { voteCount: 1 } }, {}, function(err, numberAffected, raw) {
        if (err) {
          console.log('error updating vote count for user', user_id);
          callback(err);
        } else {
          console.log('Incremented vote count for user', user_id);
          callback(null);
        }
      });
    }
  });
};

exports.saveFilter = function(user_id, draftFilter, revisionOf_id, callback) {
  draftFilter.user_creator = user_id;
  if (revisionOf_id) {
    draftFilter.revision_of = revisionOf_id;
  }
  Filter.create(draftFilter, function(err, doc) {
    if (err) {
      console.log('Error saving filter to db.');
      callback(err);
    } else {
      console.log('Filter doc created is:', doc);
      console.log('user_id is:', user_id);
      User.findById(user_id, function(err, user) {
        if (err) {
          console.log('Error finding user whose new filter this is.');
          callback(err);
        } else {
          user.activeFilters.push(doc);
          console.log('Successfully saved new filter for user.');
          console.log("User's active filters are:", user.activeFilters);
          user.save(function(err) {
            if (err) {
              console.log("Error adding filter to user's activeFilters.");
            } else {
              callback(null);
            }
          });
        }
      });
    }
  });
};

exports.disableFilter = function(user_id, activeFiltersIndex, filter_id, callback) {
  User.findById(user_id, function(err, doc) {
    if (err) {
      console.log('Error finding user whose filter to disable.');
      callback(err);
    } else {
      var filter = doc.activeFilters[activeFiltersIndex];
      console.log('Filter being disabled is:', filter);
      doc.disabledFilters.push(filter);
      doc.activeFilters[activeFiltersIndex].remove();
      doc.save(function(err) {
        if (err) {
          console.log('Error updating active and disabled filters.');
          callback(err);
        } else {
          console.log("User's active filters now are:", doc.activeFilters);
          console.log("User's disabled filters now are:", doc.disabledFilters);
          callback(null);
        }
      });
    }
  });
};

exports.adoptSuggestion = function(user_id, suggestedFiltersIndex, callback) {
  User.findById(user_id, function(err, doc) {
    if (err) {
      console.log('Error finding user to adopt suggestion for.');
      callback(err);
    } else {
      var filter = doc.suggestedFilters[suggestedFiltersIndex];
      doc.activeFilters.push(filter);
      doc.suggestedFilters[suggestedFiltersIndex].remove();
      if (doc.suggestedFilters.length === 0) {
        doc.undismissedSugg = false;
      }
      doc.save(function(err) {
        if (err) {
          console.log('Error updating active and suggested filters.');
          callback(err);
        } else {
          console.log("User's active filters now are:", doc.activeFilters);
          console.log("User's suggested filters now are:", doc.suggestedFilters);
          callback(null);
        }
      })
    }
  });
};

exports.dismissSuggestion = function(user_id, suggestedFiltersIndex, callback) {
  User.findById(user_id, function(err, doc) {
    if (err) {
      console.log('Error finding user to dismiss suggestion for.');
      callback(err);
    } else {
      var filter = doc.suggestedFilters[suggestedFiltersIndex];
      doc.dismissedFilters.push(filter);
      doc.suggestedFilters[suggestedFiltersIndex].remove();
      if (doc.suggestedFilters.length === 0) {
        doc.undismissedSugg = false;
      }
      doc.save(function(err) {
        if (err) {
          console.log('Error updating dismissed and suggested filters.');
          callback(err);
        } else {
          console.log("User's active filters now are:", doc.dismissedFilters);
          console.log("User's suggested filters now are:", doc.suggestedFilters);
          callback(null);
        }
      })
    }
  });
};

exports.findUser = function(user_id, callback) {
  // this function is only used by passport.deserializeUser
  // it may improve performance for this query only to return the select fields
  // necessary for references to req.user used in site.js route handlers
  // currently these fields are: tw_screen_name, tw_profile_image_url, agreed_terms, _id, autoWynnoing, voteCount
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
  User.findById(user_id, 'activeFilters disabledFilters voteCount autoWynnoing suggestedFilters dismissedFilters undismissedSugg', function(err, doc) {
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
};

exports.updateAutoWynnoing = function(user_id, autoWynnoing, callback) {
  User.findByIdAndUpdate(user_id, { autoWynnoing: autoWynnoing }, function(err, doc) {
    if (err) {
      console.log('Error toggling auto wynnoing.');
      callback(err);
    } else {
      console.log('Toggled auto wynnoing to:', autoWynnoing);
      callback(null);
    }
  });
};

exports.enableDisFilterOrSugg = function(user_id, disabledOrDismissed, index, callback) {
  User.findById(user_id, function(err, doc) {
    if (err) {
      console.log('Error finding user to enable filter for.');
      callback(err);
    } else {
      var filterSource;
      if (disabledOrDismissed === 'disabled') {
        filterSource = 'disabledFilters';
      } else if (disabledOrDismissed === 'dismissed') {
        filterSource = 'dismissedFilters';
      } else {
        callback('Improperly specified source of filter.');
      }
      var filter = doc[filterSource][index];
      doc.activeFilters.push(filter);
      doc[filterSource][index].remove();
      doc.save(function(err) {
        if (err) {
          console.log('Error updating active filters with ' + disabledOrDismissed + ' filter.');
          callback(err);
        } else {
          console.log('Successfully enabled ' + disabledOrDismissed + ' filter.');
          callback(null);
        }
      });
    }
  });
};
