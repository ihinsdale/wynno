'use strict';

angular.module('wynnoApp.controllers')
.controller('NavCtrl', function($scope, $location, $modal, TweetService, AuthService, FeedbackService) {
  $scope.currentPathNeedsAuth = false;
  $scope.currentUser = AuthService.getCurrentUser();
  if ($scope.currentUser) {
    $scope.username = '@' + $scope.currentUser.username;
  }
  console.log('navctrl line evaluated');

  // It is crucial that this listener gets set up before the $locationChangeSuccess
  // event for the initial page (as well as of course subsequent pages) actually occurs, so that
  // the callback function gets evaluated and $scope.currentPathNeedsAuth and $scope.active
  // get set for the initial page. The primary case in mind here is for #/in,
  // where the user is redirected after successful login with Twitter. Fortunately,
  // it appears this listener does get set up before the success event of the initial page is fired.
  $scope.$on("$locationChangeSuccess", function(evt, next, current) {
    console.log('locationchangesuccess listener in navctrl evaluated');
    var urlParsingNode = document.createElement('a');
    urlParsingNode.href = next;
    var nextPath = urlParsingNode.hash.slice(1); // slicing at index 1 because 0th character is #
    $scope.currentPathNeedsAuth = AuthService.doesPathNeedAuth(nextPath);
    $scope.active = AuthService.whatPageIsActive(nextPath);
    // if the user hasn't agreed to ToS, and the page requires authentication,
    // open Welcome modal where they can agree to ToS
    if (currentUser && !currentUser.agreed_terms && $scope.currentPathNeedsAuth) {
      $scope.openWelcome();
    }
  });

  $scope.doCollapse = function() {
    $scope.navCollapsed = true;
  };

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

  $scope.openFeedback = function() {
    var modalInstance = $modal.open({
      templateUrl: '/app/views/feedback.html',
      controller: 'FeedbackModalInstanceCtrl'
    });
    modalInstance.result.then(function(modalResult) {
      console.log('sending feedback', modalResult.feedback, 'and email', modalResult.email);
      // send feedback to server
      FeedbackService.sendFeedback(modalResult.feedback, modalResult.email)
      .then(function(result) {
        console.log(result);
      }, function(reason) {
        console.log('error saving feedback:', reason);
      });
    }, function(reason) {
      console.log('feedback canceled');
    });
  };

  $scope.openWelcome = function() {
    var modalInstance = $modal.open({
      templateUrl: '/app/views/welcome.html',
      controller: 'WelcomeModalInstanceCtrl'
    });
    modalInstance.result.then(function(modalResult) {
      console.log('sending feedback', modalResult.feedback, 'and email', modalResult.email);
      // send agreement to ToS back to server
      AuthService.sendAgreement()
      .then(function(result) {
        console.log(result);
      }, function(reason) {
        console.log('error saving agreement:', reason);
      });
    }, function(reason) {
      console.log('User did not agree to Terms of Service.');
    });
  }
})
.controller('FeedbackModalInstanceCtrl', function($scope, $modalInstance) {
  $scope.form = {};
  $scope.submit = function() {
    // if no email provided, set the value to null
    // if email is not null, it will be validated on server before storing to db
    // reason for not using Angular's validation of email is I don't like the red border that appears while mid-typing
    // and can't find out how to switch it to blue
    var email = $scope.form.email || null;
    $modalInstance.close({ feedback: $scope.form.feedback, email: email} );
  };

  $scope.cancel = function() {
    $modalInstance.dismiss('cancel');
  };
})
.controller('WelcomeModalInstanceCtrl', function($scope, $modalInstance) {
  $scope.form = {};
  $scope.submit = function() {
  };

  $scope.cancel = function() {
    $modalInstance.dismiss('cancel');
  };
});



