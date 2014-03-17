from __future__ import with_statement
import logging
import pymongo
import zerorpc
import nltk
import random
import math
import json
import os.path
import unicodedata
import copy
import pydot
import numpy as np
import time
from unidecode import unidecode
from urlparse import urlparse
from bson.json_util import dumps
from bson.objectid import ObjectId
from pymongo import MongoClient
from sklearn import tree
from sklearn.feature_extraction import DictVectorizer
from sklearn import naive_bayes
from sklearn import cross_validation
from pprint import pprint
from StringIO import StringIO
from sklearn.externals.six import StringIO as sk_StringIO

# ZeroRPC needs logging
logging.basicConfig();

# connect to db
keys = json.load(open(os.path.abspath(os.path.join(os.path.dirname(__file__),"../config/keys.json"))))
client = MongoClient('mongodb://' + keys['db']['username'] + ':' + keys['db']['password'] + '@' + keys['db']['host'] + '/wynno-dev')
db = client['wynno-dev']
tweets = db.tweets

def strip_accents(s):
  """ Removes accents from string.
      Cf. http://stackoverflow.com/questions/517923/what-is-the-best-way-to-remove-accents-in-a-python-unicode-string """
  return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')

# load tlds, ignore comments and empty lines:
with open("effective_tld_names.dat.txt") as tld_file:
    tlds = set([line.strip() for line in tld_file if line[0] not in "/\n"])

def get_domain(url, tlds):
  """Extracts domain from a url, e.g. google.com. Requires tlds file used as above.
     From http://stackoverflow.com/a/1069780"""
  url_elements = urlparse(url)[1].split('.')
  # url_elements = ["abcde","co","uk"]

  for i in range(-len(url_elements), 0):
    last_i_elements = url_elements[i:]
    #    i=-3: ["abcde","co","uk"]
    #    i=-2: ["co","uk"]
    #    i=-1: ["uk"] etc

    candidate = ".".join(last_i_elements) # abcde.co.uk, co.uk, uk
    wildcard_candidate = ".".join(["*"] + last_i_elements[1:]) # *.co.uk, *.uk, *
    exception_candidate = "!" + candidate

    # match tlds: 
    if (exception_candidate in tlds):
      return ".".join(url_elements[i:]) 
    if (candidate in tlds or wildcard_candidate in tlds):
      return ".".join(url_elements[i-1:])
      # returns "abcde.co.uk"

  raise ValueError("Domain not in global list of TLDs")

def extract_features(tweets, with_ngrams=False):
  # add tokenized versions of tweet __text to the tweet
  for tweet in tweets:
    tweet['word_tokens'] = tokenize_tweet_text(tweet['__text'])

  if with_ngrams:
    # and assemble corpus of all tokens in user's corpus of voted tweets
    # 'tw33t_3nd_m4rker' demarcates tweets
    tokenized_corpus = ['tw33t_3nd_m4rker']
    tokenized_corpus.extend(tweet['word_tokens'])
    tokenized_corpus.append('tw33t_3nd_m4rker')

    # extract the most useful bigram and trigram features from the corpus
    bi_finder = nltk.collocations.BigramCollocationFinder.from_words(tokenized_corpus)
    bigram_measures = nltk.collocations.BigramAssocMeasures()
    bi_finder.apply_freq_filter(2) # filter out bigrams appearing less than 2 times
    best_bigrams = bi_finder.nbest(bigram_measures.pmi, 10)
    print best_bigrams
    best_bigrams = [bigram for bigram in best_bigrams if not 'tw33t_3nd_m4rker' in bigram]
    tri_finder = nltk.collocations.TrigramCollocationFinder.from_words(tokenized_corpus)
    trigram_measures = nltk.collocations.TrigramAssocMeasures()
    tri_finder.apply_freq_filter(2) # filter out trigrams appearing less than 2 times
    best_trigrams = tri_finder.nbest(trigram_measures.raw_freq, 10)
    print best_trigrams
    ngram_features = {'bigrams': set(best_bigrams), 'trigrams': set(best_trigrams)}
  else:
    ngram_features = {}
  print 'ngram_features from corpus are:'
  print ngram_features

  return [tweet_features_dict(tweet, ngram_features) for tweet in tweets]

