var cheerio = require('cheerio');
var fs = require('fs');
var l = require('lodash');
var php = require('phpjs');
var argv = require('minimist')(process.argv.slice(2));
var request = require('request'); // used to make HTTP requests
var Promise = require('bluebird');

var config = require('../config');
var db = require('./db');
var models = require('../models');
var orm = models.orm;
var rssfuncs = require('./rssfuncs');

global.EXPECTED_CONFIG_VERSION = 26;
global.SCHEMA_VERSION = 127;
global.LABEL_BASE_INDEX = -1024;
global.PLUGIN_FEED_BASE_INDEX = -128;
global.COOKIE_LIFETIME_LONG = 86400 * 365;

var fetch_last_error = false;
var fetch_last_error_code = false;
var fetch_last_content_type = false;
var fetch_last_error_content = false; // curl only for the time being
var fetch_curl_used = false;
var suppress_debugging = false;

/**
 * Return the given value if it is defined or a default value
 *
 * @access private
 */
function _get(value, default_value) {
  return (typeof value !== 'undefined') ? value : default_value;
}

/**
 * Get CLI option(s) ??
 *
 * @access public
 */
exports.getopt = function() {
  l.map(process.argv.slice(2), function(i){ return i.replace('--',''); });
}

/**
 * Define a constant if not already defined
 *
 * @param string name
 * @param mixed value
 * @access public
 */
exports.define_default = function(name, value) {
  if (typeof global[name] === 'undefined')
    global[name] = value;
}

///// Some defaults that you can override in config.js //////

global.FEED_FETCH_TIMEOUT = 45; // define_default('FEED_FETCH_TIMEOUT', 45);
// How may seconds to wait for response when requesting feed from a site
global.FEED_FETCH_NO_CACHE_TIMEOUT = 15; //define_default('FEED_FETCH_NO_CACHE_TIMEOUT', 15);
// How may seconds to wait for response when requesting feed from a
// site when that feed wasn't cached before
global.FILE_FETCH_TIMEOUT = 45; //define_default('FILE_FETCH_TIMEOUT', 45);
// Default timeout when fetching files from remote sites
global.FILE_FETCH_CONNECT_TIMEOUT = 15; //define_default('FILE_FETCH_CONNECT_TIMEOUT', 15);
// How many seconds to wait for initial response from website when
// fetching files from remote sites

global.SUBSTRING_FOR_DATE = (config.DB_TYPE === 'pgsql') ? 'SUBSTRING_FOR_DATE' : 'SUBSTRING';


/**
 * Return available translations names.
 *
 * @access public
 * @return array A array of available translations.
 */
exports.get_translations = function() {
  var tr = {
    "auto"  : "Detect automatically",
    "ar_SA" : "العربيّة (Arabic)",
    "da_DA" : "Dansk",
    "ca_CA" : "Català",
    "cs_CZ" : "Česky",
    "en_US" : "English",
    "el_GR" : "Ελληνικά",
    "es_ES" : "Español (España)",
    "es_LA" : "Español",
    "de_DE" : "Deutsch",
    "fr_FR" : "Français",
    "hu_HU" : "Magyar (Hungarian)",
    "it_IT" : "Italiano",
    "ja_JP" : "日本語 (Japanese)",
    "lv_LV" : "Latviešu",
    "nb_NO" : "Norwegian bokmål",
    "nl_NL" : "Dutch",
    "pl_PL" : "Polski",
    "ru_RU" : "Русский",
    "pt_BR" : "Portuguese/Brazil",
    "pt_PT" : "Portuguese/Portugal",
    "zh_CN" : "Simplified Chinese",
    "zh_TW" : "Traditional Chinese",
    "sv_SE" : "Svenska",
    "fi_FI" : "Suomi",
    "tr_TR" : "Türkçe"
  };
  return tr;
}

//require('../lib/accept_to_gettext'); // TODO: create
//require('../lib/gettext/gettext.inc'); // TODO: create
//require('../lib/languagedetect/LanguageDetect'); // TODO: create

exports.startup_gettext = function() {
  // XXX: implement
  //
  // i18n stuff...not that important
}

var db = require('./db');
var db_prefs = require('./db_prefs');
var version = require('./version');
var ccache = require('./ccache'); // TODO: create
//require('./labels'); //TODO: create

global.SELF_USER_AGENT = 'Friggin Fast RSS/' + global.VERSION; // TODO: Allow user-agent spoofing
// set user agent: ini_set('user_agent', SELF_USER_AGENT);

//require('../lib/pubsubhubbub/publisher'); // TODO: create

var schema_version = false;

/**
 * Suppress debug output
 */
exports._debug_supress = function(suppress) {
  global.suppress_debugging = suppress;
}

/**
 * Print a timestamped debug message.
 *
 * @param string msg The debug message.
 * @return void
 */
exports._debug = function(msg, show) {
  show = _get(show, true);

  if (global.supress_debugging) return false;

  // XXX: implement
}

/**
 * Purge a feed old posts.
 *
 * @param mixed link A database connection.
 * @param mixed feed_id The id of the purged feed.
 * @param mixed purge_interval Olderness of purged posts.
 * @param boolean debug Set to True to enable the debug. False by default.
 * @access public
 * @return void
 */
