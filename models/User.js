var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var filterSchema = require('./Filter.js').filterSchema;

// Create a User Schema
exports.userSchema = userSchema = new Schema({
  tw_id: Number,
  tw_id_str: String,
  tw_name: String,
  tw_screen_name: String,
  email: String,
  tw_profile_image_url: String,
  activeFilters: [ filterSchema ],
  disabledFilters: [ filterSchema ],
  tw_access_token: String,
  tw_access_secret: String,
  joined_at: {type: Date, default: Date.now},
  agreed_terms: {type: Boolean, default: false},
  agreed_terms_at: {type: Date, default: null}
});

exports.User = mongoose.model('User', userSchema);