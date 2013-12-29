module.exports = function(app) {
  // Include controllers
  var site = require('../controllers/site.js');
  var user = require('../controllers/user.js');
  var passport = require('passport');
  var ensureAuthenticated = require('./middleware.js').ensureAuthenticated;

  // GET request to homepage
  app.get('/', site.index);
  // GET request to /old grabs old tweets from database
  app.get('/old', ensureAuthenticated, site.old)
  // GET request to /new initiates request to Twitter API, saves tweets to database, send to client
  app.get('/new', ensureAuthenticated, site.fresh);
  // POST request to /vote saves vote in the database
  app.post('/vote', ensureAuthenticated, site.processVote);
  // POST request to /settings saves new filter setting in the database
  app.post('/settings', ensureAuthenticated, site.processSetting);
  // GET request to /settings
  app.get('/settings', ensureAuthenticated, site.getSettings);
  // GET request to /auth/twitter caused by clicking 'Sign in with twitter'
  app.get('/auth/twitter', passport.authenticate('twitter', { failureRedirect: '/account' }));
  // GET request to /auth/twitter/callback caused by successful request for token to Twitter API
  app.get('/auth/twitter/callback', 
    passport.authenticate('twitter', { successRedirect: '/',
                                     failureRedirect: '/login' })
  );
};