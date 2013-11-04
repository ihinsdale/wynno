'use strict';

angular.module('wynnoApp')

  .controller('MainCtrl', function ($rootScope, $scope, $http) {
    // upon main page load, make a GET request to /old
    $http.get('/old')
    .success(function(data, status, headers, config) {
      console.log('success getting old tweets, they look like:', data);
      $scope.tweets = data;
      // $http.get('/new')
      // .success(function(data2, status2, headers2, config2) {
      //   console.log('success getting new tweets, they look like:', data2);
      //   $scope.tweets = data2.concat($scope.tweets);
      // })
      // .error(function(data2, status2) {
      //   console.log('error getting /new, data look like:', data2);
      // });
    })
    .error(function(data, status) {
      console.log('error getting /old, data look like:', data);
    });

    // function to record user's votes
    $scope.vote = function(tweet, vote) {
      var priorVote = tweet.__vote;
      // update the model with the new vote
      tweet.__vote = vote;

      // save the vote to the database
      $http({method: 'POST', url: '/vote', data: {_id: tweet._id, vote: vote}})
      .success(function(data, status, headers, config) {
        console.log('success sending vote', vote, 'on tweet', tweet._id);
      })
      .error(function(data, status) {
        console.log('error sending vote', vote, 'on tweet', tweet._id);
        // if the vote wasn't recorded, reset it on the model
        tweet.__vote = priorVote;
      });
    };

    // function to determine whether a tweet is displayed or not
    $scope.displayed = function(tweet) {
      if ($rootScope.viewing === 'passing') {
        if (tweet.__vote === null) {
          return (tweet.__p >= $scope.threshold);
        } else {
          return !!tweet.__vote;
        }
      } else if ($rootScope.viewing === 'failing') {
        if (tweet.__vote === null) {
          return (tweet.__p < $scope.threshold);
        } else {
          return !tweet.__vote;
        }
      }
    };

    // if tweet has been voted on, hide the vote buttons
    $scope.hideVoteButtons = function(tweet) {
      if (tweet.__vote !== null) {
        return true;
      } else {
        return false;
      }
    }

    $scope.threshold = 0;

  })

  .controller('NavCtrl', function($rootScope, $scope) {
    $rootScope.viewing = 'passing';
    $scope.active = [true, false, false];
    $scope.viewPassing = function() {
      if ($rootScope.viewing !== 'passing') {
        $rootScope.viewing = 'passing';
        $scope.active = [true, false, false];
      }
    };
    $scope.viewFailing = function() {
      if ($rootScope.viewing !== 'failing') {
        $rootScope.viewing = 'failing';
        $scope.active = [false, true, false];
      }
    }
    $scope.viewSettings = function() {
      if ($rootScope.viewing !== 'settings') {
        $rootScope.viewing = 'settings';
        $scope.active = [false, false, true];
      }
    }
  })

  .controller('SettingsCtrl', function($scope, $http) {

  });