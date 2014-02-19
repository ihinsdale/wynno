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

exports.old = function(req, res) {
  var oldestTweetId = req.query.oldestTweetId;
  console.log('oldestTweetId sent in request looks like:', oldestTweetId);
  console.log('typeof oldestTweetId:', typeof oldestTweetId);
  async.waterfall([
    function(callback) {
      db.findTweetsBeforeId(req.user._id, oldestTweetId, callback);
    },
    function(tweets, callback) {
      // if settings were requested too, get those
      if (req.query.settings) {
        db.getSettings(req.user._id, tweets, callback);
      } else {
        callback(null, tweets, null);
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
      console.log('sending results for /old:', data);
      res.send(data);
    }
  });
};

exports.fresh = function(req, res) {
  if (twitter.timeOfLastFetch) {
    var timeSinceLastFetch = new Date().getTime() - twitter.timeOfLastFetch;
  }
  if (timeSinceLastFetch && timeSinceLastFetch < 61000) {
    res.send(429, 'Please try again in ' + Math.ceil((61000 - timeSinceLastFetch)/1000).toString() + ' seconds. Currently unable to fetch new tweets due to Twitter API rate limiting.')
  } else {
    async.waterfall([
      // find (Twitter's) tweet id of the last saved tweet
      function(callback) {
        db.getSecondLatestTweetIdForFetching(req.user._id, callback);
      },
      // use that id to grab new tweets from Twitter API
      function(user_id, secondLatestid_str, latestid_str, callback) {
        twitter.fetch(user_id, req.session.access_token, req.session.access_secret, secondLatestid_str, latestid_str, callback);
      },
      // save each new tweet to the db. this save is synchronous so that our records have _id's in chronological chunks
      // which is not strictly necessary at this point; could refactor to allow asynchronous saving, which would presumably be faster...
      function(user_id, tweetsArray, id_str, callback) {
        if (!tweetsArray.length) {
          callback('No new tweets have occurred.');
        } else {
          // if oldest tweet in new batch has id_str which matches the id_str used in the fetch request
          // then we have gotten all tweets since the last fetch, and we don't want to save this oldest tweet
          // because it's already in the db
          var gap = true;
          if (tweetsArray[tweetsArray.length - 1].id_str === id_str) {
            // tweetsArray here is in reverse chronological order, so the last item in array is the oldest tweet
            console.log('No gap remaining between this fetch and previous.');
            tweetsArray.pop();
            gap = false;
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
                  callback(null, user_id, tweetsArray[tweetsArray.length - 2].id_str, tweetsArray[tweetsArray.length - 1].id_str, gap);
                } else if (tweetsArray.length === 1) {
                  callback(null, user_id, null, tweetsArray[tweetsArray.length - 1].id_str, gap);
                }
              }
            }
          );
        }
      },
      // after saving new batch of tweets, update latestTweetId in User doc
      db.updateSecondLatestTweetId,

      // calculate p-values for the new batch of tweets
      // currently this command crunches the numbers for all tweets which haven't been voted on
      // which does some unnecessary processing: we don't need to recrunch numbers for old tweets
      // until the user has done some new voting--e.g. implement a vote counter so that numbers
      // only get crunched every 50 votes
      // (MACHINE LEARNING CURRENTLY DISABLED, by commenting out line below:)
      // algo.crunchTheNumbers,

      // get this new batch of tweets out of the database
      db.findTweetsSinceId
    ], function(error, tweets) {
      if (error) {
        if (error === 'No new tweets have occurred.') {
          res.send([]);
        } else {
          console.log(error);
          res.send(500);
        }
      } else {
        // send the tweets back to the client
        res.send(tweets);
      }
    });
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
      res.send('Successfully recorded your vote on tweet', data._id);
    }
  });
};

exports.saveFilter = function(req, res) {
  var data = req.body;
  console.log('/savefilter request data look like', data)
  async.waterfall([
    function(callback) {
      db.saveFilter(req.user._id, data.draftFilter, data.revisionOf, callback);
    }
  ], function(error) {
    if (error) {
      console.log(error);
      res.send(500);
    } else {
      res.send('Success saving filter:', data.draftFilter, ', revision of filter:', data.revisionOf);
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