exports.purge_feed = function(feed_id, purge_interval, debug) {
  debug = _get(debug, false);

  // TODO: !purge_interval?
  if (!purge_interval) purge_interval = feed_purge_interval(feed_id);

  var rows = -1;
  var result = db.query("SELECT owner_uid FROM ttrss_feeds WHERE id = '"+feed_id+"'");
  var owner_uid = false;

  if (db.num_rows(result) == 1) {
    owner_uid = db.fetch_result(result, 0, 'owner_uid');
  }

  if (purge_interval == -1 || !purge_interval) { // TODO: !purge_interval ...test that
    if (owner_uid) { // TODO: === true?
      ccache.update(feed_id, owner_uid); // TODO: implement ccache_update()
    }
    return;
  }

  if (!owner_uid) return; // TODO: !owner_uid?

  if (global.FORCE_ARTICLE_PURGE == 0) { // TODO: where does FORCE_ARTICLE_PURGE come from?
    var purge_unread = db_prefs.get_pref('PURGE_UNREAD_ARTICLES', owner_uid, false); // TODO get_pref() ?
  } else {
    var purge_unread = true;
    purge_interval = global.FORCE_ARTICLE_PURGE;
  }

  if (!purge_unread) query_limit = ' unread = false AND ';

  /* Refactor: use an ORM OMG !!! */
  if (config.DB_TYPE == 'pgsql') {
    var pg_version = get_pgsql_version();

    //if (php.preg_match("/^7\./", pg_version) ||
    //    php.preg_match("/^8\.0/", pg_version)) {
    if (/^7\./.test(pg_version) || /^8\.0/.test(pg_version)) { // TODO: does this work???
      var result = db.query("DELETE FROM ttrss_user_entries WHERE " +
                        "ttrss_entries.id = ref_id AND " +
                        "marked = false AND " +
                        "feed_id = '"+feed_id+"' AND " +
                        query_limit +
                        "ttrss_entries.date_updated < NOW() = INTERVAL '" +
                        purge_interval+" days'");
    } else {
      var result = db.query("DELETE FROM ttrss_user_entries " +
                        "USING ttrss_entries " +
                        "WHERE ttrss_entries.id = ref_id AND " +
                        "marked = false AND " +
                        "feed_id = '" + feed_id + "' AND " +
                        query_limit +
                        "ttrss_entries.date_updated < NOW() - INTERVAL '" +
                        purge_interval + " days'");
    }
  } else { // config.DB_TYPE == 'mysql'
    var result = db.query("DELETE FROM ttrss_user_entries " +
                      "USING ttrss_user_entries, ttrss_entries " +
                      "WHERE ttrss_entries.id = ref_id AND " +
                      "marked = false AND " +
                      "feed_id = '" + feed_id + "' AND " +
                      query_limit +
                      "ttrss_entries.date_updated < DATE_SUB(NOW(), INTERVAL " +
                      purge_interval + " DAY)");
  }

  var rows = db.affected_rows(result);

  ccache.update(feed_id, owner_uid); // TODO: implement

  if (debug) {
    _debug("Purged feed " + feed_id + " (" + purge_interval + "): deleted " +
           rows + "articles");
  }

  return rows;
}

/**
 * Returns the purge interval of the provided feed
 *
 * NOTE: function refactored to return fast.
 *
 * @param int feed_id The id of the feed
 * @return int The purge interval
 */
exports.feed_purge_interval = function(feed_id) {
  var result = db.query("SELECT purge_interval, owner_uid FROM ttrss_feeds " +
                    "WHERE id = '" + feed_id + "'");
  if (db.num_rows(result) != 1) {
    return -1;
  }

  var purge_interval = db.fetch_result(result, 0, 'purge_interval');
  var owner_uid = db.fetch_result(result, 0, 'owner_uid');

  if (purge_interval == 0) {
    purge_interval = db_prefs.get_pref('PURGE_OLD_DAYS', owner_uid); // TODO: get_pref() ?
  }

  return purge_interval;
}

/**
 * Purge orphaned posts in main content table
 *
 * @param bool do_output
 * @return void
 */
exports.purge_orphans = function(do_output) {
  do_output = _get(do_output, false);

  var result = db.query("DELETE FROM ttrss_entries WHERE \
    (SELECT COUNT(int_id) FROM ttrss_user_entries WHERE ref_id = id) = 0");

  if (do_output) {
    _debug("Purged " + db.affected_rows(result) + " orphaned posts.");
  }
}

/**
 * Returns the update interval of the provided feed
 *
 * NOTE: this function was refactored to return fast
 *
 * @param int feed_id The id of the feed
 * @return int The update interval of the provided feed
 */
exports.get_feed_update_interval = function(feed_id) {
  var result = db.query("SELECT owner_uid, update_interval FROM \
                        ttrss_feeds WHERE id = '" + feed_id + "'");

  if (db.num_rows(result) != 1) {
    return -1;
  }

  var update_interval = db.fetch_result(result, 0, 'update_interval');
  var owner_uid = db.fetch_result(result, 0, 'owner_uid');

  if (update_interval != 0) {
    return update_interval
  }

  return db_prefs.get_pref('DEFAULT_UPDATE_INTERVAL', owner_uid, false);
}

/**
 * Fetch file contents
 *
 * @param string url The URL to fetch content of
 * @param mixed type Type of URL ??? (default: false)
 * @param mixed login Login ??? (default: false)
 * @param mixed pass Password (default: false)
 * @param mixed post_query HTTP POST data (default: false)
 * @param mixed timeout Timeout in seconds (default: false)
 * @param mixed timestamp Timestamp (default: false)
 * @param mixed useragent User agent string (default: false)
 * @return string The content of the given URL
 */
