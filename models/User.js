var config = require('../config');
var orm = require('./orm');

/**
 * User
 */
var User = orm.Model.extend({

  tableName: config.DB_PREFIX + 'users',

  // login varchar(120) not null
  // pwd_hash varchar(250) not null
  // last_login datetime NULL default NULL
  // access_level int(11) not null default 0
  // email varchar(250) not null default ''
  // full_name varchar(250) not null default ''
  // email_digest tinyint(1) not null default 0
  // last_digest_sent datetime NULL default NULL
  // salt varchar(250) not null default ''
  // created datetime NULL default NULL
  // twitter_oauth longtext NULL default NULL
  // otp_enabled tinyint(1) not null default 0
  // resetpass_token varchar(250) NULL default NULL

});

module.exports = User;
