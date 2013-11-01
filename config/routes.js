module.exports = function(app) {
  // Include controllers
  var routes = require('../controllers/site.js');
  var user = require('../controllers/user.js');

  // GET request to homepage
  app.get('/', routes.index);
  // GET request to /old grabs old tweets from database
  app.get('/old', routes.old)
  // GET request to /new initiates request to Twitter API, saves tweets to database, send to client
  app.get('/new', routes.fresh);
  // POST request to /vote saves vote in the database
  app.post('/vote', routes.processVote);
};