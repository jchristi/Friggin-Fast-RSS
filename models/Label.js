var config = require('../config');
var orm = require('./orm');

/**
 * Label
 */
var Label = orm.Model.extend({

  tableName: config.DB_PREFIX + 'labels2',

  /**
   * owner_uid int(11) not null index
   */
  owner: function() {
    return this.hasOne(require('./User'), 'owner_uid');
  },
  // owner_uid: function() { return this.owner.id; },

  // caption varchar(250) not null
  // fg_color varchar(15) not null
  // bg_color varchar(15) not null

});

module.exports = Label;
