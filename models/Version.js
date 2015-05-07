var config = require('../config');
var orm = require('./orm');

/**
 * Version
 */
var Version = orm.Model.extend({

  tableName: config.DB_PREFIX + 'version',

  // schema_version int(11) not null

});

module.exports = Version;
