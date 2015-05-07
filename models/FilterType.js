var config = require('../config');
var orm = require('./orm');

/**
 * Filter Type
 */
var FilterType = orm.Model.extend({

  tableName: config.DB_PREFIX + 'filter_types'

  // name varchar(120) not null
  // description varchar(250) not null

});

module.exports = FilterType;
