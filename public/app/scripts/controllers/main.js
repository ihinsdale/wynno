'use strict';

angular.module('wynnoApp')
  .controller('MainCtrl', function ($scope, $http) {
    $http.get('/old')
    .success(function(data, status, headers, config) {
      console.log('success getting old tweets, they look like:', data);
      $scope.tweets = data;
    })
    .error(function(data, status) {
      console.log('error getting /old, data look like:', data);
    });
  });
