'use strict';

angular.module('wynnoApp.controllers')

  .controller('MainCtrl', function($rootScope, $scope, $http, TweetService) {

    $scope.getOldTweets = function() {
      TweetService.getOldTweets()
      .then(function(tweets) {
        $scope.tweets = tweets;
      }).then(function() {
        $scope.getNewTweets();
      });
    }

    $scope.getNewTweets = function(callback) {
      TweetService.getNewTweets()
      .then(function(tweets) {
        $scope.tweets = tweets;
      })
    }

    $scope.getSettings = function(callback) {
      if (!$rootScope.settings) {
        $http.get('/settings')
        .success(function(data3, status3, header3, config3) {
          console.log('success getting settings, they look like:', data3);
          $rootScope.settings = data3;
          if (callback) {
            callback();
          }
        })
        .error(function(data3, status3) {
          console.log('error getting settings');
        })
      }
    };

    // function to record user's votes
    $scope.vote = function(tweet, vote) {
      var priorVote = tweet.__vote;
      // update the model with the new vote
      tweet.__vote = vote;

      // save the vote to the database
      $http({method: 'POST', url: '/vote', data: {_id: tweet._id, vote: vote}})
      .success(function(data, status, headers, config) {
        console.log('success sending vote', vote, 'on tweet', tweet._id);
      })
      .error(function(data, status) {
        console.log('error sending vote', vote, 'on tweet', tweet._id);
        // if the vote wasn't recorded, reset it on the model
        tweet.__vote = priorVote;
      });
    };

    $scope.hasWordInList = function(text, list) {
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
    };

    $scope.hasUserInList = function(user1, user2, list) {
      for (var i = 0; i < list.length; i++) {
        if (user1 === list[i] || user2 === list[i]) {
          return true;
        }
      }
      return false;
    };

    $scope.isMutedUser = function(tweeter, retweeter) {
      return $scope.hasUserInList(tweeter, retweeter, $rootScope.settings.mutedUsers);
    };
    $scope.hasMutedWord = function(text) {
      return $scope.hasWordInList(text, $rootScope.settings.mutedWords);
    };
    $scope.isProtectedUser = function(tweeter, retweeter) {
      return $scope.hasUserInList(tweeter, retweeter, $rootScope.settings.protectedUsers);
    };
    $scope.hasProtectedWord = function(text) {
      return $scope.hasWordInList(text, $rootScope.settings.protectedWords);
    };
    $scope.tweetIsProtected = function(tweet) {
      var retweeter;
      if (tweet.__retweeter) {
        retweeter = tweet.__retweeter.screen_name;
      }
      tweet.__isProtected = ($scope.isProtectedUser(tweet.__user.screen_name, retweeter) || $scope.hasProtectedWord(tweet.__text));
    };
    $scope.tweetIsMuted = function(tweet) {
      var retweeter;
      if (tweet.__retweeter) {
        retweeter = tweet.__retweeter.screen_name;
      }
      tweet.__isMuted = ($scope.isMutedUser(tweet.__user.screen_name, retweeter) || $scope.hasMutedWord(tweet.__text));
    }

    // function to determine whether a tweet is displayed or not
    $scope.displayed = function(tweet) {
      // TweetService.getPassingTweets()
      // .then(function(tweets) {
      //   $scope.tweets = tweets;
      // })
      if ($rootScope.viewing === 'passing') {
        if (tweet.__vote === null) {
          $scope.tweetIsProtected(tweet);
          $scope.tweetIsMuted(tweet);
          if (tweet.__isProtected) {
            return true;
          } else if (tweet.__isMuted) {
            return false;
          } else {
            if (tweet.__p >= $scope.threshold) {
              return true;
            } else {
              return false;
            }
          }
        } else {
          return !!tweet.__vote;
        }
      } else if ($rootScope.viewing === 'failing') {
        if (tweet.__vote === null) {
          $scope.tweetIsProtected(tweet);
          $scope.tweetIsMuted(tweet);
          if (tweet.__isProtected) {
            return false;
          } else if (tweet.__isMuted) {
            return true;
          } else {
            if (tweet.__p >= $scope.threshold) {
              return false;
            } else {
              return true;
            }
          }
        } else {
          return !tweet.__vote;
        }
      }
    };

    // if tweet has been voted on, hide the vote buttons
    $scope.hideVoteButtons = function(tweet) {
      if (tweet.__vote !== null || tweet.__isProtected || tweet.__isMuted) {
        return true;
      } else {
        return false;
      }
    };

    // $scope.getOldTweets(function() {
    //   $scope.getNewTweets();
    // });
    $scope.getOldTweets();
    $scope.getSettings();
    $scope.threshold = 0.5;

  })

  .controller('NavCtrl', function($rootScope, $scope, $http) {
    $rootScope.viewing = 'passing';
    $scope.active = [true, false, false];
    $scope.viewPassing = function() {
      if ($rootScope.viewing !== 'passing') {
        $rootScope.viewing = 'passing';
        $scope.active = [true, false, false];
      }
    };
    $scope.viewFailing = function() {
      if ($rootScope.viewing !== 'failing') {
        $rootScope.viewing = 'failing';
        $scope.active = [false, true, false];
      }
    };
    $scope.viewSettings = function() {
      if ($rootScope.viewing !== 'settings') {
        $rootScope.viewing = 'settings';
        $scope.active = [false, false, true];
      }
    };
    $scope.signIn = function() {
      $http.get('/auth/twitter')
      .success(function(data, status, headers, config) {
        console.log('successful token request:', data);
      })
      .error(function(data, status) {
        console.log('error requesting token:', data);
      });
    }
  })

  .controller('SettingsCtrl', function($rootScope, $scope, $http) {
    $scope.updateSetting = function(add_or_remove, user_or_word, mute_or_protect, input) {
      $http({method: 'POST', url: '/settings',
        data: {user_id: '52783164c5d992a75e000001', add_or_remove: add_or_remove, user_or_word: user_or_word, mute_or_protect: mute_or_protect, input: input}})
      .success(function(data, status, headers, config) {
        $rootScope.settings = data;
        console.log('success updating settings to', add_or_remove, input, 'as a', mute_or_protect, user_or_word);
      })
      .error(function(data, status) {
        console.log('error updating setting to', add_or_remove, input, 'as a', mute_or_protect, user_or_word);
      });
    };
  });