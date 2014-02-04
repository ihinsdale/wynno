var replaceAt = function(string, start, end, using) {
  return string.substr(0, start) + using + string.substr(end, string.length);
};

var handleType = function(type, tweet) {
  var items = tweet.__entities[type];
  if (items) {
    if (type === 'urls' || type === 'media') {
      for (var i = 0; i < items.length; i++) {
        if (i === 0) {
          after = 0;
        } else {
          after = start + 30 + items[i-1].url.length + items[i-1].display_url.length;
        }  // so that we always search for items[i].url after our last insertion (assumes urls come in order from Twitter API, which they appear to be)
        start = tweet.__text.indexOf(items[i].url, after);
        end = start + items[i].url.length;
        tweet.__text = replaceAt(tweet.__text, start, end, "<a href='" + items[i].url + "' target='_blank'>" + items[i].display_url + "</a>");
      }
    } else if (type === 'user_mentions') {
      for (var i = 0; i < items.length; i++) {
        if (i === 0) {
          after = 0;
        } else {
          after = start + 50 + 2 * items[i-1].screen_name.length;
        }  // so that we always search for items[i].screen_name after our last insertion (assumes screen_names come in order from Twitter API, which they appear to be)
        start = tweet.__text.indexOf('@', after) + 1;
        end = start + items[i].screen_name.length;
        tweet.__text = replaceAt(tweet.__text, start, end, "<a href='https://twitter.com/" + items[i].screen_name + "' target='_blank'>" + items[i].screen_name + "</a>");
      }
    }
  }
};

var insertHTML = function(tweet) {
  if (tweet.__entities) {
    handleType('urls', tweet);
    handleType('media', tweet);
    handleType('user_mentions', tweet);
  }
};

exports.renderLinksAndMentions = function(tweets, callback) {
  for (var i = 0; i < tweets.length; i++) {
    insertHTML(tweets[i]);
  }
  callback(null, tweets);
};