exports.fetch_file_contents = function(url, type, login, pass, post_query, timeout, timestamp, useragent) {
  type = _get(type, false);
  login = _get(login, false);
  pass = _get(pass, false);
  post_query = _get(post_query, false);
  timestamp = _get(timestamp, 0);
  useragent = _get(useragent, false);

  url = php.ltrim(url, ' ');
  url = php.str_replace(' ', '%20', url);

  if (php.strpos(url, '//') === 0) {
    url = 'http:' + url;
  }

  // skip curl code
  if (false) {
    global.fetch_curl_used = true;
    return null;
  }

  global.fetch_curl_used = false;

  if (login && pass) {
    // TODO:
  }

  var context = null;
  if (!post_query && timestamp) {
    context = null; // TODO: what is this??
  }

  // old_error = error_get_last(); // TODO: equivalent in node??

  var data = request({
    method: 'GET', // or POST
    url: url,
    maxRedirects: 20,
    //gzip: true, // TODO: consider using this
    timeout: timeout || global.FILE_FETCH_TIMEOUT,
    headers: {
      'User-Agent': useragent || global.SELF_USER_AGENT,
    },
  }).on('error', function(error) {
    /*if (error.msg != old_error.msg)  {
      fetch_last_error = error.msg;
    } else {
      fetch_last_error = "HTTP Code: " + fetch_last_error_code;
    }*/
  });

  return data; // NOTE: this is not the file content, it's the request object!
}

/**
 * Try to determine the favicon URL for a feed.
 * adapted from wordpress favicon plugin by Jeff Minard (http://thecodepro.com/)
 * http://dev.wp-plugins.org/file/favatars/trunk/favatars.php
 *
 * @param string $url A feed or page URL
 * @access public
 * @return mixed The favicon URL, or false if none was found.
 */
exports.get_favicon_url = function(url) {
  // TODO: implement me

  return null;
}

/**
 * Check feed favicon...
 *
 * @param string site_url The url of the site
 * @param string feed The name of the feed
 * @return icon_file The location of the icon file (may not exist at time of return)
 */
exports.check_feed_favicon = function(site_url, feed) {
  // TODO: ICONS_DIR could be a relative value...
  var icon_file = config.ICONS_DIR + '/' + feed + '.ico';
  fs.exists(icon_file, function(exists) {
    if (!exists) {
      var favicon_url = get_favicon_url(site_url); // TODO: implement me
      if (favicon_url) {
        var contents = request.get(favicon_url)
          .pipe(fs.createWriteStream(icon_file)
            .on('finish', function(){
              // if (file_is_not_image_type) fs.delete(icon_file); // TODO
              fs.chmod(icon_file, '0644');
            })
        );
      }
    }
  })
  return icon_file;
}

/**
 * Print select options
 *
 * TODO: This will most likely get refactored.
 * Server-side html output...sigh. Use Dojo widgets (Dijits) instead!
 *
 */
exports.print_select = function(id, default1, values, attributes) {
  attributes = _get(attributes, "");

  var select = '<select name="' + id + '" id="' + id + '" ' + attributes + '>';
  for (var v in values) {
    var sel = '';
    if (v == default1) var sel = 'selected="1"';
    v = php.trim(v);
    select += '<option value="' + v + '" ' + sel + '>' + v + '</option>';
  }
  select += '</select>';

  return select; // NOTE: TTRSS prints and returns null
}

/**
 * Print select options
 *
 * TODO: This will most likely be refactored
 */
exports.print_select_hash = function(id, default1, values, attributes) {
  attributes = _get(attributes, "");

  var select = '<select name="' + id + '" id="' + id + '" ' + attributes + '>';
  l.forOwn(values, function(i, key) {
    var sel = '';
    if (v == default1) sel = 'selected="selected"';
    v = php.trim(v);
    select += '<option ' + sel + ' value="' + v + '>' + values[key] + '" </option>"';
  });
  select += '</select>';

  return select; // NOTE: TTRSS prints and returns null
}

/**
 *
 *
 */
exports.print_radio = function(id, default1, true_is, values, attributes) {
  attributes = _get(attributes, "");

  // TODO
}

/**
 *
 */
exports.initialize_user_prefs = function(uid, profile) {
  profile = _get(profile, false);

  // TODO
}

/**
 *
 */
exports.get_ssl_certificate_id = function() {
  // TODO
}

/**
 *
 */
exports.authenticate_user = function(login, password, check_only) {
  check_only = _get(check_only, false);

  // TODO
}

/**
 * oh...my...
 */
exports.make_password = function(length) {
  length = _get(length, 8);

  // TODO
}

/**
 * This should be more event-based, for objects to respond to
 */
exports.initialize_user = function(uid) {
  db.query("INSERT INTO ttrss_feeds (owner_uid, title, feed_url) \
           VALUES ('" + uid + "', 'Tiny Tiny RSS: Forum', \
           'http://tt-rss.org/forum/rss.php')");
}

/**
 *
 */
exports.logout_user = function() {
  // TODO
}

/**
 *
 */
exports.validate_csrf = function(csrf_token) {
  // TODO
}

/**
 *
 */
exports.load_user_plugins = function(owner_uid) {
  // TODO
}

/**
 *
 */
exports.login_sequence = function() {
  // TODO
}

/**
 * No idea what this is for
 */
exports.truncate_string = function(str, max_len, suffix) {
  suffix = _get(suffix, '&hellip;');

  // TODO
  //if (str.length > max_len) {
  //  return substr(str, 0, max_len) + suffix;

  return str;
}

