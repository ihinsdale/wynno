angular.module('wynnoApp.services')
.factory('SettingsService', ['$q', '$http', 'FilterService', 'TweetService', function($q, $http, FilterService, TweetService) {
  var service = {
    settings: [],
    // (this function is obsolete now, because settings are got with the 
    // first request for old tweets)
    getSettingsFromDb: function() {
      var d = $q.defer();
      if (service.settings.length === 0) {
        $http.get('/settings')
        .success(function(data, status) {
          console.log('success getting settings, they look like:', data);
          service.settings = data;
          d.resolve(service.settings);
        })
        .error(function(reason, status) {
          console.log('error getting settings');
          d.reject(reason);
        })
      }
      return d.promise;
    },
    provideSettings: function() {
      if (service.settings.length === 0) {
        return service.getSettingsFromDb();
      } else {
        var d = $q.defer();
        d.resolve(service.settings);
      }
      return d.promise;
    },
    cleanAndValidateConditions: function(draftFilter) {
      var cleanConditions = [];
      for (var j = 0; j < draftFilter.conditions.length; j++) {
        // by conditioning on having the 'type' property, we exclude any empty condition objects,
        // including the one that draftFilter.conditions is initialized with if it is still empty
        if (draftFilter.conditions[j].hasOwnProperty('type')) {
          // clean draftFilter of any unnecessary input created by switching condition types
          if (draftFilter.conditions[j].type === 'link') {
            delete draftFilter.conditions[j].hashtag;
            delete draftFilter.conditions[j].word;
          } else if (draftFilter.conditions[j].type === 'word') {
            delete draftFilter.conditions[j].link;
            delete draftFilter.conditions[j].hashtag;
          } else if (draftFilter.conditions[j].type === 'hashtag') {
            delete draftFilter.conditions[j].link;
            delete draftFilter.conditions[j].word;
          }
          cleanConditions.push(draftFilter.conditions[j]);
        }
      }
      draftFilter.conditions = cleanConditions;
      var errors = [];
      for (var i = 0; i < draftFilter.conditions.length; i++) {
        // if user hasn't provided a word or phrase for the 'word' type of condition, invalid
        if (draftFilter.conditions[i].type === 'word' && !draftFilter.conditions[i].word) {
          errors.push('A word or phrase must be specified for condition ' + (i+1).toString());
        }
        // all other conditions are necessarily valid, because they have defaults in case of no user input
      }
      // if invalid conditions discovered, return those errors
      if (errors.length) {
        return errors;
      } else {
        return null;
      }
    },
    saveFilter: function(draftFilter, originalIndex) {
      var d = $q.defer();
      var invalidConditions = service.cleanAndValidateConditions(draftFilter);
      // make sure draftFilter has necessary elements:
      // Hear or Mute must always be specified
      if (!draftFilter.type) {
        d.reject('Filter must hear or mute.');
      // must not have invalid conditions
      } else if (invalidConditions) {
        d.reject(invalidConditions);
      // at least one user or condition must be specified, and
      // filter cannot apply to all users without at least one condition
      } else if (!draftFilter.users.length && !draftFilter.conditions.length) {
      // note that in order for this conditioning on draftFilter.conditions.length to work,
      // draftFilter.conditions must have been cleaned of empty objects {}, as done in by
      // service.cleanAndValidateConditions
        d.reject('At least one user or condition must be specified.');
      } else {
        // update filters on the client side, to be undone if POST request fails
        var orig = service.settings.activeFilters.slice();
        service.settings.activeFilters.push(draftFilter);
        // remove previous version, if this save was a revision
        if (originalIndex) {
          service.settings.activeFilters.splice(originalIndex, 1);
        }

        // now POST the new filter
        var revisionOfFilter_id = originalIndex ? service.settings.activeFilters[originalIndex]._id : null;
        $http({ method: 'POST', url: '/savefilter', data: {
          draftFilter: draftFilter,
          revisionOfFilter_id: revisionOfFilter_id
        } })
        .success(function(data, status) {
          console.log('Success saving filter.');
          // apply the new filters to currentTweets
          FilterService.applyFilterRules(TweetService.currentTweets, service.settings);
          d.resolve(service.settings);
        })
        .error(function(reason, status) {
          console.log('Error saving filter.');
          // reset to original filters
          service.settings.activeFilters = orig;
          d.reject(reason);
        });
      }
      return d.promise;
    },
    disableFilter: function(index) {
      var d = $q.defer();

      // update filters on the client side, to be undone if POST request fails
      var orig = service.settings.activeFilters.slice();
      service.settings.disabledFilters.push(service.settings.activeFilters.splice(index, 1));

      // now POST the disable
      $http({ method: 'POST', url: '/disablefilter', data: {
        activeFiltersIndex: index,
        filter_id: service.settings.activeFilters[index].id
      } })
      .success(function(data, status) {
        console.log('Success disabling filter.');
        // apply the new filters to currentTweets
        FilterService.applyFilterRules(TweetService.currentTweets, service.settings);
        d.resolve(service.settings);
      })
      .error(function(reason, status) {
        console.log('Error disabling filter.');
        // reset to original filters
        service.settings.activeFilters = orig;
        d.reject(reason);
      });
      return d.promise;
    }
  };

  return service;
}]);
