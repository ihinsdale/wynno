'use strict';

angular.module('wynnoApp.controllers')
.controller('NavCtrl', function($scope, $http, $location, TweetService, AuthService) {
  $scope.activeRequest = true;
  $scope.currentPathNeedsAuth = false;
  console.log('path is:', $location.path());

  // Keep track of which page the user is on
  if ($location.path === '/in') {
    console.log('current path is /in');
    $scope.viewing = 'passing';
    $scope.active = [true, false, false];
  } else if ($location.path === '/out') {
    console.log('current path is /out');
    $scope.viewing = 'failing';
    $scope.active = [false, true, false];
  } else if ($location.path === '/settings') {
    console.log('current path is /settings');
    $scope.viewing = 'settings';
    $scope.active = [false, false, true];
  }
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
