'use strict';

angular.module('wynnoApp.services')
.factory('BlogService', ['$q', '$http', function($q, $http) {
  var service = {
    posts: [],
    getPosts: function() {
      var d = $q.defer();
      if (service.posts.length) {
        d.resolve(service.posts);
      } else {
        $http.get('/views/blog/index.json')
        .success(function(data, status){
          service.posts = data.posts;
          service.lookup = data.lookup;
          d.resolve(service.posts);
        })
        .error(function(error, status) {
          d.reject(error);
        });
      }
      return d.promise;
    }
  };

  return service;
}]);