angular.module('wynnoApp.services')
.factory('SettingsService', ['$q', '$http', function($q, $http) {
  var service = {
    settings: [],
    getSettingsFromDb: function() {
      var d = $q.defer();
      if (service.settings.length === 0) {
        $http.get('/settings')
        .success(function(data, status) {
          console.log('success getting settings, they look like:', data);
          service.settings = data;
          d.resolve(service.settings);
        })
        .error(function(reason, status) {
          console.log('error getting settings');
          d.reject(reason);
        })
      }
      return d.promise;
    },
    provideSettings: function() {
      if (service.settings.length === 0) {
        return service.getSettingsFromDb();
      } else {
        var d = $q.defer();
        d.resolve(service.settings);
      }
      return d.promise;
    },
    updateSetting: function(add_or_remove, user_or_word, mute_or_hear, input) {
      var d = $q.defer();
      $http({method: 'POST', url: '/settings',
        data: {add_or_remove: add_or_remove, user_or_word: user_or_word, mute_or_hear: mute_or_hear, input: input}})
      .success(function(data, status) {
        console.log('success updating settings to', add_or_remove, input, 'as a', mute_or_hear, user_or_word);
        // could optimize this by updating service.settings with the particular
        // setting that was changed, rather than receiving the whole
        // settings object again from the server
        service.settings = data;
        d.resolve(service.settings);
      })
      .error(function(reason, status) {
        console.log('error updating setting to', add_or_remove, input, 'as a', mute_or_hear, user_or_word);
        d.reject(reason);
      });
      return d.promise;
    }
  };

  return service;
}]);