def tokenize_tweet_text(tweet_text):
  """ Converts a string of raw tweet text into a list of tokens. """
  # first strip accents...make that, all unicode
  #text = strip_accents(tweet_text)
  text = unidecode(tweet_text)
  # Now remove user mentions and links from tweet text. We'll keep hashtags as words because they are sometimes used that way
  whitespaced_words = text.split()
  pure_words = []
  for each in whitespaced_words:
    # treat hashtag text as words
    if each[0] == '#':
      pure_words.append(each[1:])
    elif each[0] != '@' and each[0:7] != 'http://' and each[0:8] != 'https://':
      pure_words.append(each)
  pure_lowered_text = ' '.join(pure_words).lower()

  # get word tokens using NLTK's tokenizer
  # could conceivably try stemming words too
  tokens = [word for sent in nltk.sent_tokenize(pure_lowered_text) for word in nltk.word_tokenize(sent)]
  # remove stop words. can't use set subtraction because that would mess up subsequent calculation of bigrams using the unigram tokens
  # also remove junk symbol words, though not perhaps $
  stop_words = nltk.corpus.stopwords.words('english')
  junk_symbol_words = ['(', ')', '[', ']', ',', '.', ':', ';', '?', '!', '%', "'", '"', '``', "''", "_", "__"]
  noise = stop_words + junk_symbol_words
  tokens = [word for word in tokens if not word in noise]
  return tokens

def tweet_features_dict(tweet, corpus_ngram_features):
  """Creates a dictionary of tweet features. Keys beginning with w_ indicate presence of word/ngram.
     To be more efficient, could save the tweet features dict created here to the db.
     corpus_ngram_features contain prominent bi- and tri- grams from user corpus. """
  features = {}

  # tweeter
  features['tweeter'] = tweet['__user']['screen_name']

  # retweeter
  if '__retweeter' in tweet and tweet['__retweeter'] is not None:
    features['retweeter'] = tweet['__retweeter']['screen_name']
  # number of followers of the person being retweeted
    features['num_followers_orig_tweeter'] = tweet['__user']['followers_count']
  # number of times original tweet has been retweeted
    features['retweet_count'] = tweet['retweeted_status']['retweet_count']
  # number of times original tweet has been favorited
    features['favorite_count'] = tweet['retweeted_status']['favorite_count']
  # original tweet is geotagged
    if tweet['retweeted_status']['coordinates']:
      features['is_geotagged'] = True

  # number of user_mentions
  features['user_mentions'] = len(tweet['__entities']['user_mentions'])
  # mentioned users
  for user in tweet['__entities']['user_mentions']:
    features['user_mention_' + user['screen_name']] = True
    # currently identifying mentioned users by their screen_name, because screen_name is also what's used
    # by tweet filters. But if a user changed screen_name, this would break. Stronger version would be
    # to identify user by id_str

  # number of (non-media) links
  features['urls'] = len(tweet['__entities']['urls'])
  # domains of those (non-media) links
  for url in tweet['__entities']['urls']:
    domain = get_domain(url['expanded_url'], tlds)
    features['url_' + domain] = True

  # number of hashtags
  features['hashtags'] = len(tweet['__entities']['hashtags'])
  # hashtags
  # may arguably want to remove these, because we're counting hashtag text in words and bigrams
  for hashtag in tweet['__entities']['hashtags']:
    features['hashtag_' + hashtag['text']] = True

  # number of media
  if 'media' in tweet['__entities']:
    for each in tweet['__entities']['media']:
      if each['type'] not in features:
        features[each['type']] = 0
      features[each['type']] += 1

  # contains quotation
  if '"' in unidecode(tweet['__text']):
    features['has_quotation'] = True

  # if tweet is not a retweet and so these were not set earlier:
  if ('__retweeter' in tweet and tweet['__retweeter'] is None) or ('__retweeter' not in tweet):
  # number of times tweet has been retweeted and favorited
    features['retweet_count'] = tweet['retweet_count']
    features['favorite_count'] = tweet['favorite_count']
  # is geotagged
    if tweet['coordinates']:
      features['is_geotagged'] = True

  # TODO
  # length of pure text in tweet, i.e. excluding user mentions, hashtags, and links
  # or should the metric be simply how many characters out of the  allowed 140?

  # natural language in the tweet
  # first create features for each word
  for word in tweet['word_tokens']:
    features['w__' + word] = True
  # now create features for any bigrams and trigrams present, if corpus_ngram_features have been provided
  if corpus_ngram_features:
    tweet_tokenized_for_ngram_analysis = ['tw33t_3nd_m4rker']
    tweet_tokenized_for_ngram_analysis.extend(tweet['word_tokens'])
    tweet_tokenized_for_ngram_analysis.extend(['tw33t_3nd_m4rker'])
    bi_finder = nltk.collocations.BigramCollocationFinder.from_words(tweet_tokenized_for_ngram_analysis)
    bigram_measures = nltk.collocations.BigramAssocMeasures()
    bigrams = set(bi_finder.score_ngrams(bigram_measures.raw_freq))
    for bigram in corpus_ngram_features['bigrams']:
      if bigram in bigrams:
        features['b__' + bigram[0] + '__' + bigram[1]] = True
      else:
        features['b__' + bigram[0] + '__' + bigram[1]] = False

    tri_finder = nltk.collocations.TrigramCollocationFinder.from_words(tweet_tokenized_for_ngram_analysis)
    trigram_measures = nltk.collocations.TrigramAssocMeasures()
    trigrams = set(tri_finder.score_ngrams(trigram_measures.raw_freq))
    for trigram in corpus_ngram_features['trigrams']:
      if trigram in trigrams:
        features['t__' + trigram[0] + '__' + trigram[1] + '__' + trigram[2]] = True
      else:
        features['t__' + trigram[0] + '__' + trigram[1] + '__' + trigram[2]] = False

  # other possible features
  # tweet sentiment
  # contains numbers/figures

  return features

