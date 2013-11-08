var zerorpc = require("zerorpc");

var client = new zerorpc.Client();
client.connect("tcp://127.0.0.1:4242");

exports.crunchTheNumbers = function(_id, callback) {
  client.invoke("predict", function(error, res, more) {
    if (error) {
      console.log('there was an error:', error)
      callback('there was an error crunching the numbers');
    } else if (more) {
      console.log('there is more to come:', more);
    } else {
      console.log(res);
      callback(null, _id); // pass on the _id marking the start of the new batch of tweets
    }
  });
}