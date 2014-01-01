'use strict';

angular.module('wynnoApp.controllers')
.controller('CheckinCtrl', function($scope, $location, AuthService) {
  var path = $location.path();
  $scope.currentPathNeedsAuth = AuthService.doesCurrentPathNeedAuth(path); // this property belongs to NavCtrl scope
  $scope.active = AuthService.whatPageIsActive(path); // this property belongs to NavCtrl scope
  $location.path('/in');
});