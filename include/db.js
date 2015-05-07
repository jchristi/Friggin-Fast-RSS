var config = require('../config');
var Db = require('../classes/db').Db;

var db = Db({
  type: config.DB_TYPE,
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASS
});

module.exports = {
  // database abstraction layer object (knex)
  dal: db.knex,

  escape_string: function(s, strip_tags) {
    strip_tags = (typeof strip_tags !== 'undefined') ? strip_tags : true;
    return db.escape_string(s, strip_tags);
  },

  query: function(query, die_on_error) {
    die_on_error = (typeof die_on_error !== 'undefined') ? die_on_error : true;
    return db.query(query); // TODO: die_on_error needs to be a callback
  },

  fetch_assoc: function(result) {
    return db.fetch_assoc(result);
  },

  num_rows: function(result) {
    return db.num_rows(result);
  },

  fetch_result: function(result, row, param) {
    return db.fetch_result(result, row, param);
  },

  affected_rows: function(result) {
    return db.affected_rows(result);
  },

  last_error: function() {
    return db.last_error();
  },

  quote: function(str) {
    return db.quote(str);
  }

};
