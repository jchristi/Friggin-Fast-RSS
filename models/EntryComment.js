var config = require('../config');
var orm = require('./orm');

/**
 * EntryComment
 */
var EntryComment = orm.Model.extend({

  tableName: config.DB_PREFIX + 'entry_comments',

  /**
   * ref_id int(11) not null
   */
  entry: function() {
    return this.hasOne(require('./Entry'), 'ref_id');
  },
  // ref_id: function() { return this.entry.id; }

  /**
   * owner_uid int(11) not null index
   */
  owner: function() {
    return this.hasOne(require('./User'), 'owner_uid');
  },
  // owner_uid: function() { return this.owner.id; }

  // private tinyint(1) not null default 0
  // date_entered datetime not null

});

module.exports = EntryComment;
