module.exports = function(app) {
  // Include controllers
  var routes = require('../controllers/site.js');
  var user = require('../controllers/user.js');
  var passport = require('passport');

  // GET request to homepage
  app.get('/', routes.index);
  // GET request to /old grabs old tweets from database
  app.get('/old', routes.old)
  // GET request to /new initiates request to Twitter API, saves tweets to database, send to client
  app.get('/new', routes.fresh);
  // POST request to /vote saves vote in the database
  app.post('/vote', routes.processVote);
  // POST request to /settings saves new filter setting in the database
  app.post('/settings', routes.processSetting);
  // GET request to /settings
  app.get('/settings', routes.getSettings);
  // GET request to /auth/twitter caused by clicking 'Sign in with twitter'
  app.get('/auth/twitter', passport.authenticate('twitter'));
  // GET request to /auth/twitter/callback caused by successful request for token to Twitter API
  app.get('/auth/twitter/callback', 
    passport.authorize('twitter', { successRedirect: '/',
                                     failureRedirect: '/login' })
  );
};