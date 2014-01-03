'use strict';

angular.module('wynnoApp.controllers')
.controller('NavCtrl', function($scope, $http, $location, $modal, TweetService, AuthService) {
  $scope.currentPathNeedsAuth = false;
  var currentUser = AuthService.getCurrentUser();
  if (currentUser) {
    $scope.username = '@' + currentUser.username;
  }
  console.log('navctrl line evaluated');

  $scope.$on("$locationChangeSuccess", function(evt, next, current) {
    console.log('locationchangesuccess listener in navctrl evaluated');
    var urlParsingNode = document.createElement('a');
    urlParsingNode.href = next;
    var nextPath = urlParsingNode.hash.slice(1); // slicing at index 1 because 0th character is #
    $scope.currentPathNeedsAuth = AuthService.doesPathNeedAuth(nextPath);
    $scope.active = AuthService.whatPageIsActive(nextPath);
  });

  $scope.logout = function() {
    AuthService.logout()
    .then(function(data){
      console.log(data);
      console.log('is authenticated still:', AuthService.isAuthenticated());
      console.log('current user:', AuthService.getCurrentUser());
      window.location = 'http://twitter.com/logout'; // redirect user to Twitter where they can logout
      //$location.path('/');
    }, function(err){
      console.log('failed to logout:', err);
    });
  };

  $scope.open = function() {
    var modalInstance = $modal.open({
      templateUrl: 'feedback.html',
      controller: feedbackModalInstanceCtrl
    });
    modalInstance.result.then(function(feedback, email) {
      // send back to server, including username if authenticated
    }, function(reason) {
      console.log('feedback canceled');
    });
  };
})
.controller('feedbackModalInstanceCtrl', function($scope, $modalInstance) {
  $scope.feedback = null; // not sure if setting these as null is necessary or not, hopefully it doesn't remove the placeholder
  $scope.email = null;
  $scope.submit = function() {
    // allow the user to submit invalid email address, because email address is optional
    var validEmail = $scope.feedback_form.email.$error.email ? null : $scope.email;
    $modalInstance.close($scope.feedback, validEmail);
  }

  $scope.cancel = function() {
    $modalInstance.dismiss('cancel');
  };
});



