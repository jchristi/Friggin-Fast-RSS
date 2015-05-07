var config = require('../config');
var orm = require('./orm');

/**
 * Feed Category
 */
var FeedCategory = orm.Model.extend({

  tableName: config.DB_PREFIX + 'feed_categories',

  /**
   * owner_uid int(11) not null index
   */
  owner: function() {
    return this.hasOne(require('./User'), 'owner_uid');
  },
  owner_uid: function() {
    // TODO: return actual value of owner_uid
    //return this.owner.id;
  },

  /**
   * parent_cat int(11) NULL default NULL
   */
  parent: function() {
    return this.hasOne(require('./FeedCategory'), 'parent_cat');
  }
  // parent_cat: function() { return this.parent.id; },

  // title varchar(200) not null
  // collapsed tinyint(1) not null default 0
  // order_id int(11) not null default 0
  // view_settings varchar(250) not null default ''

});

module.exports = FeedCategory;
