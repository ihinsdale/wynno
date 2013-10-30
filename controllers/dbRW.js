// function to synchronously save to the db tweets in an array received from Twitter API
exports.saveSync = saveSync = function(TweetModel, array, counter, callback) {
  if (counter >= 0) {
    console.log('tweet id', array[counter].id_str, 'created at', array[counter].created_at);

    // add empty p and vote fields to the tweet before adding to database
    array[counter].p = null;
    array[counter].vote = null;

    // create tweet document and save it to the database
    var tweet = new TweetModel(array[counter]);
    tweet.save(function(error, tweet) {
      if (error) {
        console.log('Error saving tweet', tweet.id_str, 'to db');
      } else {
        console.log('Saved tweet',tweet.id_str, 'to db');
        saveSync(TweetModel, array, counter - 1);
      }
    });
  } else if (callback) {
    callback();
  }
}

exports.findLastTweet = function(TweetModel, callback, callback2) {
  var incStrNum = function(n) { // courtesy of http://webapplog.com/decreasing-64-bit-tweet-id-in-javascript/
    n = n.toString(); // but n should be passed in as a string
    var result = n;
    var i = n.length - 1;
    while (i > -1) {
      if (n[i] === "9") {
        result = result.substring(0,i) + "0" + result.substring(i + 1);
        i--;
      }
      else {
        result=result.substring(0,i)+(parseInt(n[i],10)+1).toString()+result.substring(i+1);
        return result;
      }
    }
    return result;
  };

  TweetModel.findOne().sort('-_id').exec(function(err, item) {
    var id;
    if (err) {
      console.log('Error searching collection for a record');
    } else if (item === null) {
      console.log('Collection has no records');
    } else {
      console.log('last tweets id string is', item.id_str);
      id = incStrNum(item.id_str);
    }
    if (callback) {
      callback(TweetModel, id, callback2);
      // this incrementing performed because since_id is actually inclusive,
      // contra the Twitter API docs. Cf. https://dev.twitter.com/discussions/11084
    }
  });
}


