'use strict';

angular.module('wynnoApp.controllers')
.controller('NavCtrl', function($scope, $http, $location, TweetService, AuthService) {
  $scope.activeRequest = true;
  console.log('path is:', $location.path());
  $scope.currentPathNeedsAuth = AuthService.doesCurrentPathNeedAuth();
  $scope.active = AuthService.whatPageIsActive();

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
