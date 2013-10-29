
/*
 * GET home page.
 */
var twitter = require('./twitter.js');

exports.index = function(req, res) {
  res.render('index', { title: 'Express' });
};

exports.refresh = function(req, res) {
  twitter.fetchAndSave();
};