'use strict';

angular.module('wynnoApp.services')
.factory('FeedbackService', ['$q', '$http', function($q, $http) {
  var service = {
    sendFeedback: function(feedback, email) {
      var d = $q.defer();
      $http({ method: 'POST', url: '/feedback', data: { feedback: feedback, email: email } })
      .success(function(data, status, headers, config) {
        console.log('success sending feedback');
        d.resolve(data);
      })
      .error(function(reason, status) {
        console.log('error sending feedback');
        d.reject(reason);
      });
      return d.promise;
    }
  };

  return service;
}]);