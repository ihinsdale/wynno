'use strict';

angular.module('wynnoApp.controllers')
.controller('CheckinCtrl', function($scope, $location, AuthService) {
  AuthService.setAuthenticated();
  $location.path('/in');
});