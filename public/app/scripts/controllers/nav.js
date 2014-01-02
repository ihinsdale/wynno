'use strict';

angular.module('wynnoApp.controllers')
.controller('NavCtrl', function($scope, $http, $location, TweetService, AuthService) {
  $scope.activeRequest = true;
  $scope.currentPathNeedsAuth = false;
  $scope.username = '@' + AuthService.getCurrentUser().username;
  console.log('navctrl line evaluated');

  $scope.$on("$locationChangeSuccess", function(evt, next, current) {
    console.log('locationchangesuccess listener in navctrl evaluated');
    var urlParsingNode = document.createElement('a');
    urlParsingNode.href = next;
    var nextPath = urlParsingNode.hash.slice(1); // slicing at index 1 because 0th character is #
    $scope.currentPathNeedsAuth = AuthService.doesPathNeedAuth(nextPath);
    $scope.active = AuthService.whatPageIsActive(nextPath);
  });

  $scope.refreshRequest = function() {
    $scope.activeRequest = true;
    $scope.$broadcast('refreshRequest');
    console.log('refreshRequest event emitted');
  };

  $scope.endSpinning = function() {
    $scope.activeRequest = false;
  };

  $scope.logout = function() {
    AuthService.logout()
    .then(function(data){
      console.log(data);
      console.log('is authenticated still:', AuthService.isAuthenticated());
      console.log('current user:', AuthService.getCurrentUser());
      window.location('https://twitter.com/logout'); // redirect user to Twitter where they can logout
      //$location.path('/');
    }, function(err){
      console.log('failed to logout:', err);
    });
  };

  $scope.$on('refreshRequestCompleted', function(event, args) {
    $scope.endSpinning();
  })
});
