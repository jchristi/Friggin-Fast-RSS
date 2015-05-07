var config = require('../config');
var orm = require('./orm');

/**
 * Session
 */
var Session = orm.Model.extend({

  tableName: config.DB_PREFIX + 'sessions',

  // data text NULL default NULL
  // expire int(11) not null

});

module.exports = Session;
