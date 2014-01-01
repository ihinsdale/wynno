'use strict';

angular.module('wynnoApp.controllers')
.controller('LandingCtrl', function($scope, $location, AuthService) {
  $scope.currentPathNeedsAuth = false; // this property belongs to NavCtrl scope
  if (AuthService.isAuthenticated()) {
    $location.path('/in');
  }
});