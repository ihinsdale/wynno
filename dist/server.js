// (Disabling newrelic because 1.5.4 still has the memory leak problem)
//require('newrelic');
var express = require('express');
var http = require('http');

var app = express();

// Include our configuration
require('./lib/config/index.js')(app);

module.exports = function(app) {
  http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
  });
};
