'use strict';

angular.module('wynnoApp.services')
.factory('VoteService', ['$q', '$http', function($q, $http) {
  var service = {
    vote: function(tweet, vote) {
      var d = $q.defer();
      $http({method: 'POST', url: '/vote', data: {_id: tweet._id, vote: vote}})
      .success(function(data, status, headers, config) {
        console.log('success sending vote', vote, 'on tweet', tweet._id);
        d.resolve(vote);
      })
      .error(function(reason, status) {
        console.log('error sending vote', vote, 'on tweet', tweet._id);
        d.reject(reason);
      });
      return d.promise;
    }
  };

  return service;
}]);