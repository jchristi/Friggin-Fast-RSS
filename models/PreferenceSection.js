var config = require('../config');
var orm = require('./orm');

/**
 * PreferenceSection
 */
var PreferenceSection = orm.Model.extend({

  tableName: config.DB_PREFIX + 'prefs_sections',

  // order_id int(11) not null

});

module.exports = PreferenceSection;
