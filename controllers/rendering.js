var replaceAt = function(string, start, end, using) {
  return string.substr(0, start) + using + string.substr(end, string.length);
};

var insertLinkHTML = function(tweet) {
  var insertType = function(urls_or_media) {
    var type = tweet.__entities[urls_or_media];
    if (type && type.length !== 0) {
      for (var i = 0; i < type.length; i++) {
        tweet.__text = replaceAt(tweet.__text, type[i].indices[0], type[i].indices[1], '<a href="' + type[i].url + '" target="_blank">' + type[i].display_url + '</a>');
        console.log('text with rendered link looks like:', tweet.__text);
      }
    }
  };

  if (tweet.__entities) {
    console.log('about to replace url with link');
    insertType('urls');
    insertType('media');
  }
};

exports.renderLinks = function(tweets, callback) {
  for (var i = 0; i < tweets.length; i++) {
    insertLinkHTML(tweets[i]);
  }
  callback(null, tweets);
};