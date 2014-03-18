angular.module('wynnoApp.services')
.factory('FilterService', [function() {
  var service = {
    meetsScope: function(tweet, filterScope) {
      if (filterScope === 'all') {
        return true;
      } else if (filterScope === 'tweets' && !tweet.__retweeter) {
        return true;
      } else if (filterScope === 'retweets' && tweet.__retweeter) {
        return true;
      } else {
        return false;
      }
    },
    meetsUsers: function(tweet, filterUsers) {
      // if no users specified, all tweets pass
      if (filterUsers.length === 0) {
        return true;
      }
      var result = false;
      for (var i = 0; i < filterUsers.length; i++) {
        if (tweet.__user.screen_name === filterUsers[i] || (tweet.__retweeter && tweet.__retweeter.screen_name === filterUsers[i])) {
          result = true;
          break;
        }
      }
      return result;
    },
    meetsConditions: function(tweet, filterConditions) {
      // if no conditions specified, all tweets pass
      if (filterConditions.length === 0) {
        return true;
      }
      // since a tweet must pass ALL conditions in filterConditions
      // (i.e. conditions are inherently joined by AND),
      // our default result will be true and we'll test for failure
      // this enables us to break out of the testing as soon as a condition is failed
      var result = true;
      var linksCounted = 0;
      var numUrls = tweet.__entities.urls.length;
      var urlsCopy = tweet.__entities.urls.slice();
      var urlsCopyCopy;
      for (var i = 0; i < filterConditions.length; i++) {
        if (result) {
          switch(filterConditions[i].type) {
            // TODO add user_mention as a type of condition
            case 'link':
              var linkResult = false;
              var parser = document.createElement('a');
              // if we haven't already counted as many links as the tweet contains
              if (linksCounted < numUrls) {
                // if no link string specified, pass
                if (!filterConditions[i].link) {
                  linkResult = true;
                  linksCounted++;
                // otherwise there must be a link string specified
                } else {
                  urlsCopyCopy = urlsCopy.slice();
                  // if tweet links to the specified domain, pass
                  for (var m = 0; m < urlsCopyCopy.length; m++) {
                    if (!linkResult) {
                      parser.href = urlsCopyCopy[m].extended_url
                      // it appears extended_url always has the same domain as display_url, so we can search
                      // extended_url which has the benefit that we can use the parser
                      if (parser.hostname.indexOf(filterConditions[i].link) !== -1) {
                        linkResult = true;
                        linksCounted++;
                        // remove the url from what will be searched next time
                        urlsCopy.splice(m, 1); // we splice from urlsCopy rather than what we're looping through
                        // because changing an array while looping through it can cause problems
                      }
                    }
                  }
                }
              }
              result = linkResult;
              break;
            case 'word':
              var wordResult = false;
              var stringToSearch;
              var searchFor;
              if (filterConditions[i].wordIsCaseSensitive) {
                stringToSearch = tweet.__text
                searchFor = filterConditions[i].word
              } else {
                stringToSearch = tweet.__text.toLowerCase()
                searchFor = filterConditions[i].word.toLowerCase()
              }
              if (stringToSearch.indexOf(searchFor) !== -1) {
                wordResult = true;
                console.log('Found matching word/phrase:', searchFor, 'in tweet text:', stringToSearch);
              }
              result = wordResult;
              break;
            case 'hashtag':
              var hashtagResult = false;
              // if no hashtag specified and tweet contains any hashtag, pass
              if (!filterConditions[i].hashtag && tweet.__entities.hashtags.length) {
                hashtagResult = true;
              }
              // if tweet doesn't contain specified hashtag, fail
              for (var j = 0; j < tweet.__entities.hashtags.length; j++) {
                if (!hashtagResult) {
                  if (filterConditions[i].hashtag === tweet.__entities.hashtags[j].text) {
                    // note this strict equality implies case sensitivity
                    hashtagResult = true;
                  }
                }
              }
              result = hashtagResult;
              break;
            case 'picture':
              // if tweet doesn't contain a picture, fail
              var pictureResult = false;
              if (tweet.__entities.hasOwnProperty('media')) {
                for (var k = 0; k < tweet.__entities.media.length; k++) {
                  if (!pictureResult) {
                    if (tweet.__entities.media[i].type === 'photo') {
                      pictureResult = true;
                    }
                  }
                }
              }
              result = pictureResult;
              break;
            case 'quotation':
              var quotationResult = false;
              // could work on more complicated variations, e.g. if tweet contains 
              // two quotation marks or a quotation mark and ..., pass
              // currently, I am just using presence of a quotation mark " to indicate
              // TODO make sure this method of checking handles unicode characters correctly
              if (tweet.__text.indexOf('"') !== -1) {
                quotationResult = true;
              }
              result = quotationResult;
          }
        }
      }
      return result;
    },
    applyHearOrMute: function(tweet, filterType) {
      if (filterType === 'hear') {
        tweet.__isHeard = true;
        tweet.__isMuted = false;
      } else if (filterType === 'mute') {
        tweet.__isHeard = false;
        tweet.__isMuted = true;
      }
    },
    passTweetThroughFilter: function(tweet, filter) {
      if (service.meetsScope(tweet, filter.scope) && service.meetsUsers(tweet, filter.users)
          && service.meetsConditions(tweet, filter.conditions)) {
            service.applyHearOrMute(tweet, filter.type);
          }
    },
    applyFilterRules: function(tweets, settings) {
      console.log('applying filter rules');
      // if settings are provided, set those as the current settings
      if (settings) {
        service.currentSettings = settings;
      }
      console.log('current filters are:', service.currentSettings.activeFilters);
      angular.forEach(tweets, function(tweet) {
        // reset the values of tweet.__isHeard and tweet.__isMuted
        tweet.__isHeard = null;
        tweet.__isMuted = null;
        angular.forEach(service.currentSettings.activeFilters, function(filter) {
          // set up guard so that once a filter 'catches' a tweet, no subsequent filters are applied
          // this enables a prioritizing of filters
          if (!tweet.__isHeard && !tweet.__isMuted) {
            service.passTweetThroughFilter(tweet, filter);
          }
        });
      });
    }
  };

  return service;
}]);