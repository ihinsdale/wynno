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
    $scope.draftFilter = { conditions: [{}] };
  };

  $scope.draftFilterAddUser = function(username) {
    $scope.draftFilter.users.push(username);
  };

  $scope.draftFilterRemoveUser = function(userIndex) {
    $scope.draftFilter.users.splice(userIndex);
  };

  $scope.injectSettings = function() {
    SettingsService.provideSettings()
    .then(function(settings) {
      $scope.settings = settings;
    });
  };

  $scope.updateSetting = function(add_or_remove, user_or_word, mute_or_hear, input) {
    SettingsService.updateSetting(add_or_remove, user_or_word, mute_or_hear, input)
    .then(function(settings) {
      $scope.settings = settings;
    });
  };

  window.scrollTo(0);
  $scope.injectSettings();

  $scope.$on("agreementSaved", function() {
    $scope.injectSettings();
  });
});
  