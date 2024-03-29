'use strict';

var express = require('express');
var path = require('path');
var env = process.env.NODE_ENV;
var credentials = require('./keys/' + env + '/node.json');
var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;
var db = require('../controllers/dbRW.js');
var expressValidator = require('express-validator');
var RedisStore = require('connect-redis')(express);

// Create a custom function for evaluating the CSRF token provided by client, for use
// with the express.csrf middleware
var csrfValue = function(req) {
  console.log('x-xsrf-token header is:', req.headers['x-xsrf-token']);
  var token = (req.headers['x-xsrf-token']) // this is the header used by Angular
    || (req.body && req.body._csrf)
    || (req.query && req.query._csrf)
    || (req.headers['x-csrf-token']);
  return token;
};

exports.init = function(app) {
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(expressValidator());
  app.use(express.methodOverride());
  app.use(express.cookieParser(credentials.secrets.cookieParser));
  app.use(express.session({
    store: new RedisStore({
      host: credentials.redis.host,
      port: credentials.redis.port,
      db: credentials.redis.dbs.session,
      pass: credentials.redis.pass
    }),
    secret: credentials.secrets.session,
    cookie: { path: '/', maxAge: 36000000 } // secure option for HTTPS? investigate this...
  }));
  app.use(express.csrf({value: csrfValue})); // Cf. http://mircozeiss.com/using-csrf-with-express-and-angular/
  app.use(function(req, res, next) {
    var token = req.csrfToken();
    //console.log('CSRF token created on server looks like:', token);
    res.cookie('XSRF-TOKEN', token);
    next();
  });

  console.log('dirname is', __dirname);
  console.log('path', path.join(__dirname, '../..', 'public'));
  app.use(express.static(path.join(__dirname, '../..', 'public')));
  app.use(express.favicon(path.join(__dirname, '../..', 'public/favicon.ico')));

  // initialize passport.js and its session support
  app.use(passport.initialize());
  app.use(passport.session());

  app.use(app.router);

  // define passport.js Twitter auth strategy

  // if we are in a testing deployment/environment or using mock authentication has been specified, use a mock Passport authentication strategy which
  // is hard-coded to use a particular test Twitter user, @TimStudebaker
  if (app.get('mockAuth')) {
    var StrategyMock = require('./strategy-mock.js');
    passport.use(new StrategyMock({
        passAuthentication: true,
        userId: credentials.testing.user_id // this is the ObjectId string of the test user in the db
        // it gets overwritten in the verify function just below, but I'm preserving the structure of
        // Weibel's example (https://gist.github.com/mweibel/5219403) in case in future we want to
        // use multiple test users, who have different userIds, in which case this options object
        // would be passed from the test suite file
      }, function(req, user, done) {
        user = {
          _id: credentials.testing.user_id,
          tw_id: credentials.testing.tw_id,
          //tw_id_str: profile._json.id_str, // this isn't actually used by db.registerUser in the real auth flow...
          tw_name: credentials.testing.tw_name,
          tw_screen_name: credentials.testing.tw_screen_name,
          tw_profile_image_url: credentials.testing.tw_profile_image_url,
          tw_access_token: credentials.testing.tw_access_token,
          tw_access_secret: credentials.testing.tw_access_secret
        };
        req.session.access_token = credentials.testing.tw_access_token;
        req.session.access_secret = credentials.testing.tw_access_secret;
        done(null, user);
      }
    ));
  } else {
    // otherwise we are in a development/staging environment, or the actual production environment,
    // so use a real TwitterStrategy
    passport.use(new TwitterStrategy({
        consumerKey: credentials.twitter.consumer_key,
        consumerSecret: credentials.twitter.consumer_secret,
        callbackURL: 'https://' + app.get('publicDNS') + '/auth/twitter/callback',
        //userAuthorizationURL: 'https://api.twitter.com/oauth/authorize',
        userAuthorizationURL: 'https://api.twitter.com/oauth/authenticate',
        passReqToCallback: true
      },
      function(req, token, tokenSecret, profile, done) {
        // register user with the db, i.e. find and update access_token and access_secret, or create
        console.log('Twitter profile looks like:', profile);
        var user = {
          tw_id: profile._json.id,
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
  }

  passport.serializeUser(function(user, done) {
    // console.log('serializeUser: ' + user._id);
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

exports.ensureAgreedTerms = function (req, res, next) {
  if (req.user.agreed_terms) { return next(); }
  // can't use 401 code because that gets caught by angular interceptor and
  // redirects user to sign in page
  res.send(402, 'User must first agree to Terms of Service.');
};