/**
 *
 */
exports.convert_timestamp = function(timestamp, source_tz, dest_tz) {
  // TODO
}

/**
 *
 */
exports.make_local_datetime = function(timestamp, long1, owner_uid, no_smart_dt) {
  owner_uid = _get(owner_uid, false);
  no_smart_dt = _get(no_smart_dt, false);

  // TODO
}

/**
 *
 */
exports.smart_date_time = function(timestamp, tz_offset, owner_uid) {
  tz_offset = _get(tz_offset, 0);
  owner_uid = _get(owner_uid, false);

  // TODO: nodejs Sessions ??
  //session = null;
  //if (!owner_uid) owner_uid = $_SESSION['uid'];

  if (php.date('Y.m.d', timestamp) == php.date('Y.m.d', php.time() + tz_offset)) {
    return php.date('G:i', timestamp);
  } else if (php.date('Y', timestamp) == php.date('Y', time() + tz_offset)) {
    var format = db_prefs.get_pref('SHORT_DATE_FORMAT', owner_uid);
    return php.date(format, timestamp);
  } else {
    var format = db_prefs.get_pref('LONG_DATE_FORMAT', owner_uid);
    return php.date(format, timestamp);
  }
}

/**
 *
 */
exports.sql_bool_to_bool = function(s) {
  return (s === 't' || s === '1' || (s + '').toLowerCase() === 'true');
}

/**
 *
 */
exports.bool_to_sql_bool = function(s) {
  return s ? 'true' : 'false';
}

/**
 * Returns the current database schema version from
 * the database (which could differ from what version
 * the codebase is trying to run off of).
 *
 * NOTE: Session caching removed due to causing wrong redirects
 * to upgrade script when get_schema_version() is called on an
 * obsolete session created on a previous schema version.
 *
 * @param boolean nocache if cache should be used
 * @return Promise/int version of the database schema
 */
var get_schema_version = function(nocache) {
  nocache = _get(nocache, false);

  if (global.SCHEMA_VERSION && nocache) {
    // even though this is synchronous, return a Promise
    // so the function has a consistent return type
    return new Promise(function(resolve, reject) {
      resolve(global.SCHEMA_VERSION);
    });
  }

  return models.Version.fetchAll({require: true})
  .then(function(result) {
    var version = result.at(0).get('schema_version');
    global.SCHEMA_VERSION = version;
    return version;
  });
}
exports.get_schema_version = get_schema_version;

/**
 *
 */
exports.sanity_check = function() {
  var errors = require('./errors');
  var error_code = 0;
  var schema_version = get_schema_version(true);

  if (schema_version != global.SCHEMA_VERSION) {
    error_code = 5;
  }

  if (config.DB_TYPE == 'mysql') {
    var result = db.query("SELECT true", false);
    if (db.num_rows(result) != 1) {
      error_code = 10;
    }
  }

  if (db.escape_string('testTEST') != 'testTEST') {
    error_code = 12;
  }

  return { 'code': error_code, 'message': global.ERRORS[error_code] };
}

exports.file_is_locked = function(filename) {}

/**
 * Requires a lot of async magic TODO
 *
 */
exports.make_lockfile = function(filename) {
  //var fp = fs.open(LOCK_DIRECTORY + "/" + filename, 'w', '0666', function(err, fd) {

  //});
  /*
  var fp = fs.openSync(LOCK_DIRECTORY + "/" + filename, 'w', '0666');
  if (fp && flock(fp, LOCK_EX | LOCK_NB)) {
    stat_h = fstat(fp);
    stat_f = stat(LOCK_DIRECTORY . "/$filename");
    if (php.strtoupper(php.substr(PHP_OS, 0, 3)) !== 'WIN') {
      if (stat_h["ino"] != stat_f["ino"] ||
        stat_h["dev"] != stat_f["dev"]) {
        return false;
      }
    }
    if (function_exists('posix_getpid')) {
      fwrite(fp, posix_getpid() . "\n");
    }
    return fp;
  }
  return false;*/
}

/**
 *
 */
exports.make_stampfile = function(filename) {
  // TODO
}

/**
 * NOTE: This shit should be done inside an ORM !!!
 */
exports.sql_random_function = function() {
  if (config.DB_TYPE == 'mysql') {
    return 'RAND()';
  }
  return 'RANDOM()';
}

/**
 *
 */
exports.catchup_feed = function(feed, cat_view, owner_uid, max_id, mode) {
  // TODO
}

/**
 *
 */
exports.getAllCounters = function() {
  // TODO
}

/**
 *
 */
exports.getCategoryTitle = function(cat_id) {
  // TODO
}

/**
 *
 */
exports.getCategoryCounters = function() {i
  // TODO
}

/**
 * only accepts real cats (>= 0)
 */
exports.getCategoryChildrenUnread = function(cat, owner_uid) {
  // TODO
}

/**
 *
 */
exports.getCategoryUnread = function(cat, owner_uid) {
  // TODO
}

/**
 *
 */
exports.getFeedUnread = function(feed, is_cat) {
  var session_uid = null; // TODO: node equivalent of $_SESSION['uid'] ???
  return getFeedArticles(feed, is_cat, true, session_uid);
}

/**
 *
 */
exports.getFeedArticles = function(feed, is_cat, unread_only, owner_uid) {
  // TODO
}

/**
 *
 */
exports.getGlobalUnread = function(user_id) {
  // TODO
}

/**
 *
 */
