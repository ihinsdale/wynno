angular.module('wynnoApp.services')
.factory('AuthService', ['$q', '$http', '$cookieStore', '$location', function($q, $http, $cookieStore, $location) {
  var service = {
    getCurrentUser: function() {
      return $cookieStore.get('user');
    },
    isAuthenticated: function() {
      console.log('cookieStore get looks like:', $cookieStore.get('user'));
      return !!service.getCurrentUser();
    },
    setAuthenticated: function() {
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
    },
    doesCurrentPathNeedAuth: function() {
      switch($location.path) {
        case '':
          return false;
        case '/':
          return false;
        case '#/signinwithtwitter':
          return false;
        case '#/firsttimesignin':
          return true;
        case '#/in':
          return true;
        case '#/out':
          return true;
        case '#/settings':
          return true;
        default:
          console.log('no matching case found in doesCurrentPathNeedAuth');
          return false;
      }
    },
    whatPageIsActive: function() {
      switch($location.path) {
        case '':
          return [false, false, false];
        case '/':
          return [false, false, false];
        case '#/signinwithtwitter':
          return [false, false, false];
        case '#/firsttimesignin':
          return [false, false, false];
        case '#/in':
          return [true, false, false];
        case '#/out':
          return [false, true, false];
        case '#/settings':
          return [false, false, true];
        default:
          console.log('no matching case found in whatPageIsActive');
          return [false, false, false];
      }
    }
  };

  return service;
}]);