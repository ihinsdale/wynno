'use strict';

angular.module('wynnoApp')
.factory('wynnoInterceptor', ['$q', '$location', '$cookieStore', function($q, $location, $cookieStore) {
  var interceptor = {
    responseError: function(rejection) {
      console.log('401 response from server intercepted, redirecting to /login.');
      $cookieStore.remove('user');
      $location.path('/');
      return $q.reject(rejection);
    }
  };

  return interceptor;
}]);