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
          // add the rendered text versions of the filters, since that doesn't come from the db
          service.renderFilters(data);
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
    renderFilters: function(settings) {
      var filterGroups = ['activeFilters', 'disabledFilters', 'suggestedFilters', 'dismissedFilters'];
      angular.forEach(filterGroups, function(filterGroup) {
        angular.forEach(settings[filterGroup], function(filter) {
          filter.rendered = 
        });
      });
    },
    renderFilter: function(filter) {
      var result = '';
      // filter type
      if (filter.type === 'hear') {
        result += 'Hear ';
      } else if (filter.type === 'mute') {
        result += 'Mute ';
      }
      // filter users
      if (!filter.users.length) {
        result += "<span class='wynnoPurple'>all users' </span>"; 
      } else {
        for (var i = 0; i < filter.users.length; i++) {
          result += ('<span class="wynnoPurple">' + '@' + filter.users[i] + '</span>');
          if (i === filter.users.length - 1) {
            if (result[result.length - 8] === 's') {
              result += "' ";
            } else {
              result += "'s ";
            }
          } else if (i === filter.users.length - 2) {
            if (filter.users.length === 2) {
              result += ' and ';
            } else {
              result += ', and ';
            }
          } else {
            result += ', ';
          }
        }
      }
      // filter scope
      if (filter.scope === 'all') {
        if (filter.conditions.length) {
          result += 'tweets and retweets';
        } else {
          // if there are no filter conditions, we can keep the rendered filter short
          // e.g. it would read, Hear @ihinsdale
          if (result.slice(result.length - 3) === "'s ") {
            result = result.slice(0, result.length - 3);
          } else {
            result = result.slice(0, result.length - 2);
          }
        }
      } else if (filter.scope === 'tweets') {
        result += 'tweets';
      } else if (filter.scope === 'retweets') {
        result += 'retweets';
      } 
      // filter conditions
      if (filter.conditions.length) {
        result += service.parseConditions(filter.conditions);
      }
      return result;
    },
    parseConditions: function(conditions) {
      var result = ' that ';
      var linksResult = '';
      var wordsResult = '';
      var hashtagsResult = '';
      var picturesResult = '';
      var quotationResult = '';
      var lastNonemptyResult = '';

      // loop through conditions, updating summary objects about each type
      var links = { total: 0, specific: { count: 0, domains: {} }, anywhere: { count: 0 } };
      var hashtags = { specific: { count: 0, text: {} }, anything: { count: 0 } };
      var words = {};
      var pictures = 0;
      var quotations = 0;
      for (var i = 0; i < conditions.length; i++) {
        switch(filter.conditions[i].type) {
          case 'link':
            if (filter.conditions[i].link) {
              links.specific.count++;
              if (links.specific.domains.hasOwnProperty(filter.conditions[i].link)) {
                links.specific.domains[filter.conditions[i].link]++;
              } else {
                links.specific.domains[filter.conditions[i].link] = 1;
              }
            } else {
              links.anywhere.count++;
            }
            links.total++;
            break;
          case 'word':
            if (words.hasOwnProperty(filter.conditions[i].word)) {
              words[filter.conditions[i].word]++;
            } else {
              words[filter.conditions[i].word] = 1;
            }
            break;
          case 'hashtag':
            if (filter.conditions[i].hashtag) {
              hashtags.specific.count++;
              if (hashtags.specific.text.hasOwnProperty(filter.conditions[i].hashtag)) {
                hashtags.specific.text[filter.conditions[i].hashtag]++;
              } else {
                hashtags.specific.text[filter.conditions[i].hashtag] = 1;
              }
            } else {
              hashtags.anything.count++;
            }
            break;
          case 'picture':
            pictures++;
            break;
          case 'quotation':
            quotations++;
            break;
        }
      }
      // now render text for each type
      // links
      // if there are link conditions but nowhere specific specified
      if (links.total && !links.specific.count) {
        linksResult = 'contain ' + links.total + ' link';
        if (links.anywhere.count > 1) {
          linksResult += 's';
        }
      // otherwise if there are link conditions and somewhere specific has been specified
      } else if (links.total) {
        var specificDomains = Object.keys(links.specific.domains);
        // if no link domain has a count > 1
        var countsLessThan1 = true;
        if links.anywhere.count > 1 {
          countsLessThan1 = false;
        }
        for (var j = 0; j < specificDomains.length; j++) {
          if (countsLessThan1) {
            if (links.specific.domains[specificDomains[j]] > 1) {
              countsLessThan1 = false;
            }
          }
        }
        if (countsLessThan1) {
          linksResult = 'link to ';
          for (var k = 0; k < specificDomains.length; k++) {
            linksResult += specificDomains[k];
            if (k !== specificDomains.length - 1) {
              linksResult += ' and ';
            }
          }
          if (links.anywhere.count) {
            linksResult += ' and anywhere else';
          }
        // otherwise
        } else {
          linksResult = 'contain ' + links.total + ' links, ';
          for (var m = 0; m < specificDomains.length; m++) {
            linksResult += (links.specific.domains[specificDomains[m]] + ' to ' + specificDomains[m]);
            if (m !== specificDomains.length - 1) {
              linksResult += ' and ';
            }
          }
          if (links.anywhere.count) {
            linksResult += (' and ' + links.anywhere.count + ' anywhere else');
          }
        }
      }
      if (linksResult) {
        result += linksResult;
        lastNonemptyResult = 'linksResult';
      }
      // hashtags

      // words
      
      // picture
      if (pictures) {
        var noun = ' picture';
        if (pictures > 1) {
          noun += 's';
        }
        picturesResult = pictures + noun;
      }
      // quotation
      if (quotations) {
        quotationResult = 'a quotation';
      }


      // now join the results
        //       // the actual count of quotation conditions doesn't matter; as long as there's one, that's all that's meaningful
        // if (lastNonemptyResult === 'linksResult') {
        //   if (linksResult.slice(0, 7) === 'link to') {
        //     result += ' and contain a quotation';
        //   } else if (linksResult.slice(linksResult.length - 5) === ' link' || linksResult.slice(linksResult.length - 5) === 'links') {
        //     result += ' and a quotation';
        //   } else {
        //     result += ', and a quotation';
        //   }
        // } else {
        //   // TODO
        //   // if first word is contain, implies ...
        //   // else
        // }

      return result;
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
            // strip a leading # character from the hashtag input
            // this is necessary because I could not get the Bootstrap # input add-on to display inline
            if (draftFilter.conditions[j].hashtag && draftFilter.conditions[j].hashtag[0] === '#') {
              draftFilter.conditions[j].hashtag = draftFilter.conditions[j].hashtag.slice(1);
            }
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

      // get _id of the filter to be disabled, before updating client side
      var filterId = service.settings.activeFilters[index]._id;
      // update filters on the client side, to be undone if POST request fails
      var orig = service.settings.activeFilters.slice();
      service.settings.disabledFilters.push(service.settings.activeFilters.splice(index, 1));

      // now POST the disable
      $http({ method: 'POST', url: '/disablefilter', data: {
        activeFiltersIndex: index,
        filter_id: filterId
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
    },
    requestSugg: function() {
      var d = $q.defer();
      $http({ method: 'POST', url: '/suggest', data: {} })
      .success(function(data, status, headers, config) {
        console.log('Success requesting filter suggestion.');
        console.log('Data look like:', data)
        // append the suggested filters received to any preexisting suggestedFilters
        for (var i = 0; i < data.suggestedFilters.length; i++) {
          service.settings.suggestedFilters.push(data.suggestedFilters[i])
        }
        service.settings.undismissedSugg = data.undismissedSugg;
        // reset votesRequiredForNextSugg
        service.settings.votesRequiredForNextSugg = 100 - (service.settings.voteCount - Math.floor(service.settings.voteCount / 100) * 100);
        d.resolve(data.suggestedFilters);
      })
      .error(function(reason, status) {
        console.log('error getting filter suggestion');
        d.reject(reason);
      });
      return d.promise;
    },
    adoptSugg: function(index) {
      var d = $q.defer();
      // update filters on the client side, to be undone if POST request fails
      var origSuggested = service.settings.suggestedFilters.slice();
      var origActive = service.settings.activeFilters.slice();
      var origUndismissedSugg = service.settings.undismissedSugg;
      service.settings.activeFilters.push(service.settings.suggestedFilters.splice(index, 1));
      if (!service.settings.suggestedFilters.length) {
        service.settings.undismissedSugg = false;
      }
      $http({ method: 'POST', url: '/adoptsuggestion', data: {
        suggestedFiltersIndex: index
      } })
      .success(function(data, status) {
        console.log('Success adopting filter suggestion.');
        // apply the new filters to currentTweets
        FilterService.applyFilterRules(TweetService.currentTweets, service.settings);
        d.resolve(service.settings);
      })
      .error(function(reason, status) {
        console.log('Error adopting filter suggestion.');
        // reset to original filters
        service.settings.suggestedFilters = origSuggested;
        service.settings.activeFilters = origActive;
        service.settings.undismissedSugg = origUndismissedSugg;
        d.reject(reason);
      });
      return d.promise;
    },
    dismissSugg: function(index) {
      var d = $q.defer();
      // update filters on the client side, to be undone if POST request fails
      var origSuggested = service.settings.suggestedFilters.slice();
      var origDismissed = service.settings.dismissedFilters.slice();
      var origUndismissedSugg = service.settings.undismissedSugg;
      service.settings.dismissedFilters.push(service.settings.suggestedFilters.splice(index, 1));
      if (!service.settings.suggestedFilters.length) {
        service.settings.undismissedSugg = false;
      }
      $http({ method: 'POST', url: '/dismisssuggestion', data: {
        suggestedFiltersIndex: index
      } })
      .success(function(data, status) {
        console.log('Success dismissing filter suggestion.');
        d.resolve(service.settings);
      })
      .error(function(reason, status) {
        console.log('Error dismissing filter suggestion.');
        // reset to original filters
        service.settings.suggestedFilters = origSuggested;
        service.settings.dismissedFilters = origDismissed;
        service.settings.undismissedSugg = origUndismissedSugg;
        d.reject(reason);
      });
      return d.promise;
    }
  };

  return service;
}]);
