var express = require('express');
var http = require('http');

var app = express();

// Include our configuration
require('./config/index.js')(app);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
