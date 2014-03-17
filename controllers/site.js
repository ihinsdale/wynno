var async = require('async');
var twitter = require('./twitter.js');
var db = require('./dbRW.js');
var algo = require('./algo.js');
var rendering = require('./rendering.js');


exports.index = function(req, res) {
  // if user is already in session, send them the cookie again
  // [WHY?? Just in case they had deleted the user cookie, and not the session one?]
  if (req.user) {
    res.cookie('user', JSON.stringify({
      username: '@' + req.user.tw_screen_name,
      profile_image_url: req.user.tw_profile_image_url,
      agreed_terms: req.user.agreed_terms
    }));
  }
  res.render('index', { title: 'wynno' });
};

// a function for checking in a user after a successful signin
exports.checkin = function(req, res) {
  // send cookie to client containing user info
  res.cookie('user', JSON.stringify({
    username: '@' + req.user.tw_screen_name,
    profile_image_url: req.user.tw_profile_image_url,
    agreed_terms: req.user.agreed_terms
  }));
  res.redirect('#/in');
};

exports.logout = function(req, res) {
  req.logout(); // passport.js provides a logout method on the req object which removes req.user and clears the session
  res.send('Logged out of wynno.');
};

exports.old = old = function(req, res) {
  var oldestTweetIdStr = req.query.oldestTweetIdStr || '0';
  console.log('oldestTweetId sent in request looks like:', oldestTweetIdStr);
  console.log('typeof oldestTweetId:', typeof oldestTweetIdStr);
  async.waterfall([
    function(callback) {
      db.findTweetsBeforeId(req.user._id, oldestTweetIdStr, callback);
    },
    function(tweets, callback) {
      // if no tweets were found in the db, and yet a nonzero oldestTweetIdStr was provided,
      // meaning that a previous call to the db had successfully grabbed old tweets,
      // then we know oldestTweetIdStr is the boundary for the oldest tweet ever received for the user,
      // so we need to go back to Twitter and get even older tweets
      if (!tweets.length && oldestTweetIdStr !== '0') {
        getHistorical(req, oldestTweetIdStr, callback);
      // otherwise we found tweets, so proceed: if settings were requested too, as would be the case,
      // upon initial loading of wynno by user, get those
      // (we don't need to worry about combining getHistorical with an additional request for settings,
      //  because that case would never occur:  getHistorical is only called if oldestTweetIdStr !== '0',
      //  meaning the user had previously gotten some tweets successfully, in which case they would also
      //  have already gotten settings)
      } else if (req.query.settings) {
        db.getSettings(req.user._id, tweets, callback);
      } else {
        callback(null, tweets, null);
      }
    },
    function(tweets, settings, callback) {
      if (req.user.autoWynnoing || req.session.autoWynnoingJustToggledOn) {
        algo.crunchTheNumbers(req.user._id, tweets, settings, callback);
      } else {
        callback(null, tweets, settings);
      }
    }
  ], function(error, tweets, settings) {
    if (error) {
      console.log(error);
      res.send(500);
    } else {
      var data = { tweets: tweets };
      if (settings) {
        data.settings = settings;
      }
      console.log('sending results for /old');
      res.send(data);
    }
  });
};

var getHistorical = function(req, oldestTweetIdStr, callback) {
  console.log('inside getHistorical, oldestTweetIdStr looks like:', oldestTweetIdStr);
  async.waterfall([
    // fetch the tweets from twitter
    function(callback2) {
      twitter.fetchMiddle(req.user._id, req.session.access_token, req.session.access_secret, oldestTweetIdStr, null, null, callback2)
    },
    // store in the db
    function(user_id, tweetsArray, irrelevant, callback2) {
      async.eachSeries(tweetsArray.reverse(), 
        function(tweet, callback2) {
          db.saveTweet(user_id, tweet, callback2);
        }, 
        function(err) {
          if (err) {
            console.log('Error saving historical tweets:', err);
            callback2(err);
          } else {
            console.log('Successfully saved batch of historical tweets');
            callback2(null);
          }
        }
      );
    },
    // grab the newly saved tweets
    function(callback2) {
      db.findTweetsBeforeId(req.user._id, oldestTweetIdStr, callback2);
    }
  ], function(error, tweets) {
    if (error) {
      callback(error);
    } else {
      callback(null, tweets, null); // arguments match the signature within the 
      // second function of exports.old()'s waterfall
    }
  });
};

