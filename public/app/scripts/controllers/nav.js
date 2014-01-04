'use strict';

angular.module('wynnoApp.controllers')
.controller('NavCtrl', function($scope, $location, $modal, TweetService, AuthService, FeedbackService) {
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
      templateUrl: '/app/views/feedback.html',
      controller: 'FeedbackModalInstanceCtrl'
    });
    modalInstance.result.then(function(feedback, email) {
      // send feedback to server
      FeedbackService.sendFeedback(feedback, email)
      .then(function(result) {
        console.log('successfully saved feedback;', result);
      }, function(reason) {
        console.log('error saving feedback:', reason);
      });
    }, function(reason) {
      console.log('feedback canceled');
    });
  };
})
.controller('FeedbackModalInstanceCtrl', function($scope, $modalInstance) {
  $scope.feedback = null; // not sure if setting these as null is necessary or not, hopefully it doesn't remove the placeholder
  $scope.email = null;
  $scope.submit = function(isEmailInvalid) {
    // allow the user to submit invalid email address, because email address is optional
    var validEmail = isEmailInvalid ? null : $scope.email;
    $modalInstance.close($scope.feedback, validEmail);
  };

  $scope.cancel = function() {
    $modalInstance.dismiss('cancel');
  };
});



