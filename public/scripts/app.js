'use strict';

angular.module('wynnoApp', [
  'ngCookies',
  'ngAnimate',
  'ngResource',
  'ngSanitize',
  'ui.bootstrap',
  'wynnoApp.services',
  'wynnoApp.controllers',
  'wynnoApp.filters',
  'infinite-scroll',
  'ngRoute',
  'btford.markdown'
])
.config(function ($routeProvider) {
  $routeProvider
    .when('/', {
      templateUrl: '/views/landing.html',
      controller: 'LandingCtrl'
    })
    .when('/signinwithtwitter', {
      templateUrl: '/views/signinwithtwitter.html',
      controller: 'LandingCtrl'
    })
    .when('/in', {
      templateUrl: '/views/main.html',
      controller: 'MainCtrl'
    })
    .when('/out', {
      templateUrl: '/views/main.html',
      controller: 'MainCtrl'
    })
    .when('/settings', {
      templateUrl: '/views/settings.html',
      controller: 'SettingsCtrl'
    })
    .when('/terms', {
      templateUrl:'/views/termsofservice.html',
      controller: 'StaticCtrl'
    })
    .when('/privacy', {
      templateUrl:'/views/privacypolicy.html',
      controller: 'StaticCtrl'
    })
    .when('/blog', {
      templateUrl: '/views/blog/blogindex.html',
      controller: 'BlogCtrl'
    })
    .when('/blog/:slug', {
      templateUrl: '/views/blog/post.html',
      controller: 'BlogCtrl'
    })
    .otherwise({
      redirectTo: '/'
    });
})
.config(function($httpProvider) {
  $httpProvider.interceptors.push('wynnoInterceptor');
})
.run(function($rootScope, $location, AuthService) {
  $rootScope.$on('$locationChangeStart', function(evt, next, current) {
    console.log('$locationChangeStart event fired');
    console.log('according to client-side, user is authenticated:', AuthService.isAuthenticated());
    console.log('next looks like:', next);
    if (!AuthService.isAuthenticated()) {
      var urlParsingNode = document.createElement('a');
      urlParsingNode.href = next;
      if (AuthService.doesPathNeedAuth(urlParsingNode.hash.slice(1))) { // slicing at index 1 because 0th character is #
        console.log('redirecting to /signinwithtwitter because not authenticated');
        $location.path('/signinwithtwitter');
      }
    }
  });
});
