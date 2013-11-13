angular.module('wynnoApp.services')
.factory('TweetService', ['$q', '$http', 'SettingsService', function($q, $http, SettingsService) {
  var service = {
    timeOfLastFetch: null,
    currentTweets: [],
    getOldTweets: function() {
      var d = $q.defer();
      if (service.currentTweets.length <= 0) {
        $http.get('/old')
        .success(function(data, status) {
          console.log('success getting old tweets, they look like:', data);
          service.currentTweets = data;
          d.resolve(service.currentTweets);
        })
        .error(function(reason, status) {
          console.log('error getting old tweets:', reason);
          d.reject(reason);
        })
      } else {
        d.resolve(service.currentTweets);
      }
      return d.promise;
    },
    getNewTweets: function() {
      var d = $q.defer();
      if (service.timeOfLastFetch) {
        var timeSinceLastFetch = new Date().getTime() - service.timeOfLastFetch;
      }
      if (timeSinceLastFetch && timeSinceLastFetch < 61000) {
        d.reject('Please try again in ' + Math.ceil((61000 - timeSinceLastFetch)/1000).toString() + 'seconds. Currently unable to fetch new tweets due to Twitter API rate limiting.')
      } else {
        $http.get('/new')
        .success(function(data, status) {
          console.log('success getting new tweets, they look like:', data);
          service.currentTweets = data.concat(service.currentTweets);
          service.timeOfLastFetch = new Date().getTime();
          d.resolve(service.currentTweets);
        })
        .error(function(reason, status) {
          console.log('error getting new tweets:', reason);
          d.reject(reason);
        });
      }
      return d.promise;
    },

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
      return service.hasUserInList(tweeter, retweeter, service.settings.mutedUsers);
    },
    hasMutedWord: function(text) {
      return service.hasWordInList(text, service.settings.mutedWords);
    },
    isProtectedUser: function(tweeter, retweeter) {
      return service.hasUserInList(tweeter, retweeter, service.settings.protectedUsers);
    },
    hasProtectedWord: function(text) {
      return service.hasWordInList(text, service.settings.protectedWords);
    },
    tweetIsProtected: function(tweet) {
      var retweeter;
      if (tweet.__retweeter) {
        retweeter = tweet.__retweeter.screen_name;
      }
      tweet.__isProtected = (service.isProtectedUser(tweet.__user.screen_name, retweeter) || service.hasProtectedWord(tweet.__text));
    },
    tweetIsMuted: function(tweet) {
      var retweeter;
      if (tweet.__retweeter) {
        retweeter = tweet.__retweeter.screen_name;
      }
      tweet.__isMuted = (service.isMutedUser(tweet.__user.screen_name, retweeter) || service.hasMutedWord(tweet.__text));
    },
    setPassingTweets: function(threshold) {
      return SettingsService.provideSettings()
      .then(function(settings) {
        service.settings = settings;
        var d = $q.defer();
        angular.forEach(service.currentTweets, function(tweet) {
          if (tweet.__vote === null) {
            service.tweetIsProtected(tweet);
            service.tweetIsMuted(tweet);
            if (tweet.__isProtected) {
              tweet.__isDisplayed = true;
            } else if (tweet.__isMuted) {
              tweet.__isDisplayed = false;
            } else {
              if (tweet.__p >= threshold) {
                tweet.__isDisplayed = true;
              } else {
                tweet.__isDisplayed = false;
              }
            }
          } else {
            tweet.__isDisplayed = !!tweet.__vote;
          }
        });
        d.resolve(service.currentTweets);
        return d.promise;
      });
    },
    setFailingTweets: function(threshold) {
      return SettingsService.provideSettings()
      .then(function(settings) {
        service.settings = settings;
        var d = $q.defer();
        angular.forEach(service.currentTweets, function(tweet) {
          if (tweet.__vote === null) {
            service.tweetIsProtected(tweet);
            service.tweetIsMuted(tweet);
            if (tweet.__isProtected) {
              tweet.__isDisplayed = false;
            } else if (tweet.__isMuted) {
              tweet.__isDisplayed = true;
            } else {
              if (tweet.__p >= threshold) {
                tweet.__isDisplayed = false;
              } else {
                tweet.__isDisplayed = true;
              }
            }
          } else {
            tweet.__isDisplayed = !tweet.__vote
          }
        });
        d.resolve(service.currentTweets);
        return d.promise;
      });
    }
  };

  return service;
}]);