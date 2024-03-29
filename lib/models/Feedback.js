'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Create a User Schema
var feedbackSchema;
exports.feedbackSchema = feedbackSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  email: String,
  feedback: String
});

exports.Feedback = mongoose.model('Feedback', feedbackSchema);
