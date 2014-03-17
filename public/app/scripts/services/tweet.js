angular.module('wynnoApp.services')
.factory('TweetService', ['$q', '$http', 'FilterService', function($q, $http, FilterService) {
  var service = {
    timeOfLastFetch: null,
    currentTweets: [],
    oldestTweetIdStr: 0,
    getOldTweets: function(oldestTweetIdStr) {
      oldestTweetIdStr = oldestTweetIdStr || '0';
      var d = $q.defer();
      $http.get('/old', {
        params: {
          oldestTweetIdStr: oldestTweetIdStr,
          settings: false
        }
      })
      .success(function(data, status) {
        console.log('success getting old tweets:', data);
        // apply filtering rules to the tweets using whatever settings are current in the FilterService
        FilterService.applyFilterRules(data.tweets);
        // now add the tweets to currentTweets
        service.currentTweets = service.currentTweets.concat(data.tweets);
        // update oldestTweetIdStr, if any tweets were received
        if (data.tweets.length) {
          service.oldestTweetIdStr = service.currentTweets[service.currentTweets.length - 1].id_str;
        }
        console.log('oldestTweetIdStr after getting batch of tweets is:', service.oldestTweetIdStr);
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
        .success(function(data, status) {
          console.log('success getting new tweets, they look like:', data.tweets);
          // since the initial request for old tweets is always completed before getNewTweets is called for the first time,
          // we know that if service.currentTweets is empty we are dealing with a new user,
          // in which case we want to update oldestTweetIdStr after receiving the new tweets
          if (!service.currentTweets.length) {
            service.oldestTweetIdStr = data.tweets[data.tweets.length - 1].id_str;
            console.log('oldestTweetIdStr after getting batch of tweets is:', service.oldestTweetIdStr);
          }

          // apply filtering rules to the tweets
          FilterService.applyFilterRules(data.tweets);
          // now add the tweets to currentTweets
          service.currentTweets = data.tweets.concat(service.currentTweets);
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
    getMiddleTweets: function(oldestOfMoreRecentTweetsIndex, secondNewestOfOlderTweetsIndex, newestOfOlderTweetsIndex) {
      var d = $q.defer();
      if (service.timeOfLastFetch) {
        var timeSinceLastFetch = new Date().getTime() - service.timeOfLastFetch.getTime();
      }
      if (timeSinceLastFetch && timeSinceLastFetch < 61000) {
        d.reject('Please try again in ' + Math.ceil((61000 - timeSinceLastFetch)/1000).toString() + ' seconds. Currently unable to fetch new tweets due to Twitter API rate limiting.')
      } else {
        $http.get('/middle', {
          params: {
            oldestOfMoreRecentTweetsIdStr: service.currentTweets[oldestOfMoreRecentTweetsIndex].id_str,
            secondNewestOfOlderTweetsIdStr: service.currentTweets[secondNewestOfOlderTweetsIndex].id_str,
            newestOfOlderTweetsIdStr: service.currentTweets[newestOfOlderTweetsIndex].id_str
          }
        })
        .success(function(data, status) {
          console.log('success getting middle tweets, they look like:', data.tweets);
          // apply filtering rules to the tweets
          FilterService.applyFilterRules(data.tweets);
          // update gapAfterThis to false on the cutoff tweet, because there is no longer a gap after this tweet
          service.currentTweets[oldestOfMoreRecentTweetsIndex].gapAfterThis = false;
          // now add the tweets to currentTweets
          service.currentTweets = service.currentTweets.slice(0,oldestOfMoreRecentTweetsIndex + 1).concat(data.tweets).concat(service.currentTweets.slice(secondNewestOfOlderTweetsIndex - 1));
          // update timeOfLastFetch
          service.timeOfLastFetch = new Date();
          d.resolve(service.currentTweets);
        })
        .error(function(reason, status) {
          console.log('error getting middle tweets:', reason);
          d.reject(reason);
        });
      }
      return d.promise;
    },
    getPassingTweets: function() {
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
            if (tweet.__p === 1 || tweet.__p === null) {
              tweetsToDisplay.push(tweet);
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
    getFailingTweets: function() {
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
            if (tweet.__p === 0) {
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
    },
    replaceCurrentTweets: function(tweets) {
      FilterService.applyFilterRules(tweets);
      service.currentTweets = tweets;
    },
    removePredictions: function() {
      angular.forEach(service.currentTweets, function(tweet) {
        tweet.__p = null;
        tweet.__pScore = null;
      })
    }
  };

  return service;
}]);