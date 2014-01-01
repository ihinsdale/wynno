'use strict';

angular.module('wynnoApp.controllers')
.controller('LandingCtrl', function($scope, $location, AuthService) {
  if (AuthService.isAuthenticated()) {
    $location.path('/in');
  }
});