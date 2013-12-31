var zerorpc = require("zerorpc");

var client = new zerorpc.Client();
client.connect("tcp://127.0.0.1:4242");

exports.crunchTheNumbers = function(user_id, _id, callback) {
  console.log('typeof user_id:', typeof user_id);
  console.log('user_id for sending to Python looks like:', user_id);
  console.log('typeof stringified user_id:', typeof user_id.toString());
  console.log('stringified user_id for sending to Python looks like:', user_id.toString());
  client.invoke("predict", user_id, function(error, res, more) {
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
}