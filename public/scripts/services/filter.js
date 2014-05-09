'use strict';

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
        if (tweet.__user.screen_name.toLowerCase() === filterUsers[i].toLowerCase() || (tweet.__retweeter && tweet.__retweeter.screen_name.toLowerCase() === filterUsers[i].toLowerCase())) {
          // we turn the tweet's user/retweeter screen_name to lowercase and the filterUser[i] to lowercase so that
          // user conditions are not evaluated case-sensitively
          result = true;
          break;
        }
      }
      return result;
    },
    parseUri: function(str) {
      // parseUri 1.2.2
      // (c) Steven Levithan <stevenlevithan.com>
      // MIT License
      // Cf. http://blog.stevenlevithan.com/archives/parseuri

      var options = {
        strictMode: false,
        key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
        q:   {
          name:   "queryKey",
          parser: /(?:^|&)([^&=]*)=?([^&]*)/g
        },
        parser: {
          strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
          loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
        }
      };

      var o   = options,
          m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
          uri = {},
          i   = 14;

      while (i--) uri[o.key[i]] = m[i] || "";

      uri[o.q.name] = {};
      uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
        if ($1) uri[o.q.name][$1] = $2;
      });

      return uri;
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

      // initialize variables for
      // links conditions
      var linksCounted = 0;
      var numUrls = tweet.__entities.urls.length;
      var urlsCopy = tweet.__entities.urls.slice();
      var urlsCopyCopy;

      // words conditions
      var referenceStringToSearch = tweet.__text;
      var caseSensitive = [];
      var caseInsensitive = [];

      // hashtags conditions
      var hashtagsCounted = 0;
      var numHashtags = tweet.__entities.hashtags.length;
      var hashtagsCopy = tweet.__entities.hashtags.slice();
      var hashtagsCopyCopy;

      // picture conditions
      var picturesCounted = 0;
      var numPictures = 0;
      if (tweet.__entities.hasOwnProperty('media')) {
        for (var k = 0; k < tweet.__entities.media.length; k++) {
          if (tweet.__entities.media[k].type === 'photo') {
            numPictures++;
          }
        }
      }

      var linkResult;
      var host;
      var hashtagResult;
      var pictureResult;
      var quotationResult;
      for (var i = 0; i < filterConditions.length; i++) {
        if (result) {
          switch(filterConditions[i].type) {
            // TODO add user_mention as a type of condition
            case 'link':
              linkResult = false;
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
                      console.log('url is:', urlsCopyCopy[m].expanded_url);
                      host = service.parseUri(urlsCopyCopy[m].expanded_url).host;
                      // for parsing the url to get the host, could conceivably use the browser-dependent trick
                      // described here, which involves creating an anchor element: https://gist.github.com/jlong/2428561
                      console.log('hostname is:', host);
                      // it appears expanded_url always has the same domain as display_url, so we can search
                      // expanded_url which has the benefit that we can use parseUri
                      if (host.indexOf(filterConditions[i].link) !== -1) {
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
              if (filterConditions[i].wordIsCaseSensitive) {
                caseSensitive.push(i);
              } else {
                caseInsensitive.push(i);
              }
              // word condition processing to be continued outside the switch statement
              break;
            case 'hashtag':
              hashtagResult = false;
              // if we haven't counted all of the tweet's hashtags already
              if (hashtagsCounted < numHashtags) {
                // if no hashtag specified, pass
                if (!filterConditions[i].hashtag) {
                  hashtagResult = true;
                  hashtagsCounted++;
                // otherwise a hashtag must be specified
                } else {
                  hashtagsCopyCopy = hashtagsCopy.slice();
                  // if tweet contains specified hashtag, pass
                  for (var j = 0; j < hashtagsCopyCopy.length; j++) {
                    if (!hashtagResult) {
                      // using toLowerCase() ensures case insensitivity
                      if (filterConditions[i].hashtag.toLowerCase() === hashtagsCopyCopy[j].text.toLowerCase()) {
                        hashtagResult = true;
                        hashtagsCounted++;
                        hashtagsCopy.splice(j, 1);
                      }
                    }
                  }
                }
              }
              result = hashtagResult;
              break;
            case 'picture':
              pictureResult = false;
              if (picturesCounted < numPictures) {
                pictureResult = true;
                picturesCounted++;
              }
              result = pictureResult;
              break;
            case 'quotation':
              // quotation conditions aren't additive, so we don't need to worry about
              // keeping track of the total number of quotation conditions

              quotationResult = false;
              // could work on more complicated variations, e.g. if tweet contains
              // two quotation marks or a quotation mark and ..., pass
              // currently, I am just using presence of a quotation mark " to indicate
              // TODO make sure this method of checking handles unicode characters correctly
              if (tweet.__text.indexOf('"') !== -1) {
                quotationResult = true;
              }
              result = quotationResult;
              break;
          }
        }
      }
      // if we have gotten this far with a true result, test whether the tweet satisfies the word conditions
      if (result) {
        var wordResult = true;
        var stringToSearch;
        var searchFor;
        var loc;
        for (var n = 0; n < caseSensitive.length; n++) {
          if (wordResult) {
            stringToSearch = referenceStringToSearch;
            searchFor = filterConditions[caseSensitive[n]].word;
            loc = stringToSearch.indexOf(searchFor);
            if (loc === -1) {
              wordResult = false;
            } else {
              // remove the found word
              referenceStringToSearch = referenceStringToSearch.slice(0, loc) + referenceStringToSearch.slice(loc + searchFor.length);
            }
          }
        }
        for (var p = 0; p < caseInsensitive.length; p++) {
          if (wordResult) {
            stringToSearch = referenceStringToSearch.toLowerCase();
            searchFor = filterConditions[caseInsensitive[p]].word.toLowerCase();
            loc = stringToSearch.indexOf(searchFor);
            if (loc === -1) {
              wordResult = false;
            } else {
              // remove the found word
              referenceStringToSearch = referenceStringToSearch.slice(0, loc) + referenceStringToSearch.slice(loc + searchFor.length);
            }
          }
        }
        result = wordResult;
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
          // this enables a prioritizing of filters -- older filters take priority
          if (!tweet.__isHeard && !tweet.__isMuted) {
            service.passTweetThroughFilter(tweet, filter);
          }
        });
      });
    }
  };

  return service;
}]);
