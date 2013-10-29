var Twitter = require('ntwitter');

exports.twit = function() {
  // Define user's Twitter credentials
  return new Twitter({
    consumer_key: '0adZZZjZVIDxGtDJY0shkA',
    consumer_secret: 'Ke3KzVQk01grsPb6Df5h4nCvAQVLJQX7rEqTwkcnKY',
    access_token_key: '78494906-ijDki2Ht5a9CB8za40awzAja6H0bQeNNNKvYrfyuk',
    access_token_secret: '8hvztfCXHlicqaeecfPlLbMvC9086Cmt1BCZYlaLhA'
  });
};