'use strict';

angular.module('wynnoApp.controllers')
.controller('CreateFilterCtrl', function($scope, $modalInstance, FilterBuilderService, SettingsService) {
  // The use of bindings to FilterBuilderService functions here is done so that we can reuse the FilterBuilderService
  // logic from within the blog post on how to use the Filter Builder. This is useful so that over time as the
  // Filter Builder evolves, we will be able to have interactive examples/tutorials of how to use it,
  // without having to duplicate any code.

  $scope.newDraftFilter = function() {
    FilterBuilderService.newDraftFilter($scope);
  };
  $scope.draftFilterAddUser = function(username) {
    FilterBuilderService.draftFilterAddUser(username, $scope);
  };
  $scope.draftFilterIsIncomplete = function() {
    return FilterBuilderService.draftFilterIsIncomplete($scope);
  };
  $scope.draftFilterRemoveUser = function(userIndex) {
    FilterBuilderService.draftFilterRemoveUser(userIndex, $scope);
  };
  $scope.dismissError = function() {
    FilterBuilderService.dismissError($scope);
  ];
  $scope.hasValidCondition = function() {
    return FilterBuilderService.hasValidCondition($scope);
  };
  $scope.hasInvalidCondition = function() {
    return FilterBuilderService.hasInvalidCondition($scope);
  };
  $scope.addAnotherCondition = function() {
    FilterBuilderService.addAnotherCondition($scope);
  };
  $scope.removeCondition = function(index) {
    FilterBuilderService.removeCondition(index, $scope);
  };
  // initialize by creating new filter
  $scope.newDraftFilter();

  $scope.saveFilter = function(draftFilter, originalIndex) {
    FilterBuilderService.saveFilter(draftFilter, originalIndex, $scope)
    .then(function(settings) {
      $modalInstance.close(settings.activeFilters[settings.activeFilters.length - 1].rendered);
    }, function(reason) {
      // error handling logic is performed in FilterBuilderService.saveFilter, so we
      // don't need to do anything here
    });
  };

// BELOW HERE, WE DON'T NEED TO REPLICATE THIS FUNCTIONALITY IN THE filtering-basics BLOG POST

  $scope.cancel = function() {
    $modalInstance.dismiss('cancel');
  };


});