def binarize_feature_dicts(feature_dicts):
  """ Converts any features in feature dict that are counts into binary indicators of presence of feature.
      Assumes numerical features are integers. """
  binarized = copy.deepcopy(feature_dicts)
  for dict in binarized:
    for key in dict:
      if dict[key] > 1:
        dict[key] = 1
  return binarized

def crunch(voted_tweets, tweets_to_predict):
  # crucial that voted_tweets and tweets_to_predict have feature vectors with the exact same signature
  # to ensure that, we'll join them together, then split them after vectorizing
  all_tweets = voted_tweets[:]
  all_tweets.extend(tweets_to_predict)
  # create feature dictionaries of voted_tweets
  feature_dicts = extract_features(all_tweets, with_ngrams=False)

  # define array of votes, i.e. class labels, also known as Y array for scikit classifiers
  votes = [tweet['__vote'] for tweet in voted_tweets]

  # use Bernoulli naive Bayes from scikit
  binarized_feature_dicts = binarize_feature_dicts(feature_dicts)
  # vectorize the binarized feature dicts
  vec = DictVectorizer()
  binarized_vectorized_features = vec.fit_transform(binarized_feature_dicts).toarray()
  feature_names = vec.get_feature_names()
  binarized_vectorized_voted_tweets = binarized_vectorized_features[:len(voted_tweets)]
  print 'Length of binarized_vectorized_voted_tweets: ' + str(len(binarized_vectorized_voted_tweets))
  print 'Length of votes: ' + str(len(votes))
  clf = sk_naive_bayes(binarized_vectorized_voted_tweets, votes, feature_names)
  predictions = clf.predict(binarized_vectorized_features[len(voted_tweets):])
  probabilities = clf.predict_proba(binarized_vectorized_features[len(voted_tweets):])
  pprint([(round(pair[1]/pair[0], 2), round(pair[1], 2), round(pair[0]/pair[1], 2), round(pair[0], 2)) for pair in probabilities])
  log_probabilities = clf.predict_log_proba(binarized_vectorized_features[len(voted_tweets):])
  pprint([round(pair[1]/pair[0], 2) for pair in log_probabilities])
  # per https://github.com/scikit-learn/scikit-learn/issues/2508 and https://github.com/scikit-learn/scikit-learn/pull/2694,
  # votes needs to be converted from a list to a numpy array

  scores = cross_validation.cross_val_score(clf, binarized_vectorized_voted_tweets, np.array(votes), cv=10)
  print("Accuracy: %0.2f (+/- %0.2f)" % (scores.mean(), scores.std() * 2))

  # # compare with naive Bayes from nltk
  # nltk_naive_bayes(binarized_vectorized_features, votes, feature_names)

  return

