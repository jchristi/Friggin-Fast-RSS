var config = require('../config');
var orm = require('./orm');

/**
 * Preference
 */
var Preference = orm.Model.extend({

  tableName: config.DB_PREFIX + 'prefs',

  /**
   * type_id int(11) not null
   */
  type: function() {
    return this.hasOne(require('./PreferenceType'), 'type_id');
  },
  // type_id

  /**
   * section_id int(11) not null default 1
   */
  section: function() {
    return this.hasOne(require('./PreferenceSection'), 'section_id');
  },
  // section_id

  // access_level int(11) not null default 0
  // def_value text not null

});

module.exports = Preference;
