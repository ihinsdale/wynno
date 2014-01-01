'use strict';

angular.module('wynnoApp.controllers')
.controller('CheckinCtrl', function($scope, $location, AuthService) {
  $scope.currentPathNeedsAuth = AuthService.doesCurrentPathNeedAuth(); // this property belongs to NavCtrl scope
  $scope.active = AuthService.whatPageIsActive(); // this property belongs to NavCtrl scope
  $location.path('/in');
});