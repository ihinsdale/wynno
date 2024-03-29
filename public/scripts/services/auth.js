'use strict';

angular.module('wynnoApp.services')
.factory('AuthService', ['$q', '$http', '$cookieStore', function($q, $http, $cookieStore) {
  var service = {
    getCurrentUser: function() {
      return $cookieStore.get('user');
    },
    isAuthenticated: function() {
      console.log('cookieStore get looks like:', $cookieStore.get('user'));
      return !!service.getCurrentUser();
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
      return d.promise;
    },
    logout: function() {
      var d = $q.defer();
      $http({ method: 'POST', url: '/logout', data: {} })
      .success(function(data) {
        $cookieStore.remove('user');
        d.resolve(data);
      }).error(function(data) {
        d.reject(data);
      });
      return d.promise;
    },
    doesPathNeedAuth: function(path) {
      // truncate /blog post paths
      if (path.slice(0, 5) === '/blog') {
        path = '/blog';
      }
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
        case '/terms':
          return false;
        case '/privacy':
          return false;
        case '/blog':
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