def save_suggested_filters(user_id, filters):
  """ Save filter suggestions to the user's record in the database. """
  print 'Saving filter suggestions to the db.'
  try:
    filter_ids = db.filters.insert(filters)
    saved_filters = []
    for filter_id in filter_ids:
      saved_filters.append(db.filters.find_one({"_id": filter_id}))
    result = db.users.update({"_id": user_id}, {"$push": {"suggestedFilters": {"$each": saved_filters}}, "$set": {"undismissedSugg": True}})
  except:
    raise SaveError('There was an error saving the suggested filters.')
  return

def decision_tree(feature_dicts, votes):
  # vectorize the feature dicts
  vec = DictVectorizer()
  vectorized_features = vec.fit_transform(feature_dicts).toarray()
  feature_names = vec.get_feature_names()
  
  # train the classifier
  criterion = "entropy"
  clf = tree.DecisionTreeClassifier(criterion=criterion,min_samples_leaf=10)
  clf = clf.fit(vectorized_features, votes)
  print clf.tree_.feature
  print clf.tree_.value
  # save results in dotfile
  with open("output.dot", "w") as output_file:
    tree.export_graphviz(clf, out_file=output_file, feature_names=feature_names)
  # also print results to console
  out = StringIO()
  out = tree.export_graphviz(clf, out_file=out, feature_names=feature_names)
  print out.getvalue()
  # also create pdf graph from dotfile
  dot_data = sk_StringIO() 
  tree.export_graphviz(clf, out_file=dot_data, feature_names=feature_names) 
  graph = pydot.graph_from_dot_data(dot_data.getvalue()) 
  graph.write_pdf("graph_" + criterion + ".pdf") 

def sk_naive_bayes(X, Y, feature_names):
  clf = naive_bayes.BernoulliNB() # binarize turns count features like number of urls into binary indicator
  clf.fit(X, Y)
  show_most_informative_features(feature_names, clf)
  return clf


def nltk_naive_bayes(X, Y, feature_names):
  # need to convert from X back into feature dict
  # important to start with X though, so that all dicts have the exact same keys
  feature_dicts = []
  for each in X:
    dict = {}
    for index, feature_value in enumerate(each):
      dict[feature_names[index]] = feature_value
    feature_dicts.append(dict)

  clf = nltk.NaiveBayesClassifier.train([(feature_dicts[index], Y[index]) for index, val in enumerate(X)])
  clf.show_most_informative_features(20)

def show_most_informative_features(feature_names, clf, n=20):
  """ For scikit, shows n most informative features of a classifier, mimicking this functionality of nltk.
      Cf. http://stackoverflow.com/questions/11116697/how-to-get-most-informative-features-for-scikit-learn-classifiers """
  c_f = sorted(zip(clf.coef_[0], feature_names))
  best = c_f[:n]
  worst = c_f[:-(n+1):-1]
  pprint(best)
  pprint(worst)

def show_most_prevalent_originators_of_tweets(feature_dicts):
  """ Takes list of feature dictionaries and returns sorted list of users who originate
      (i.e. tweet or retweet) the most tweets. """
  originators = {}
  for each in feature_dicts:
    if 'retweeter' in each:
      if not each['retweeter'] in originators:
        originators[each['retweeter']] = {}
        originators[each['retweeter']]['total'] = 1
        originators[each['retweeter']]['ow_retweets'] = 1
      else:
        originators[each['retweeter']]['total'] += 1
        originators[each['retweeter']]['ow_retweets'] += 1
    else:
      if each['tweeter'] in originators:
        originators[each['tweeter']]['total'] += 1
      else:
        originators[each['tweeter']] = {}
        originators[each['tweeter']]['total'] = 1
        originators[each['tweeter']]['ow_retweets'] = 0

  # get list of originators descending by the total tweets they originate
  most_prevalent_users = sorted(originators.iterkeys(), key=lambda k: -1 * originators[k]['total'])
  return most_prevalent_users

