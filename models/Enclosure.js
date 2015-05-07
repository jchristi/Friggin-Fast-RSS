var config = require('../config');
var orm = require('./orm');

/**
 * Enclosure
 */
var Enclosure = orm.Model.extend({

  tableName: config.DB_PREFIX + 'enclosures',

  /**
   * post_id int(11) not null
   */
  post: function() {
    return this.hasOne(require('./Feed'), 'post_id'); // TODO: what does post_id map to ???
  }
  // post_id: function() { return this.post.id; },

  // content_url text not null
  // content_type varchar(250) not null
  // title text not null
  // duration text not null
  // width int(11) not null default 0
  // height int(11) not null default 0

});

module.exports = Enclosure;
