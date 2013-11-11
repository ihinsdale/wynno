angular.module('wynnoApp.services')
.factory('TweetService', ['$q', '$http', function($q, $http) {
  var service = {
    currentTweets: [],
    getOldTweets: function() {
      var d = $q.defer();
      if (service.currentTweets.length <= 0) {
        $http.get('/old')
        .success(function(data, status) {
          service.currentTweets = data;
          d.resolve(service.currentTweets);
        })
        .error(function(reason, status) {
          d.reject(reason);
        })
      }
      return d.promise;
    },
    getPassingTweets: function() {
      var d = $q.defer();
      angular.forEach(service.currentTweets, function(tweet) {
        // return true to include or false to exclude
      });
      return d.promise;
    }
  };

  return service;
      // $scope.getOldTweets = function(callback) {
      // if (!$rootScope.tweets) {
      //   // upon main page load, make a GET request to /old
      //   $http.get('/old')
      //   .success(function(data, status, headers, config) {
      //     console.log('success getting old tweets, they look like:', data);
      //     $rootScope.tweets = data;
      //     if (callback) {
      //       callback();
      //     }
      //   })
      //   .error(function(data, status) {
      //     console.log('error getting /old, data look like:', data);
      //   });
      // }
}])