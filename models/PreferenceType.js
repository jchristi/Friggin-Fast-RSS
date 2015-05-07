var config = require('../config');
var orm = require('./orm');

/**
 * PreferenceType
 */
var PreferenceType = orm.Model.extend({

  tableName: config.DB_PREFIX + 'prefs_types',

  // type_name varchar(100) not null

});

module.exports = PreferenceType;
