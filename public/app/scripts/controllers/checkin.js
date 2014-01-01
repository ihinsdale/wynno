'use strict';

angular.module('wynnoApp.controllers')
.controller('CheckinCtrl', function($scope, $location, AuthService) {
  $scope.currentPathNeedsAuth = true; // this property belongs to NavCtrl scope
  $location.path('/in');
});