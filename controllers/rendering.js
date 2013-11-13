var replaceAt = function(string, start, end, using) {
  return string.substr(0, start) + using + string.substr(end, string.length);
};

var insertLinkHTML = function(tweet) {
  if (tweet.__entities) {
    var urls = tweet.__entities.urls;
    var media = tweet.__entities.media;
    var total = 0;
    var numUrls;
    var numMedia;
    if (urls) {
      numUrls = urls.length;
      total += numUrls;
    } else {
      numUrls = 0;
    }
    if (media) {
      numMedia = media.length;
      total += numMedia;
    } else {
      numMedia = 0;
    }
    if (total === 1) {
      if (numUrls) {
        tweet.__text = replaceAt(tweet.__text, urls[0].indices[0], urls[0].indices[1], '<a href="' + urls[0].url + '" target="_blank">' + urls[0].display_url + '</a>');
      } else {
        tweet.__text = replaceAt(tweet.__text, media[0].indices[0], media[0].indices[1], '<a href="' + media[0].url + '" target="_blank">' + media[0].display_url + '</a>');
      }
    } else if (total > 1) {
      // could optimize this by using always using provided indices for first replacement
      var after;
      var start;
      var end;
      if (numUrls) {
        for (var i = 0; i < numUrls; i++) {
          if (i === 0) {
            after = 0;
          } else {
            after = start + 30 + urls[i-1].url.length + urls[i-1].display_url.length;
          }  // so that we always search for urls[i].url after our last insertion (assumes urls come in order from Twitter API, which they appear to be)
          start = tweet.__text.indexOf(urls[i].url, after);
          end = start + urls[i].url.length;
          tweet.__text = replaceAt(tweet.__text, start, end, '<a href="' + urls[i].url + '" target="_blank">' + urls[i].display_url + '</a>');
        }
      }
      if (numMedia) {
        for (var j = 0; j < numMedia; j++) {
          if (j === 0) {
            after = 0;
          } else {
            after = start + 30 + media[j-1].url.length + media[j-1].display_url.length;
          } // so that we always search for media[i].url after our last insertion (assumes urls come in order from Twitter API, which they appear to be)
          start = tweet.__text.indexOf(media[j].url, after);
          end = start + media[j].url.length;
          tweet.__text = replaceAt(tweet.__text, start, end, '<a href="' + media[j].url + '" target="_blank">' + media[j].display_url + '</a>');
        }
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