def custom(feature_dicts, votes_vector):
  # binarize the feature_dicts
  binarized_feature_dicts = binarize_feature_dicts(feature_dicts)

  # if tweet-filter conditioning options are expanded to include e.g. tweets that do NOT contain a link,
  # then we'd want to distinguish between originally-binary and originally-continuous features here,
  # and apply the recursive searching to e.g. originally-continous features with at least 5 or more 0 values

  # vectorize features
  vec = DictVectorizer()
  vectorized_features = vec.fit_transform(feature_dicts).toarray()
  feature_names = vec.get_feature_names()
  print 'Feature names are:'
  print feature_names

  # tack votes on to each vectorized tweet as last item
  # since vectorized_features is a numpy array, we need to use numpy methods
  # Cf. http://stackoverflow.com/questions/5064822/how-to-add-items-into-a-numpy-array
  b = np.array(votes_vector)
  vectorized_features_and_votes = np.hstack((vectorized_features, np.atleast_2d(b).T))

  # could conceivably
  # eliminate features from consideration which the user can't currently use in building a filter
  # would do this by replacing feature values with all 0's, rather than removing the columns entirely,
  # which would destroy index correspondence with feature_names
  # however this is unnecessary -- we'll just only parse into filter suggestions the results which don't
  # involve unfilterable features
  # This is accomplished by remove_unimplementable_results()
  # non_filterable_features = ['favorite_count', 'retweet_count', 'is_geotagged', etc.]
  # for non_filterable_feature in non_filterable_features:
  #   for index, feature in enumerate(feature_names):
  #     if non_filterable_features == feature:
  #       vectorized_features_and_votes[:,index] = 0

  results = []

  def recur_find(vector_to_search, inherited_features, min_tweets=5):
    """ NB each tweet features vector must have the vote/class of the tweet as its last element. 
        Works as follows:
        For each feature with at least min_tweets tweets with non-zero value,
        check if that feature corresponds to a 100% or 0% voting percentage.
        If it does, add that feature to results (closure variable).
        Also, recursively search all tweets with the current feature for features with at least min_tweets tweets 
        with non-zero value for 100% or 0% voting percentage. """
    a = vector_to_search
    # count number of rows with non-zero elements in each column (excluding the vote column)
    print a
    columns = (a[:,0:-1] != 0).sum(0) # http://stackoverflow.com/a/3797190
    for index, count in enumerate(columns):
      # check if any winning feature found
      if count >= min_tweets:
        print 'Checking out ' + str(count) + ' tweets of ' + feature_names[index]
        sum_votes = np.sum(a[a[:,index] != 0][:,-1], axis=0)
        like_pct = sum_votes * 1.0 / count
        print 'like_pct is ' + str(like_pct)
        if like_pct == 0 or like_pct == 1:
          winning_combo = inherited_features[:]
          winning_combo.append(feature_names[index])
          results.append({'like_pct': like_pct, 'num_votes': count, 'features': winning_combo})
        # prepare new array for recursive search
        # remove rows for which current feature is not non-zero, creating new array in the process
        b = a[a[:,index] != 0]
        # get rid of column for the current feature
        # we don't want to actually remove the column, because then index no longer points us correctly within feature_names
        # so we'll just replace the column with 0's
        b[:,index] = 0
        # and in fact to be more efficient, we can replace all columns < index with 0's, so that we don't
        # duplicate any work by considering the same feature combinations in different orders
        b[:,0:index] = 0

        next_inherited_features = inherited_features[:]
        next_inherited_features.append(feature_names[index])
        recur_find(b, next_inherited_features)
  
  start = time.time()
  recur_find(vectorized_features_and_votes, [])
  elapsed = time.time() - start
  print 'Completed filter candidate identification in ' + str(round(elapsed, 2)) + ' seconds'
  print 'Number of results before trimming unimplementable results: ' + str(len(results))
  results = remove_unimplementable_results(results)
  print 'Number of results before trimming duplicates: ' + str(len(results))
  results = remove_any_remaining_duplicate_results(results)
  print 'Number of results after trimming duplicates: ' + str(len(results))
  pprint(results)

  return parse_results_into_filters(select_winning_results(results))

