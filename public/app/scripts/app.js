'use strict';

angular.module('wynnoApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ui.bootstrap',
  'wynnoApp.services',
  'wynnoApp.controllers',
])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        redirectTo: '/in'
      })
      .when('/in', {
        templateUrl: '/app/views/main.html',
        controller: 'MainCtrl'
      })
      .when('/out', {
        templateUrl: '/app/views/main.html',
        controller: 'MainCtrl'
      })
      .when('/settings', {
        templateUrl: '/app/views/settings.html',
        controller: 'SettingsCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  });
