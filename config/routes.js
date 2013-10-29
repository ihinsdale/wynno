module.exports = function(app) {
  // Include controllers
  var routes = require('../controllers/site.js');
  var user = require('../controllers/user.js');

  // GET request to homepage grabs old tweets from database
  app.get('/', routes.index);
  // GET request to /new initiates request to Twitter API, saves tweets to database, send to client
  app.get('/new', routes.refresh);
};