def remove_unimplementable_results(results):
  """ Removes from results list the feature combinations which cannot be the basis of filters
      because filtering functionality based on one or more features does not exist. 
      CURRENT LIST OF UNIMPLEMENTABLE RESULTS -- if 'features' contains:
      -- a tweeter=* feature and retweeter=* feature
      -- any of ['favorite_count', 'retweet_count', 'is_geotagged', 'num_followers_orig_tweeter', 'user_mentions']
      -- a user_mention_* feature 
      -- a bigram or trigram: b__* or t__* """
  non_filterable_features = set(['favorite_count', 'retweet_count', 'is_geotagged', 'num_followers_orig_tweeter', 'user_mentions'])
  trimmed_results = []
  for result in results:
    has_tweeter = False
    has_retweeter = False
    for feature in result['features']:
      if feature in non_filterable_features:
        break
      if feature[:13] == 'user_mention_':
        break
      if feature[:3] == 'b__' or feature[:3] == 't__':
        break

      if feature[:8] == 'tweeter=':
        has_tweeter = True
      if feature[:10] == 'retweeter=':
        has_retweeter = True
      if has_tweeter and has_retweeter:
        break
    else:
      trimmed_results.append(result)
  return trimmed_results

def remove_redundant_hashtag_text_words(results):
  """ Removes from results list the word feature of a hashtag's text, 
      if that specific hashtag feature is also present. Necessary because hashtag text is
      currently used to create a word feature for tweet. Assumes, as is currently the case,
      that word feature text is always lowercase but hashtag text might not be. """
  trimmed_results = []
  for result in results:
    hashtag_text_words_to_remove = []
    found_redundancy = False
    word_features = [feature[3:] for feature in result['features'] if feature[:3] == 'w__']
    hashtag_features = [feature for feature in result['features'] if feature[:8] == 'hashtag_']
    for feature in hashtag_features:
      hashtag_text_word = feature[8:].lower()
      if hashtag_text_word in word_features:
        found_redundancy = True
        print 'Removing a redundant hashtag text word feature.'
        hashtag_text_words_to_remove.append('w__' + hashtag_text_word)
    if found_redundancy:
      new_result = copy.deepcopy(result) # have to use deepcopy so that we get a copy of result['features'] as well
      # and we need that new copy of result['features'] because we don't want to remove from a list we're iterating through
      for word in hashtag_text_words_to_remove:
        new_result['features'].remove(word)
      trimmed_results.append(new_result)
    else:
      trimmed_results.append(result)
  return trimmed_results

def remove_redundant_entity_type_indicator_features(entity_type_indicator_feature, results):
  """ Removes redundant features from feature combinations, e.g. for 'features': [u'hashtag_Oscar', 'hashtags'],
      the 'hashtags' features should be removed since it is currently a binary indicator of hashtags
      and is therefore implied by 'hashtag_Oscar'. """
  trimmed_results = []
  for result in results:
    if entity_type_indicator_feature in result['features']:
      # look for a specific feature of the general_feature's type
      for feature in result['features']:
        specific_feature_prefix = entity_type_indicator_feature[:-1] + '_'
        if feature[:len(specific_feature_prefix)] == specific_feature_prefix:
          print 'Removing a redundant ' + entity_type_indicator_feature + ' feature.'
          new_result = copy.deepcopy(result) # have to use deepcopy so that we get a copy of result['features'] as well
          # and we need that new copy of result['features'] because we don't want to remove from a list we're iterating through
          new_result['features'].remove(entity_type_indicator_feature)
          trimmed_results.append(new_result)
          break
      # if we looped through every feature without hitting a break, i.e. without finding a matching specific feature
      # then the result is valid, so add it to trimmed_results
      else:
        trimmed_results.append(result)
    else:
      trimmed_results.append(result)
  return trimmed_results

