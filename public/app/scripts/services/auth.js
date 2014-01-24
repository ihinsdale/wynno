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
    sendAgreement: function(consent) {
      var d = $q.defer();
      $http({method: 'POST', url: '/agreed',
        data: { agreement: consent }})
      .success(function(data, status) {
        console.log('success saving agreement to Terms of Service');
        d.resolve('success saving agreement to Terms of Service');
      })
      .error(function(reason, status) {
        console.log('error saving agreement to Terms of Service:', reason);
        d.reject(reason);
      });
    },
    logout: function() {
      var d = $q.defer();
      $http.get('/logout')
      .success(function(data) {
        $cookieStore.remove('user');
        d.resolve(data);
      }).error(function(data) {
        d.reject(data);
      });
      return d.promise;
    },
    doesPathNeedAuth: function(path) {
      switch(path) {
        case '':
          return false;
        case '/':
          return false;
        case '/signinwithtwitter':
          return false;
        case '/in':
          return true;
        case '/out':
          return true;
        case '/settings':
          return true;
        case '/termsofservice':
          return false;
        default:
          console.log('no matching case found in doesCurrentPathNeedAuth');
          return false;
      }
    },
    whatPageIsActive: function(path) {
      switch(path) {
        case '':
          return [false, false, false];
        case '/':
          return [false, false, false];
        case '/signinwithtwitter':
          return [false, false, false];
        case '/in':
          return [true, false, false];
        case '/out':
          return [false, true, false];
        case '/settings':
          return [false, false, true];
        case '/termsofservice':
          return [false, false, false];
        default:
          console.log('no matching case found in whatPageIsActive');
          return [false, false, false];
      }
    }
  };

  return service;
}]);