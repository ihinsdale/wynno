'use strict';

angular.module('wynnoApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ui.bootstrap'
])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
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
