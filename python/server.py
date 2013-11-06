import pymongo
import zerorpc
import nltk
import random

from pymongo import MongoClient
client = MongoClient()
db = client.test
tweets = db.tweets
votedTweets = tweets.find( { "__vote": { "$nin": [None] } } )

def tweet_features(tweet):
  features = {}
  features['tweeter'] = tweet['__user']['screen_name']

  # if retweeter
  features['retweeter'] = tweet['__retweeter']['screen_name']

  return features


featureSets = [(tweet_features(tweet), tweet['__vote']) for tweet in votedTweets]
#random.shuffle(feature_sets)

twoThirds = math.floor(len(featureSets)*2/3)
halfOfRemaining = math.floor(len(featureSets)*5/6)

trainSet = featureSets[:twoThirds]
devtestSet = featureSets[twoThirds:halfOfRemaining]
testSet = featureSets[halfOfRemaining:]

print 'Tweets voted on: ' + str(tweets.find({"__vote": {"$gte": 0}}).count())
print 'Out of ' + str(tweets.find({"__vote": None}).count()) ' total tweets'
#for tweet in tweets.find():
#    print tweet
print 'hello, world'

# class HelloRPC(object):
#     def hello(self, name):
#         return "Hello, %s" % name

# s = zerorpc.Server(HelloRPC())
# s.bind("tcp://0.0.0.0:4242")
# s.run()

# take all tweets that have been voted on, divide into training and dev sets
# where training is 4/5 and dev 1/5

# classification should be done on all non-voted-upon tweets