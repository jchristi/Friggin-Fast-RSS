var config = require('../config');
var orm = require('./orm');

/**
 * Plugin
 */
var Plugin = orm.Model.extend({

  tableName: config.DB_PREFIX + 'plugin_storage',

  /**
   * owner_uid int(11) not null index
   */
  owner: function() {
    return this.hasOne(require('./User'), 'owner_uid');
  },
  // owner_uid: function() { return this.owner.id; },

  // name varchar(100) not null
  // content longtext not null

});

module.exports = Plugin;
