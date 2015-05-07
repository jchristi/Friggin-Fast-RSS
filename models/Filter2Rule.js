var config = require('../config');
var orm = require('./orm');

/**
 * Filter2Rule
 */
var Filter2Rule = orm.Model.extend({

  tableName: config.DB_PREFIX + 'filters2_rules',

  /**
   * filter_id int(11) not null
   */
  filter: function() {
    return this.hasOne(require('./Filter2'), 'filter_id'); // TODO: Filter or Filter2 ?
  },
  // filter_id: function() { return this.filter.id; },

  /**
   * filter_type int(11) not null
   */
  filter_type: function() {
    return this.hasOne(require('./FilterType'), 'filter_type'); // TODO: is this right?
  },

  /**
   * feed_id int(11) NULL default NULL
   */
  feed: function() {
    return this.hasOne(require('./Feed'), 'feed_id');
  },
  // feed_id

  /**
   * cat_id int(11) NULL default NULL
   */
  category: function() {
    return this.hasOne(require('./Category'), 'cat_id');
  }
  // cat_id

  // reg_exp varchar(250) not null
  // inverse tinyint(1) not null default 0
  // cat_filter tinyint(1) not null default 0

});

module.exports = Filter2Rule;
