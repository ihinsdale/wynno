var replaceAt = function(string, start, end, using) {
  return string.substr(0, start) + using + string.substr(end, string.length);
};

var handleType = function(type, tweet) {
  var items = tweet.__entities[type];
  if (items) {
    var after;
    var start;
    var end;
    var uniquelyInvalidPrecedingChars;
    switch(type) {
      case 'urls':
        // no break statement here, as a way of making the case 'urls' || 'media'
      case 'media':
        uniquelyInvalidPrecedingChars = '@#$';
        for (var i = 0; i < items.length; i++) {
          if (i === 0) {
            after = 0;
          } else {
            // so that we always search for items[i].url after our last insertion (assumes urls come in order from Twitter API, which they appear to be)
            after = start + 30 + items[i-1].url.length + items[i-1].display_url.length; // 30 is length of the static link html minus 1
          }
          start = findProperInsertionLocation(uniquelyInvalidPrecedingChars, items[i].url, tweet.renderedText, after);
          end = start + items[i].url.length;
          tweet.renderedText = replaceAt(tweet.renderedText, start, end, "<a href='" + items[i].url + "' target='_blank'>" + items[i].display_url + "</a>");
        }
        break;
      case 'user_mentions':
        uniquelyInvalidPrecedingChars = '!@#$%&*_';
        for (var i = 0; i < items.length; i++) {
          if (i === 0) {
            after = 0;
          } else {
            // so that we always search for items[i].screen_name after our last insertion (assumes screen_names come in order from Twitter API, which they appear to be)
            after = start + 50 + 2 * items[i-1].screen_name.length;
          }
          // provide lowercased versions of the username and the text to search, because capitalization of usernames is irrelevant
          // but retaining it in the renderedText that is searched can cause problems
          start = findProperInsertionLocation(uniquelyInvalidPrecedingChars, ('@' + items[i].screen_name).toLowerCase(), tweet.renderedText.toLowerCase(), after) + 1;
          end = start + items[i].screen_name.length;
          tweet.renderedText = replaceAt(tweet.renderedText, start, end, "<a href='https://twitter.com/" + items[i].screen_name + "' target='_blank'>" + items[i].screen_name + "</a>");
        }
        break;
      case 'hashtags':
        uniquelyInvalidPrecedingChars = '&_';
        for (var i = 0; i < items.length; i++) {
          if (i === 0) {
            after = 0;
          } else {
            // so that we always search for items[i].screen_name after our last insertion (assumes screen_names come in order from Twitter API, which they appear to be)
            after = start + 71 + 2 * items[i-1].text.length; // 71 is the length of the static link html minus 1 (--minus 1 because of zero-indexing)
          }
          start = findProperInsertionLocation(uniquelyInvalidPrecedingChars, '#' + items[i].text, tweet.renderedText, after) + 1; // + 1 because our link won't include the #
          end = start + items[i].text.length;
          tweet.renderedText = replaceAt(tweet.renderedText, start, end, "<a href='https://twitter.com/search?q=%23" + items[i].text + "&src=hash' target='_blank'>" + items[i].text + "</a>");
        }
        break;
    }
  }
};

var findProperInsertionLocation = function(uniquelyInvalidPrecedingChars, targetText, renderedText, after) {
  // invalid preceding characters common to all entity types
  var invalidPrecedingChars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  invalidPrecedingChars += uniquelyInvalidPrecedingChars;
  var foundProperLocation = false;
  var loc;
  var precedingChar;
  while (!foundProperLocation) {
    loc = renderedText.indexOf(targetText, after)
    precedingChar = renderedText[loc - 1];
    if (precedingChar) {
      precedingChar = precedingChar.toLowerCase(); // so that invalidPrecedingChars effectively includes capital letters too
    }
    // if preceding character is not in invalidPrecedingChars, we have found the proper location to insert HTML
    if (invalidPrecedingChars.indexOf(precedingChar) === -1) {
      foundProperLocation = true;
    // otherwise keep looking - have to increment after to avoid infinite loop
    } else {
      after += 1;
    }
  }
  return loc;
};

var insertHTML = function(tweet) {
  var types = ['urls', 'media', 'user_mentions', 'hashtags'];
  for (var i = 0; i < types.length; i++) {
    if (tweet.__entities[types[i]]) {
      handleType(types[i], tweet);
    }
  }
};

exports.renderLinksAndMentions = function(tweet) {
  insertHTML(tweet);
};