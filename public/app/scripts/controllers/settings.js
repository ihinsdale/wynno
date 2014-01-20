'use strict';

angular.module('wynnoApp.controllers')
.controller('SettingsCtrl', function($scope, $location, AuthService, SettingsService) {
  $scope.injectSettings = function() {
    SettingsService.provideSettings()
    .then(function(settings) {
      $scope.settings = settings;
    });
  };

  $scope.updateSetting = function(add_or_remove, user_or_word, mute_or_protect, input) {
    SettingsService.updateSetting(add_or_remove, user_or_word, mute_or_protect, input)
    .then(function(settings) {
      $scope.settings = settings;
    });
  };

  window.scrollTo(0);
  $scope.injectSettings();
});
  