var replaceAt = function(string, start, end, using) {
  return string.substr(0, start) + using + string.substr(end, string.length);
};

var insertLinkHTML = function(tweet) {
  if (tweet.__entities) {
    console.log('about to replace url with link');
    var urls = tweet.__entities.urls;
    if (urls && urls.length !== 0) {
      for (var i = 0; i < urls.length; i++) {
        tweet.__text = replaceAt(tweet.__text, urls[i].indices[0], urls[i].indices[1], '<a href="' + urls[i].url + '">' + urls[i].display_url + '</a>');
        console.log('text with rendered link looks like:', tweet.__text);
      }
    }
  }
};

exports.renderLinks = function(tweets, callback) {
  for (var i = 0; i < tweets.length; i++) {
    insertLinkHTML(tweets[i]);
  }
  callback(null, tweets);
};