'use strict';

angular.module('wynnoApp.controllers')
.controller('NavCtrl', function($scope, $rootScope, $route, $location, $modal, $cookieStore, $timeout, $window, TweetService, AuthService, FeedbackService) {
  $scope.currentPathNeedsAuth = false;
  $scope.votesRequiredForNextSugg = null;
  $scope.undismissedSugg = null;
  $scope.filterBuilderOpen = false;
  $scope.serverError = null;

  console.log('navctrl line evaluated');

  // It is crucial that this listener gets set up before the $locationChangeSuccess
  // event for the initial page (as well as of course subsequent pages) actually occurs, so that
  // the callback function gets evaluated and $scope.currentPathNeedsAuth and $scope.active
  // get set for the initial page. The primary case in mind here is for #/in,
  // where the user is redirected after successful login with Twitter. Fortunately,
  // it appears this listener does get set up before the success event of the initial page is fired.
  $scope.$on('$locationChangeSuccess', function(evt, next, current) {
    console.log('locationchangesuccess listener in navctrl evaluated');

    // Register a new pageview with Google Analytics
    $window.ga('send', 'pageview', { page: $location.path() }); // Cf. comment by CWSpear at http://stackoverflow.com/a/10713709

    // update which view is active and whether that view requires authentication
    // can't parse the URL using $location, because that only parses the current url, not the next one we're going to
    var urlParsingNode = document.createElement('a');
    urlParsingNode.href = next;
    var nextPath = urlParsingNode.hash.slice(1); // slicing at index 1 because 0th character is #
    // angular uses a secondary hash, which we want to lop off in order to get just the path
    var locSecHash = nextPath.indexOf('#');
    nextPath = locSecHash !== -1 ? nextPath.slice(0,locSecHash) : nextPath;
    $scope.currentPathNeedsAuth = AuthService.doesPathNeedAuth(nextPath);
    $scope.active = AuthService.whatPageIsActive(nextPath);

    var currentUser = AuthService.getCurrentUser();
    // if there is a current user, set the value of username in the scope
    if (currentUser) {
      $scope.username = currentUser.username;
    } else {
      $scope.username = null;
    }

    // if the user hasn't agreed to ToS, and the view requires authentication,
    // open Welcome modal where they can agree to ToS
    console.log('inside locationChangeSuccess listener, currentUser looks like:', currentUser);
    if (currentUser && !currentUser.agreed_terms && $scope.currentPathNeedsAuth) {
      $scope.openWelcome();
    }
  });

  // create listener for update to voteCount and votesRequiredForNextSugg
  $scope.$on('setSuggIndicators', function(event, votesRequiredForNextSugg, undismissedSugg) {
    console.log('Setting votesRequired and undismissedSugg indicators.');
    if (votesRequiredForNextSugg !== null) {
      $scope.votesRequiredForNextSugg = votesRequiredForNextSugg;
    }
    if (undismissedSugg !== null) {
      $scope.undismissedSugg = undismissedSugg;
    }
  });

  // create listener for serverError event emitted by response interceptor
  $rootScope.$on('serverError', function(event, mainMsg) {
    $scope.serverError = { mainMsg: mainMsg };
    // make the error disappear after 10 seconds if user hasn't already closed it
    $timeout(function() {
      $scope.serverError = null;
    }, 10000);
  });

  $scope.closeErrorAlert = function() {
    $scope.serverError = null;
  };

  $scope.doCollapse = function() {
    $scope.navCollapsed = true;
  };

  $scope.logout = function(redirectDestination) {
    AuthService.logout()
    .then(function(data){
      console.log(data);
      console.log('is authenticated still:', AuthService.isAuthenticated());
      console.log('current user:', AuthService.getCurrentUser());
      if (redirectDestination === 'twitter') {
        window.location = 'http://twitter.com/logout'; // redirect user to Twitter where they can logout
      } else {
        $location.path('/');
      }
    }, function(err){
      console.log('failed to logout:', err);
    });
  };

  $scope.openFeedback = function() {
    var modalInstance = $modal.open({
      templateUrl: '/views/feedback.html',
      controller: 'FeedbackModalInstanceCtrl',
      windowClass: 'noFade'
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
      templateUrl: '/views/welcome.html',
      controller: 'WelcomeModalInstanceCtrl',
      windowClass: 'noFade'
    });
    modalInstance.result.then(function(modalResult) {
      console.log('sending agreement to ToS', modalResult.agreement);
      // broadcast event that agreement is being sent. this will be heard in
      // MainCtrl, which will start spinners
      $scope.$broadcast('sendingAgreement');
      // send agreement to ToS back to server
      AuthService.sendAgreement(modalResult.agreement)
      .then(function(result) {
        console.log(result);
        // broadcast event that agreement has been saved, so that loading of
        // content can actually be kicked off
        $scope.$broadcast('agreementSaved');
        // update cookie accordingly
        var user = AuthService.getCurrentUser();
        user.agreed_terms = true;
        $cookieStore.put('user', user);
        console.log('after rewriting cookie, user looks like:', AuthService.getCurrentUser());
      }, function(reason) {
        console.log('error saving agreement:', reason);
      });
    }, function(reason) {
      console.log('User did not agree to Terms of Service.');
      if (reason === 'cancel') {
        $scope.logout();
      }
    });
  };

  $scope.openFilterBuilder = function() {
    $scope.filterBuilderOpen = true; // used by ng-class on body element, for css targeting of modal-dialog
    var modalInstance = $modal.open({
      templateUrl: '/views/filterbuilder.html',
      controller: 'CreateFilterCtrl',
      windowClass: 'filterBuilderOpen noFade'
    });
    modalInstance.result.then(function(modalResult) {
      console.log('Created filter successfully.');
      // display alert containing the rendered filter
      console.log('the rendered filter text is:', modalResult);
      $scope.filterBuilderOpen = false;
      // if user is currently viewing /in or /out, we need to reload the page
      // so that the filter that was just created gets applied to what they're viewing
      var currentLocation = $location.path();
      if (currentLocation === '/in' || currentLocation === '/out') {
        console.log('Refreshing ' + currentLocation);
        $route.reload();
      }
    }, function(reason) {
      console.log('Filter creation canceled.');
      $scope.filterBuilderOpen = false;
    });
  };
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
    $modalInstance.close({ agreement: $scope.form.agreement});
  };

  $scope.cancel = function() {
    $modalInstance.dismiss('cancel');
  };
});
