'use strict';

angular.module('wynnoApp.controllers')
.controller('CheckinCtrl', function($scope, $location, AuthService) {
  $location.path('/in');
});