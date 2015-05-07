var config = require('../config');
var orm = require('./orm');

/**
 * UserPreference
 */
var UserPreference = orm.Model.extend({

  idAttribute: null,

  tableName: config.DB_PREFIX + 'user_prefs',

  /**
   * owner_uid int(11) not null index
   */
  owner: function() {
    return this.hasOne(require('./User'), 'owner_uid');
  },
  // owner_uid: function() { return this.owner.id; },

  /**
   *  profile int(11) NULL default NULL
   */
  profile: function() {
    return this.hasOne(require('./Profile'), 'profile');
  }

  // pref_name varchar(250) NULL default NULL
  // value longtext not null

});

module.exports = UserPreference;