exports.fresh = function(req, res) {
  async.waterfall([
    function(callback) {
      checkTimeOfLastFetch(req.session.timeOfLastFetch, callback);
    },
    // find (Twitter's) tweet id of the last saved tweet
    function(callback) {
      db.getSecondLatestTweetIdForFetching(req.user._id, callback);
    },
    // use that id to grab new tweets from Twitter API
    function(user_id, secondLatestid_str, latestid_str, callback) {
      req.session.timeOfLastFetch = new Date().getTime();
      console.log('time of last fetch now:', req.session.timeOfLastFetch);
      twitter.fetchNew(user_id, req.session.access_token, req.session.access_secret, secondLatestid_str, latestid_str, callback);
    },
    // save each new tweet to the db. this save is synchronous so that our records have _id's in chronological chunks
    // which is not strictly necessary at this point; could refactor to allow asynchronous saving, which would presumably be faster...
    function(user_id, tweetsArray, latestid_str, callback) {
      // if we get back only 1 tweet, that's the one we already have, so we're done
      if (tweetsArray.length === 1) {
        callback('No new tweets have occurred.');
      } else if (tweetsArray.length === 0) {
        callback("There was an error on Twitter's end in fetching new tweets.")
      } else {
        // if oldest tweet in new batch has id_str which matches the id_str of the latest tweet previously obtained
        // then we have gotten all tweets since the last fetch, and we don't want to save this oldest tweet
        // because it's already in the db
        if (tweetsArray[tweetsArray.length - 1].id_str === latestid_str) {
          // tweetsArray here is in reverse chronological order, so the last item in array is the oldest tweet
          console.log('No gap remaining between this fetch and previous.');
          tweetsArray.pop();
        } else if (latestid_str === null) {
          // this is the case of a new user, so we're done
        } else {
          console.log('Gap exists between this fetch and previous.');
          tweetsArray[tweetsArray.length - 1].gapAfterThis = true;
        }
        async.eachSeries(tweetsArray.reverse(), 
          function(tweet, callback) {
            db.saveTweet(user_id, tweet, callback);
          }, 
          function(err) {
            if (err) {
              console.log('Error saving fresh tweets:', err);
              callback(err);
            } else {
              // tweetsArray has been reversed so last item in the array is the newest tweet
              if (tweetsArray.length > 1) {
                callback(null, user_id, tweetsArray[tweetsArray.length - 2].id_str, tweetsArray[tweetsArray.length - 1].id_str);
              } else if (tweetsArray.length === 1) {
                // if only one tweet has occurred, the secondLatestTweetId needs to come from the db
                callback(null, user_id, null, tweetsArray[tweetsArray.length - 1].id_str);
              }
            }
          }
        );
      }
    },
    // after saving new batch of tweets, update latestTweetId in User doc
    db.updateSecondLatestTweetId,

    // get this new batch of tweets out of the database
    db.findTweetsSinceId,
    // calculate p values for tweets, if auto-wynnoing is on
    function(tweets, callback) {
      if (req.user.autoWynnoing) {
        algo.crunchTheNumbers(req.user._id, tweets, null, callback);
      } else {
        callback(null, tweets);
      }
    }
  ], function(error, tweets) {
    if (error) {
      if (error === 'No new tweets have occurred.') {
        res.send({ tweets: [] });
      } else if (error.slice(0,20) === 'Please try again in ') {
        res.send(429, error);
      } else {
        console.log(error);
        res.send(500);
      }
    } else {
      // send the tweets back to the client
      res.send({ tweets: tweets });
    }
  });
};