exports.getGlobalCounters = function(global_unread) {
  // TODO
}

/**
 *
 */
exports.getVirtCounters = function() {
  // TODO
}

/**
 *
 */
exports.getLabelCounters = function(descriptions) {
  // TODO
}

/**
 *
 */
exports.getFeedCounters = function(active_feed) {
  // TODO
}

/**
 * Returns the version of PostgreSQL
 */
exports.get_pgsql_version = function() {
  var result = db.query("SELECT version() AS version");
  var version = php.explode(' ', db.fetch_result(result, 0, 'version'));
  return version[1];
}


var read_stream = function(rs) {
  // error if rs is not a readable stream
  var content = '';
  rs.on('data', function(data) {
    content += data;
  }).on('end', function() {
    return content;
  });
}
read_stream = Promise.method(read_stream);

/**
 * Subscribe to a feed.
 *
 * 0 - OK, Feed already exists
 * 1 - OK, Feed added
 * 2 - Invalid URL
 * 3 - URL content is HTML, no feeds available
 * 4 - URL content is HTML which contains multiple feeds.
 * Here you should call extractfeedurls in rpc-backend
 * to get all possible feeds.
 * 5 - Couldn't download the URL content.
 * 6 - Content is an invalid XML.
 *
 * @param string url
 * @param int user_id
 * @param int cat_id
 * @param string auth_login
 * @param string auth_pass
 * @return Promise/object { code: Status code, message: error message if available }
 */
var subscribe_to_feed = function(url, user_id, cat_id, auth_login, auth_pass) {
  cat_id = _get(cat_id, null);
  auth_login = _get(auth_login, '');
  auth_pass = _get(auth_pass, '');

  cat_id = (cat_id === '0' || cat_id === 0 || !cat_id) ? null : cat_id;
  var url = fix_url(url);

  if (!url || !validate_feed_url(url))
    return { code: 2, message: 'Feed URL is invalid' };

  var fetch_p = rssfuncs.fetch_feed(url); //, false, auth_login, auth_pass);
  var p = fetch_p.then(function(rs) {
    var contents = '';
    rs.on('data', function(data) {
      contents += data;
      //while (contents.length < 200) {
      //contents += rs.read(20);
      //}
      // we only need the first bit of data, so fire the 'end' event
      //contents = contents.substr(0, 20);
      //console.log('contents:', contents.length);
      //console.log('data:', data + '');
      //rs.pause();
      //rs.close();
      //rs.end();
      //rs.destroy();
      //rs.close();
    });
    return new Promise(function(resolve, reject) {
      rs.on('end', function() {
        if (!contents || contents === '') {
          return resolve({
            code: 5,
            message: /*global.FETCH_LAST_ERROR*/ 'Error fetching feed'
          });
        }

        //l.forEach(PluginHost.get_hooks(PluginHost.HOOK_SUBSCRIBE_FEED), function(plugin) {
          // contents = plugin.hook_subscribe_feed(contents, url, auth_login, auth_pass);
        //});

        if (is_html(contents)) {
          var feedUrls = get_feeds_from_html(url, contents);
          if (feedUrls.length === 0) {
            return resolve({ code: 3 });
          } else if (feedUrls.length > 1) {
            return resolve({ code: 4, feeds: feedUrls });
          }
          // use feed url as new URL
          url = php.key(feedUrls);
        }

        // todo: encrypt auth_pass and shit
        var auth_pass_encrypted = 0;

        var feed = new models.Feed({
          owner_uid: user_id,
          feed_url: url
        });
        feed.fetch()
        .then(function(model) {
          if (model !== null) {
            // TODO: change these to debug statements
            //console.log('model already exists, skipping...');
            return resolve({ code: 0 });
          }
          feed.set({
            title: '[Unknown]',
            cat_id: cat_id,
            auth_login: auth_login,
            auth_pass: auth_pass,
            update_method: 0,
            auth_pass_encrypted: auth_pass_encrypted
          });
          feed.save();
          feed.on('saving', function(model) {
            if (model === null)
              return resolve({ code: 9, message: 'Error saving feed' });
            //update_rss_feed(model.id);
            return resolve({ code: 1 });
          });
          //feed.on('error', function(e) { resolve({ code: 1}) });
        });

      });
    });
  });
  return p;
}
subscribe_to_feed = Promise.method(subscribe_to_feed);
exports.subscribe_to_feed = subscribe_to_feed;

/**
 *
 */
exports.print_feed_select = function(id, default_id, attributes,
                                     include_all_feeds, root_id, nest_level) {
  // TODO
}

/**
 *
 */
exports.print_feed_cat_select = function(id, default_id, attributes,
                                         include_all_feeds, root_id, nest_level) {
  // TODO
}

/**
 * Returns a checkbox value converted to a SQL boolean string
 */
exports.checkbox_to_sql_bool = function(val) {
  return (val == 'on') ? 'true' : 'false'; // NOTE: TTRSS returns strings, not booleans
}


/**
 * Returns the name of the feed category
 *
 * TODO: i18n
 *
 * LOL @ mixed casing for function names
 *
 */
exports.getFeedCatTitle = function(id) {
  if (id == -1) {
    return 'Special';
  } else if (id < global.LABEL_BASE_INDEX) {
    return 'Labels';
  } else if (id > 0) {
    var result = db.query("SELECT ttrss_feed_categories.title \
                          FROM ttrss_feeds, ttrss_feed_categories \
                          WHERE ttrss_feeds.id = '" + id + "' \
                          AND cat_id = ttrss_feed_categories.id");
    if (db.num_rows(result) == 1) {
      return db.fetch_result(result, 0, 'title');
    } else {
      return 'Uncategorized';
    }
  }
}

