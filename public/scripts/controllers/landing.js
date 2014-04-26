'use strict';

angular.module('wynnoApp.controllers')
.controller('LandingCtrl', function($scope, $location, AuthService) {
  if (AuthService.isAuthenticated()) {
    $location.path('/in');
  }

  // Always start at the top
  window.scrollTo(0, 0);
});
