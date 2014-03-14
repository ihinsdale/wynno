var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Create a Filter Schema
exports.filterSchema = filterSchema = new Schema({
  type: String,
  users: [ String ],
  conditions: [ Schema.Types.Mixed ],
  scope: String,
  typeDisplayed: String,
  usersDisplayed: String,
  scopeDisplayed: String,
  created_at: {type: Date, default: Date.now},
  user_creator: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  revision_of: { type: Schema.Types.ObjectId, ref: 'Filter', default: null },
  wynno_created: {type: Boolean, default: false}
});

exports.Filter = mongoose.model('Filter', filterSchema);
