var path = require('path');
var os = require('os');

module.exports = function(app) {
  app.set('env', process.env.NODE_ENV || 'development')
  app.set('port', process.env.PORT || 8080);
  app.set('host', os.hostname());
  console.log('Port is:', app.get('port'));
  console.log('Host is:', app.get('host'));
  
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