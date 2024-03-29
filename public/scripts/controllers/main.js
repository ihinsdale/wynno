'use strict';

angular.module('wynnoApp.controllers')
.controller('MainCtrl', function($scope, $location, $timeout, AuthService, TweetService, SettingsService, VoteService, InitialTweetsAndSettingsService) {
  var limitIncrement = 10;
  $scope.activeTwitterRequest = { new: false, middle: false }; // used by spinner, to keep track of an active request to the Twitter API
  $scope.mustWait = { new: false, middle: false };
  $scope.twitterError = { new: false, middle: false };
  $scope.remaining = {}; // initialize this object used by $scope.countdownTimer;
  $scope.busy = false; // used by infinite-scroll directive, to know not to trigger another scroll/load event
  if ($location.path() === '/in') {
    $scope.currentStream = 'Good Stuff';
    $scope.oppositeStream = 'The Rest';
  } else if ($location.path() === '/out') {
    $scope.currentStream = 'The Rest';
    $scope.oppositeStream = 'Good Stuff';
  }

  $scope.refreshRequest = function() {
    if (!$scope.activeTwitterRequest.new) {
      $scope.getNewTweets();
    }
  };

  $scope.initialLoad = function() {
    console.log('initialLoad firing');
    $scope.currentLimit = limitIncrement;
    if (!TweetService.timeOfLastFetch) {
      $scope.firstGet();
    } else {
      $scope.getAlreadyGotten();
    }
  };

  $scope.nextPage = function() {
    if ($scope.busy) return;
    $scope.busy = true;
    console.log('nextPage firing');

    // var origNumDisplayed = $scope.tweets.length;
    // // keep repeating the following loop until additional tweets are displayed on the page
    // // TODO: but if user has never voted nay on an earlier tweet and doesn't have any active mute filters
    // // this will lead to an infinite loop
    // while ($scope.tweets.length === origNumDisplayed) {

    // if the current limit of tweets displayed on the page is not very close to exhausting
    // the total number of tweets we've received from the server, just increment currentLimit
    if ($scope.currentLimit < TweetService.currentTweets.length - 30) {
      console.log('incrementing limit');
      $scope.currentLimit += limitIncrement;
      // update the value of oldestScanned to reflect this new currentLimit
      $scope.updateOldestScanned();
      $scope.busy = false;
    // otherwise get more old tweets from the server
    } else {
      console.log('incrementing limit and getting more old tweets from server');
      $scope.currentLimit += limitIncrement;
      // ($scope.updateOldestScanned will get called in $scope.display() once we have gotten more old tweets)
      $scope.getMoreOldTweets(); // $scope.busy gets reset to false once getMoreOldTweets completes
    }

    // }
  };

  $scope.firstGet = function() {
    console.log('firstGet firing');
    console.log('oldestTweetIdStr at this point is:', TweetService.oldestTweetIdStr);
    // set $scope.busy to true so that no additional requests for old tweets are triggered
    // until this first one is finished
    $scope.busy = true;
    InitialTweetsAndSettingsService.getInitialOldTweetsAndSettings()
    .then(function(tweets) {
      // set the indicators displayed in the navbar
      $scope.$emit('setSuggIndicators', SettingsService.settings.votesRequiredForNextSugg, SettingsService.settings.undismissedSugg);
      // render the initial tweets
      $scope.renderInOrOut();
      // fetch new tweets
      $scope.getNewTweets();
    }, function(reason) {
      console.log('error getting first batch of old tweets:', reason);
      $scope.busy = false;
    });
  };

  $scope.getMoreOldTweets = function() {
    console.log('getMoreOldTweets firing');
    console.log('oldestTweetIdStr at this point is:', TweetService.oldestTweetIdStr);
    TweetService.getOldTweets(TweetService.oldestTweetIdStr)
    .then(function(tweets) {
      $scope.renderInOrOut();
    }, function(reason) {
      console.log('error getting more old tweets:', reason);
      $scope.busy = false;
    });
  };

  $scope.getNewTweets = function() {
    console.log('getNewTweets firing');
    $scope.activeTwitterRequest.new = true;
    TweetService.getNewTweets()
    .then(function(tweets) {
      $scope.activeTwitterRequest.new = false; // to stop the spinner
      // note we don't want to set activeTwitterRequest.new to false inside .renderInOrOut() or .display(),
      // because those functions are also used by functions which fetch old tweets from the db, not the Twitter API
      $scope.mustWait.new = false;
      $scope.twitterError.new = false;

      $scope.renderInOrOut();
    }, function(reason) {
      console.log('error getting new tweets:', reason);
      if (reason.slice(0,20) === 'Please try again in ') {
        $scope.mustWait.new = true;
        $scope.waitNew = parseInt(reason.slice(20,22), 10);
        $scope.countdownTimer('new', $scope.waitNew, $scope.getNewTweets);
      } else {
        $scope.activeTwitterRequest.new = false; // to stop the spinner
        $scope.twitterError.new = true;
      }
    });
  };

  $scope.fillGapRequest = function(oldestOfMoreRecentTweetsIdStr) {
    if (!$scope.activeTwitterRequest.middle) {
      $scope.fillGap(oldestOfMoreRecentTweetsIdStr);
    }
  };

  $scope.fillGap = function(oldestOfMoreRecentTweetsIdStr) {
    // (eventual) TODO could also use index of newest of the older tweets, and decrement it by one
    // (eventual) TODO could likewise only store latestIdStr in db, don't need secondLatest because
    // we can just decrement latest by 1 when using as since_id
    // disadvantage of current approach is it won't work if a new twitter user's timeline only has
    // one tweet in it when we fetch their tweets for the first time, and then more than 195 tweets
    // elapse before their next use of wynno
    console.log('filling the gap');
    $scope.activeTwitterRequest.middle = true;
    TweetService.getMiddleTweets(oldestOfMoreRecentTweetsIdStr)
    .then(function(tweets) {
      $scope.renderInOrOut();
      $scope.activeTwitterRequest.middle = false; // to stop the spinner
      $scope.mustWait.middle = false;
      $scope.twitterError.middle = false;
    }, function(reason) {
      console.log('error filling gap:', reason);
      if (reason.slice(0,20) === 'Please try again in ') {
        $scope.mustWait.middle = true;
        $scope.waitMiddle = parseInt(reason.slice(20,22), 10);
        $scope.countdownTimer('middle', $scope.waitMiddle, function() {
          $scope.fillGap(oldestOfMoreRecentTweetsIdStr);
        });
      } else {
        $scope.activeTwitterRequest.middle = false; // to stop the spinner
        $scope.twitterError.middle = true;
      }
    });
  };

  $scope.decr = function(middleOrNew, timeRemaining, next) {
    if (timeRemaining === 0) {
      next();
    } else {
      $scope.remaining[middleOrNew] = timeRemaining - 1;
      $timeout(function() {
        $scope.decr(middleOrNew, $scope.remaining[middleOrNew], next);
      }, 1000);
    }
  };

  $scope.countdownTimer = function(middleOrNew, wait, next) {
    $scope.remaining[middleOrNew] = wait;
    $timeout(function() {
      $scope.decr(middleOrNew, $scope.remaining[middleOrNew], next);
    }, 1000);
  };

  $scope.dismissAlert = function(waitOrError, newOrMiddleError) {
    if (waitOrError === 'error') {
      if (newOrMiddleError === 'new') {
        $scope.twitterError.new = false;
      } else if (newOrMiddleError === 'middle') {
        $scope.twitterError.middle = false;
      }
    }
  };

  $scope.getAlreadyGotten = function() {
    console.log('getAlreadyGotten firing');
    $scope.renderInOrOut();
  };

  $scope.renderInOrOut = function() {
    var results;
    if ($location.path() === '/in') {
      results = TweetService.getPassingTweets();
    } else if ($location.path() === '/out') {
      results = TweetService.getFailingTweets();
    }
    $scope.indexOfLast = results.indexOfLast;
    $scope.display(results.tweets);
  };

  $scope.display = function(tweets) {
    $scope.elegantize(tweets, new Date().getTime());
    $scope.tweets = tweets;
    console.log('displaying tweets:', $scope.tweets);
    $scope.busy = false;
    // update the value of oldestScanned
    $scope.updateOldestScanned();

    // set timeOfLastFetch - doing it here, as opposed to in getNewTweets success,
    // so that it is displayed in both /in and /out streams
    if (!$scope.twitterError.new) { // this guard ensures that the time of last update / fetching of new tweets
    // which the user sees is only for the last *successful* attempt
      $scope.timeOfLastFetch = TweetService.timeOfLastFetch;
    }
  };

  $scope.updateOldestScanned = function() {
    // Update the value showing how far back in history has been searched to display the
    // tweets that are displayed

    var currentTweetsLength = TweetService.currentTweets.length;
    if (currentTweetsLength) {
      // If there aren't any tweets bound to the scope but there are tweets in TweetService.currentTweets
      // then we know nextPage is incrementing through currentTweets in blocks of limitIncrement
      if ($scope.tweets && !$scope.tweets.length) {
        $scope.oldestScanned = Date.parse(TweetService.currentTweets[$scope.currentLimit - 1].created_at);
      // If there are tweets bound to the scope
      } else if ($scope.tweets && $scope.tweets.length) {
        // then if our currentLimit is trying to show us more tweets than are actually bound to the scope
        if ($scope.tweets.length < $scope.currentLimit) {
          // we know we have searched in currentTweets as far as the index of the last tweet in $scope.tweets plus the difference between currentLimit and the length of $scope.tweets
          $scope.oldestScanned = Date.parse(TweetService.currentTweets[Math.min($scope.indexOfLast + $scope.currentLimit - $scope.tweets.length, currentTweetsLength - 1)].created_at);
        // otherwise we have searched as far as the currentLimit'eth tweet of the tweets bound to the scope
        } else {
          $scope.oldestScanned = Date.parse($scope.tweets[$scope.currentLimit - 1].created_at);
        }
      }
    }
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
        var date = timeOfEventArray[2];
        date = date[0] === '0' ? date[1] : date;
        approx = timeOfEventArray[1] + ' ' + date;
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
      if (p === null) {
        return null;
      } else {
        return Math.round(p * 100);
      }
    };
    for (var i = 0; i < tweets.length; i++) {
      tweets[i].__elegant_time = elegantizeTimestamp(tweets[i].__created_at);
      tweets[i].__pScore = elegantizeP(tweets[i].__p);
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
    // increment user's total vote count
    SettingsService.settings.voteCount++;
    SettingsService.settings.votesRequiredForNextSugg--;
    // update the count displayed in the navbar
    $scope.$emit('setSuggIndicators', SettingsService.settings.votesRequiredForNextSugg, null);

    // now pass the vote on to the server
    VoteService.vote(tweet, vote)
    .then(function(newVote) {
      console.log('vote recorded');
      if (SettingsService.settings.votesRequiredForNextSugg === 0) {
        console.log('Enough votes for new filter suggestion. Requesting...');
        SettingsService.requestSugg()
        .then(function() {
          console.log('Received new suggestion.');
          // update indicators on the navbar
          $scope.$emit('setSuggIndicators', SettingsService.votesRequiredForNextSugg, SettingsService.settings.undismissedSugg);
        }, function(error) {
          console.log('Error receiving new suggestion.');
          // if there was an error getting filter suggestions, SettingsService.votesRequiredForNextSugg
          // gets reset to 1, so we want to rebind this to the Nav scope
          $scope.$emit('setSuggIndicators', SettingsService.votesRequiredForNextSugg, null);
        });
      }
    }, function(error) {
      // restore the original tweet
      $scope.tweets = origTweets;
      // and restore the original vote
      tweet.__vote = origVote;
      // and restore the original vote count
      SettingsService.settings.voteCount--;
      SettingsService.settings.votesRequiredForNextSugg++;
      // update the count displayed in the navbar
      $scope.$emit('setSuggIndicators', SettingsService.settings.votesRequiredForNextSugg, null);
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

  window.scrollTo(0, 0);
  $scope.initialLoad();

  $scope.$on('sendingAgreement', function() {
    $scope.activeTwitterRequest.new = true;
    $scope.busy = true;
  });

  $scope.$on('agreementSaved', function() {
    $scope.initialLoad();
  });

});
