var zerorpc = require("zerorpc");

var client = new zerorpc.Client();
client.connect("tcp://127.0.0.1:4242");

exports.crunchTheNumbers = function(user_id, _id, callback) {
  // need to stringify the user_id ObjectId object before sending to Python
  client.invoke("predict", user_id.toString(), function(error, res, more) {
    if (error) {
      console.log('there was an error:', error)
      callback(error);
    } else if (more) {
      console.log('there is more to come:', more);
    } else {
      console.log(res);
      callback(null, user_id, _id); // pass on the _id marking the start of the new batch of tweets
    }
  });
};

exports.suggestFilters = function(user_id, callback) {
  // need to stringify the user_id ObjectId object before sending to Python
  client.invoke("suggest", user_id.toString(), function(error, res, more) {
    if (error) {
      console.log('there was an error:', error)
      callback(error);
    } else if (more) {
      console.log('there is more to come:', more);
    } else {
      console.log('Response received from RPC call to "suggest":')
      console.log(res);
      callback(null, res.suggestedFilters, res.undismissedSugg);
    }
  });
};
