/*
 * GET home page.
 */
var async = require('async');
var twitter = require('./twitter.js');
var db = require('./dbRW.js');
var Tweet = require('../models/Tweet.js').Tweet;

exports.index = function(req, res) {
  res.render('index', { title: 'Express' });
};

exports.old = function(req, res) {
  db.findAllTweets(function(docs) {
    res.send(docs);
  });
};

exports.fresh = function(req, res) {
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
    // get this new batch of tweets out of the database
    db.findTweetsSince_id,
    // send the tweets back to the client
    function(tweets, callback) {
      res.send(tweets);
      callback(null);
    }
  ]);
};

exports.processVote = function(req, res) {
  var data = req.body;
  async.series([
    function(callback) {
      db.saveVote(data._id, data.vote, callback);
    }
  ]);
};