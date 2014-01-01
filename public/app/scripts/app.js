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
      templateUrl: '/app/views/signinwithtwitter.html',
      controller: 'LandingCtrl'
    })
    .when('/firsttimesignin', {
      templateUrl: '/app/views/checkingin.html',
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
})
.run(function($rootScope, $location, AuthService) {
  $rootScope.$on("$locationChangeStart", function(evt, next, current) {
    console.log('according to client-side, user is authenticated:', AuthService.isAuthenticated());
    console.log('next looks like:', next);
    if (!AuthService.isAuthenticated() && next.controller !== "LandingCtrl") {
      ('redirecting to /signinwithtwitter because not authenticated');
      $location.path('/signinwithtwitter');
    }
  });
});
