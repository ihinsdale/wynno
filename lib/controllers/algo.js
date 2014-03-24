'use strict';

var zerorpc = require('zerorpc');

var client = new zerorpc.Client();
client.connect('tcp://127.0.0.1:4242');

exports.crunchTheNumbers = function(user_id, tweets, settingsPassingOn, callback) {
  // need to stringify the user_id ObjectId object before sending to Python
  client.invoke('predict', user_id.toString(), JSON.stringify(tweets), function(error, res, more) {
    if (error) {
      console.log('there was an error:', error);
      callback(error);
    } else if (more) {
      console.log('there is more to come:', more);
    } else {
      // response is an array of predictions (0 or 1) for whether the user will like the tweets
      console.log(res);
      res = JSON.parse(res);
      // add these predictions to the tweets
      for (var i = 0; i < res.length; i++) {
        tweets[i].__p = res[i];
      }
      callback(null, tweets, settingsPassingOn);
    }
  });
};

exports.suggestFilters = function(user_id, callback) {
  // need to stringify the user_id ObjectId object before sending to Python
  client.invoke('suggest', user_id.toString(), function(error, res, more) {
    if (error) {
      console.log('there was an error:', error);
      callback(error);
    } else if (more) {
      console.log('there is more to come:', more);
    } else {
      res = JSON.parse(res);
      console.log('Response received from RPC call to "suggest":');
      console.log(res);
      callback(null, res.suggestedFilters, res.undismissedSugg);
    }
  });
};
