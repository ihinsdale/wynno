/*
 * GET home page.
 */
var twitter = require('./twitter.js');
var db = require('./dbRW.js');
var Tweet = require('../models/Tweet.js').Tweet;

exports.index = function(req, res) {
  res.render('index', { title: 'Express' });
};

exports.old = function(req, res) {
  res.send();
}

exports.fresh = function(req, res) {
  // find the id of the last tweet saved to the db
  db.findLastTweet(Tweet,
    // then fetch new tweets since that id from Twitter API
    twitter.fetch,
    // and save those new tweets to the db
    db.saveSync);
};