/**
 *
 *
 */
exports.getFeedIcon = function(id) {
  switch (id) {
  case 0:
    return 'images/archive.png';
    break;
  case -1:
    return 'images/star.png';
    break;
  case -2:
    return 'images/feed.png';
    break;
  case -3:
    return 'images/fresh.png';
    break;
  case -4:
    return 'images/folder.png';
    break;
  case -6:
    return 'images/time.png';
    break;
  default:
    if (id < global.LABEL_BASE_INDEX) {
      return 'images/label.png';
    // TODO: make this asynchronous
    } else if (fs.existsSync(config.ICONS_DIR + '/' + id + '.ico')) {
      return ICONS_URL + '/' + id + '.ico';
    }
    break;
  }

  return false;
}

/**
 * Returns the title of a feed given the id
 *
 * TODO: add i18n to this func
 */
exports.getFeedTitle = function(id, cat) {
  cat = _get(cat, false);

  if (cat) {
    return getCategoryTitle(id);
  } else if (id == -1) {
    return "Starred articles";
  } else if (id == -2) {
    return "Published articles";
  } else if (id == -3) {
    return 'Fresh articles';
  } else if (id == -4) {
    return 'All articles';
  } else if (id === 0 || id === '0') {
    return 'Archived articles';
  } else if (id == -6) {
    return 'Recently read';
  } else if (id < global.LABEL_BASE_INDEX) {
    var label_id = feed_to_label_id(id);
    var result = db.query("SELECT caption FROM ttrss_labels2 WHERE id = '"
                          + label_id + "'");
    if (db.num_rows(result) == 1) {
      return db.fetch_result(result, 0, 'caption');
    } else {
      return 'Unknown label (' + label_id + ')';
    }
  } else if (php.is_numeric(id) && id > 0) {
    var result = db.query("SELECT title FROM ttrss_feeds WHERE id = '"
                          + id + '"');
    if (db.num_rows(result) == 1) {
      return db.fetch_result(result, 0, 'title');
    } else {
      return 'Unknown feed (' + id + ')';
    }
  }
}

// === START OF FUNCTIONS2 !!! ================================

/**
 *
 */
exports.make_init_params = function() {
  // TODO

}

/**
 *
 */
exports.get_hotkeys_info = function() {
  // TODO

}

/**
 *
 */
exports.get_hotkeys_map = function() {
  // TODO

}

/**
 *
 */
exports.make_runtime_info = function() {
  // TODO

}

/**
 *
 */
exports.search_to_sql = function() {
  // TODO

}

/**
 *
 */
exports.getParentCategories = function(cat, owner_uid) {
  // TODO

}

/**
 *
 */
exports.getChildCategories = function(cat, owner_uid) {
  // TODO

}

/**
 *
 */
exports.queryFeedHeadlines = function(feed, limit, view_mode, cat_view,
                                      search, search_mode, override_order,
                                      offset, owner_uid, filter, since_id,
                                      include_children, ignore_vfeed_group,
                                      override_strategy, override_vfeeds,
                                      start_ts) {
  override_order = _get(override_order, false);
  offset = _get(offset, 0);
  owner_uid = _get(owner_uid, 0);
  filter = _get(filter, false);
  since_id = _get(offset, 0);
  include_children = _get(include_children, false);
  ignore_vfeed_group = _get(ignore_vfeed_group, false);
  override_strategy = _get(override_strategy, false);
  override_vfeeds = _get(override_vfeeds, false);
  start_ts = _get(start_ts, false);

  // TODO

}

/**
 *
 */
exports.iframe_whitelisted = function(entry) {
  // TODO

}

/**
 *
 */
exports.sanitize = function(str, force_remove_images, site_url, highlight_words,
                            article_id) {
  force_remove_images = _get(force_remove_images, false);
  site_url = _get(site_url, false);
  highlight_words = _get(highlight_words, false);
  article_id = _get(article_id, false);

  // TODO
}


/**
 *
 */
exports.strip_harmful_tags = function(doc, allowed_elements,
                                      disallowed_attributes) {
  // TODO
  return null;
}

/**
 *
 */
exports.check_for_update = function() {
  // TODO

}

/**
 *
 */
exports.catchupArticlesById = function(ids, cmode, owner_uid) {
  // TODO

}

/**
 *
 */
exports.get_article_tags = function(id, owner_uid, tag_cache) {
  // TODO

}

/**
 *
 */
exports.trim_array = function(array) {
  // TODO

}

/**
 *
 */
exports.tag_is_valid = function(tag) {
  // TODO

}

/**
 *
 */
exports.render_login_form = function() {
  // TODO

}

/**
 *
 */
exports.format_warning = function(msg, id) {
  // TODO

}

/**
 *
 */
exports.format_notice = function(msg, id) {
  // TODO

}

/**
 *
 */
exports.format_error = function(msg, id) {
  // TODO

}

/**
 *
 */
exports.print_notice = function(msg) {
  // TODO

}

/**
 *
 */
exports.print_warning = function(msg) {
  // TODO

}

/**
 *
 */
exports.print_error = function(msg) {
  // TODO

}

/**
 *
 */
exports.T_sprintf = function() {
  // TODO

}

/**
 *
 */
exports.format_inline_player = function(url, ctype) {
  // TODO
}

/**
 *
 */
