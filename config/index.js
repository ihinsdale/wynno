'use strict';

var path = require('path');
var credentials = require('./keys.json');

module.exports = function(app) {
  app.set('env', process.env.NODE_ENV || 'development');
  app.set('port', process.env.PORT || 8080);
  app.set('publicDNS', credentials.publicDNS);
  console.log('publicDNS is:', app.get('publicDNS'));
  
  app.set('views', path.resolve(__dirname, '../public/views'));
  // We're going to use plain old html views (Grunt had trouble trying to minify jade templates)
  app.engine('html', require('ejs').renderFile); // We use the ejs engine to serve regular HTML
  app.set('view engine', 'html');

  // Include environments
  require('./environments.js')(app);

  // Include db
  require('./db.js')(app);

  // Include middleware
  require('./middleware.js').init(app);

  // Include routes
  require('./routes.js')(app);
};