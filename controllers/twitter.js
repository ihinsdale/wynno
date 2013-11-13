var OAuth = require('oauth').OAuth;

var oa = new OAuth(
  "https://api.twitter.com/oauth/request_token",
  "https://api.twitter.com/oauth/access_token",
  "0adZZZjZVIDxGtDJY0shkA",
  "Ke3KzVQk01grsPb6Df5h4nCvAQVLJQX7rEqTwkcnKY",
  "1.0A",
  "http://127.0.0.1:8080/auth/twitter/callback",
  "HMAC-SHA1"
);

exports.getRequestToken = function(req, res) {
  oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
    if (error) {
      console.log(error);
      res.send("yeah no. didn't work.")
    } else {
      req.session.oauth = {};
      req.session.oauth.token = oauth_token;
      console.log('oauth.token: ' + req.session.oauth.token);
      req.session.oauth.token_secret = oauth_token_secret;
      console.log('oauth.token_secret: ' + req.session.oauth.token_secret);
      res.redirect('https://twitter.com/oauth/authorize?oauth_token='+oauth_token)
    }
  });
};

exports.successCallback = function(req, res, next) {
  console.log('inside the success callback');
  if (req.session.oauth) {
    req.session.oauth.verifier = req.query.oauth_verifier;
    var oauth = req.session.oauth;

    oa.getOAuthAccessToken(oauth.token,oauth.token_secret,oauth.verifier, 
    function(error, oauth_access_token, oauth_access_token_secret, results){
      if (error){
        console.log(error);
        res.send("yeah something broke.");
      } else {
        req.session.oauth.access_token = oauth_access_token;
        req.session.oauth.access_token_secret = oauth_access_token_secret;
        console.log(results);
        console.log('user access token is:', req.session.oauth.access_token);
        console.log('user secret is:', req.session.oauth.access_token_secret);
        res.send("worked. nice one.");
      }
    }
    );
  } else
    next(new Error("you're not supposed to be here."));
};

exports.timeOfLastFetch = null;

// Fetch new tweets from Twitter API
exports.fetch = function(id, _id, callback) {
  console.log('fetching tweets since', id);
  var twit = require('../config/config.js').twit();
  var options = {count: 200};
  if (id) {
    options.since_id = id;
  }
  twit.get('https://api.twitter.com/1.1/statuses/home_timeline.json', options, function(error, data) {
    exports.timeOfLastFetch = new Date().getTime();
    if (error) {
      console.log('there was an error getting tweets from Twitter API:', error);
    } else {
      console.log('number of tweets:', data.length);
      callback(null, data, _id);
    }
  });
};



