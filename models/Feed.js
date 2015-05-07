var config = require('../config');
var db = require('../include/db');
var orm = require('./orm');

/**
 * Feed
 */
var Feed = orm.Model.extend({

  tableName: config.DB_PREFIX + 'feeds',

  objects: null, // default objects manager
  // https://docs.djangoproject.com/en/1.7/topics/db/managers/#django.db.models.Manager

  /**
   * Custom manager to get the top X most subscribed feeds
   *
   * @param int limit the number of feeds to return
   * @param array columns the columns to return
   * @return Promise a promise for the query
   */
  most_subscribed: function(limit, columns) {
    // TODO: Allow inside a transaction
    limit = (limit !== 'undefined') ? limit : 1000;
    if (typeof columns === 'undefined') {
      columns = ['feed_url', 'site_url', 'title', db.dal.raw('COUNT(id) as subscribers')];
    }
    return db.select(columns)
    .from(table_name)
    .whereRaw("(SELECT COUNT(id) = 0 FROM "+table_name+" AS tf \
              WHERE tf.feed_url = ttrss_feeds.feed_url \
              AND ( private IS true OR auth_login != '' OR auth_pass != '' \
              OR feed_url LIKE '%:%@%/%'))")
    .groupByRaw('feed_url, site_url, title')
    .orderBy('subscribers', 'desc')
    .limit(limit);
  },

  /**
   *
   */
  favicon_needs_check: function() {
    return false;
    //return this.favicon_last_checked === null || favicon_last_checked < "12 hours ago";
  },

  /**
   * owner_uid int(11) not null index
   */
  owner: function() {
    return this.hasOne(require('./User'), 'owner_uid');
  },
  // owner_uid: function() { return this.owner.id }

  /**
   * cat_id int(11) not null
   */
  category: function() {
    return this.hasOne(require('./Category'), 'cat_id');
  },

  /**
   * parent_feed int(11) NULL default NULL
   */
  parent: function() {
    return this.hasOne(require('./Feed'), 'parent_feed');
  }

});

Feed.collection = orm.Collection.extend({ model: Feed });
module.exports = Feed;
