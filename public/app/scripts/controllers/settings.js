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

  $scope.disableFilter = function(indexInReversedArray) {
    // translate indexInReversedArray to an index in the original array
    var index = SettingsService.settings.activeFilters.length - indexInReversedArray - 1;
    SettingsService.disableFilter(index)
    .then(function(settings) {
      // no need to rebind these objects to the scope, because the arrays have just been mutated
      //$scope.activeFilters = settings.activeFilters;
      //$scope.disabledFilters = settings.disabledFilters;
      console.log('after binding to controller, disabledFilters looks like:', settings.disabledFilters);
    }, function(reason) {
      // need to rebind filter arrays to the scope because in resetting them within SettingsService, the old array is replaced.
      $scope.activeFilters = SettingsService.settings.activeFilters;
      $scope.disabledFilters = SettingsService.settings.disabledFilters;
    });
  };

  $scope.enableFilter = function(disabledOrDismissed, indexInReversedArray) {
    var index;
    if (disabledOrDismissed === 'disabled') {
      index = SettingsService.settings.disabledFilters.length - indexInReversedArray - 1;
    } else if (disabledOrDismissed === 'dismissed') {
      index = SettingsService.settings.dismissedFilters.length - indexInReversedArray - 1;
    }
    SettingsService.enableFilterOrSugg(disabledOrDismissed, index)
    .then(function(settings){
      // don't need to do anything more
    }, function(reason) {
      // rebind the relevant filter arrays on the scope to their originals
      $scope.activeFilters = SettingsService.settings.activeFilters;
      if (disabledOrDismissed === 'disabled') {
        $scope.disabledFilters = SettingsService.settings.disabledFilters;
      } else if (disabledOrDismissed === 'dismissed') {
        $scope.dismissedFilters = SettingsService.settings.dismissedFilters;
      }
    });
  };

  $scope.adoptSugg = function(indexInReversedArray) {
    // translate indexInReversedArray to an index in the original array
    var index = SettingsService.settings.suggestedFilters.length - indexInReversedArray - 1;
    SettingsService.adoptSugg(index)
    .then(function(settings) {
      if (!settings.undismissedSugg) {
        $scope.$emit('setSuggIndicators', null, settings.undismissedSugg);
      }
    }, function(reason) {
      // rebind the relevant filter arrays on the scope to their originals
      $scope.suggestedFilters = service.settings.suggestedFilters;
      $scope.activeFilters = service.settings.activeFilters;
    })
  };

  $scope.dismissSugg = function(indexInReversedArray) {
    // translate indexInReversedArray to an index in the original array
    var index = SettingsService.settings.suggestedFilters.length - indexInReversedArray - 1;
    SettingsService.dismissSugg(index)
    .then(function(settings) {
      if (!settings.undismissedSugg) {
        $scope.$emit('setSuggIndicators', null, settings.undismissedSugg);
      }
    }, function(reason) {
      // rebind the relevant filter arrays on the scope to their originals
      $scope.suggestedFilters = service.settings.suggestedFilters;
      $scope.dismissedFilters = service.settings.dismissedFilters;
    })
  };

  $scope.toggleAutoWynnoing = function(newSetting) {
    if (SettingsService.settings.autoWynnoing !== newSetting) {
      SettingsService.toggleAutoWynnoing()
      .then(function() {
        // if successful in saving toggling, we are done;
      }, function(error) {
        // if there was an error toggling, then we need to reset the value of autoWynnoing on the scope
        // to its original
        $scope.autoWynnoing = !newSetting;
      });
    }
  };

  window.scrollTo(0, 0);
  $scope.injectSettings();

  $scope.$on("agreementSaved", function() {
    $scope.injectSettings();
  });
});
  