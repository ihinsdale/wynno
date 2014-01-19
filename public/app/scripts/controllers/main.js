'use strict';

angular.module('wynnoApp.controllers')
.controller('MainCtrl', function($scope, $location, $timeout, AuthService, TweetService, SettingsService, VoteService) {
  $scope.activeTwitterRequest = false; // used by spinner, to keep track of an active request to the Twitter API
  $scope.busy = false; // used by infinite-scroll directive, to know not to trigger another scroll/load event
  if ($location.path() === '/in') {
    $scope.currentStream = "The Good Stuff";
    $scope.oppositeStream = "The Rest";
  } else if ($location.path() === '/out') {
    $scope.currentStream = "The Rest";
    $scope.oppositeStream = "The Good Stuff";
  }

  $scope.refreshRequest = function() {
    if (!$scope.activeTwitterRequest) {
      $scope.getNewTweets();
    }
  };

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
      $scope.renderInOrOut();
      $scope.getNewTweets();
    });
  };

  $scope.getMoreOldTweets = function() {
    console.log('getMoreOlder firing');
    console.log('oldestTweetId at this point is:', TweetService.oldestTweetId);
    TweetService.getOldTweets(TweetService.oldestTweetId)
    .then(function(tweets) {
      $scope.renderInOrOut();
    }, function(reason) {
      console.log('error getting more old tweets:', reason);
      $scope.busy = false;
    })
  };

  $scope.getNewTweets = function() {
    console.log('getNewTweets firing');
    $scope.activeTwitterRequest = true;
    TweetService.getNewTweets()
    .then(function(tweets) {
      $scope.renderInOrOut();
      $scope.activeTwitterRequest = false; // to stop the spinner
      // note we don't want to set activeTwitterRequest to false inside .renderInOrOut() or .display(),
      // because those functions are also used by functions which fetch old tweets from the db, not the Twitter API
      $scope.mustWait = false;
      $scope.twitterError = false;
      // update timeOfLastFetch
      $scope.timeOfLastFetch = TweetService.timeOfLastFetch;
    }, function(reason) {
      console.log('error getting new tweets:', reason);
      if (reason.slice(0,20) === 'Please try again in ') {
        $scope.mustWait = true;
        $scope.wait = parseInt(reason.slice(20,22));
        $scope.countdownTimer($scope.wait, $scope.getNewTweets);
      } else {
        $scope.activeTwitterRequest = false; // to stop the spinner
        $scope.twitterError = true;
      }
    })
  };

  $scope.countdownTimer = function(wait, next) {
    console.log()
    $scope.remaining = wait;
    $scope.decr = function() {
      if ($scope.remaining === 0) {
        next();
      } else {
        $scope.remaining--;
        $timeout($scope.decr, 1000);
      }
    };
    $timeout($scope.decr, 1000);
  };

  $scope.dismissAlert = function(wait_or_error) {
    if (wait_or_error === 'wait') {
      $scope.mustWait = false;
    } else if (wait_or_error === 'error') {
      $scope.twitterError = false;
    }
  };

  $scope.getAlreadyGotten = function() {
    console.log('getAlreadyGotten firing');
    $scope.renderInOrOut();
  };

  $scope.threshold = 0.5;

  $scope.renderInOrOut = function() {
    if ($location.path() === '/in') {
      TweetService.getPassingTweets($scope.threshold)
      .then(function(tweets) {
        $scope.display(tweets);
      }, function(reason) {

      });
    } else if ($location.path() === '/out') {
      TweetService.getFailingTweets($scope.threshold)
      .then(function(tweets) {
        $scope.display(tweets);
      });
    }
  };

  $scope.display = function(tweets) {
    $scope.elegantize(tweets, new Date().getTime());
    $scope.tweets = tweets;
    console.log('displaying tweets:', $scope.tweets);
    $scope.busy = false;
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
  // TODO: move this to logic to the VoteService
  $scope.vote = function(tweet, vote, index) {
    // setting the new vote value before making the AJAX call to the server
    // and removing the tweet in light of the vote, if appropriate
    // is crucial for rendering quickly in Safari (desktop and mobile).
    // in Chrome and firefox it worked fine not to do that until inside
    // the success callback, but in Safari that created an extremely long delay (minutes)
    var origVote = tweet.__vote;
    var origTweets = $scope.tweets.slice();

    // setting the vote value here like this changes the original tweet object in TweetService.currentTweets
    // because tweet is a reference to the item in that original array
    // hence all subsequent uses of TweetService.currentTweets will reflect this vote
    tweet.__vote = vote;
    // remove tweet from those being displayed if vote was contrary
    if ($location.path() === '/in' && vote === 0) {
      console.log('removing a nayed tweet from the passing tweets');
      // $scope.tweets.splice(index, 1); // can't do this because it triggers $locationChangeStart
      // angular seems to think because the DOM is changing that the browser location is being changed
      tweet.hideGivenNewContraryVote = true; 
    } else if ($location.path() === '/out' && vote === 1) {
      console.log('removing a yeaed tweet from the failing tweets');
      // $scope.tweets.splice(index, 1); // can't do this, see above
      tweet.hideGivenNewContraryVote = true;
    }
    // now pass the vote on to the server
    VoteService.vote(tweet, vote)
    .then(function(newVote) {
      console.log("vote recorded, don't need to do anything more");
    }, function(error) {
      // restore the original tweet
      $scope.tweets = origTweets;
      // and restore the original vote
      tweet.__vote = origVote;
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

  window.scrollTo(0);
  $scope.initialLoad();

});
