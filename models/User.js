var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Create a User Schema
exports.userSchema = userSchema = new Schema({
  tw_id: Number,
  tw_id_str: String,
  tw_name: String,
  tw_screen_name: String,
  email: String,
  tw_profile_image_url: String,
  protectedUsers: [],
  protectedWords: [],
  mutedUsers: [],
  mutedWords: [],
  tw_access_token: String,
  tw_access_secret: String,
  joined_at: {type: Date, default: Date.now},
  agreed_terms: Date
});

exports.User = mongoose.model('User', userSchema);