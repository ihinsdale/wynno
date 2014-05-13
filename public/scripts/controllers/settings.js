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
      $scope.$emit('setSuggIndicators', SettingsService.settings.votesRequiredForNextSugg, SettingsService.settings.undismissedSugg);
    }, function(reason) {
      console.log('There was an error fetching settings.');
    });
  };

  $scope.disableFilter = function(indexInArrayUserSees) {
    // These two lines would be appropriate if the argument passed to disableFilter were indexInReversedArray
    // but currently (4/4/14) activeFilters is not displayed to the user in reverse order, so we just use the index passed:
    // translate indexInReversedArray to an index in the original array
    //var index = SettingsService.settings.activeFilters.length - indexInArrayUserSees - 1;
    var index = indexInArrayUserSees;
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

  $scope.enableDisFilter = function(disabledOrDismissed, indexInArrayUserSees) {
    var index;
    // currently disabledFilters are not displayed in reverse order; dismissedFilters are
    if (disabledOrDismissed === 'disabled') {
      index = indexInArrayUserSees;
      //index = SettingsService.settings.disabledFilters.length - indexInArrayUserSees - 1;
    } else if (disabledOrDismissed === 'dismissed') {
      index = SettingsService.settings.dismissedFilters.length - indexInArrayUserSees - 1;
    }
    SettingsService.enableDisFilterOrSugg(disabledOrDismissed, index)
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

  $scope.adoptSugg = function(indexInArrayUserSees) {
    // suggestedFilters is currently displayed in reverse order to user, so we need to
    // translate indexInArrayUserSees to an index in the original array
    var index = SettingsService.settings.suggestedFilters.length - indexInArrayUserSees - 1;
    SettingsService.adoptSugg(index)
    .then(function(settings) {
      if (!settings.undismissedSugg) {
        $scope.$emit('setSuggIndicators', null, settings.undismissedSugg);
      }
    }, function(reason) {
      // rebind the relevant filter arrays on the scope to their originals
      $scope.suggestedFilters = SettingsService.settings.suggestedFilters;
      $scope.activeFilters = SettingsService.settings.activeFilters;
    });
  };

  $scope.dismissSugg = function(indexInArrayUserSees) {
    // suggestedFilters is currently displayed in reverse order to user, so we need to
    // translate indexInReversedArray to an index in the original array
    var index = SettingsService.settings.suggestedFilters.length - indexInArrayUserSees - 1;
    SettingsService.dismissSugg(index)
    .then(function(settings) {
      if (!settings.undismissedSugg) {
        $scope.$emit('setSuggIndicators', null, settings.undismissedSugg);
      }
    }, function(reason) {
      // rebind the relevant filter arrays on the scope to their originals
      $scope.suggestedFilters = SettingsService.settings.suggestedFilters;
      $scope.dismissedFilters = SettingsService.settings.dismissedFilters;
    });
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

  $scope.handleDrop = function(itemId, binId) {
    alert('Item ' + itemId + ' has been dropped in bin ' + binId);
  };

  // Initialize
  window.scrollTo(0, 0);
  $scope.injectSettings();
  console.log('location hash is:', $location.hash());
  $scope.suggestionsActive = $location.hash() === 'suggestions';

  // Set listener for agreeing to ToS
  $scope.$on('agreementSaved', function() {
    $scope.injectSettings();
  });
});
