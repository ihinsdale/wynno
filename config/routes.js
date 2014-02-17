module.exports = function(app) {
  // Include controllers
  var site = require('../controllers/site.js');
  var user = require('../controllers/user.js');
  var passport = require('passport');
  var ensureAuthenticated = require('./middleware.js').ensureAuthenticated;
  var ensureAgreedTerms = require('./middleware.js').ensureAgreedTerms;

  // GET request to homepage
  app.get('/', site.index);
  // GET request to /old grabs old tweets from database
  app.get('/old', ensureAuthenticated, ensureAgreedTerms, site.old)
  // GET request to /new initiates request to Twitter API, saves tweets to database, send to client
  app.get('/new', ensureAuthenticated, ensureAgreedTerms, site.fresh);
  // POST request to /vote saves vote in the database
  app.post('/vote', ensureAuthenticated, ensureAgreedTerms, site.processVote);
  // POST request to /savefilter saves new filter in the database
  app.post('/savefilter', ensureAuthenticated, ensureAgreedTerms, site.saveFilter);
  // POST request to /disablefilter disables a filter
  app.post('/disablefilter', ensureAuthenticated, ensureAgreedTerms, site.disableFilter);
  // GET request to /settings
  app.get('/settings', ensureAuthenticated, ensureAgreedTerms, site.getSettings);
  // GET request to /checkin after authenticating with Twitter
  app.get('/checkin', ensureAuthenticated, site.checkin);
  // GET request to /auth/twitter caused by clicking 'Sign in with twitter'
  app.get('/auth/twitter', passport.authenticate('twitter', { failureRedirect: '/account' }));
  // GET request to /auth/twitter/callback caused by successful request for token to Twitter API
  app.get('/auth/twitter/callback', 
    passport.authenticate('twitter', { successRedirect: '/checkin',
                                     failureRedirect: '#/signinwithtwitter' })
  );
  // GET request to /logout
  app.get('/logout', ensureAuthenticated, site.logout);
  // POST request to /feedback records feedback in the database
  app.post('/feedback', site.processFeedback);
  // POST request to /agreed
  app.post('/agreed', ensureAuthenticated, site.processAgreement)
};
