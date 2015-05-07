var config = require('../config');
var orm = require('./orm');

/**
 * Filter2Action
 */
var Filter2Action = orm.Model.extend({

  tableName: config.DB_PREFIX + 'filters2_actions',

  /**
   * filter_id int(11) not null
   */
  filter: function() {
    return this.hasOne(require('./Filter2'), 'filter_id');
  },
  // filter_id: function() { return this.filter.id; },

  /**
   * action_id int(11) not null default 1
   */
  action: function() {
    return this.hasOne(require('./FilterAction'), 'action_id');
  }
  // action_id: function() { return this.action.id; },

  // action_param varchar(250) not null default ''

});

module.exports = Filter2Action;
