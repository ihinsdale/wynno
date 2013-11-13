'use strict';

angular.module('wynnoApp.controllers')

  .controller('MainCtrl', function($scope, TweetService, SettingsService, VoteService) {

    $scope.busy = false;
    $scope.lastTweetId = 0;

    $scope.nextPage = function() {
      if ($scope.busy) {
        return;
      }
      $scope.busy = true;
      if (!TweetService.timeOfLastFetch) {
        $scope.firstGet();
      } else {
        $scope.subsequentGet();
      }
    }

    $scope.firstGet = function() {
      TweetService.getOldTweets($scope.lastTweetId)
      .then(function(tweets) {
        if (!TweetService.timeOfLastFetch) {
          $scope.getNewTweets();
        } else {
          $scope.renderInOrOut(tweets);
        }
      });
    };

    $scope.subsequentGet = function() {
      TweetService.getOldTweets($scope.lastTweetId)
      .then(function(tweets) {
        $scope.renderInOrOut(tweets);
      })
    }

    $scope.getNewTweets = function() {
      TweetService.getNewTweets()
      .then(function(tweets) {
        $scope.renderInOrOut(tweets);
        $scope.$emit('refreshRequestCompleted');
      }, function(reason) {
        console.log('error getting new tweets:', reason);
        $scope.$emit('refreshRequestCompleted');
      })
    };

    $scope.renderInOrOut = function(tweets) {
      $scope.tweets = tweets;
      $scope.threshold = 0.5;
      if ($scope.viewing === 'passing') {
        $scope.displayPassing($scope.threshold);
      } else if ($scope.viewing === 'failing') {
        $scope.displayFailing($scope.threshold);
      }
      $scope.lastTweetId = $scope.tweets[$scope.tweets.length - 1]._id;
      $scope.busy = false;
    };

    $scope.displayPassing = function(threshold) {
      TweetService.getPassingTweets(threshold)
      .then(function(tweets) {
        $scope.tweets = tweets;
        console.log('displaying tweets:', $scope.tweets);
      });
    };

    $scope.displayFailing = function(threshold) {
      TweetService.getFailingTweets(threshold)
      .then(function(tweets) {
        $scope.tweets = tweets;
        console.log('displaying tweets:', $scope.tweets);
      })
    }

    // function to record user's votes
    $scope.vote = function(tweet, vote, index) {
      VoteService.vote(tweet, vote)
      .then(function(newVote) {
        tweet.__vote = newVote;
        if ($scope.viewing === 'passing' && tweet.__vote === 0) {
          $scope.tweets.splice(index, 1);
        } else if ($scope.viewing === 'failing' && tweet.__vote === 1) {
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

    //$scope.getOldTweets();
    $scope.$on('refreshRequest', function(event, args) {
      $scope.getNewTweets();
    });

  })

  .controller('NavCtrl', function($scope, $http, TweetService) {
    $scope.viewing = 'passing';
    $scope.active = [true, false, false];
    $scope.activeRequest = true;
    $scope.viewPassing = function() {
      if ($scope.viewing !== 'passing') {
        $scope.viewing = 'passing';
        $scope.active = [true, false, false];
      }
    };
    $scope.viewFailing = function() {
      if ($scope.viewing !== 'failing') {
        $scope.viewing = 'failing';
        $scope.active = [false, true, false];
      }
    };
    $scope.viewSettings = function() {
      if ($scope.viewing !== 'settings') {
        $scope.viewing = 'settings';
        $scope.active = [false, false, true];
      }
    };
    $scope.signIn = function() {
      $http.get('/auth/twitter')
      .success(function(data, status, headers, config) {
        console.log('successful token request:', data);
      })
      .error(function(data, status) {
        console.log('error requesting token:', data);
      });
    };

    $scope.refreshRequest = function() {
      $scope.activeRequest = true;
      $scope.$broadcast('refreshRequest');
      console.log('refreshRequest event emitted');
    };

    $scope.endSpinning = function() {
      $scope.activeRequest = false;
    };

    $scope.$on('refreshRequestCompleted', function(event, args) {
      $scope.endSpinning();
    })
  })

  .controller('SettingsCtrl', function($scope, SettingsService) {
    $scope.injectSettings = function() {
      SettingsService.provideSettings()
      .then(function(settings) {
        $scope.settings = settings;
      });
    };

    $scope.updateSetting = function(add_or_remove, user_or_word, mute_or_protect, input) {
      SettingsService.updateSetting(add_or_remove, user_or_word, mute_or_protect, input)
      .then(function(settings) {
        $scope.settings = settings;
      });
    };

    $scope.injectSettings();
  });