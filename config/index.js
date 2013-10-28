var path = require('path');

module.exports = function(app) {
  app.set('port', process.env.PORT || 3000);
  app.set('views', path.resolve(__dirname, '../views'));
  app.set('view engine', 'jade');

  // Include environments
  require('./environments.js')(app);

  // Include db
  require('./db.js')(app);

  // Include middleware
  require('./middleware.js')(app);

  // Include routes
  require('./routes.js')(app);
};