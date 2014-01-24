var async = require('async');
var twitter = require('./twitter.js');
var db = require('./dbRW.js');
var algo = require('./algo.js');
var rendering = require('./rendering.js');


exports.index = function(req, res) {
  // if user is already in session, send them the cookie again
  // [WHY??]
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
  async.waterfall([
    function(callback) {
      db.findTweetsBefore_id(req.user._id, oldestTweetId, callback);
    },
    rendering.renderLinksAndMentions
  ], function(error, tweets) {
    if (error) {
      console.log(error);
      res.send(500);
    } else {
      console.log(tweets);
      res.send(tweets);
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
        db.lastTweetId(req.user._id, callback);
      },
      // use that id to grab new tweets from Twitter API
      function(user_id, id, _id, callback) {
        twitter.fetch(user_id, req.session.access_token, req.session.access_secret, id, _id, callback);
      },
      // save each new tweet to the db. this save is synchronous so that our records have _id's in chronological order
      function(user_id, tweetsArray, _id, callback) {
        async.eachSeries(tweetsArray.reverse(), 
          function(tweet, callback) {
            db.saveTweet(user_id, tweet, callback);
          }, 
          function(err) {
            if (err) {
              console.log('Error saving fresh tweets:', err);
            } else {
              callback(null, user_id, _id);
            }
          }
        );
      },
      // calculate p-values for the new batch of tweets
      // currently this command crunches the numbers for all tweets which haven't been voted on
      // which does some unnecessary processing: we don't need to recrunch numbers for old tweets
      // until the user has done some new voting--e.g. implement a vote counter so that numbers
      // only get crunched every 50 votes
      algo.crunchTheNumbers,
      // get this new batch of tweets out of the database
      db.findTweetsSince_id,
      // render any links in the tweets
      // TODO: do this only once and save the rendered version in a field in the db
      rendering.renderLinksAndMentions,
    ], function(error, tweets) {
      if (error) {
        console.log(error);
        res.send(500);
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

exports.processSetting = function(req, res) {
  var data = req.body;
  console.log('request data look like', data)
  async.waterfall([
    function(callback) {
      db.saveSetting(req.user._id, data.add_or_remove, data.user_or_word, data.mute_or_hear, data.input, callback);
    },
    // TODO: this step of getting the updated settings could be removed if logic on the client-side updates the settings
    //       model/view upon success message from server
    function(callback) {
      db.getSettings(req.user._id, callback);
    }
  ], function(error, settings) {
    if (error) {
      console.log(error);
      res.send(500);
    } else {
      res.send(settings);
    }
  });
};

exports.getSettings = function(req, res) {
  db.getSettings(req.user._id, function(error, settings) {
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
