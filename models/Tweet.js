var mongoose = require('mongoose');
require('mongoose-long')(mongoose);
var Schema = mongoose.Schema;

exports.tweetSchema = tweetSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  __p: Number,
  __vote: Number,
  __text: String, // this is necessary because the text field is truncated when the tweet is a retweet.
  // i.e. full text resides in the retweeted_status nested object's text property
  renderedText: String, // this contains __text but with escaped HTML characters and anchor elements
  __user: Schema.Types.Mixed,
  __created_at: String, //UTC time
  __retweeter: { type: Schema.Types.Mixed, default: null } ,
  __id_str: String,
  __displayStatus: Boolean,
  __entities: Schema.Types.Mixed,
  gapAfterThis: { type: Boolean, default: false },

  //created_at: String, // UTC time
  id: { type: Schema.Types.Long, index: true },
  id_str: String,
  //text: String,
  source: String,
  truncated: Boolean,
  in_reply_to_status_id: Number,
  in_reply_to_status_id_str: String,
  in_reply_to_user_id: Number,
  in_reply_to_user_id_str: String,
  in_reply_to_screen_name: String,

  // These all come as properties of an object called user
  //user: Schema.Types.Mixed,

  //geo: null, // deprecated by Twitter
  coordinates: Schema.Types.Mixed, // or perhaps String because it is geoJSON
  place: Schema.Types.Mixed, // or perhaps String
  contributors: Schema.Types.Mixed, // or perhaps String

  // These all come as properties of an object called 'retweeted_status'
  retweeted_status: Schema.Types.Mixed,

  retweet_count: Number,
  favorite_count: Number,
  entities: Schema.Types.Mixed,
  favorited: Boolean,
  retweeted: Boolean,
  possibly_sensitive: Boolean,
  lang: String

});

// Create the Tweet model
exports.Tweet = mongoose.model('Tweet', tweetSchema);