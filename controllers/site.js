/*
 * GET home page.
 */
var async = require('async');
var twitter = require('./twitter.js');
var db = require('./dbRW.js');
var Tweet = require('../models/Tweet.js').Tweet;
var algo = require('./algo.js');
var rendering = require('./rendering.js');

exports.index = function(req, res) {
  res.render('index', { title: 'wynno' });
};

exports.old = function(req, res) {
  var oldestTweetId = req.query.oldestTweetId;
  console.log('oldestTweetId sent in request looks like:', oldestTweetId);
  async.waterfall([
    function(callback) {
      db.findTweetsBefore_id(oldestTweetId, callback);
    },
    rendering.renderLinks,
    function(tweets, callback) {
      res.send(tweets);
      callback(null);
    }
  ]);
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
      db.lastTweetId,
      // use that id to grab new tweets from Twitter API
      twitter.fetch,
      // save each new tweet to the db. this save is synchronous so that our records have _id's in chronological order
      function(tweetsArray, _id, callback) {
        async.eachSeries(tweetsArray.reverse(), db.saveTweet, function(err) {
          if (err) {
            console.log('error saving tweet');
          } else {
            callback(null, _id);
          }
        });
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
      rendering.renderLinks,
      // send the tweets back to the client
      function(tweets, callback) {
        res.send(tweets);
        callback(null);
      }
    ]);
  }
};

exports.processVote = function(req, res) {
  var data = req.body;
  async.series([
    function(callback) {
      db.saveVote(data._id, data.vote, callback);
    },
    function(callback) {
      res.send('successfully recorded your vote on that tweet');
      callback(null);
    }
  ]);
};

exports.processSetting = function(req, res) {
  var data = req.body;
  console.log('request data look like', data)
  async.waterfall([
    // function(callback) {
    //   db.createUser({email: 'ihinsdale@gmail.com', password: 'test'}, callback);
    // },
    function(callback) {
      db.saveSetting(data.user_id, data.add_or_remove, data.user_or_word, data.mute_or_protect, data.input, callback);
    },
    function(callback) {
      db.getSettings('52783164c5d992a75e000001', callback);
    },
    function(settings, callback) {
      res.send(settings);
      callback(null);
    }
  ]);
};

exports.getSettings = function(req, res) {
  async.waterfall([
    function(callback) {
      db.getSettings('52783164c5d992a75e000001', callback);
    },
    function(settings, callback) {
      res.send(settings);
      callback(null);
    }
  ]);
};

exports.signIn = function(req, res) {
  twitter.getRequestToken(req, res);
};

exports.signInSuccessCallback = function(req, res, next) {
  twitter.successCallback(req, res, next);
};