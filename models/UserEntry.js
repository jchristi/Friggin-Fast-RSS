var config = require('../config');
var orm = require('./orm');

/**
 * UserEntry
 */
var UserEntry = orm.Model.extend({

  tableName: config.DB_PREFIX + 'user_entries',

  /**
   * owner_uid int(11) not null index
   */
  owner: function() {
    return this.hasOne(require('./User'), 'owner_uid');
  },
  // owner_uid: function() { return this.owner.id; },

  /**
   * ref_id int(11) not null
   */
  entry: function() {
    return this.hasOne(require('./Entry'), 'ref_id'); // TODO: is this what its referring to?
  },

  /**
   * feed_id int(11) NULL default NULL
   */
  feed: function() {
    return this.hasOne(require('./Feed'), 'feed_id');
  },

  /**
   * orig_feed_id int(11) NULL default NULL
   */
  orig_feed: function() {
    return this.hasOne(require('./Feed'), 'feed_id');
  }

  // uuid varchar(200) not null
  // marked tinyint(1) not null default 0
  // published tinyint(1) not null default 0
  // tag_cache text not null
  // label_cache text not null
  // last_read datetime NULL default NULL
  // score int(11) not null default 0
  // note longtext NULL default NULL
  // last_marked datetime NULL default NULL
  // last_published datetime NULL default NULL
  // unread tinyint(1) not null default 1

});

module.exports = UserEntry;
