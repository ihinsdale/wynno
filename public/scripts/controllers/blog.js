'use strict';

angular.module('wynnoApp.controllers')
.controller('BlogCtrl', function($scope, $location, BlogService, FilterBuilderService, AuthService) {
  // bind necessary Filter Builder variables to the scope for use in the filtering-basics post
  // ideally this would only be done when we know filtering-basics is being displayed
  // currently, since the blog index actually loads the contents of all posts,
  // we know filtering-basics is being displayed
  $scope.newDraftFilter = function() {
    FilterBuilderService.newDraftFilter($scope);
  };
  $scope.draftFilterAddUser = function(username) {
    FilterBuilderService.draftFilterAddUser(username, $scope);
  };
  $scope.draftFilterIsIncomplete = function() {
    return FilterBuilderService.draftFilterIsIncomplete($scope);
  };
  $scope.draftFilterRemoveUser = function(userIndex) {
    FilterBuilderService.draftFilterRemoveUser(userIndex, $scope);
  };
  $scope.dismissError = function() {
    FilterBuilderService.dismissError($scope);
  };
  $scope.hasValidCondition = function() {
    return FilterBuilderService.hasValidCondition($scope);
  };
  $scope.hasInvalidCondition = function() {
    return FilterBuilderService.hasInvalidCondition($scope);
  };
  $scope.addAnotherCondition = function() {
    FilterBuilderService.addAnotherCondition($scope);
  };
  $scope.removeCondition = function(index) {
    FilterBuilderService.removeCondition(index, $scope);
  };
  // initialize by creating new filter
  $scope.newDraftFilter();
  // we create save functionality so that users can actually create filters directly
  // from the filtering-basis blog post
  $scope.saveFilter = function(draftFilter, originalIndex) {
    if (AuthService.isAuthenticated()) {
      FilterBuilderService.saveFilter(draftFilter, originalIndex, $scope)
      .then(function(settings) {
        // unlike in the actual Filter Builder modal, we don't need to do anything here
      }, function(reason) {
        // error handling logic is performed in FilterBuilderService.saveFilter, so we
        // don't need to do anything here
      });
    } else {
      $scope.error = {
        message: "You must be signed in to wynno to save a filter."
      };
    }
  };


  // bind posts to the current scope
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

  // Initialize
  // Always start at the top
  window.scrollTo(0, 0);
});
