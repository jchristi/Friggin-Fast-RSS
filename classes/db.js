var knex = require('knex');
var l = require('lodash');

/**
 * Database class
 *
 * @param object params
 *  type
 *  host
 *  port
 *  user
 *  pass
 *  database
 *  filename
 *
 * @return object An initialized database object
 */
exports.Db = function(params) {
  if (l.has(params, 'filename') && l.has(params, 'type')
      && params.type == 'sqlite3') {
    var conn = knex({
      client: params.type,
      connection: { filename: params.filename }
    });
  } else if (l.has(params, 'type') && l.has(params, 'host')
      && l.has(params, 'user') && l.has(params, 'password')
      && l.has(params, 'database')) {
    var db_type = params.type.toLowerCase();
    var supported_db_types = ['pg', 'mysql', 'sqlite3'];
    if (!l.include(supported_db_types, db_type)) {
      throw 'UnsupportedDatabaseType'; // TODO: more verbose error message
    }
    var conn = knex({
      client: params.type,
      connection: {
        host: params.host,
        user: params.user,
        port: params.port,
        password: params.password,
        database: params.database,
      }
    });
  } else {
    console.error('InvalidDatabaseParameters: ', params);
    throw 'InvalidDatabaseParameters'; // TODO: more verbose error message
  }

  return {
    type: params.type,
    host: params.host,
    user: params.user,
    port: params.port,
    knex: conn,
    last_error: null,

    quote: function(str) {
      return "'" + str + "'";
    },

    reconnect: function() {
      // knex has no implementation for this
    },

    close: function() {
      // knex has no implementation for this
    },

    escape_string: function(s, strip_tags) {
      //strip_tags = _get(strip_tags, true);
      // TODO
      return s;
    },

    query: function(query, callback) {
      /*return conn.raw(query).then(function(err, rows) {
        if (err) {
          this.last_error = err;
        }
        if (typeof callback === 'function') {
          callback(err, rows);
        }
        return rows;
      });*/
       return conn.raw(query);
    },

    fetch_assoc: function(result) {
      // TODO
    },

    num_rows: function(result) {
      return result.length;
    },

    fetch_result: function(result, row, param) {
      // TODO
    },

    affected_rows: function(result) {
      return result.length;
    },

    //last_error: function() {
    //  return this.;
    //}
  }
}
