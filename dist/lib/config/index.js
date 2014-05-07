'use strict';

var path = require('path');
var env = process.env.NODE_ENV;
var credentials = require('./keys/' + env + '/node.json');

module.exports = function(app) {
  app.set('env', process.env.NODE_ENV || 'dev');
  app.set('port', credentials.port);
  app.set('mockAuth', credentials.testing.mockAuth || false);
  app.set('publicDNS', credentials.publicDNS);
  console.log('publicDNS is:', app.get('publicDNS'));
  
  app.set('views', path.resolve(__dirname, '../../public/views'));
  // We're going to use plain old html views (Grunt had trouble trying to minify jade templates)
  app.engine('html', require('ejs').renderFile); // We use the ejs engine to serve regular HTML
  app.set('view engine', 'html');

  app.set('trust proxy', true); // necessary for use of nginx as reverse proxy; Cf. http://stackoverflow.com/questions/9348487/nginx-as-proxy-of-node-js

  // Include environments
  require('./environments.js')(app);

  // Include db
  require('./db.js')(app);

  // Include middleware
  require('./middleware.js').init(app);

  // Include routes
  require('./routes.js')(app);
};