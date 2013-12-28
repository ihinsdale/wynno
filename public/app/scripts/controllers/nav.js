'use strict';

angular.module('wynnoApp.controllers')
.controller('NavCtrl', function($scope, $http, $location, TweetService) {
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
    // .then(function(resp) {
    //   // user should be redirected;
    // });
    .success(function(data, status, headers, config) {
      console.log('successful token request:', data);
      console.log('now redirecting if necessary');
      window.location.replace('https://twitter.com/oauth/authorize?oauth_token='+data.oauth_token);
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
});
