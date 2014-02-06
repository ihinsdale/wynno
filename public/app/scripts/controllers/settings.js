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
    } else {
      $scope.errorAddingUser = 'That user has already been added.';
    }  
  };

  $scope.draftFilterRemoveUser = function(userIndex) {
    $scope.draftFilter.users.splice(userIndex, 1);
  };

  $scope.dismissError = function(whichError) {
    $scope[whichError] = null;
  };

  $scope.addAnotherCondition = function() {
    $scope.draftFilter.conditions.push({});
  }

  $scope.injectSettings = function() {
    SettingsService.provideSettings()
    .then(function(settings) {
      $scope.activeFilters = settings.activeFilters;
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

  window.scrollTo(0);
  $scope.injectSettings();

  $scope.$on("agreementSaved", function() {
    $scope.injectSettings();
  });
});
  