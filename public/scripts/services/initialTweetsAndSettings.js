'use strict';

angular.module('wynnoApp.services')
.factory('InitialTweetsAndSettingsService', ['$q', '$http', 'FilterService', 'TweetService', 'SettingsService', function($q, $http, FilterService, TweetService, SettingsService) {
  // this service created to avoid circular dependency between Filter, Tweet, and Settings services that resulted
  // from trying to set initial settings using the TweetService

  var service = {
    getInitialOldTweetsAndSettings: function() {
      // for the first load of MainCtrl, we want to get old tweets
      // and the user's filtering rules to apply to all tweets
      var d = $q.defer();
      $http({ method: 'POST', url: '/old', data: {
        oldestTweetIdStr: '0',
        settings: true
      } })
      .success(function(data, status) {
        console.log('success getting old tweets and settings:', data);
        // save settings in SettingsService
        // after initializing votesRequiredForNextSugg
        data.settings.votesRequiredForNextSugg = 100 - (data.settings.voteCount - Math.floor(data.settings.voteCount / 100) * 100);
        // add the rendered text versions of the filters, since that doesn't come from the db
        SettingsService.renderFilters(data.settings);
        SettingsService.settings = data.settings;

        // apply filtering rules to the tweets
        FilterService.applyFilterRules(data.tweets, data.settings);
        // it's crucial that we provide these settings to FilterService; if FilterService
        // had to get them from SettingsService, we'd have a circular dependency

        // now add the tweets to currentTweets
        TweetService.currentTweets = data.tweets;
        // update oldestTweetIdStr, if any tweets were received
        if (data.tweets.length) {
          TweetService.oldestTweetIdStr = TweetService.currentTweets[TweetService.currentTweets.length - 1].id_str;
        }
        console.log('oldestTweetIdStr after getting batch of tweets is:', TweetService.oldestTweetIdStr);
        d.resolve(TweetService.currentTweets);
      })
      .error(function(reason, status) {
        console.log('error getting old tweets and settings:', reason);
        d.reject(reason);
      });
      return d.promise;
    }
  };

  return service;
}]);
