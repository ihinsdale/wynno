'use strict';

angular.module('wynnoApp.controllers')
.controller('SettingsCtrl', function($scope, $location, AuthService, SettingsService) {
  $scope.builderIsCollapsed = false;

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
  