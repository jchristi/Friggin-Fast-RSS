var config = require('../config');
var orm = require('./orm');

/**
 * Profile
 */
var Profile = orm.Model.extend({

  tableName: config.DB_PREFIX + 'settings_profiles',

  /**
   * owner_uid int(11) not null index
   */
  owner: function() {
    return this.hasOne(require('./User'), 'owner_uid');
  },
  // owner_uid: function() { return this.owner.id; },

  // title int(11) not null

});

module.exports = Profile;
