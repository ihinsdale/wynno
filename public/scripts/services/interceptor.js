'use strict';

angular.module('wynnoApp')
.factory('wynnoInterceptor', ['$q', '$location', '$cookieStore', '$rootScope', function($q, $location, $cookieStore, $rootScope) {
  var interceptor = {
    responseError: function(rejection) {
      console.log('Rejection object looks like:', rejection);
      if (rejection.status === 401) {
        console.log('401 response from server intercepted, redirecting to /login.');
        $cookieStore.remove('user');
        $location.path('/');
      } else if (rejection.status === 500) {
        $rootScope.$emit('serverError');
      }
      return $q.reject(rejection);
    }
  };

  return interceptor;
}]);