exports.middle = function(req, res) {
  var oldestOfMoreRecentTweetsIdStr = req.query.oldestOfMoreRecentTweetsIdStr;
  var secondNewestOfOlderTweetsIdStr = req.query.secondNewestOfOlderTweetsIdStr;
  var newestOfOlderTweetsIdStr = req.query.newestOfOlderTweetsIdStr;
  async.waterfall([
    function(callback) {
      checkTimeOfLastFetch(req.session.timeOfLastFetch, callback);
    },
    function(callback) {
      req.session.timeOfLastFetch = new Date().getTime();
      console.log('time of last fetch now:', req.session.timeOfLastFetch);
      twitter.fetchMiddle(req.user._id, req.session.access_token, req.session.access_secret, oldestOfMoreRecentTweetsIdStr, secondNewestOfOlderTweetsIdStr, newestOfOlderTweetsIdStr, callback);
    },
    // save each tweet to the db. this save is synchronous so that our records have _id's in chronological chunks
    // which is not strictly necessary at this point; could refactor to allow asynchronous saving, which would presumably be faster...
    function(user_id, tweetsArray, newestOfTheOlderTweetsid_str, callback) {
      // NB shouldn't have to consider case where tweetsArray contains less than 2 tweets, because 1 or 0 tweets would imply
      // that there wasn't a gap in the first place
      // if oldest tweet in new batch has id_str which matches the id_str of the newest of the older tweets we already had,
      // then we have closed the gap, and we don't want to save this oldest tweet
      // because it's already in the db
      if (tweetsArray[tweetsArray.length - 1].id_str === newestOfTheOlderTweetsid_str) {
        // tweetsArray here is in reverse chronological order, so the last item in array is the oldest tweet
        console.log('The gap has been closed.');
        tweetsArray.pop();
      } else {
        console.log('A gap still remains.');
        tweetsArray[tweetsArray.length - 1].gapAfterThis = true;
      }
      async.eachSeries(tweetsArray.reverse(), 
        function(tweet, callback) {
          db.saveTweet(user_id, tweet, callback);
        }, 
        function(err) {
          if (err) {
            console.log('Error saving middle tweets:', err);
            callback(err);
          } else {
            callback(null, user_id, oldestOfMoreRecentTweetsIdStr, newestOfTheOlderTweetsid_str);
          }
        }
      );
    },
    // could consolidate the updateGapMarker query with the findTweetsSinceIdAndBeforeId query, may be faster
    db.updateGapMarker,
    // grab tweets from the db
    db.findTweetsSinceIdAndBeforeId,
    // calculate p values for tweets, if auto-wynnoing is on
    function(tweets, callback) {
      if (req.user.autoWynnoing) {
        algo.crunchTheNumbers(req.user._id, tweets, null, callback);
      } else {
        callback(null, tweets);
      }
    }
  ], function(error, tweets) {
    if (error) {
      if (error.slice(0,20) === 'Please try again in ') {
        res.send(429, error);
      } else {
        console.log(error);
        res.send(500);
      }
    } else {
      // send the tweets back to the client
      res.send({ tweets: tweets });
    }
  });
};

var checkTimeOfLastFetch = function(timeOfLastFetch, callback) {
  console.log('time of last fetch before this one:', timeOfLastFetch);
  if (timeOfLastFetch) {
    var timeSinceLastFetch = new Date().getTime() - timeOfLastFetch;
  }
  if (timeSinceLastFetch && timeSinceLastFetch < 61000) {
    callback('Please try again in ' + Math.ceil((61000 - timeSinceLastFetch)/1000).toString() + ' seconds. Currently unable to fetch new tweets due to Twitter API rate limiting.');
  } else {
    callback(null);
  }
};

exports.processVote = function(req, res) {
  var data = req.body;
  async.series([
    function(callback) {
      db.saveVote(req.user._id, data._id, data.vote, callback);
    }
  ], function(error) {
    if (error) {
      console.log(error);
      res.send(500);
    } else {
      res.send('Successfully recorded your vote on tweet' + data._id);
    }
  });
};

exports.saveFilter = function(req, res) {
  var data = req.body;
  console.log('/savefilter request data look like', data)
  async.waterfall([
    function(callback) {
      db.saveFilter(req.user._id, data.draftFilter, data.revisionOfFilter_id, callback);
    }
  ], function(error) {
    if (error) {
      console.log(error);
      res.send(500);
    } else {
      res.send('Success saving filter:' + data.draftFilter + ', revision of filter:' + data.revisionOfFilter_id);
    }
  });
};

exports.disableFilter = function(req, res) {
  var data = req.body;
  console.log('/disablefilter request data look like', data)
  async.waterfall([
    function(callback) {
      db.disableFilter(req.user._id, data.activeFiltersIndex, data.filter_id, callback);
    }
  ], function(error) {
    if (error) {
      console.log(error);
      res.send(500);
    } else {
      res.send('Successfully disabled filter.');
    }
  });
};

