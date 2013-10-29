var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Tweet = module.exports = new Schema({
  p: Number,
  vote: Number,

  created_at: String, // UTC time
  id: Number,
  id_str: String,
  text: String,
  source: String,
  truncated: Boolean,
  in_reply_to_status_id: Number,
  in_reply_to_status_id_str: String,
  in_reply_to_user_id: Number,
  in_reply_to_user_id_str: String,
  in_reply_to_screen_name: String,

  // These all come as properties of an object called user
  user: {
    id: Number,
    id_str: String,
    name: String,
    screen_name: String,
    location: String,
    description: String,
    url: String,
    entities: Schema.Types.Mixed,
    protected: Boolean,
    followers_count: Number,
    friends_count: Number,
    listed_count: Number,
    created_at: String, // UTC time
    favourites_count: Number,
    utc_offset: Number,
    time_zone: String,
    geo_enabled: Boolean,
    verified: Boolean,
    statuses_count: Number,
    lang: String,
    contributors_enabled: Boolean,
    is_translator: Boolean,
    profile_background_color: String,
    profile_background_image_url: String,
    profile_background_image_url_https: String,
    profile_background_tile: Boolean,
    profile_image_url: String,
    profile_image_url_https: String,
    profile_banner_url: String,
    profile_link_color: String,
    profile_sidebar_border_color: String,
    profile_sidebar_fill_color: String,
    profile_text_color: String,
    profile_use_background_image: Boolean,
    default_profile: Boolean,
    default_profile_image: Boolean,
    following: Boolean,
    follow_request_sent: Boolean,
    notifications: Boolean
  },

  //geo: null, // deprecated by Twitter
  coordinates: Schema.Types.Mixed, // or perhaps String because it is geoJSON
  place: Schema.Types.Mixed, // or perhaps String
  contributors: Schema.Types.Mixed, // or perhaps String

  // These all come as properties of an object called 'retweeted_status'
  retweeted_status: {
    created_at: String,
    id: Number,
    id_str: String,
    text: String,
    source: String,
    truncated: Boolean,
    in_reply_to_status_id: Number,
    in_reply_to_status_id_str: String,
    in_reply_to_user_id: Number,
    in_reply_to_user_id_str: String,
    in_reply_to_screen_name: String,
    user: Schema.Types.Mixed,
    //geo: null,
    coordinates: Schema.Types.Mixed, // or perhaps String
    place: Schema.Types.Mixed, // or perhaps String
    contributors: Schema.Types.Mixed, // or perhaps String
    retweet_count: Number,
    favorite_count: Number,
    entities: Schema.Types.Mixed,
    favorited: Boolean,
    retweeted: Boolean,
    possibly_sensitive: Boolean,
    lang: String
  },

  retweet_count: Number,
  favorite_count: Number,
  entities: {
    hashtags: Schema.Types.Mixed,
    symbols: Schema.Types.Mixed,
    urls: Schema.Types.Mixed,
    user_mentions: Schema.Types.Mixed
  },
  favorited: Boolean,
  retweeted: Boolean,
  possibly_sensitive: Boolean,
  lang: String

});