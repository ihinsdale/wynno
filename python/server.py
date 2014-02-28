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

logging.basicConfig();

keys = json.load(open(os.path.abspath(os.path.join(os.path.dirname(__file__),"../config/keys.json"))))
client = MongoClient('mongodb://' + keys['db']['username'] + ':' + keys['db']['password'] + '@127.0.0.1:27017/wynno-dev')
db = client['wynno-dev']
tweets = db.tweets

def tweet_features(tweet):
  features = {}
  features['tweeter'] = tweet['__user']['screen_name']

  if '__retweeter' in tweet and tweet['__retweeter'] is not None:
    features['retweeter'] = tweet['__retweeter']['screen_name']
  else:
    features['retweeter'] = ''

  # contains link / more than one
  # contains hashtag / more than one
  # whether person being retweeted has e.g. > 5,000 followers
  # length of tweet
  # and of course the words in the tweet
  # certain keywords like cartoon

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
  voted_feature_sets = [(tweet_features(tweet), tweet['__vote']) for tweet in tweets]
  classifier = nltk.NaiveBayesClassifier.train(voted_feature_sets)
  classifier.show_most_informative_features(20)
  return []

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
    return json.dumps({'suggestedFilters': suggestedFilters, 'undismissedSugg': True })

s = zerorpc.Server(RPC())
s.bind("tcp://0.0.0.0:4242")
s.run()

test = RPC()
test.suggest("5310690f1264b0ac1b000005")