def remove_any_remaining_duplicate_results(results):
  """ Safeguard to remove any remaining duplicate results. Duplicates could result
      e.g. in cases of multiple redundant features of different types in the same tweet -- the 
      removal functions might not have caught all such combinations. """
  # convert feature list to tuple -- order doesn't matter at this point
  # this is necessary so we can use dict() (I think), which requires hashable keys
  for result in results:
    result['features'] = tuple(result['features'])
  trimmed_results = [dict(tupleized) for tupleized in set(tuple(sorted(result.items())) for result in results)]
  return trimmed_results

def select_winning_results(results, n=3):
  """ Selects up to n results from batch of candidate results. These are the results that will be
      suggested to the user as filters. """
  winning_results = []
  # sort results first on number of votes, then on number of features in result
  sorted_results = sorted(results, key=lambda k: (-1 * k['num_votes'], -1 * len(k['features'])))
  # select most specific result
  # commenting out invocations of remove_redundant_hashtag_text_words() and remove_redundant_entity_type_indicator_features()
  # in recur_find allows us to now ascertain the most specific results just by looking at length of 'features'
  last_unique_result = None
  for result in sorted_results:
    if not last_unique_result:
      winning_results.append(result)
      last_unique_result = result
      continue
    # if all features in result are features of the last_unique_result, and both results have same number of votes, 
    # then result is a weaker variant of last_unique_result and should be skipped
    if result['num_votes'] == last_unique_result['num_votes'] and set(result['features']) < set(last_unique_result['features']):
      continue
    else:
      winning_results.append(result)
      last_unique_result = result
    if len(winning_results) == n:
      break
  return winning_results

def parse_results_into_filters(results):
  """ Converts a list of result dictionaries into a list of filter dictionaries, i.e. dictionaries
      in the format of a filter parsed by client-side. Removes redundant features before doing so. 
      Filter format is: 
      { 
        type: 'hear' or 'mute',
        users: [screen_name1_str, screen_name2_str, ...], 
        conditions: [{
          type: 'link' or 'word' or 'hashtag' or 'picture' or 'quotation',
          (optional, as appropriate:)
          link: domain_str,
          word: word_or_phrase_str,
          wordIsCaseSensitive: Boolean,
          hashtag: hashtag_str
        }, ...], 
        scope: 'all' or 'tweets' or 'retweets'
      } """
  filters = []
  # remove redundant features from results
  # first we need to convert the 'features' tuples in each result into a list, because
  # the remove_redundant_* methods use list.remove()
  for result in results:
    result['features'] = list(result['features'])
  results = remove_redundant_hashtag_text_words(results)
  results = remove_redundant_entity_type_indicator_features('hashtags', results)
  results = remove_redundant_entity_type_indicator_features('urls', results)
  results = remove_redundant_entity_type_indicator_features('user_mentions', results)
  for result in results:
    filter = {'wynno_created': True, 'type': None, 'users': [], 'conditions': [], 'scope': 'all'}
    # set the filter type
    if result['like_pct'] == 0:
      filter['type'] = 'mute'
    elif result['like_pct'] == 1:
      filter['type'] = 'hear'
    # populate the filter with other features
    for feature in result['features']:
      # tweeter=
      if feature[:8] == 'tweeter=':
        filter['users'].append(feature[8:])
      # retweeter=
      elif feature[:10] == 'retweeter=':
        filter['users'].append('feature'[10:])
        filter['scope'] = 'retweets'
      # hashtags
      elif feature[:8] == 'hashtags':
        filter['conditions'].append({'type': 'hashtag'})
      # hashtag_
      elif feature[:8] == 'hashtag_':
        filter['conditions'].append({'type': 'hashtag', 'hashtag': feature[8:]})
      # urls
      elif feature[:4] == 'urls':
        filter['conditions'].append({'type': 'link'})
      # url_
      elif feature[:4] == 'url_':
        filter['conditions'].append({'type': 'link', 'link': feature[4:]})
      # photo
      elif feature[:5] == 'photo':
        filter['conditions'].append({'type': 'picture'})
      # has_quotation
      elif feature == 'has_quotation':
        filter['conditions'].append({'type': 'quotation'})
      # w__
      elif feature[:3] == 'w__':
        filter['conditions'].append({'type': 'word', 'word': feature[3:], 'wordIsCaseSensitive': False})

      # NOT IMPLEMENTABLE YET:
      # tweeter= and retweeter=
      # user_mentions
      # user_mention_
      # favorite_count
      # retweet_count
      # is_geotagged
      # num_followers_orig_tweeter
      # b__
      # t__
    filters.append(filter)
  return filters

