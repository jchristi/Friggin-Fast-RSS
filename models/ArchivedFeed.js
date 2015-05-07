var config = require('../config');
var orm = require('./orm');

/**
 * Archived Feed
 */
var ArchivedFeed = orm.Model.extend({

  tableName: config.DB_PREFIX + 'archived_feeds',

  /**
   * owner_uid int(11) not null index
   */
  owner: function() {
    return this.hasOne(require('./User'), 'owner_uid');
  },

  // title varchar(200) not null
  // feed_url text not null
  // site_url varchar(250) not null

});

module.exports = ArchivedFeed;
