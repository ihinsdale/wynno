angular.module('wynnoApp.services')
.factory('TweetService', ['$q', '$http', 'SettingsService', function($q, $http, SettingsService) {
  var service = {
    // store oauth token in here
    timeOfLastFetch: null,
    currentTweets: [],
    oldestTweetId: 0,
    getOldTweets: function(oldestTweetId) {
      oldestTweetId = oldestTweetId || 0;
      var d = $q.defer();
      $http.get('/old', {
        params: {oldestTweetId: oldestTweetId}
      })
      .success(function(data, status) {
        console.log('success getting old tweets, they look like:', data);
        service.currentTweets = service.currentTweets.concat(data);
        service.oldestTweetId = service.currentTweets[service.currentTweets.length - 1]._id;
        console.log('oldestTweetId after getting batch of tweets is:', service.oldestTweetId);
        d.resolve(service.currentTweets);
      })
      .error(function(reason, status) {
        console.log('error getting old tweets:', reason);
        d.reject(reason);
      })
      return d.promise;
    },
    getNewTweets: function() {
      var d = $q.defer();
      if (service.timeOfLastFetch) {
        var timeSinceLastFetch = new Date().getTime() - service.timeOfLastFetch;
      }
      if (timeSinceLastFetch && timeSinceLastFetch < 61000) {
        d.reject('Please try again in ' + Math.ceil((61000 - timeSinceLastFetch)/1000).toString() + ' seconds. Currently unable to fetch new tweets due to Twitter API rate limiting.')
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
    getPassingTweets: function(threshold) {
      return SettingsService.provideSettings()
      .then(function(settings) {
        service.settings = settings;
        var d = $q.defer();
        var tweetsToDisplay = [];
        angular.forEach(service.currentTweets, function(tweet) {
          if (tweet.__vote === null) {
            service.tweetIsProtected(tweet);
            service.tweetIsMuted(tweet);
            if (tweet.__isProtected) {
              tweetsToDisplay.push(tweet);
            } else if (tweet.__isMuted) {
              //do nothing
            } else {
              if (tweet.__p >= threshold) {
                tweetsToDisplay.push(tweet);
              } else {
                //do nothing
              }
            }
          } else {
            if (!!tweet.__vote) {
              tweetsToDisplay.push(tweet);
            }
          }
        });
        d.resolve(tweetsToDisplay);
        return d.promise;
      });
    },
    getFailingTweets: function(threshold) {
      return SettingsService.provideSettings()
      .then(function(settings) {
        service.settings = settings;
        var d = $q.defer();
        var tweetsToDisplay = [];
        angular.forEach(service.currentTweets, function(tweet) {
          if (tweet.__vote === null) {
            service.tweetIsProtected(tweet);
            service.tweetIsMuted(tweet);
            if (tweet.__isProtected) {
              //do nothing
            } else if (tweet.__isMuted) {
              tweetsToDisplay.push(tweet);
            } else {
              if (tweet.__p >= threshold) {
                //do nothing
              } else {
                tweetsToDisplay.push(tweet);
              }
            }
          } else {
            if (!tweet.__vote) {
              tweetsToDisplay.push(tweet);
            }
          }
        });
        d.resolve(tweetsToDisplay);
        return d.promise;
      });
    }
  };

  return service;
}]);