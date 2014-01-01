'use strict';

angular.module('wynnoApp.controllers')
.controller('NavCtrl', function($scope, $http, $location, TweetService) {
  $scope.activeRequest = true;
  console.log('path is:', $location.path());
  if ($location.path === '/in') {
    $scope.viewing = 'passing';
    $scope.active = [true, false, false];
  } else if ($location.path === '/out') {
    $scope.viewing = 'failing';
    $scope.active = [false, true, false];
  } else if ($location.path === '/settings') {
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
