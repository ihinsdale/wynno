var path = require('path');
var os = require('os');
var credentials = require('./keys.json')

module.exports = function(app) {
  app.set('env', process.env.NODE_ENV || 'development')
  app.set('port', process.env.PORT || 8080);
  app.set('publicDNS', credentials.publicDNS);
  console.log('publicDNS is:', app.get('publicDNS'));
  
  app.set('views', path.resolve(__dirname, '../views'));
  app.set('view engine', 'jade');

  // Include environments
  require('./environments.js')(app);

  // Include db
  require('./db.js')(app);

  // Include middleware
  require('./middleware.js').init(app);

  // Include routes
  require('./routes.js')(app);
};