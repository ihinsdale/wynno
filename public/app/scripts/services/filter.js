angular.module('wynnoApp.services')
.factory('FilterService', [function() {
  var service = {
    hasWordInList: function(text, list) {
      var noPunctuation = text.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g,"");
      var noExtraSpaces = noPunctuation.replace(/\s{2,}/g," ");
      var words = noExtraSpaces.split(' ');
      var wordsHash = {};
      for (var i = 0; i < words.length; i++) {
        wordsHash[words[i]] = true;
      }
      for (var j = 0; j < list.length; j++) {
        if (wordsHash.hasOwnProperty(list[j])) {
          return true;
        }
      }
      return false;
    },
    hasUserInList: function(user1, user2, list) {
      for (var i = 0; i < list.length; i++) {
        if (user1 === list[i] || user2 === list[i]) {
          return true;
        }
      }
      return false;
    },
    isMutedUser: function(tweeter, retweeter) {
      return service.hasUserInList(tweeter, retweeter, service.currentSettings.mutedUsers);
    },
    hasMutedWord: function(text) {
      return service.hasWordInList(text, service.currentSettings.mutedWords);
    },
    isHeardUser: function(tweeter, retweeter) {
      return service.hasUserInList(tweeter, retweeter, service.currentSettings.heardUsers);
    },
    hasHeardWord: function(text) {
      return service.hasWordInList(text, service.currentSettings.heardWords);
    },
    tweetIsHeard: function(tweet) {
      var retweeter;
      if (tweet.__retweeter) {
        retweeter = tweet.__retweeter.screen_name;
      }
      tweet.__isHeard = (service.isHeardUser(tweet.__user.screen_name, retweeter) || service.hasHeardWord(tweet.__text));
    },
    tweetIsMuted: function(tweet) {
      var retweeter;
      if (tweet.__retweeter) {
        retweeter = tweet.__retweeter.screen_name;
      }
      tweet.__isMuted = (service.isMutedUser(tweet.__user.screen_name, retweeter) || service.hasMutedWord(tweet.__text));
    },
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
        if (tweet.__user.screen_name === filterUsers[i] || tweet.__retweeter.screen_name === filterUsers[i]) {
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
      for (var i = 0; i < filterConditions.length; i++) {
        if (result) {
          switch(filterCondition.type) {
            case 'link':
              var linkResult = false;
              if (!filterCondition.link && tweet.__entities.urls.length) {
                linkResult = true;
              }
              // if tweet doesn't contain link to specified domain, fail
              tweet.__entities.urls display_url
            case 'hashtag':
              // if tweet doesn't contain specified hashtag, fail
              var hashtagResult = false;
              for (var j = 0; j < tweet.__entities.hashtags.length; j++) {
                if (!hashtagResult) {
                  if (filterCondition.hashtag === tweet.__entities.hashtags[j].text) {
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
              for (var k = 0; k < tweet.__entities.media.length; k++) {
                if (!pictureResult) {
                  if (tweet.__entities.media[i].type === 'photo') {
                    pictureResult = true;
                  }
                }
              }
              result = pictureResult;
              break;
            case 'quotation':
              // if tweet contains two quotation marks or a quotation mark and ...
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
      // if settings are provided, set those as the current settings
      if (settings) {
        service.currentSettings = settings;
      }
      angular.forEach(tweets, function(tweet) {
        // reset the values of tweet.__isHeard and tweet.__isMuted
        tweet.__isHeard = null;
        tweet.__isMuted = null;
        angular.forEach(settings.activeFilters, function(filter) {
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