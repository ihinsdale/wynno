var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Create a Filter Schema
exports.filterSchema = filterSchema = new Schema({
  type: String,
  users: [ String ],
  conditions: [ Schema.Types.Mixed ],
  scope: String,
  created_at: {type: Date, default: Date.now},
  creator: { type: Schema.Types.ObjectId, ref: 'User' },
  revision_of: { type: Schema.Types.ObjectId, ref: 'Filter' }
});

exports.Filter = mongoose.model('Filter', filterSchema);