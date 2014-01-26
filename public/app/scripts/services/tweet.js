angular.module('wynnoApp.services')
.factory('TweetService', ['$q', '$http', 'SettingsService', 'FilterService', function($q, $http, SettingsService, FilterService) {
  var service = {
    timeOfLastFetch: null,
    currentTweets: [],
    oldestTweetId: 0,
    getOldTweetsAndSettings: function(oldestTweetId, andSettings) {
      // for the first load of MainCtrl, andSettings should be true,
      // because we want to get old tweets and the user's filtering rules to
      // apply to all tweets
      oldestTweetId = oldestTweetId || 0;
      var d = $q.defer();
      $http.get('/old', {
        params: {
          oldestTweetId: oldestTweetId,
          settings: andSettings
        }
      })
      .success(function(data, status) {
        console.log('success getting old tweets', andSettings ? 'and settings' : '', ':', data);
        // save settings in SettingsService
        SettingsService.settings = data.settings;
        // apply filtering rules to the tweets
        FilterService.applyFilterRules(data.tweets, SettingsService.settings);
        // now add the tweets to currentTweets
        service.currentTweets = service.currentTweets.concat(data.tweets);
        // update oldestTweetId, if any tweets were received
        if (data.tweets.length) {
          service.oldestTweetId = service.currentTweets[service.currentTweets.length - 1]._id;
        }
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
        var timeSinceLastFetch = new Date().getTime() - service.timeOfLastFetch.getTime();
      }
      if (timeSinceLastFetch && timeSinceLastFetch < 61000) {
        d.reject('Please try again in ' + Math.ceil((61000 - timeSinceLastFetch)/1000).toString() + ' seconds. Currently unable to fetch new tweets due to Twitter API rate limiting.')
      } else {
        $http.get('/new')
        .success(function(tweets, status) {
          console.log('success getting new tweets, they look like:', tweets);
          // apply filtering rules to the tweets
          FilterService.applyFilterRules(tweets, SettingsService.settings);
          // now add the tweets to currentTweets
          service.currentTweets = tweets.concat(service.currentTweets);
          // update timeOfLastFetch
          service.timeOfLastFetch = new Date();
          d.resolve(service.currentTweets);
        })
        .error(function(reason, status) {
          console.log('error getting new tweets:', reason);
          d.reject(reason);
        });
      }
      return d.promise;
    },
    getPassingTweets: function(threshold) {
      var tweetsToDisplay = [];
      angular.forEach(service.currentTweets, function(tweet) {
        // reset this property to false, so it is only made true by a new contrary vote
        tweet.hideGivenNewContraryVote = false;
        if (tweet.__vote === null) {
          if (tweet.__isHeard) {
            tweetsToDisplay.push(tweet);
          } else if (tweet.__isMuted) {
            //do nothing
          } else {
            if (tweet.__p >= threshold || tweet.__p === null) {
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
      return tweetsToDisplay;
    },
    getFailingTweets: function(threshold) {
      var tweetsToDisplay = [];
      angular.forEach(service.currentTweets, function(tweet) {
        // reset this property to false, so it is only made true by a new contrary vote
        tweet.hideGivenNewContraryVote = false;
        if (tweet.__vote === null) {
          if (tweet.__isHeard) {
            //do nothing
          } else if (tweet.__isMuted) {
            tweetsToDisplay.push(tweet);
          } else {
            if (tweet.__p >= threshold || tweet.__p === null) {
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
      return tweetsToDisplay;
    }
  };

  return service;
}]);