var zerorpc = require("zerorpc");

var client = new zerorpc.Client();
client.connect("tcp://127.0.0.1:4242");

client.invoke("predict", function(error, res, more) {
  if (error) {
    console.log('there was an error:', error)
  } else if (more) {
    console.log('there is more to come:' more);
  } else {
    console.log(res);
  }
});