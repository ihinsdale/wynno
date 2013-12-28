var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Create a User Schema
exports.userSchema = userSchema = new Schema({
  twitter_id: String,
  email: String,
  password: String,
  twitterUsername: String,
  twitterPassword: String,
  protectedUsers: [],
  protectedWords: [],
  mutedUsers: [],
  mutedWords: []
});

exports.User = mongoose.model('User', userSchema);