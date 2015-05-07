var config = require('../config');
var orm = require('./orm');

/**
 * Access Key
 */
var AccessKey = orm.Model.extend({

  tableName: config.DB_PREFIX + 'access_keys',

  //idAttribute: 'id',

  /**
   * Invoked when the model is first created
   */
  initialize: function() {
    //this.on('saving', this.validateSave);
  },

  validateSave: function() {
    //return checkit(rules).run(this.attributes);
  },

  /**
   * feed_id varchar(250) not null
   */
  feed: function() {
    return this.hasOne(require('./Feed'), 'feed_id');
  },

  /**
   * owner_uid int(11) not null index
   */
  owner: function() {
    return this.hasOne(require('./User'), 'owner_uid');
  }

  //access_key varchar(250) not null
  //is_cat tinyint(1) no null default 0

});

module.exports = AccessKey;
