'use strict';

// Include controllers
var site = require('../controllers/site.js');
var passport = require('passport');
var ensureAuthenticated = require('./middleware.js').ensureAuthenticated;
var ensureAgreedTerms = require('./middleware.js').ensureAgreedTerms;
var setCSRFtoken = require('./middleware.js').setCSRFtoken;

module.exports = function(app) {
  // GET request to homepage
  app.get('/', site.index);
  // POST request to /old grabs old tweets from database
  app.post('/old', ensureAuthenticated, ensureAgreedTerms, site.old);
  // POST request to /new initiates request to Twitter API, saves tweets to database, send to client
  app.post('/new', ensureAuthenticated, ensureAgreedTerms, site.fresh);
  //app.post('/new', function(req, res) { res.send(500); }); // for purpose of testing client-side 500 response interceptor
  // POST request to /middle initiates request to Twitter API for old tweets, saves tweets to database, send to client
  app.post('/middle', ensureAuthenticated, ensureAgreedTerms, site.middle);
  // POST request to /vote saves vote in the database
  app.post('/vote', ensureAuthenticated, ensureAgreedTerms, site.processVote);
  // POST request to /savefilter saves new filter in the database
  app.post('/savefilter', ensureAuthenticated, ensureAgreedTerms, site.saveFilter);
  // POST request to /disablefilter disables a filter
  app.post('/disablefilter', ensureAuthenticated, ensureAgreedTerms, site.disableFilter);
  // GET request to /settings
  app.get('/settings', ensureAuthenticated, ensureAgreedTerms, site.getSettings);
  // POST request to /suggest
  app.post('/suggest', ensureAuthenticated, ensureAgreedTerms, site.makeSuggestion);
  // POST request to /adoptsuggestion
  app.post('/adoptsuggestion', ensureAuthenticated, ensureAgreedTerms, site.adoptSuggestion);
  // POST request to /dismisssuggestion
  app.post('/dismisssuggestion', ensureAuthenticated, ensureAgreedTerms, site.dismissSuggestion);
  // POST request to /enabledisfilterorsugg disables a filter
  app.post('/enabledisfilterorsugg', ensureAuthenticated, ensureAgreedTerms, site.enableDisFilterOrSugg);
  // POST request to /autowynnoing
  app.post('/autowynnoing', ensureAuthenticated, ensureAgreedTerms, site.toggleAutoWynnoing);
  // GET request to /checkin after authenticating with Twitter
  app.get('/checkin', ensureAuthenticated, setCSRFtoken, site.checkin);
  // GET request to /auth/twitter caused by clicking 'Sign in with twitter'
  app.get('/auth/twitter', passport.authenticate('twitter', { failureRedirect: '/' }));
  // GET request to /auth/twitter/callback caused by successful request for token to Twitter API
  app.get('/auth/twitter/callback',
    passport.authenticate('twitter', { successRedirect: '/checkin',
                                     failureRedirect: '#/signinwithtwitter' })
  );
  // POST request to /logout
  app.post('/logout', ensureAuthenticated, site.logout);
  // POST request to /feedback records feedback in the database
  app.post('/feedback', ensureAuthenticated, site.processFeedback);
  // POST request to /agreed
  app.post('/agreed', ensureAuthenticated, site.processAgreement);
  if (app.get('env') === 'testing' || app.get('mockAuth')) {
    app.get('/mock/login', passport.authenticate('mock', { successRedirect: '/checkin',
                                                         failureRedirect: '#/signinwithtwitter' }));
  }
  app.all('*', function(req, res) {
    res.send(404);
  });
};