exports.getSettings = function(req, res) {
  db.getSettings(req.user._id, null, function(error, tweetsPassingOn, settings) {
    // we are just grabbing settings, so tweetsPassingOn is null;
    if (error) {
      console.log(error);
      res.send(500);
    } else {
      res.send(settings);
    }
  });
};

exports.makeSuggestion = function(req, res) {
  // check that user is eligible for new recommendation
  // currently that is the case if voteCount is a multiple of 100
  var voteCount = req.user.voteCount;
  if (voteCount % 100 !== 0 || voteCount === 0) {
    var requiredVotes = 100 - (voteCount - (voteCount / 100).floor() * 100)
    res.send(402, "User must vote on " + requiredVotes.toString() + " more tweets to generate new filter suggestion.");
  } else {
    async.waterfall([
        function(callback) {
          algo.suggestFilters(req.user._id, callback);
        }
      ], function(error, suggestedFilters, undismissedSugg) {
        if (error) {
          console.log('Error making suggestions:', error);
          res.send(500);
        } else {
          console.log('Sending back suggested filters:', suggestedFilters)
          res.send({ suggestedFilters: suggestedFilters, undismissedSugg: undismissedSugg });
        }
      })
  }
};

exports.adoptSuggestion = function(req, res) {
  var data = req.body;
  async.waterfall([
    function(callback) {
      db.adoptSuggestion(req.user._id, data.suggestedFiltersIndex, callback)
    }
  ], function(error) {
    if (error) {
      console.log(error);
      res.send(500);
    } else {
      res.send('Successfully adopted suggestion.');
    }
  });
};

exports.dismissSuggestion = function(req, res) {
  var data = req.body;
  async.waterfall([
    function(callback) {
      db.dismissSuggestion(req.user._id, data.suggestedFiltersIndex, callback)
    }
  ], function(error) {
    if (error) {
      console.log(error);
      res.send(500);
    } else {
      res.send('Successfully dismissed suggestion.');
    }
  });
};

exports.processFeedback = function(req, res) {
  var user_id = req.user ? req.user._id : null;
  var data = req.body;
  var validatedEmail = req.body.email;
  async.waterfall([
    // validate the received input
    function(callback) {
      req.checkBody('feedback', 'Feedback must not be empty.').notEmpty();
      req.checkBody('email', 'Not a valid email').isEmail();
      var errors = req.validationErrors();
      console.log('errors:', errors);
      // if there's an error with feedback, send back 400. otherwise, e.g. if email is invalid, that's okay because email is optional
      if (errors && errors[0].param === 'feedback') {
        callback(errors[0].msg);
      } else {
        // if email is invalid, use null
        if (errors && errors[0].param === 'email') {
          validatedEmail = null;
        }
        callback(null, validatedEmail);
      }
    },
    // then save to the db
    function(validatedEmail, callback) {
      db.saveFeedback(user_id, data.feedback, validatedEmail, callback)
    }
  ], function(error) {
    if (error) {
      console.log(error);
      if (error === 'Feedback must not be empty.') {
        res.send(400, error);
      } else {
        res.send(500);
      }
    } else {
      res.send('Successfully recorded your feedback. Thanks!');
    }
  });
};
exports.processAgreement = function(req, res) {
  if (req.body.agreement !== true) {
    res.send(400, 'Route only accepts agreement value of true, indicating ToS agreed to.');
  }
  async.series([
    function(callback) {
      db.saveAgreement(req.user._id, req.body.agreement, callback)
    }
  ], function(error) {
    if (error) {
      console.log(error);
      res.send(500);
    } else {
      res.send("Successfully saved user's agreement to Terms of Service.");
    }
  });
};

exports.toggleAutoWynnoing = function(req, res) {
  var data = req.body;
  if (req.user.voteCount < 200) {
    res.send(429, (200 - req.user.voteCount) + " more votes required before auto-wynnoing can be turned on.");
  }
  async.waterfall([
    function(callback) {
      db.updateAutoWynnoing(req.user._id, req.body.autoWynnoing, callback);
    }
  ], function(error) {
    if (error) {
      res.send(500);
    } else {
      if (!req.body.autoWynnoing) {
        req.session.autoWynnoingJustToggledOn = false; // this is relevant to old()
        res.send("Auto-wynnoing has been turned off.");
      } else {
        req.session.autoWynnoingJustToggledOn = true; // this is used by old()
        old(req, res);
      }
    }
  });
};

