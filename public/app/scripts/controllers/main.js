'use strict';

angular.module('wynnoApp.controllers')

  .controller('MainCtrl', function($rootScope, $scope, $http, TweetService, SettingsService, VoteService) {

    $scope.getOldTweets = function() {
      TweetService.getOldTweets()
      .then(function(tweets) {
        $scope.tweets = tweets;
        $scope.getNewTweets();
      });
    };

    $scope.getNewTweets = function() {
      TweetService.getNewTweets()
      .then(function(tweets) {
        $scope.tweets = tweets;
        $scope.threshold = 0.5;
        $scope.renderInOrOut($scope.threshold);
      })
    };

    $scope.renderInOrOut = function(threshold) {
      if ($scope.viewing === 'passing') {
        $scope.displayPassing($scope.threshold);
      } else if ($scope.viewing === 'failing') {
        $scope.displayFailing($scope.threshold);
      }
    }

    // function to record user's votes
    $scope.vote = function(tweet, vote) {
      VoteService.vote(tweet, vote)
      .then(function(newVote) {
        tweet.__vote = newVote;
      });
    };

    // function to determine whether a tweet is displayed or not
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

    // if tweet has been voted on, hide the vote buttons
    $scope.hideVoteButtons = function(tweet) {
      if (tweet.__vote !== null || tweet.__isProtected || tweet.__isMuted) {
        return true;
      } else {
        return false;
      }
    };

    // $scope.getOldTweets(function() {
    //   $scope.getNewTweets();
    // });
    //$scope.getSettingsFromDb();
    $scope.getOldTweets();

  })

  .controller('NavCtrl', function($scope, $http) {
    $scope.viewing = 'passing';
    $scope.active = [true, false, false];
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
    }
  })

  .controller('SettingsCtrl', function($scope, $http, SettingsService) {
    $scope.injectSettings = function() {
      SettingsService.provideSettings()
      .then(function(settings) {
        $scope.settings = settings;
      });
    };

    $scope.updateSetting = function(add_or_remove, user_or_word, mute_or_protect, input) {
      SettingsService.updateSetting(add_or_remove, user_or_word, mute_or_protect, input);
      // .then(function(settings) {
      //   $scope.settings = settings;
      // });
    };

    $scope.injectSettings();
  });