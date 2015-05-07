var config = require('../config');
var orm = require('./orm');

/**
 * Filter Action
 */
var FilterAction = orm.Model.extend({

  tableName: config.DB_PREFIX + 'filter_actions'

  // name varchar(120) not null
  // description varchar(250) not null

});

module.exports = FilterAction;
