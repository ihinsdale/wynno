'use strict';

angular.module('wynnoApp.controllers')
.controller('LandingCtrl', function($scope, $location, AuthService) {
  var path = $location.path();
  $scope.currentPathNeedsAuth = AuthService.doesCurrentPathNeedAuth(path); // this property belongs to NavCtrl scope
  $scope.active = AuthService.whatPageIsActive(path); // this property belongs to NavCtrl scope
  if (AuthService.isAuthenticated()) {
    $location.path('/in');
  }
});