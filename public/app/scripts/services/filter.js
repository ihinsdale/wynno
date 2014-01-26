angular.module('wynnoApp.services')
.factory('FilterService', ['SettingsService', function(SettingsService) {
  var service = {
    hasWordInList: function(text, list) {
      var noPunctuation = text.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g,"");
      var noExtraSpaces = noPunctuation.replace(/\s{2,}/g," ");
      var words = noExtraSpaces.split(' ');
      var wordsHash = {};
      for (var i = 0; i < words.length; i++) {
        wordsHash[words[i]] = true;
      }
      for (var j = 0; j < list.length; j++) {
        if (wordsHash.hasOwnProperty(list[j])) {
          return true;
        }
      }
      return false;
    },
    hasUserInList: function(user1, user2, list) {
      for (var i = 0; i < list.length; i++) {
        if (user1 === list[i] || user2 === list[i]) {
          return true;
        }
      }
      return false;
    },
    isMutedUser: function(tweeter, retweeter) {
      return service.hasUserInList(tweeter, retweeter, service.currentSettings.mutedUsers);
    },
    hasMutedWord: function(text) {
      return service.hasWordInList(text, service.currentSettings.mutedWords);
    },
    isHeardUser: function(tweeter, retweeter) {
      return service.hasUserInList(tweeter, retweeter, service.currentSettings.heardUsers);
    },
    hasHeardWord: function(text) {
      return service.hasWordInList(text, service.currentSettings.heardWords);
    },
    tweetIsHeard: function(tweet) {
      var retweeter;
      if (tweet.__retweeter) {
        retweeter = tweet.__retweeter.screen_name;
      }
      tweet.__isHeard = (service.isHeardUser(tweet.__user.screen_name, retweeter) || service.hasHeardWord(tweet.__text));
    },
    tweetIsMuted: function(tweet) {
      var retweeter;
      if (tweet.__retweeter) {
        retweeter = tweet.__retweeter.screen_name;
      }
      tweet.__isMuted = (service.isMutedUser(tweet.__user.screen_name, retweeter) || service.hasMutedWord(tweet.__text));
    },
    applyFilterRules: function(tweets) {
      service.currentSettings = SettingsService.settings;
      angular.forEach(tweets, function(tweet) {
        service.tweetIsHeard(tweet);
        service.tweetIsMuted(tweet);
      });
    }
  }

  return service;
}]);