angular.module('wynnoApp.services')
.factory('TweetService', ['$q', '$http', function($q, $http) {
  var service = {
    currentTweets: [],
    getOldTweets: function() {
      var d = $q.defer();
      if (service.currentTweets.length <= 0) {
        $http.get('/old')
        .success(function(data, status) {
          console.log('success getting old tweets, they look like:', data);
          service.currentTweets = data;
          d.resolve(service.currentTweets);
        })
        .error(function(reason, status) {
          console.log('error getting old tweets:', reason);
          d.reject(reason);
        })
      }
      return d.promise;
    },
    getNewTweets: function() {
      var d = $q.defer();
      $http.get('/new')
      .success(function(data, status) {
        console.log('success getting new tweets, they look like:', data);
        service.currentTweets = data.concat(service.currentTweets);
        d.resolve(service.currentTweets);
      })
      .error(function(reason, status) {
        console.log('error getting new tweets:', reason);
        d.reject(reason);
      })
      return d.promise;
    },
    getPassingTweets: function() {
      var d = $q.defer(),
      tweetsToDisplay = [];
      angular.forEach(service.currentTweets, function(tweet) {
        // return true to include or false to exclude
      });
      return d.promise;
    },
    getFailingTweets: function() {
      var d = $q.defer(),
      tweetsToDisplay = [];
      angular.forEach
    }
  };

  return service;
}]);