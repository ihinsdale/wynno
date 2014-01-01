'use strict';

angular.module('wynnoApp.controllers')
.controller('SettingsCtrl', function($scope, SettingsService) {
  $scope.currentPathNeedsAuth = true; // this property belongs to NavCtrl scope
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

  $scope.injectSettings();
});
  