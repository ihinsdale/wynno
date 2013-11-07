import pymongo
import zerorpc
import nltk
import random
import math

from pymongo import MongoClient
client = MongoClient()
db = client.test
tweets = db.tweets

print 'Tweets voted on: ' + str(tweets.find({"__vote": {"$gte": 0}}).count())
print 'Out of ' + str(tweets.find().count()) + ' total tweets'

votedTweets = tweets.find( { "__vote": { "$nin": [None] } } )
nonvotedTweets = tweets.find( {"__vote": None})
print str(nonvotedTweets.count())

def tweet_features(tweet):
  features = {}
  features['tweeter'] = tweet['__user']['screen_name']

  if '__retweeter' in tweet:
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

  nonvotedFeatureSet = [tweet_features(tweet) for tweet in nonvotedTweets]
  print classifier.batch_classify(nonvotedFeatureSet)


  # errors = []
  # for (tweet, tag) in devtestSet:
  #   guess = classifier.classify(tweet)
  #   if guess != tag:
  #     errors.append( (tag, guess, tweet) )

  # for (tag, guess, tweet) in sorted(errors):
  #   print 'correct=%-8s guess=%-8s features=%-30s' % (tag, guess, tweet)
  return

crunch(votedTweets, nonvotedTweets)

def save_guesses():
  return

# class HelloRPC(object):
#     def hello(self, name):
#         return "Hello, %s" % name

# s = zerorpc.Server(HelloRPC())
# s.bind("tcp://0.0.0.0:4242")
# s.run()

# take all tweets that have been voted on, divide into training and dev sets
# where training is 4/5 and dev 1/5

# classification should be done on all non-voted-upon tweets