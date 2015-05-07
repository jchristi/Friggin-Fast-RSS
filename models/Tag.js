var config = require('../config');
var orm = require('./orm');

/**
 * Tag
 */
var Tag = orm.Model.extend({

  tableName: config.DB_PREFIX + 'tags',

  /**
   * owner_uid int(11) not null index
   */
  owner: function() {
    return this.hasOne(require('./User'), 'owner_uid');
  },
  // owner_uid: function() { return this.owner.id; },

  /**
   * post_int_id int(11) not null
   */
  entry: function() {
    return this.hasOne(require('./Entry'), 'post_int_id');
  }
  // post_int_id

  // tag_name varchar(250) not null

});

module.exports = Tag;
