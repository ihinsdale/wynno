'use strict';

angular.module('wynnoApp.controllers')
.controller('SettingsCtrl', function($scope, $location, AuthService, SettingsService) {
  // initial conditions
  $scope.builderIsCollapsed = true;

  $scope.newDraftFilter = function() {
    // toggle collapse of the filter builder
    $scope.builderIsCollapsed = !$scope.builderIsCollapsed;
    // reset any editExistingFilterIndex value
    $scope.editExistingFilterIndex = null;
    // initialize new draft filter
    $scope.draftFilter = { conditions: [{}], users: [], scope: 'all' };
    $scope.draftFilter.typeDisplayed = 'Hear/Mute';
    $scope.draftFilter.usersDisplayed = 'all users (default)'
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
      if ($scope.draftFilter.users.length === 0) {
        $scope.draftFilter.usersDisplayed = ''
      } else {
        $scope.draftFilter.usersDisplayed += ', '
      }
      $scope.draftFilter.users.push(username);
      $scope.draftFilter.usersDisplayed += ('@' + username);
    } else {
      $scope.errorAddingUser = 'That user has already been added.';
    }
  };

  $scope.draftFilterRemoveUser = function(userIndex) {
    $scope.draftFilter.users.splice(userIndex, 1);
    if (!$scope.draftFilter.users.length) {
      $scope.draftFilter.usersDisplayed = 'all users (default)';
    } else {
      $scope.draftFilter.usersDisplayed = '';
      for (var i = 0; i < $scope.draftFilter.users.length; i++) {
        if (i > 0) {
          $scope.draftFilter.usersDisplayed += ', ';
        }
        $scope.draftFilter.usersDisplayed += ('@' + $scope.draftFilter.users[i])
      }
    }
  };

  $scope.dismissError = function(whichError) {
    $scope[whichError] = null;
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
    $scope.draftFilter.conditions.push({});
  }

  $scope.injectSettings = function() {
    SettingsService.provideSettings()
    .then(function(settings) {
      $scope.activeFilters = settings.activeFilters;
      $scope.suggestedFilters = settings.suggestedFilters;
      $scope.dismissedFilters = settings.dismissedFilters;
    });
  };

  $scope.saveFilter = function(draftFilter, originalIndex) {
    SettingsService.saveFilter(draftFilter, originalIndex)
    .then(function(settings) {
      $scope.activeFilters = settings.activeFilters;
    }, function(reason) {
      console.log('Error saving filter:', reason);
    });
  };

  $scope.disableFilter = function(index) {
    SettingsService.disableFilter(index)
    .then(function(settings) {
      $scope.activeFilters = settings.activeFilters;
    });
  };

  $scope.adoptSugg = function(index) {
    SettingsService.adoptSugg(index)
    .then(function(settings) {
      $scope.activeFilters = settings.activeFilters;
      $scope.suggestedFilters = settings.suggestedFilters;
      if (!settings.undismissedSugg) {
        $scope.$emit('setSuggIndicators', null, settings.undismissedSugg);
      }
    })
  };

  $scope.dismissSugg = function(index) {
    SettingsService.dismissSugg(index)
    .then(function(settings) {
      $scope.suggestedFilters = settings.suggestedFilters;
      if (!settings.undismissedSugg) {
        $scope.$emit('setSuggIndicators', null, settings.undismissedSugg);
      }
    })
  }

  window.scrollTo(0, 0);
  $scope.injectSettings();

  $scope.$on("agreementSaved", function() {
    $scope.injectSettings();
  });
});
  