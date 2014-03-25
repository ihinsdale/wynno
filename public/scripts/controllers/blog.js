'use strict';

angular.module('wynnoApp.controllers')
.controller('BlogCtrl', function($scope, $location, BlogService) {
  var currentLocation = $location.path();
  if (currentLocation === '/blog') {
    BlogService.getPosts()
    .then(function(posts) {
      $scope.posts = posts;
    }, function(reason) {
      console.log('Error grabbing blog posts.');
      $scope.error = 'There was an error loading the blog.';
    });
  } else {
    var slug = currentLocation.slice(6);
    BlogService.getPosts()
    .then(function(posts) {
      $scope.post = posts[BlogService.lookup[slug]];
    }, function(reason) {
      $scope.error = 'There was an error loading the article.';
    });
  }
});