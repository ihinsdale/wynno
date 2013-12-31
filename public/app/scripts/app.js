'use strict';

angular.module('wynnoApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ui.bootstrap',
  'wynnoApp.services',
  'wynnoApp.controllers',
  'infinite-scroll',
  'ngRoute'
])
.config(function ($routeProvider) {
  $routeProvider
    .when('/', {
      templateUrl: '/app/views/landing.html',
      controller: 'LandingCtrl'
    })
    .when('/signinwithtwitter', {
      templateUrl: '/app/views/signinwithtwitter.html'
    })
    .when('/clientcheckin', {
      controller: 'CheckinCtrl'
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
})
.config(function($httpProvider) {
  $httpProvider.interceptors.push('wynnoInterceptor');
});
