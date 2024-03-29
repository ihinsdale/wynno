'use strict';

angular.module('wynnoApp.services')
.factory('SettingsService', ['$q', '$http', 'FilterService', 'TweetService', function($q, $http, FilterService, TweetService) {
  var service = {
    settings: {},
    getSettingsFromDb: function() {
      // Most of the time this function won't be used because settings will have been obtained via the InitialTweetsAndSettingsService.
      // But if user goes directly to the #/settings page, this function will be called.
      var d = $q.defer();
      $http.get('/settings')
      .success(function(data, status) {
        console.log('success getting settings, they look like:', data);
        // after initializing votesRequiredForNextSugg
        data.votesRequiredForNextSugg = 100 - (data.voteCount - Math.floor(data.voteCount / 100) * 100);
        // add the rendered text versions of the filters, since that doesn't come from the db
        service.renderFilters(data);
        service.settings = data;
        d.resolve(service.settings);
      })
      .error(function(reason, status) {
        console.log('error getting settings');
        d.reject(reason);
      });
      return d.promise;
    },
    renderFilters: function(settings, filterGroups) {
      filterGroups = filterGroups || ['activeFilters', 'disabledFilters', 'suggestedFilters', 'dismissedFilters'];
      angular.forEach(filterGroups, function(filterGroup) {
        angular.forEach(settings[filterGroup], function(filter) {
          filter.rendered = service.renderFilter(filter);
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

      // if filter applies to all users
      if (!filter.users.length) {
        if (filter.scope === 'all') {
          result += 'all tweets';
        } else if (filter.scope === 'tweets') {
          result += 'tweets (but not retweets)';
        } else if (filter.scope === 'retweets') {
          result += 'retweets';
        }
      } else {
        for (var i = 0; i < filter.users.length; i++) {
          result += ('<strong class="darkGray">' + '@' + filter.users[i] + '</strong>');
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

      // loop through conditions, updating summary objects about each type
      var links = { total: 0, specific: { count: 0, domains: {} }, anywhere: { count: 0 } };
      var hashtags = { total: 0, specific: { count: 0, text: {} }, anything: { count: 0 } };
      var words = { total: 0, words: { count: 0, text: {} }, words_cs: { count: 0, text: {} }, phrases: { count: 0, text: {} }, phrases_cs: { count: 0, text: {} } };
      var pictures = 0;
      var quotations = 0;
      for (var i = 0; i < conditions.length; i++) {
        switch(conditions[i].type) {
          case 'link':
            if (conditions[i].link) {
              links.specific.count++;
              if (links.specific.domains.hasOwnProperty(conditions[i].link)) {
                links.specific.domains[conditions[i].link]++;
              } else {
                links.specific.domains[conditions[i].link] = 1;
              }
            } else {
              links.anywhere.count++;
            }
            links.total++;
            break;
          case 'word':
            var type = conditions[i].word.indexOf(' ') === -1 ? 'words' : 'phrases';
            var cs = conditions[i].wordIsCaseSensitive ? '_cs' : '';
            var cat = type + cs;
            words[cat].count++;
            if (words[cat].text.hasOwnProperty(conditions[i].word)) {
              words[cat].text[conditions[i].word]++;
            } else {
              words[cat].text[conditions[i].word] = 1;
            }
            words.total++;
            break;
          case 'hashtag':
            if (conditions[i].hashtag) {
              hashtags.specific.count++;
              if (hashtags.specific.text.hasOwnProperty(conditions[i].hashtag)) {
                hashtags.specific.text[conditions[i].hashtag]++;
              } else {
                hashtags.specific.text[conditions[i].hashtag] = 1;
              }
            } else {
              hashtags.anything.count++;
            }
            hashtags.total++;
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

      // links are the only type for which the verb might not be 'contain'
      // so we will add the verb directly in linksResult. Whereas for other condition types
      // we will wait to see whether the verb 'contain' needs to be added before joining any of them

      var linksResultHasComma = false; // this is used in joining all results together
      // if there are link conditions but nowhere specific specified
      if (links.total && !links.specific.count) {
        if (links.total === 1) {
          linksResult = 'contain <strong class="darkGray">a link</strong>';
        } else {
          linksResult = 'contain <strong class="darkGray">' + links.total + ' links</strong>';
        }

      // otherwise if there are link conditions and somewhere specific has been specified
      } else if (links.total) {
        var specificDomains = Object.keys(links.specific.domains);
        // if no link domain has a count > 1
        var countsLessThan1 = true;
        if (links.anywhere.count > 1) {
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
            linksResult += '<strong class="darkGray">' + specificDomains[k] + '</strong>';
            if (k !== specificDomains.length - 1) {
              linksResult += ' and ';
            }
          }
          if (links.anywhere.count) {
            linksResult += ' and <strong class="darkGray">anywhere else</strong>';
          }
        // otherwise
        } else {
          linksResult = 'contain <strong class="darkGray">' + links.total + ' links</strong>';
          if (specificDomains.length === 1) {
            linksResult += ' to <strong class="darkGray">' + specificDomains[0] + '</strong>';
          } else {
            linksResult += ', ';
            linksResultHasComma = true;
            for (var m = 0; m < specificDomains.length; m++) {
              linksResult += (links.specific.domains[specificDomains[m]] + ' to <strong class="darkGray">' + specificDomains[m] + '</strong>');
              if (m !== specificDomains.length - 1) {
                linksResult += ' and ';
              }
            }
            if (links.anywhere.count) {
              linksResult += (' and ' + links.anywhere.count + ' <strong class="darkGray">anywhere else</strong>');
            }
          }
        }
      }

      // hashtags

      if (hashtags.total && !hashtags.specific.count) {
        if (hashtags.total === 1) {
          hashtagsResult += '<strong class="darkGray">a hashtag</strong>';
        } else {
          hashtagsResult += '<strong class="darkGray">' + hashtags.total + ' hashtags</strong>';
        }
      } else if (hashtags.total) {
        var specificHashtags = Object.keys(hashtags.specific.text);
        if (specificHashtags.length === 1) {
          hashtagsResult += 'the hashtag <strong class="darkGray">' + specificHashtags[0] + '</strong>';
        } else {
          hashtagsResult += 'the hashtags ';
          var count;
          for (var p = 0; p < specificHashtags.length; p++) {
            hashtagsResult += '<strong class="darkGray">' + specificHashtags[p] + '</strong>';
            count = hashtags.specific.text[specificHashtags[p]];
            if (count > 1) {
              if (count === 2) {
                hashtagsResult += ' (twice)';
              } else {
                hashtagsResult += ' (' + count + ' times)';
              }
            }
            if (p !== specificHashtags.length - 1) {
              hashtagsResult += ' and ';
            }
          }
        }
        if (hashtags.anything.count) {
          if (hashtags.anything.count === 1) {
            hashtagsResult += ' and <strong class="darkGray">any other hashtag</strong>';
          } else {
            hashtagsResult += ' and <strong class="darkGray">any ' + hashtags.anything.count + ' others</strong>';
          }
        }
      }

      // words

      if (words.total) {
        // console.log('words objects look like:');
        // console.log('words.words:');
        // console.log(words.words);
        // console.log('words.words_cs:');
        // console.log(words.words_cs);
        // console.log('words.phrases:');
        // console.log(words.phrases);
        // console.log('words.phrases_cs:');
        // console.log(words.phrases_cs);
        var hasWords = words.words.count || words.words_cs.count;
        var hasPhrases = words.phrases.count || words.phrases_cs.count;
        // words
        if (hasWords) {
          wordsResult += service.wordsRender(words.words, words.words_cs, false);
          if (hasPhrases) {
            wordsResult += ' and ';
          }
        }
        // phrases
        if (hasPhrases) {
          wordsResult += service.wordsRender(words.phrases, words.phrases_cs, true);
        }
      }

      // picture

      if (pictures) {
        var noun = ' picture';
        if (pictures > 1) {
          picturesResult += ('<strong class="darkGray">' + pictures + noun + 's</strong>');
        } else {
          picturesResult += ('<strong class="darkGray">a' + noun + '</strong>');
        }
      }

      // quotation

      if (quotations) {
        quotationResult = '<strong class="darkGray">a quotation</strong>';
      }


      // now join the results
      result += linksResult;
      if (linksResult.slice(0,7) === 'link to'
          && (wordsResult || hashtagsResult || picturesResult || quotationResult)) {
        result += ' and contain ';
      } else if (linksResult && (wordsResult || hashtagsResult || picturesResult || quotationResult)) {
        if (linksResultHasComma) {
          result += ', and ';
        } else {
          result += ' and ';
        }
      } else {
        if (!linksResult) {
          result += 'contain ';
        }
      }
      result += wordsResult;
      if (wordsResult && (hashtagsResult || picturesResult || quotationResult)) {
        result += ' and ';
      }
      result += hashtagsResult;
      if (hashtagsResult && (picturesResult || quotationResult)) {
        result += ' and ';
      }
      result += picturesResult;
      if (picturesResult && quotationResult) {
        result += ' and ';
      }
      result += quotationResult;

      return result;
    },
    wordsRender: function(wordsOrPhrasesObject, wordsOrPhrases_csObject, isPhrases) {
      var result = '';
      var type = isPhrases ? 'phrase' : 'word';
      var specific = Object.keys(wordsOrPhrasesObject.text);
      var specific_cs = Object.keys(wordsOrPhrases_csObject.text);
      var totalUniqueSpecific = specific.length + specific_cs.length;
      if (!totalUniqueSpecific) {
        return '';
      }
      var count;
      result += 'the ' + type;
      if (totalUniqueSpecific > 1) {
        result += 's ';
      } else {
        result += ' ';
      }
      var catRender = function(isCaseSensitive) {
        var which;
        var sourceObject;
        if (isCaseSensitive) {
          which = specific_cs;
          sourceObject = wordsOrPhrases_csObject;
        } else {
          which = specific;
          sourceObject = wordsOrPhrasesObject;
        }
        for (var n = 0; n < which.length; n++) {
          result += '<strong class="darkGray">' + which[n] + '</strong>';
          count = sourceObject.text[which[n]];
          if (count > 1) {
            if (count === 2) {
              result += ' (twice'
              if (isCaseSensitive) {
                result += '; case-sensitive';
              }
              result += ')';
            } else {
              result += ' (' + count + ' times';
              if (isCaseSensitive) {
                result += '; case-sensitive';
              }
              result += ')';
            }
          } else {
            if (isCaseSensitive) {
              result += ' (case-sensitive)';
            }
          }
          if (n !== which.length - 1) {
            result += ' and ';
          }
        }
      };
      catRender(false);
      if (specific.length && specific_cs.length) {
        result += ' and ';
      }
      catRender(true);
      return result;
    },
    provideSettings: function() {
      if (!Object.keys(service.settings).length) {
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
            delete draftFilter.conditions[j].wordIsCaseSensitive;
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
            delete draftFilter.conditions[j].wordIsCaseSensitive;
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
        // add rendered version to draftFilter
        draftFilter.rendered = service.renderFilter(draftFilter);
        // add draftFilter to the activeFilters
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
      var origActive = service.settings.activeFilters.slice();
      var origDisabled = service.settings.disabledFilters.slice();
      service.settings.disabledFilters.push(service.settings.activeFilters.splice(index, 1)[0]);

      // now POST the disable
      $http({ method: 'POST', url: '/disablefilter', data: {
        activeFiltersIndex: index,
        filter_id: filterId
      } })
      .success(function(data, status) {
        console.log('Success disabling filter.');
        // apply the new filters to currentTweets
        // service.settings reflects the new filters because we previously spliced
        // from activeFilters and pushed to disabledFilters
        FilterService.applyFilterRules(TweetService.currentTweets, service.settings);
        d.resolve(service.settings);
      })
      .error(function(reason, status) {
        console.log('Error disabling filter.');
        // reset to original filters
        service.settings.activeFilters = origActive;
        service.settings.disabledFilters = origDisabled;
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
        // render the suggested filters, since that doesn't come from the db
        service.renderFilters(data, ['suggestedFilters']);
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
        // if there was an error getting filter suggestions, we want the user to be able to try getting filter suggestions again
        // after the next vote
        service.settings.votesRequiredForNextSugg = 1;
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
      service.settings.activeFilters.push(service.settings.suggestedFilters.splice(index, 1)[0]);
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
      service.settings.dismissedFilters.push(service.settings.suggestedFilters.splice(index, 1)[0]);
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
    },
    enableDisFilterOrSugg: function(disabledOrDismissed, index) {
      var d = $q.defer();
      var orig;
      var origActive = service.settings.activeFilters.slice();
      // update filters on the client side, to be undone if POST request fails
      if (disabledOrDismissed === 'disabled') {
        orig = service.settings.disabledFilters.slice();
        service.settings.activeFilters.push(service.settings.disabledFilters.splice(index, 1)[0]);
      } else if (disabledOrDismissed === 'dismissed') {
        orig = service.settings.dismissedFilters.slice();
        service.settings.activeFilters.push(service.settings.dismissedFilters.splice(index, 1)[0]);
      }
      $http({ method: 'POST', url: '/enabledisfilterorsugg', data: {
        which: disabledOrDismissed,
        index: index
      } })
      .success(function(data, status) {
        console.log('Success enabling filter.');
        // apply the new filters to currentTweets
        FilterService.applyFilterRules(TweetService.currentTweets, service.settings);
        d.resolve(service.settings);
      })
      .error(function(reason, status) {
        console.log('Error enabling filter.');
        // reset to original filters
        service.settings.activeFilters = origActive;
        if (disabledOrDismissed === 'disabled') {
          service.settings.disabledFilters = orig;
        } else if (disabledOrDismissed === 'dismissed') {
          service.settings.dismissedFilters = orig;
        }
        d.reject(reason);
      });
      return d.promise;
    },
    toggleAutoWynnoing: function() {
      var d = $q.defer();
      if (service.settings.voteCount < 200) {
        d.reject(200 - service.settings.voteCount + " more votes required before auto-wynnoing can be turned on.");
      } else {
        $http({ method: 'POST', url: '/autowynnoing', data: {
          autoWynnoing: !service.settings.autoWynnoing
        } })
        .success(function(data, status) {
          service.settings.autoWynnoing = !service.settings.autoWynnoing;
          // if auto-wynnoing has just been turned on, we will have received tweets with p-values
          // so we apply filters to the tweets received and then replace the currentTweets with them
          if (service.settings.autoWynnoing) {
            TweetService.replaceCurrentTweets(data.tweets);
          // if auto-wynnoing has just been turned off, we want to remove p-values from currentTweets
          } else {
            TweetService.removePredictions();
          }
          d.resolve('Successfully switched auto-wynnoing to', service.settings.autoWynnoing);
        })
        .error(function(reason, status) {
          d.reject(reason);
        });
      }
      return d.promise;
    }
  };

  return service;
}]);
