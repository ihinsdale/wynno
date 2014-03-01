from __future__ import with_statement
from urlparse import urlparse
import logging
import pymongo
import zerorpc
import nltk
import random
import math
import json
import os.path
from bson.json_util import dumps
from bson.objectid import ObjectId
from pymongo import MongoClient
from sklearn import tree
from sklearn.feature_extraction import DictVectorizer
from pprint import pprint

logging.basicConfig();

# connect to db
keys = json.load(open(os.path.abspath(os.path.join(os.path.dirname(__file__),"../config/keys.json"))))
client = MongoClient('mongodb://' + keys['db']['username'] + ':' + keys['db']['password'] + '@' + keys['db']['host'] + '/wynno-dev')
db = client['wynno-dev']
tweets = db.tweets

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

def tweet_features_dict(tweet):
  """Creates a dictionary of tweet features. Keys beginning with w_ indicate presence of word/bigram.
     To be more efficient, could save the tweet features dict created here to the db."""
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
  for hashtag in tweet['__entities']['hashtags']:
    features['hashtag_' + hashtag['text']] = True

  # number of media
  if 'media' in tweet['__entities']:
    for each in tweet['__entities']['media']:
      if each['type'] not in features:
        features[each['type']] = 0
      features[each['type']] += 1

  # contains quotation
  if '"' in tweet['__text']:
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

  # words in the tweet
  whitespaced_words = tweet['__text'].split()
  pure_words = []
  for each in whitespaced_words:
    if each[0] != '@' and each[0] != '#' and each[0:7] != 'http://' and each[0:8] != 'https://':
      pure_words.append(each)
  pure_lowered_text = ' '.join(pure_words).lower()
  print pure_lowered_text
  # Now use NLTK's tokenizer
  # could try stemming words too
  # get word tokens
  words = set([word for sent in nltk.sent_tokenize(pure_lowered_text) for word in nltk.word_tokenize(sent)])
  # remove stop words
  words -= set(nltk.corpus.stopwords.words('english'))
  # remove single symbol 'words', though not perhaps $
  words -= set(['(', ')', ',', '.', ':', ';', "'", '"', '``', "''"])
  for word in words:
    features['w_' + word] = True

  # other possible features
  # tweet sentiment
  # contains numbers/figures

  return features

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

def from_votes_to_filters(user_id, tweets):
  # use NLTK to tokenize tweet text, using unigrams and bigrams
  # combine those tokens, which should be binary rather than count, into one feature dict
  # (do anything about stop words or high frequency words?)
  # use DictVectorizer to transform the dict into scikit vector
  # use DecisionTreeClassifier, or perhaps Random Forest, and look for shortest path with no error


  # define X array for DecisionTreeClassifier
  feature_dicts = [tweet_features_dict(tweet) for tweet in tweets]
  pprint(feature_dicts)
  #vec = DictVectorizer()

  # define Y array
  #votes = [tweet['__vote'] for tweet in tweets]

  #classifier = nltk.NaiveBayesClassifier.train(voted_feature_sets)
  #classifier.show_most_informative_features(20)
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
    voted_tweets = tweets.find({ "user_id": user_id, "__vote": { "$nin": [None] } })
    if voted_tweets.count():
      suggestedFilters = from_votes_to_filters(user_id, voted_tweets)
    return
    #return json.dumps({'suggestedFilters': suggestedFilters, 'undismissedSugg': True })

# commenting out the RPC server while testing
# s = zerorpc.Server(RPC())
# s.bind("tcp://0.0.0.0:4242")
# s.run()

test = RPC()
test.suggest("5310690f1264b0ac1b000005")
