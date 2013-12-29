var keys = require('../config/keys.json').twitter;
var Twitter = require('ntwitter');
var OAuth = require('oauth').OAuth;

var oa = new OAuth(
  "https://api.twitter.com/oauth/request_token",
  "https://api.twitter.com/oauth/access_token",
  keys.consumer_key,
  keys.consumer_secret,
  "1.0A",
  "http://127.0.0.1:8080/auth/twitter/callback",
  "HMAC-SHA1"
);

var twit = new Twitter({
  consumer_key: keys.consumer_key,
  consumer_secret: keys.consumer_secret,
  access_token_key: '78494906-ijDki2Ht5a9CB8za40awzAja6H0bQeNNNKvYrfyuk',
  access_token_secret: '8hvztfCXHlicqaeecfPlLbMvC9086Cmt1BCZYlaLhA'
});

exports.getRequestToken = function(req, res) {
  oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
    if (error) {
      console.log(error);
      res.send("yeah no. didn't work.")
    } else {
      console.log('response body:', results);
      console.log('oauth_token is:', oauth_token);
      console.log('oauth_secret is:', oauth_token_secret);
      // req.session.oauth = {};
      // req.session.oauth.token = oauth_token;
      // console.log('oauth.token: ' + req.session.oauth.token);
      // req.session.oauth.token_secret = oauth_token_secret;
      // console.log('oauth.token_secret: ' + req.session.oauth.token_secret);

      res.send({"oauth_token": oauth_token});
      //res.redirect('https://twitter.com/oauth/authorize?oauth_token='+oauth_token);
      // send JSON object with the oauth token back to angular which then does the redirect on the front end
      // somehow tell angular to ignore the callback get request coming from twitter
      // withCredentials - jquery helper[?] for user authentication
    }
  });
};

exports.successCallback = function(req, res, next) {
  console.log('inside the success callback');
  console.log(req);

  if (req.query) {
    req.session['oauth'] = {
      'token': req.query.oauth_token,
      'verifier': req.query.oauth_verifier
    }
    res.redirect('/');
    // res.query.oauth_token
    // res.query.oauth_verifier;
  } else {
    
  }


  // if (req.session.oauth) {
  //   req.session.oauth.verifier = req.query.oauth_verifier;
  //   var oauth = req.session.oauth;

  //   oa.getOAuthAccessToken(oauth.token,oauth.token_secret,oauth.verifier, 
  //   function(error, oauth_access_token, oauth_access_token_secret, results){
  //     if (error){
  //       console.log(error);
  //       res.send("yeah something broke.");
  //     } else {
  //       req.session.oauth.access_token = oauth_access_token;
  //       req.session.oauth.access_token_secret = oauth_access_token_secret;
  //       console.log(results);
  //       console.log('user access token is:', req.session.oauth.access_token);
  //       console.log('user secret is:', req.session.oauth.access_token_secret);
  //       res.send("worked. nice one.");
  //     }
  //   }
  //   );
  // } else {
  //   next(new Error("you're not supposed to be here."));
  // }
};

exports.timeOfLastFetch = null;

// Fetch new tweets from Twitter API
exports.fetch = function(user_id, id, _id, callback) {
  console.log('fetching tweets since', id);
  var options = {count: 195};
  if (id) {
    options.since_id = id;
    console.log('Twitter id of last tweet, as sent in fetch call to Twitter API:', options.since_id);
    console.log('type of that id:', typeof options.since_id);
  }
  twit.get('https://api.twitter.com/1.1/statuses/home_timeline.json', options, function(error, data) {
    exports.timeOfLastFetch = new Date().getTime();
    if (error) {
      console.log('there was an error getting tweets from Twitter API:', error);
    } else {
      console.log('number of tweets:', data.length);
      callback(null, user_id, data, _id);
    }
  });
};



