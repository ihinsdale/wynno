var express = require('express');
var path = require('path');
var credentials = require('./keys.json');
var passport = require('passport')
var TwitterStrategy = require('passport-twitter').Strategy;
var User = require('../models/User.js').User;
var db = require('../controllers/dbRW.js');

exports.init = function(app) {
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser(credentials.secrets.cookieParser));
  app.use(express.session({ secret: credentials.secrets.session }));

  // initialize passport.js and its session support
  app.use(passport.initialize());
  app.use(passport.session());
  
  app.use(app.router);
  app.use(require('stylus').middleware(__dirname + '/public'));
  console.log('dirname is', __dirname);
  console.log('path', path.join(__dirname, '..', 'public'));
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use(express.favicon(path.join(__dirname, '..', 'public/app/images/favicon.ico')));

  // define passport.js Twitter auth strategy
  passport.use(new TwitterStrategy({
      consumerKey: credentials.twitter.consumer_key,
      consumerSecret: credentials.twitter.consumer_secret,
      callbackURL: "http://" + app.get('publicDNS') + ":" + app.get('port') + "/auth/twitter/callback",
      //callbackURL: "http://127.0.0.1:" + app.get('port') + "/auth/twitter/callback",
      userAuthorizationURL: 'https://api.twitter.com/oauth/authorize',
      passReqToCallback: true
    },
    function(req, token, tokenSecret, profile, done) {
      // register user with the db, i.e. find and update access_token and access_secret, or create
      console.log('Twitter profile looks like:', profile);
      user = {
        tw_id: profile._json.id
        tw_id_str: profile._json.id_str,
        tw_name: profile._json.name,
        tw_screen_name: profile._json.screen_name,
        tw_profile_image_url: profile._json.profile_image_url,
        tw_access_token: token,
        tw_access_secret: tokenSecret
      };
      // save the token and secret in the session for easy access when using to query Twitter API
      req.session.access_token = token;
      req.session.access_secret = tokenSecret;

      // also save the token and secret in the db in case they're ever needed for server processes
      // which don't access the session store. Also save other user details in the db of course.
      db.registerUser(user, done);
    }
  ));

  passport.serializeUser(function(user, done) {
    console.log('serializeUser: ' + user._id);
    done(null, user._id);
  });

  passport.deserializeUser(function(id, done) {
    db.findUser(id, done);
  });
};

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected.
exports.ensureAuthenticated = function (req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.send(401);
};
