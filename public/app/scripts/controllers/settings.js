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
    $scope.draftFilter.users.push(username);
  };

  $scope.draftFilterRemoveUser = function(userIndex) {
    $scope.draftFilter.users.splice(userIndex, 1);
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
    });
  };

  $scope.removeFilter = function(index) {
    SettingsService.removeFilter(index)
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
  