'use strict';

angular.module('wynnoApp.controllers')
.controller('CreateFilterCtrl', function($scope, $modalInstance, FilterBuilderService, SettingsService) {
  // The use of bindings to FilterBuilderService functions here is done so that we can reuse the FilterBuilderService
  // logic from within the blog post on how to use the Filter Builder. This is useful so that over time as the
  // Filter Builder evolves, we will be able to have interactive examples/tutorials of how to use it.
  // TODO: At present, the methods AddUser, RemoveUser, and removeCondition don't seem to be working
  $scope.newDraftFilter = FilterBuilderService.newDraftFilter($scope);

  $scope.draftFilterAddUser = function(username) {
    FilterBuilderService.draftFilterAddUser(username, $scope)();
  };

  $scope.draftFilterIsIncomplete = FilterBuilderService.draftFilterIsIncomplete($scope);

  $scope.draftFilterRemoveUser = function(userIndex) {
    FilterBuilderService.draftFilterRemoveUser(userIndex, $scope)();
  };

  $scope.dismissError = FilterBuilderService.dismissError($scope);

  $scope.hasValidCondition = FilterBuilderService.hasValidCondition($scope);

  $scope.hasInvalidCondition = FilterBuilderService.hasInvalidCondition($scope);

  $scope.addAnotherCondition = FilterBuilderService.addAnotherCondition($scope);

  $scope.removeCondition = function(index) {
    FilterBuilderService.removeCondition(index, $scope)();
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