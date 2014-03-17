var replaceAt = function(string, start, end, using) {
  return string.substr(0, start) + using + string.substr(end, string.length);
};

var handleType = function(type, tweet) {
  var items = tweet.__entities[type];
  if (items) {
    switch(type) {
      case 'urls':
        // no break statement here, as a way of making the case 'urls' || 'media'
      case 'media':
        for (var i = 0; i < items.length; i++) {
          if (i === 0) {
            after = 0;
          } else {
            after = start + 30 + items[i-1].url.length + items[i-1].display_url.length; // 30 is length of the static link html minus 1
          }  // so that we always search for items[i].url after our last insertion (assumes urls come in order from Twitter API, which they appear to be)
          start = tweet.renderedText.indexOf(items[i].url, after);
          end = start + items[i].url.length;
          tweet.renderedText = replaceAt(tweet.renderedText, start, end, "<a href='" + items[i].url + "' target='_blank'>" + items[i].display_url + "</a>");
        }
        break;
      case 'user_mentions':
        for (var i = 0; i < items.length; i++) {
          if (i === 0) {
            after = 0;
          } else {
            after = start + 50 + 2 * items[i-1].screen_name.length;
          }  // so that we always search for items[i].screen_name after our last insertion (assumes screen_names come in order from Twitter API, which they appear to be)
          start = tweet.renderedText.indexOf('@', after) + 1;
          end = start + items[i].screen_name.length;
          tweet.renderedText = replaceAt(tweet.renderedText, start, end, "<a href='https://twitter.com/" + items[i].screen_name + "' target='_blank'>" + items[i].screen_name + "</a>");
        }
        break;
      case 'hashtags':
        for (var i = 0; i < items.length; i++) {
          if (i === 0) {
            after = 0;
          } else {
            after = start + 71 + 2 * items[i-1].text.length; // 71 is the length of the static link html minus 1 (--minus 1 because of zero-indexing)
          }  // so that we always search for items[i].screen_name after our last insertion (assumes screen_names come in order from Twitter API, which they appear to be)
          start = tweet.renderedText.indexOf('@', after) + 1;
          end = start + items[i].text.length;
          tweet.renderedText = replaceAt(tweet.renderedText, start, end, "<a href='https://twitter.com/search?q=%23" + items[i].text + "&src=hash' target='_blank'>" + items[i].text + "</a>");
        }
        break;
    }
  }
};

var insertHTML = function(tweet) {
  var types = ['urls', 'media', 'user_mentions'];
  for (var i = 0; i < types.length; i++) {
    if (tweet.__entities[types[i]]) {
      handleType(types[i], tweet);
    }
  }
};

exports.renderLinksAndMentions = function(tweet) {
  insertHTML(tweet);
};