var config = require('../config');
var orm = require('./orm');

/**
 * Filter2
 */
var Filter2 = orm.Model.extend({

  tableName: config.DB_PREFIX + 'filters2',

  /**
   * owner_uid int(11) not null index
   */
  owner: function() {
    return this.hasOne(require('./User'), 'owner_uid');
  },
  //owner_uid: function() { return this.owner.id; }

  // match_any_rule tinyint(1) not null default 0
  // enabled tinyint(1) not null default 1
  // inverse tinyint(1) not null default 0
  // title varchar(250) not null default ''
  // order_id int(11) not null default 0

});

module.exports = Filter2;
