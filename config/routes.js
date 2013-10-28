module.exports = function(app) {
  // Include controllers
  var routes = require('./controllers/site.js');
  var user = require('./controllers/user.js');

  app.get('/', routes.index);
  app.get('/users', user.list);
};