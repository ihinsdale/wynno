'use strict';

angular.module('wynnoApp')
  .controller('MainCtrl', function ($scope, $http) {

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

    $scope.vote = function(_id, vote) {
      $http({method: 'POST', url: '/vote', data: {_id: _id, vote: vote}})
      .success(function(data, status, headers, config) {
        console.log('success sending vote', data.vote, 'on tweet', data._id);
      })
      .error(function(data, status) {
        console.log('error sending vote', data.vote, 'on tweet', data._id);
      });
    };
  });
