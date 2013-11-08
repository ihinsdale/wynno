var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// var tweeterSchema = new Schema({
//   id: Number,
//   id_str: String,
//   name: String,
//   screen_name: String,
//   location: String,
//   description: String,
//   url: String,
//   entities: Schema.Types.Mixed,
//   protected: Boolean,
//   followers_count: Number,
//   friends_count: Number,
//   listed_count: Number,
//   created_at: String, // UTC time
//   favourites_count: Number,
//   utc_offset: Number,
//   time_zone: String,
//   geo_enabled: Boolean,
//   verified: Boolean,
//   statuses_count: Number,
//   lang: String,
//   contributors_enabled: Boolean,
//   is_translator: Boolean,
//   profile_background_color: String,
//   profile_background_image_url: String,
//   profile_background_image_url_https: String,
//   profile_background_tile: Boolean,
//   profile_image_url: String,
//   profile_image_url_https: String,
//   profile_banner_url: String,
//   profile_link_color: String,
//   profile_sidebar_border_color: String,
//   profile_sidebar_fill_color: String,
//   profile_text_color: String,
//   profile_use_background_image: Boolean,
//   default_profile: Boolean,
//   default_profile_image: Boolean,
//   following: Boolean,
//   follow_request_sent: Boolean,
//   notifications: Boolean
// });

exports.tweetSchema = tweetSchema = new Schema({
  __user_id: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  __p: Number,
  __vote: Number,
  __text: String, // this is necessary because the text field is truncated when the tweet is a retweet.
  // i.e. full text resides in the retweeted_status nested object's text property
  __user: Schema.Types.Mixed,
  __created_at: String, //UTC time
  __retweeter: Schema.Types.Mixed,
  __id_str: String,
  __displayStatus: Boolean,
  __entities: Schema.Types.Mixed,

  //created_at: String, // UTC time
  id: Number,
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