def from_votes_to_filters(user_id, tweets):
  # create feature dictionaries
  feature_dicts = extract_features(tweets, with_ngrams=False)
  pprint(feature_dicts)

  # define array of votes, i.e. class labels, also known as Y array for scikit classifiers
  votes = [tweet['__vote'] for tweet in tweets]

  # decision tree classifier 
  #decision_tree(feature_dicts, votes)

  # make filter suggestions, using compute custom approach
  filters = custom(feature_dicts, votes)
  # filters at this point are ranked in descending order of accuracy/quality: the 0th element is the one we're most confident in.
  # So we want to reverse filters, to rank filters in ascending order of accuracy/certainty/quality.
  # This is because
  # when displaying suggested filters to the user, we want to display them in what is all-time descending order of accuracy/certainty/quality.
  # We can assume that more recently generated suggestions are always better than older ones, because they would have
  # been generated using at least as much vote information. So to display suggestions in all-time descending order,
  # we can display in reverse order an array of all filter suggestions which are ranked in ascending order of accuracy/certainty/quality.
  filters.reverse()

  return filters

class RPC(object):
  def predict(self, user_id, tweets_to_predict):
    # user_id ObjectId string representation needs to be converted to actual ObjectId for querying
    user_id = ObjectId(user_id) 
    # when computing resources become more scarce, because of more users, can implement saving of classifiers
    # using joblib (http://stackoverflow.com/a/11169797) - e.g. refit the classifier after every 20 votes
    print 'Tweets voted on: ' + str(tweets.find({ "user_id": user_id, "__vote": { "$nin": [None] } }).count())
    print 'Out of ' + str(tweets.find({ "user_id": user_id }).count()) + ' total tweets'
    voted_tweets = tweets.find({ "user_id": user_id, "__vote": { "$nin": [None] } })
    nonvoted_tweets = tweets.find({ "user_id": user_id, "__vote": None })
    if voted_tweets.count():
      crunch(list(voted_tweets), tweets_to_predict) # using list() necessary to convert from PyMongo cursor
    else:
      return 'No tweets have been voted on yet.'
    # this will return the p's for all nonvoted tweets which have just been crunched
    # return dumps(save_guesses(crunch(votedTweets, nonvotedTweets)))
  def suggest(self, user_id):
    # user_id ObjectId string representation needs to be converted to actual ObjectId for querying
    user_id = ObjectId(user_id)
    voted_tweets = tweets.find({ "user_id": user_id, "__vote": { "$nin": [None] } }) # may also perhaps want to restrict the
    print 'User has voted on ' + str(voted_tweets.count()) + ' tweets'
    # tweets used by excluding ones to which filters apply
    if voted_tweets.count():
      suggestedFilters = from_votes_to_filters(user_id, list(voted_tweets)) # using list() necessary to convert from cursor
      # save filter suggestions before returning them
      save_suggested_filters(user_id, suggestedFilters)

    return dumps({'suggestedFilters': suggestedFilters, 'undismissedSugg': True })

# s = zerorpc.Server(RPC())
# s.bind("tcp://0.0.0.0:4242")
# s.run()

unvoted = list(tweets.find({ "user_id": ObjectId("53256f304c02bf7521103344") }).sort("_id",1).limit(50))
test = RPC()
test.predict("53256f304c02bf7521103344", unvoted)
