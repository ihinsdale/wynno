'use strict';

angular.module('wynnoApp.controllers')
.controller('NavCtrl', function($scope, $route, $location, $modal, $cookieStore, TweetService, AuthService, FeedbackService) {
  $scope.currentPathNeedsAuth = false;
  $scope.votesRequiredForNextSugg = null;
  $scope.undismissedSugg = null;
  $scope.filterBuilderOpen = false;

  console.log('navctrl line evaluated');

  // It is crucial that this listener gets set up before the $locationChangeSuccess
  // event for the initial page (as well as of course subsequent pages) actually occurs, so that
  // the callback function gets evaluated and $scope.currentPathNeedsAuth and $scope.active
  // get set for the initial page. The primary case in mind here is for #/in,
  // where the user is redirected after successful login with Twitter. Fortunately,
  // it appears this listener does get set up before the success event of the initial page is fired.
  $scope.$on('$locationChangeSuccess', function(evt, next, current) {
    console.log('locationchangesuccess listener in navctrl evaluated');

    // update which view is active and whether that view requires authentication
    var urlParsingNode = document.createElement('a');
    urlParsingNode.href = next;
    var nextPath = urlParsingNode.hash.slice(1); // slicing at index 1 because 0th character is #
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
      templateUrl: '/views/welcome.html',
      controller: 'WelcomeModalInstanceCtrl'
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
})
.controller('CreateFilterCtrl', function($scope, $modalInstance, SettingsService) {
  $scope.newDraftFilter = function() {
    // reset any editExistingFilterIndex value
    $scope.editExistingFilterIndex = null;
    // initialize new draft filter
    $scope.draftFilter = { conditions: [{}], users: [], scope: 'all' };
    $scope.draftFilter.typeDisplayed = 'Hear/Mute';
    $scope.draftFilter.usersDisplayed = '(all users)';
    $scope.draftFilter.conditions[0].typeDisplayed = '(anything)';
    $scope.draftFilter.scopeDisplayed = 'tweets + retweets';
  };

  $scope.draftFilterAddUser = function(username) {
    // have to prevent duplicates from being added
    var duplicate = false;
    for (var i = 0; i < $scope.draftFilter.users.length; i++) {
      if (!duplicate && $scope.draftFilter.users[i] === username) {
        duplicate = true;
      }
    }
    if (!duplicate) {
      $scope.errorAddingUser = null;
      $scope.draftFilter.users.push(username);
      // display up to two usernames within the dropdown field. More are represented by ...
      if ($scope.draftFilter.users.length === 1) {
        $scope.draftFilter.usersDisplayed = '@' + username;
      } else if ($scope.draftFilter.users.length === 2) {
        $scope.draftFilter.usersDisplayed += ', ...';
        //$scope.draftFilter.usersDisplayed += ', ';
        //$scope.draftFilter.usersDisplayed += '@' + username;
      //} else if ($scope.draftFilter.users.length === 3) {
      //  $scope.draftFilter.usersDisplayed += ', ...';
      }
    } else {
      $scope.errorAddingUser = 'That user has already been added.';
    }
  };

  $scope.draftFilterIsIncomplete = function() {
    // if no users have been specified, at least one condition must be valid
    // if a user has been specified, invalid conditions are okay
    if ($scope.draftFilter && !$scope.draftFilter.type) {
      return true;
    } else if ($scope.draftFilter && !$scope.draftFilter.scope) {
      return true;
    } else if ($scope.draftFilter && !$scope.draftFilter.users.length) {
      // if not all conditions valid, incomplete
      var oneValid = false;
      for (var i = 0; i < $scope.draftFilter.conditions.length; i++) {
        if (!oneValid) {
          // if the condition has a type that's not 'word', or its type is 'word' and a word has been entered, valid
          if (($scope.draftFilter.conditions[i].type && $scope.draftFilter.conditions[i].type !== 'word')
          || ($scope.draftFilter.conditions[i].type === 'word' && $scope.draftFilter.conditions[i].word)) {
            oneValid = true;
          }
        }
      }
      if (!oneValid) {
        return true;
      } else {
      // else, complete
        return false;
      }
    } else {
      return false;
    }
  };

  $scope.draftFilterRemoveUser = function(userIndex) {
    $scope.draftFilter.users.splice(userIndex, 1);
    if (!$scope.draftFilter.users.length) {
      $scope.draftFilter.usersDisplayed = '(all users)';
    } else {
      $scope.draftFilter.usersDisplayed = '';
      var limit;
      if ($scope.draftFilter.users.length > 1) {
        limit = 2;
      } else {
        limit = $scope.draftFilter.users.length;
      }
      for (var i = 0; i < limit; i++) {
        if (i > 0) {
          $scope.draftFilter.usersDisplayed += ', ';
        }
        if (i === 1) {
          $scope.draftFilter.usersDisplayed += '...';
        } else {
          $scope.draftFilter.usersDisplayed += ('@' + $scope.draftFilter.users[i]);
        }
      }
    }
  };

  $scope.dismissError = function() {
    $scope.error = null;
  };

  $scope.hasValidCondition = function() {
    // must have at least one valid condition
    var hasValidCondition = false;
    for (var i = 0; i < $scope.draftFilter.conditions.length; i++) {
      if (!hasValidCondition) {
        // if condition type is a word, condition must have a word
        // all other condition types are necessarily valid because they have defaults
        if (($scope.draftFilter.conditions[i].type && $scope.draftFilter.conditions[i].type !== 'word')
        || ($scope.draftFilter.conditions[i].type === 'word' && $scope.draftFilter.conditions[i].word)) {
          hasValidCondition = true;
        }
      }
    }
    return hasValidCondition;
  };

  $scope.hasInvalidCondition = function() {
    var hasInvalidCondition = false;
    for (var i = 0; i < $scope.draftFilter.conditions.length; i++) {
      if (!hasInvalidCondition) {
        // if condition type is a word and condition doesn't have a word, invalid
        // all other condition types are necessarily valid because they have defaults
        if ($scope.draftFilter.conditions[i].type === 'word' && !$scope.draftFilter.conditions[i].word) {
          hasInvalidCondition = true;
        }
      }
    }
    return hasInvalidCondition;
  };

  $scope.addAnotherCondition = function() {
    $scope.draftFilter.conditions.push({typeDisplayed: '(choose one)'});
  };

  $scope.removeCondition = function(index) {
    $scope.draftFilter.conditions.splice(index, 1);
    if (!$scope.draftFilter.conditions.length) {
      $scope.draftFilter.conditions = [{typeDisplayed: '(anything)'}];
    }
  };

  $scope.saveFilter = function(draftFilter, originalIndex) {
    if (!$scope.busySaving) {
      $scope.busySaving = true;
      $scope.error = null;
      SettingsService.saveFilter(draftFilter, originalIndex)
      .then(function(settings) {
        // no need to rebind this object to the scope
        //$scope.activeFilters = settings.activeFilters;
        $scope.busySaving = false;
        $modalInstance.close(settings.activeFilters[settings.activeFilters.length - 1].rendered);
      }, function(reason) {
        console.log('Error saving filter:', reason);
        $scope.error = { message: reason };
        $scope.busySaving = false;
      });
    }
  };

  $scope.cancel = function() {
    $modalInstance.dismiss('cancel');
  };

  // initialize by creating new filter
  $scope.newDraftFilter();
});



