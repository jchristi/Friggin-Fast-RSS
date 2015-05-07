var config = require('../config');
var orm = require('./orm');

/**
 * Entry
 */
var Entry = orm.Model.extend({

  tableName: config.DB_PREFIX + 'entries',

  // title text not null
  // guid varchar(255) not null
  // link text not null
  // updated datetime not null
  // content longtext not null // TODO: Make this a compressed field !
  // content_hash varchar(250) not null
  // cached_content longtext NULL default NULL
  // no_orig_date tinyint(1) not null default 0
  // date_entered datetime not null
  // date_updated datetime not null
  // num_comments int(11) not null default 0
  // plugin_data longtext NULL default NULL
  // lang varchar(2) NULL default NULL
  // comments varchar(250) not null default ''
  // author varchar(250) not null default ''

});

Entry.collection = orm.Collection.extend({ model: Entry });
module.exports = Entry;
