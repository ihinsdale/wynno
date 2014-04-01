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
        var mainMsg;
        switch(rejection.config.url) {
          case '/logout':
            mainMsg = 'Error logging out.';
            break;
          case '/old':
            mainMsg = 'Error loading your timeline.';
            break;
          case '/new':
            mainMsg = 'Error fetching new tweets.';
            break;
          case '/middle':
            mainMsg = 'Error fetching old tweets.';
            break;
          case '/vote':
            mainMsg = 'Error saving your vote.';
            break;
          case '/savefilter':
            mainMsg = 'Error saving filter.';
            break;
          case '/disablefilter':
            mainMsg = 'Error disabling filter.';
            break;
          case '/settings':
            mainMsg = 'Error loading your settings.';
            break;
          case '/suggest':
            mainMsg = 'Error generating filter suggestions.';
            break;
          case '/adoptsuggestion':
            mainMsg = 'Error activating suggested filter.';
            break;
          case '/dismisssuggestion':
            mainMsg = 'Error dismissing suggested filter.';
            break;
          case '/feedback':
            mainMsg = 'Error saving feedback.';
            break;
          case '/agreed':
            mainMsg = 'Error saving your agreement to Terms of Service and Privacy Policy.';
            break;
          case '/autowynnoing':
            mainMsg = 'Error toggling automatic wynnoing.';
            break;
          case '/enabledisfilterorsugg':
            mainMsg = 'Error enabling filter.';
            break;
          default:
            mainMsg = 'Internal server error.'
            break;
        }
        $rootScope.$emit('serverError', mainMsg);
      }
      return $q.reject(rejection);
    }
  };

  return interceptor;
}]);