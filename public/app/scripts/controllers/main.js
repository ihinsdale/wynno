'use strict';

angular.module('wynnoApp')
  .controller('MainCtrl', function ($scope, $http) {
    $http.get('/old')
    .success(function(data, status, headers, config) {
      console.log('success getting old tweets, they look like:', data);
      $scope.tweets = data;
      $http.get('/new')
      .success(function(data2, status2, headers2, config2) {
        console.log('success getting new tweets, they look like:', data2);
        $scope.tweets = _.extend($scope.tweets, data2);
      })
      .error(function(data2, status2) {
        console.log('error getting /new, data look like:', data2);
      });
    })
    .error(function(data, status) {
      console.log('error getting /old, data look like:', data);
    });
  });
