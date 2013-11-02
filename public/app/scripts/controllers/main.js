'use strict';

angular.module('wynnoApp')
  .controller('MainCtrl', function ($rootScope, $scope, $http) {
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

    $scope.displayed = function(tweet) {
      if ($rootScope.viewingPassing) {
        if (tweet.__vote === null) {
          return (tweet.__p >= $scope.threshold);
        } else {
          return !!tweet.__vote;
        }
      } else {
        if (tweet.__vote === null) {
          return (tweet.__p < $scope.threshold);
        } else {
          return !tweet.__vote;
        }
      }
    };

    $scope.threshold = 0;

  })
  .controller('NavCtrl', function($rootScope, $scope) {
    $rootScope.viewingPassing = true;
    $scope.viewPassing = function() {
      if (!$rootScope.viewingPassing) {
        $rootScope.viewingPassing = !$rootScope.viewingPassing;
      }
    };
    $scope.viewFailing = function() {
      if ($rootScope.viewingPassing) {
        $rootScope.viewingPassing = !$rootScope.viewingPassing;
      }
    }
  });