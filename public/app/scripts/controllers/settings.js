'use strict';

angular.module('wynnoApp.controllers')
.controller('SettingsCtrl', function($scope, $location, AuthService, SettingsService) {
  $scope.injectSettings = function() {
    SettingsService.provideSettings()
    .then(function(settings) {
      var filterGroups = ['activeFilters', 'disabledFilters', 'suggestedFilters', 'dismissedFilters'];
      angular.forEach(filterGroups, function(filterGroup) {
        $scope[filterGroup] = settings[filterGroup];
      });
      $scope.autoWynnoing = settings.autoWynnoing;
      $scope.voteCount = settings.voteCount;
    });
  };

  $scope.disableFilter = function(index) {
    SettingsService.disableFilter(index)
    .then(function(settings) {
      // no need to rebind these objects to the scope
      //$scope.activeFilters = settings.activeFilters;
      //$scope.disabledFilter = settings.disabledFilters;
      console.log('after binding to controller, disabledFilters looks like:', settings.disabledFilters);
    });
  };

  $scope.enableFilter = function(index) {
    // to enable a disabled filter
    // should work with dismissed suggestion or disabled filter
    // TODO
  }

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
  