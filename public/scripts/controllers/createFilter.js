'use strict';

angular.module('wynnoApp.controllers')
.controller('CreateFilterCtrl', function($scope, filterBuilderModalService, SettingsService) {
  $scope.newDraftFilter = function() {
    // reset any editExistingFilterIndex value
    $scope.editExistingFilterIndex = null;
    // initialize new draft filter
    $scope.draftFilter = { conditions: [{}], users: [], scope: 'all' };
    $scope.draftFilter.typeDisplayed = 'Hear/Mute';
    $scope.draftFilter.usersDisplayed = '(all users)';
    $scope.draftFilter.conditions[0].typeDisplayed = '(anything)';
    $scope.draftFilter.scopeDisplayed = 'tweets and retweets';
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

  if (!$scope.insideBlogPost) {
  // this if blog is used so that we don't define saveFilter or cancel functions in the case
  // where CreateFilterCtrl is used inside of a blog post (explaining how to use the Filter Builder). 
  // Inside of a blog post, there is no modal instance, so $modalInstance causes an error. 
  // So we created the filterBuilderModalService, which wraps to $modalInstance.
  // Furthermore inside of a blog post saving and canceling are not applicable.
    $scope.saveFilter = function(draftFilter, originalIndex) {
      if (!$scope.busySaving) {
        $scope.busySaving = true;
        $scope.error = null;
        SettingsService.saveFilter(draftFilter, originalIndex)
        .then(function(settings) {
          // no need to rebind this object to the scope
          //$scope.activeFilters = settings.activeFilters;
          $scope.busySaving = false;
          filterBuilderModalService.close()(settings.activeFilters[settings.activeFilters.length - 1].rendered);
        }, function(reason) {
          console.log('Error saving filter:', reason);
          $scope.error = { message: reason };
          $scope.busySaving = false;
        });
      }
    };

    $scope.cancel = function() {
      filterBuilderModalService.dismiss()('cancel');
    };
  }

  // initialize by creating new filter
  $scope.newDraftFilter();
});