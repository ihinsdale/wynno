
/*
 * GET home page.
 */
var fs = require('fs');

exports.index = function(req, res) {
  res.render('index', { title: 'Express' });
};

exports.refresh = function(req, res) {
  var twit = require('../config/config.js').twit;
  twit.get('https://api.twitter.com/1.1/statuses/home_timeline.json', {count: 10}, function(error, data) {
    console.log('number of tweets:', data.length);
    //console.log(data);
    for (var i = 0; i < data.length; i++) {
      fs.writeFileSync('tweet' + i + '.txt', data[i]);
    }
    // for (var i = 0; i < data.length; i++) {
    //   var tweet = {};
    //   tweet.
    //   collection.insert(data[i], function(err, docs) {
    //     if (err) throw error;
    //     console.log("Inserted a document.");
    //   });
    // }
  });
};