exports.format_article = function(id, mark_as_read, zoom_mode, owner_uid) {
  // TODO
}

/**
 * Looks like a func used for debugging
 */
exports.print_checkpoint = function(n, s) {
  var ts = php.microtime(true);
  // print php.sprintf("<!-- CP[" + n + "] %.4f seconds -->\n", ts - s);
  return ts;
}

/**
 * Formats a tag name
 *
 * @param string tag The name of the tag
 * @return string The formatted tag name
 */
exports.sanitize_tag = function(tag) {
  tag = php.trim(tag);
  tag = php.strtolower(tag);
  // tag = preg_replace('/[\'\"\+\>\<]/', "", $tag); // TODO: implement
  tag = php.str_replace('technorati tag: ', '', tag); // TODO: should be done by extensions
  return tag;
}

/**
 * Returns the server URL with the trailing slash removed
 *
 * TODO: Where is SELF_URL_PATH created ??
 *
 */
exports.get_self_url_prefix = function() {
  global.SELF_URL_PATH = 'http://localhost/';
  if (php.strrpos(global.SELF_URL_PATH, '/') ===
      php.strlen(global.SELF_URL_PATH)-1) {
    return php.substr(global.SELF_URL_PATH, 0, php.strlen(global.SELF_URL_PATH)-1);
  }
  return global.SELF_URL_PATH;
}

/**
 * Computer the Mozilla Firefox feed adding URL from server
 * HOST and REQUEST_URI
 *
 * @return string The Mozilla Firefox feed adding URL
 */
exports.add_feed_url = function() {
  return get_self_url_prefix() + '/public?op=subscribe&feed_url=%s';
}

/**
 *
 */
exports.encrypt_password = function(pass, salt, mode2) {
  // TODO
}

/**
 *
 */
exports.load_filters = function(feed_id, owner_uid, action_id) {
  // TODO
}

/**
 * TODO: Use image sprites ya noob!
 */
exports.get_score_pic = function(score) {
  if (score > 100) return 'score_high.png';
  else if (score > 0) return 'score_half_high.png';
  else if (score < -100) return 'score_low.png';
  else if (score < 0) return 'score_half_low.png';
  else return 'score_neutral.png';
}

/**
 * TODO
 */
exports.feed_has_icon = function(id) {
  // return is_file(ICONS_DIR . "/$id.ico") && filesize(ICONS_DIR . "/$id.ico") > 0;
  return false;
}

/**
 * TODO: Implement PluginHost class
 */
exports.init_plugins = function() {
  // PluginHost().load(config.PLUGINS, PluginHost.KIND_ALL);
  return true;
}

/**
 *
 */
exports.format_tags_string = function(tags, id) {
  // TODO
}

/**
 *
 */
exports.format_article_note = function(id, note, allow_edit) {
  // TODO
}

/**
 *
 */
exports.get_feed_category = function(feed_cat, parent_cat_id) {
  // TODO
}

/**
 *
 */
exports.add_feed_category = function(feed_cat, parent_cat_id) {
  // TODO
}

/**
 *
 */
exports.getArticleFeed = function(id) {
  // TODO
}

/**
 * Fixes incomplete URLs by prepending "http://".
 * Also replaces feed:// with http://, and
 * prepends a trailing slash if the url is a domain name only.
 *
 * @param string $url Possibly incomplete URL
 * @return string Fixed URL.
 */
var fix_url = function(url) {
  if (typeof url === 'undefined') return '';

  if (php.strpos(url, '://') === false) {
    url = 'http://' + url;
  } else if (php.substr(url, 0, 5) == 'feed:') {
    url = 'http://' + php.substr(url, 5);
  }

  // append trailing slash to the URL
  if (php.strpos(url, '/', php.strpos(url, ':') + 3) === false) {
    url += '/';
  }

  if (url === 'http:///')
    return '';

  return url;
}
exports.fix_url = fix_url;

/**
 * Validate a feed URL
 *
 * @param string url the url of the feed to validate
 * @return boolean if the url is valid
 */
var validate_feed_url = function(url) {
  var parts = php.parse_url(url);
  return (parts.scheme === 'http' || parts.scheme === 'feed' || parts.scheme === 'https');
}
exports.validate_feed_url = validate_feed_url;

/**
 *
 */
exports.get_article_enclosures = function(id) {
  // TODO
}

/**
 *
 */
exports.get_feed_access_key = function(feed_id, is_cat, owner_uid) {
  // TODO
}

/**
 * Find feeds within a remote HTML document
 *
 * @param string url
 * @return Promise/object
 */
var get_feeds_from_url = function(url) {
  url = fix_url(url);
  var base_url = php.substr(url, 0, php.strrpos(url, '/') + 1);
  return new Promise(function(resolve, reject) {
    if (!validate_feed_url(url))
      return reject(new Error('Invalid URL: ' + url));
    request(url, function(err, res, html) {
      if (err)
        return reject(err);
      resolve(get_feeds_from_html(html, base_url));
    });
  });
}
exports.get_feeds_from_url = get_feeds_from_url;

/**
 * Find feeds within an HTML document
 *
 * @param string html
 * @param string base_url
 * @return object contains a dictionary of the feedUrl: title
 */
