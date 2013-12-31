angular.module('wynnoApp.services')
.factory('AuthService', ['$q', '$http', '$cookieStore', function($q, $http, $cookieStore) {
  var service = {
    currentUser: $cookieStore.get('user'),
    isAuthenticated: function() {
      return !!service.currentUser;
    },
    setAuthenticated: function() {
      service.currentUser = $cookieStore.get('user');
      console.log('currentUser is now:', service.currentUser);
    },
    logout: function() {
      var d = $q.defer();
      $http.post('/logout', {}, {
      })
      .success(function(data) {
        service.currentUser = null;
        $cookieStore.remove('user');
        d.resolve(data);
      }).error(function(data) {
        d.reject(data);
      });
      return d.promise;
    }
  };

  return service;
}]);