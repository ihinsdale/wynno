'use strict';

var keys = require('../config/keys.json').twitter;
var Twitter = require('ntwitter');

exports.timeOfLastFetch = null;

// Fetch new tweets from Twitter API
exports.fetchNew = function(user_id, token, tokenSecret, secondLatestid_str, latestid_str, callback) {
  console.log('fetching tweets since:', secondLatestid_str);
  var options = {};
  if (secondLatestid_str) {
    options.since_id = secondLatestid_str;
    console.log('Twitter id of second to last tweet, as sent in fetch call to Twitter API:', options.since_id);
    console.log('type of that id:', typeof options.since_id);
  }
  twitGet(user_id, token, tokenSecret, options, latestid_str, callback);
};

exports.fetchMiddle = function(user_id, token, tokenSecret, oldestOfMoreRecentTweetsIdStr, secondNewestOfOlderTweetsIdStr, newestOfOlderTweetsIdStr, callback) {
  console.log('fetching tweets since', secondNewestOfOlderTweetsIdStr, 'and before', oldestOfMoreRecentTweetsIdStr);
  var options = {
    max_id: decStrNum(oldestOfMoreRecentTweetsIdStr) // need to decrement because max_id is inclusive
  };
  if (secondNewestOfOlderTweetsIdStr) {
    options.since_id = secondNewestOfOlderTweetsIdStr;
  }
  twitGet(user_id, token, tokenSecret, options, newestOfOlderTweetsIdStr, callback);
};

var twitGet = function(user_id, token, tokenSecret, options, latestid_str, callback) {
  options.count = 195;
  var twit = new Twitter({
    consumer_key: keys.consumer_key,
    consumer_secret: keys.consumer_secret,
    access_token_key: token,
    access_token_secret: tokenSecret
  });
  twit.get('https://api.twitter.com/1.1/statuses/home_timeline.json', options, function(error, data) {
    if (error) {
      console.log('there was an error getting tweets from Twitter API:', error);
    } else {
      console.log('number of tweets:', data.length);
      callback(null, user_id, data, latestid_str);
    }
  });
};

exports.incStrNum = incStrNum = function(n) { // courtesy of http://webapplog.com/decreasing-64-bit-tweet-id-in-javascript/
  // NB only works for n >= 0
  n = n.toString(); // but n should be passed in as a string
  var result = n;
  var i = n.length - 1;
  while (i > -1) {
    if (n[i] === "9") {
      result = result.substring(0,i) + "0" + result.substring(i + 1);
      i--;
    } else {
      result=result.substring(0,i)+(parseInt(n[i],10)+1).toString()+result.substring(i+1);
      return result;
    }
  }
  return result;
};

exports.decStrNum = decStrNum = function(n) {
  // NB only works for n > 0
  n = n.toString();
  var result = n;
  var i = n.length - 1;
  while (i > -1) {
    if (n[i] === "0") {
      result = result.substring(0,i) + "9" + result.substring(i + 1);
      i--;
    } else {
      result=result.substring(0,i)+(parseInt(n[i],10)-1).toString()+result.substring(i+1);
      if (i === 0 && result[0] === "0") {
        result = result.substring(1);
      }
      return result;
    }
  }
  return result;
};