var get_feeds_from_html = function(html, base_url) {
  var feed_urls = {};
  var $ = cheerio.load(html);
  $('head').find('link').each(function(i, el) {
    try {
      var rel = el.attribs.rel;
      var type = el.attribs.type;
      var title = el.attribs.title;
      var alt = rel === 'alternate' && (type.indexOf('rss') > -1 ||
          type.indexOf('atom') > -1);
      if (alt || rel === 'feed') {
        var feed_url = el.attribs.href;
        if (base_url)
          feed_url = rewrite_relative_url(base_url, feed_url);
        feed_urls[feed_url] = title === '' ? type : title;
      }
    } catch(e) {}
  });
  return feed_urls;
}
exports.get_feeds_from_html = get_feeds_from_html;

/**
 * Tests if the given string is an html document
 *
 * @param string content the string to check
 * @return boolean if the string is html
 */
var is_html = function(content) {
  return /<html|DOCTYPE html/i.test(php.substr(content));
}
exports.is_html = is_html;

/**
 *
 */
exports.url_is_html = function(url, login, pass) {
  // TODO
}

/**
 *
 */
exports.print_label_select = function(name, value, attributes) {
  // TODO
}

/**
 *
 */
exports.format_article_enclosures = function(id, always_display_enclosures,
                                  article_content, hide_images) {
  // TODO
}

/**
 *
 */
exports.getLastArticleId = function() {
  // TODO
}

/**
 * Returns a URL given a URL Parts object
 *
 * @param object parts contains scheme, host, and path properties
 @ @return string the built URL
 */
var build_url = function(parts) {
  return parts.scheme + '://' + parts.host + parts.path;
}
exports.build_url = build_url;

/**
 * Converts a URL to an absolute URL
 *
 * @param string url Base URL (i.e. from where the document is)
 * @param string rel_url Possibly relative URL in the document
 * @return string an absolute URL
 */
var rewrite_relative_url = function(url, rel_url) {
  if (php.strpos(rel_url, ':') !== false) {
    return rel_url;
  } else if (php.strpos(rel_url, '://') !== false) {
    return rel_url;
  } else if (php.strpos(rel_url, '//') === 0) {
    // protocol-relative URL (rare but they exist)
    return rel_url;
  } else if (php.strpos(rel_url, '/') === 0) {
    var parts = php.parse_url(url);
    parts.path = rel_url;
    return build_url(parts);
  }

  parts = php.parse_url(url);
  if (!parts.hasOwnProperty('path')) {
    parts.path = '/';
  }
  var dir = parts.path;
  if (php.substr(dir, -1) !== '/') {
    dir = php.dirname(parts.path);
    if (dir !== '/')
      dir += '/';
  }
  parts.path = dir + rel_url;

  return build_url(parts);
}
exports.rewrite_relative_url = rewrite_relative_url;

/**
 *
 */
exports.cleanup_tags = function(days, limit) {
  days = _get(days, 14);
  limit = _get(limit, 1000);

  var interval_query = '';
  if (config.DB_TYPE === "pgsql") {
    interval_query = "date_updated < NOW() - INTERVAL '" + days + " days'";
  } else if (config.DB_TYPE === "mysql") {
    interval_query = "date_updated < DATE_SUB(NOW(), INTERVAL " + days + " DAY)";
  }

  var tags_deleted = 0;

  while (limit > 0) {
    var limit_part = 500;

    var query = "SELECT ttrss_tags.id AS id \
      FROM ttrss_tags, ttrss_user_entries, ttrss_entries \
      WHERE post_int_id = int_id AND " + interval_query +
      "AND ref_id = ttrss_entries.id AND tag_cache != '' LIMIT " + limit_part;

    var result = db.query(query);

    var ids = [];
    var line = null;
    while (line = db.fetch_assoc(result)) {
      ids.push(line.id);
    }

    if (ids.length > 0) {
      ids = php.join(",", ids);
      var tmp_result = db.query("DELETE FROM ttrss_tags WHERE id IN (" + ids + ")");
      tags_deleted += db.affected_rows(tmp_result);
    } else {
      break;
    }

    limit -= limit_part;
  }

  return tags_deleted;
}

/**
 *
 */
exports.print_user_stylesheet = function() {
  // TODO
}

/**
 *
 */
exports.filter_to_sql = function(filter, owner_uid) {
  // TODO
}

//if (!function_exists('gzdecode')) {
//  function gzdecode($string) { // no support for 2nd argument
//    return file_get_contents('compress.zlib://data:who/cares;base64,'.
//      base64_encode($string));
//  }
//}

/**
 *
 */
exports.get_random_bytes = function(length) {
  // TODO
}

/**
 *
 */
exports.read_stdin = function() {
  // TODO
}

/**
 *
 */
exports.tmpdirname = function(path, prefix) {
  // TODO
}

/**
 *
 */
exports.getFeedCategory = function(feed) {}

/**
 *
 */
exports.implements_interface = function(cls, intrface) {
  // TODO
}

/**
 *
 */
exports.geturl = function(url, depth, nobody) {
  // TODO
}

/**
 *
 */
exports.get_minified_js = function(files) {
  // TODO
}

/**
 *
 */
exports.stylesheet_tag = function(filename) {
  // TODO
}

/**
 *
 */
exports.javascript_tag = function(filename) {
  // TODO
}

/**
 *
 */
exports.calculate_dep_timestamp = function() {
  // TODO
}

/**
 *
 */
exports.T_js_decl = function(s1, s2) {
  // TODO
}

/**
 *
 */
exports.init_js_translations = function() {
  // TODO
}

/**
 *
 */
exports.label_to_feed_id = function(label) {
  // TODO
}

/**
 *
 */
exports.feed_to_label_id = function(feed) {
  // TODO
}
