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
      features[is_geotagged] = True

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

def crunch(votedTweets, nonvotedTweets):
  votedFeatureSets = [(tweet_features(tweet), tweet['__vote']) for tweet in votedTweets]
  random.shuffle(votedFeatureSets)

  twoThirds = int(math.floor(len(votedFeatureSets)*2/3))
  print 'Size of training set:'
  print twoThirds
  halfOfRemaining = int(math.floor(len(votedFeatureSets)*5/6))
  print 'Size of devtest set:'
  print halfOfRemaining - twoThirds
  print 'Size of test set:'
  print len(votedFeatureSets) - halfOfRemaining

  trainSet = votedFeatureSets[:twoThirds]
  devtestSet = votedFeatureSets[twoThirds:halfOfRemaining]
  testSet = votedFeatureSets[halfOfRemaining:]

  classifier = nltk.NaiveBayesClassifier.train(trainSet)
  print nltk.classify.accuracy(classifier, devtestSet)
  print nltk.classify.accuracy(classifier, testSet)
  classifier.show_most_informative_features(10)

  # errors = []
  # for (tweet, tag) in devtestSet:
  #   guess = classifier.classify(tweet)
  #   if guess != tag:
  #     errors.append( (tag, guess, tweet) )

  # for (tag, guess, tweet) in sorted(errors):
  #   print 'correct=%-8s guess=%-8s features=%-30s' % (tag, guess, tweet)

  guesses = []
  for tweet in nonvotedTweets:
    guesses.append([tweet['_id'], round(classifier.prob_classify(tweet_features(tweet)).prob(1), 3)])

  return guesses

def save_guesses(guesses):
  for pair in guesses:
    result = db.tweets.update({"_id": pair[0]}, {"$set": {"__p": pair[1]}})
    if result['err']: # is this test formulated correctly?
      raise SaveError('There was an error saving the prediction.')
  #return guesses
  return

def save_suggested_filters(user_id, filters):
  result = db.users.update({"_id": user_id}, {"$push": {"filters": {"$each": filters}}, "$set": {"undismissedSugg": True}})
  if result['err']:
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
  for dict in feature_dicts:
    if 'retweeter' in dict:
      if not dict['retweeter'] in originators:
        originators[dict['retweeter']] = {}
        originators[dict['retweeter']]['total'] = 1
        originators[dict['retweeter']]['ow_retweets'] = 1
      else:
        originators[dict['retweeter']]['total'] += 1
        originators[dict['retweeter']]['ow_retweets'] += 1
    else:
      if dict['tweeter'] in originators:
        originators[dict['tweeter']]['total'] += 1
      else:
        originators[dict['tweeter']] = {}
        originators[dict['tweeter']]['total'] = 1
        originators[dict['tweeter']]['ow_retweets'] = 0

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
  print remove_unimplementable_results(results)

def remove_unimplementable_results(results):
  """ Removes from results list the feature combinations which cannot be the basis of filters
      because filtering functionality based on one or more features does not exist. """
  non_filterable_features = ['favorite_count', 'retweet_count', 'is_geotagged', 'num_followers_orig_tweeter', 'user_mentions']
  trimmed_results = []
  for result in results:
    for feature in result['features']:
      if feature in non_filterable_features or feature[:13] == 'user_mention_':
        break
    else:
      trimmed_results.append(result)
  return trimmed_results

def from_votes_to_filters(user_id, tweets):
  # create feature dictionaries
  feature_dicts = extract_features(tweets, with_ngrams=False)
  pprint(feature_dicts)

  # define array of votes, i.e. class labels, also known as Y array for scikit classifiers
  votes = [tweet['__vote'] for tweet in tweets]

  # decision tree classifier 
  decision_tree(feature_dicts, votes)

  # [THIS BLOCK WORKS, JUST COMMENTING IT OUT FOR EFFICIENCY WHILE EXPERIMENTING WITH OTHER STUFF]
  # # use Bernoulli naive Bayes from scikit
  # binarized_feature_dicts = binarize_feature_dicts(feature_dicts)
  # # vectorize the binarized feature dicts
  # vec = DictVectorizer()
  # binarized_vectorized_features = vec.fit_transform(binarized_feature_dicts).toarray()
  # feature_names = vec.get_feature_names()
  # sk_naive_bayes(binarized_vectorized_features, votes, feature_names)

  # # compare with naive Bayes from nltk
  # nltk_naive_bayes(binarized_vectorized_features, votes, feature_names)

  # also compute custom approach
  custom(feature_dicts, votes)

  return

class RPC(object):
  def predict(self, user_id):
    # user_id ObjectId string representation needs to be converted to actual ObjectId for querying
    user_id = ObjectId(user_id) 
    print 'Tweets voted on: ' + str(tweets.find({ "user_id": user_id, "__vote": { "$nin": [None] } }).count())
    print 'Out of ' + str(tweets.find({ "user_id": user_id }).count()) + ' total tweets'
    votedTweets = tweets.find({ "user_id": user_id, "__vote": { "$nin": [None] } })
    nonvotedTweets = tweets.find({ "user_id": user_id, "__vote": None })
    if votedTweets.count():
      save_guesses(crunch(votedTweets, nonvotedTweets))
    return 'success'
    # this will return the p's for all nonvoted tweets which have just been crunched
    # requires save_guesses to return the guesses
    # return dumps(save_guesses(crunch(votedTweets, nonvotedTweets)))
  def suggest(self, user_id):
    # user_id ObjectId string representation needs to be converted to actual ObjectId for querying
    user_id = ObjectId(user_id)
    voted_tweets = tweets.find({ "user_id": user_id, "__vote": { "$nin": [None] } }) # may also perhaps want to restrict the
    print 'User has voted on ' + str(voted_tweets.count()) + ' tweets'
    # tweets used by excluding ones to which filters apply
    if voted_tweets.count():
      suggestedFilters = from_votes_to_filters(user_id, list(voted_tweets)) # using list() necessary to convert from cursor
    return
    #return json.dumps({'suggestedFilters': suggestedFilters, 'undismissedSugg': True })

# commenting out the RPC server while testing
# s = zerorpc.Server(RPC())
# s.bind("tcp://0.0.0.0:4242")
# s.run()

test = RPC()
#test.suggest("5310690f1264b0ac1b000005")
test.suggest("5311704f0970b2d421000006")
