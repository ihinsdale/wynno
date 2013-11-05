var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Create a User Schema
exports.userSchema = userSchema = new Schema({
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