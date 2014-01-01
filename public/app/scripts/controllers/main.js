'use strict';

angular.module('wynnoApp.controllers')
.controller('MainCtrl', function($scope, $location, AuthService, TweetService, SettingsService, VoteService) {
  var path = $location.path();
  $scope.currentPathNeedsAuth = AuthService.doesCurrentPathNeedAuth(path); // this property belongs to NavCtrl scope
  $scope.active = AuthService.whatPageIsActive(path); // this property belongs to NavCtrl scope
  $scope.busy = false;

  $scope.initialLoad = function() {
    console.log('initialLoad firing');
    if (!TweetService.timeOfLastFetch) {
      $scope.firstGet();
    } else {
      $scope.getAlreadyGotten();
    }
  };

  $scope.nextPage = function() {
    console.log('nextPage firing');
    if ($scope.busy) {
      return;
    }
    $scope.busy = true;
    $scope.getMoreOldTweets();
  };

  $scope.firstGet = function() {
    console.log('firstGet firing');
    console.log('oldestTweetId at this point is:', TweetService.oldestTweetId);
    TweetService.getOldTweets(TweetService.oldestTweetId)
    .then(function(tweets) {
      $scope.renderInOrOut(tweets);
      $scope.getNewTweets();
    });
  };

  $scope.getMoreOldTweets = function() {
    console.log('getMoreOlder firing');
    console.log('oldestTweetId at this point is:', TweetService.oldestTweetId);
    TweetService.getOldTweets(TweetService.oldestTweetId)
    .then(function(tweets) {
      $scope.renderInOrOut(tweets);
    })
  };

  $scope.getNewTweets = function() {
    console.log('getNewTweets firing');
    TweetService.getNewTweets()
    .then(function(tweets) {
      $scope.renderInOrOut(tweets);
      $scope.$emit('refreshRequestCompleted');
    }, function(reason) {
      console.log('error getting new tweets:', reason);
      $scope.$emit('refreshRequestCompleted');
    })
  };

  $scope.getAlreadyGotten = function() {
    console.log('getAlreadyGotten firing');
    $scope.renderInOrOut(TweetService.currentTweets);
  };

  $scope.renderInOrOut = function(tweets) {
    $scope.tweets = tweets;
    $scope.threshold = 0.5;
    if ($location.path === '/in') {
      $scope.displayPassing($scope.threshold);
    } else if ($location.path === '/out') {
      $scope.displayFailing($scope.threshold);
    }
    $scope.busy = false;
  };

  $scope.displayPassing = function(threshold) {
    TweetService.getPassingTweets(threshold)
    .then(function(tweets) {
      $scope.elegantize(tweets, new Date().getTime());
      $scope.tweets = tweets;
      console.log('displaying tweets:', $scope.tweets);
    });
  };

  $scope.displayFailing = function(threshold) {
    TweetService.getFailingTweets(threshold)
    .then(function(tweets) {
      $scope.elegantize(tweets, new Date().getTime());
      $scope.tweets = tweets;
      console.log('displaying tweets:', $scope.tweets);
    })
  };

  $scope.elegantize = function(tweets, presentTime) {
    var elegantizeTimestamp = function(UTCtimestamp) {
      var numMilliseconds = presentTime - Date.parse(UTCtimestamp); 
      var numSeconds = numMilliseconds/1000;
      var numMinutes = numSeconds/60;
      var numHours = numMinutes/60;
      var approx = '';
      if (numHours >= 24) {
        var timeOfEventArray = UTCtimestamp.split(' ');
        approx = timeOfEventArray[1] + ' ' + timeOfEventArray[2];
      } else if (numHours >= 1 && numHours < 24) {
        approx = Math.round(numHours).toString() + 'h';
      } else if (numMinutes >= 1 && numHours < 1) {
        approx = Math.round(numMinutes).toString() + 'm';
      } else if (numSeconds >= 1 && numMinutes < 1) {
        approx = Math.round(numSeconds).toString() + 's';
      } else {
        approx = 'now';
      }
      return approx;
    };
    var elegantizeP = function(p) {
      return Math.round(p * 100);
    }
    for (var i = 0; i < tweets.length; i++) {
      tweets[i].__elegant_time = elegantizeTimestamp(tweets[i].__created_at);
      tweets[i].__pScore = elegantizeP(tweets[i].__p)
    }
  };

  // function to record user's votes
  $scope.vote = function(tweet, vote, index) {
    VoteService.vote(tweet, vote)
    .then(function(newVote) {
      tweet.__vote = newVote;
      if ($location.path === '/in' && tweet.__vote === 0) {
        $scope.tweets.splice(index, 1);
      } else if ($location.path === '/out' && tweet.__vote === 1) {
        $scope.tweets.splice(index, 1);
      }
    });
  };

  // if tweet has been voted on, hide the vote buttons
  $scope.hideVoteButtons = function(tweet) {
    if (tweet.__vote !== null || tweet.__isProtected || tweet.__isMuted) {
      return true;
    } else {
      return false;
    }
  };

  $scope.initialLoad();
  $scope.$on('refreshRequest', function(event, args) {
    $scope.getNewTweets();
  });

});
