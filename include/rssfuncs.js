var FeedParser = require('feedparser');
var fs = require('fs');
var l = require('lodash');
var path = require('path');
var php = require('phpjs');
var Promise = require('bluebird');
var request = require('request');

var config = require('../config');
var db = require('./db');
var funcs = require('./functions');
var models = require('../models');

global.DAEMON_UPDATE_LOGIN_LIMIT = 30;
global.DAEMON_FEED_LIMIT = 500;
global.DAEMON_SLEEP_INTERVAL = 120;
global._MIN_CACHE_IMAGE_SIZE = 1024;

global.FEED_CACHE_DIR = config.CACHE_DIR + '/feeds';

function _get(value, default_value) {
  return (typeof value !== 'undefined') ? value : default_value;
}

/**
 * Calculates the article hash
 *
 * @param object article
 * @param PluginHost pluginhost
 * @return string sha1 hash of the article object plus plugin names
 */
// TODO: make this take an Entry model instance instead of wierd article object
// TODO: perhaps this should just be a method of the Entry model
var calculate_article_hash = function(article, pluginhost) {
  var tmp = '';
  l.forEach(article, function(i, key) {
    var v = article[key];
    if (key != 'feed' && v !== undefined) {
      /*if (typeof v !== 'string') { // typeof == 'object', 'hash', 'array'
        l.forEach(v, function(i) {
        });
      }*/
      v = l.isArray(v) ? php.implode(',', v) : v; // TODO: arrays in php are also dicts
      tmp += php.sha1(key + ':' + v);
    }
  });

  var plugin_names = pluginhost.get_plugin_names(); // TODO: pluginhost.get_plugin_names()
  var plugin_tmp = l.isArray(plugin_names) ? php.implode(',', plugin_names) : plugin_names;
  var hash = php.sha1(plugin_tmp + tmp);

  return hash;
}
exports.calculate_article_hash = calculate_article_hash;

/**
 * Updates the feedbrowser cache with the most subscribed feeds
 *
 * @return Promise/int the number of rows affected
 */
var update_feedbrowser_cache = function() {
  var count = 0;
  /*return db.dal.transaction(function(tx) {
    return tx('ttrss_feedbrowser_cache')
    .del()
    .then(function(result) {
      return tx
      .select('feed_url', 'site_url', 'title', db.dal.raw('COUNT(id) as subscribers'))
      .from('ttrss_feeds')
      .whereExists(
        db.dal
        //count('id')
        .select('COUNT(id)')
        .from('ttrss_feeds')
        .whereRaw('COUNT(id) = 0')
        .where('feed_url', 'ttrss_feeds.feed_url')
        .andWhere(function() {
          this.whereRaw('private IS true')
          .orWhere('auth_login', '!=', '')
          .orWhere('auth_pass', '!=', '')
          .orWhere('feed_url', 'LIKE', '%:%@%/%');
        })
      )
      .groupByRaw('feed_url, site_url, title')
      .orderBy('subscribers', 'desc')
      .limit(1000);
    })
    .map(function(row) {
      return tx
      .select('subscribers')
      .from('ttrss_feedbrowser_cache')
      .where('feed_url', row.feed_url)
      .then(function(results) {
        if (results.length === 0) {
          count += 1;
          return tx.insert(row).into('ttrss_feedbrowser_cache');
        }
      });
    })
    .then(function() {
      return count;
    });
  });*/
  return db.dal.transaction(function(tx) {
    return tx('ttrss_feedbrowser_cache')
    .del()
    .then(function(result) {
      return tx
      .select('feed_url', 'site_url', 'title', db.dal.raw('COUNT(id) as subscribers'))
      .from('ttrss_feeds')
      .whereRaw("(SELECT COUNT(id) = 0 FROM ttrss_feeds AS tf \
                WHERE tf.feed_url = ttrss_feeds.feed_url \
                AND ( private IS true OR auth_login != '' OR auth_pass != '' \
                OR feed_url LIKE '%:%@%/%'))")
      .groupByRaw('feed_url, site_url, title')
      .orderBy('subscribers', 'desc')
      .limit(1000);
    })
    .map(function(row) {
      return tx
      .select('subscribers')
      .from('ttrss_feedbrowser_cache')
      .where('feed_url', row.feed_url)
      .then(function(results) {
        if (results.length === 0) {
          count += 1;
          return tx.insert(row).into('ttrss_feedbrowser_cache');
        }
      });
    })
    .then(function() {
      return count;
    });
  });
}
exports.update_feedbrowser_cache = update_feedbrowser_cache;

/**
 * Update a feed batch. Used by daemons to update n feeds by
 * run. Only update feed needing a update, and not being
 * processed by another process.
 *
 * @param int limit the maximum number of feeds to update (default: DAEMON_FEED_LIMIT)
 * @param boolean from_http if this function was called from http or CLI (default: false)
 * @param boolean debug if debug output is enabled (default: true)
 * @return void
 */
var update_daemon_common = function(limit, from_http, debug) {
  limit = _get(limit, global.DAEMON_FEED_LIMIT);
  from_http = _get(from_http, false);
  debug = _get(debug, true);

  var schema_version = funcs.get_schema_version();
  if (schema_version !== global.SCHEMA_VERSION) {
    console.error("Schema version is wrong, please upgrade the database.");
    process.exit(1);
  }

  global.PREFS_NO_CACHE = true;

  var login_thresh_qpart = '';
  // Test if the user has logged in recently. If not, it does not update its feeds.
  if (!global.SINGLE_USER_MODE && global.DAEMON_UPDATE_LOGIN_LIMIT > 0) {
    // TODO: make this db-agnostic !!!
    if (config.DB_TYPE === 'pgsql') {
      login_thresh_qpart = "AND ttrss_users.last_login >= NOW() - INTERVAL '" +
        global.DAEMON_UPDATE_LOGIN_LIMIT + " days'";
    } else {
      login_thresh_qpart = "AND ttrss_users.last_login >= DATE_SUB(NOW(), INTERVAL " +
        global.DAEMON_UPDATE_LOGIN_LIMIT + " DAY)";
    }
  }

  var update_limit_qpart = '';
  // Test if the feed need a update (update interval exceeded).
  if (config.DB_TYPE === 'pgsql') {
    update_limit_qpart = "AND (( \
        ttrss_feeds.update_interval = 0 \
        AND ttrss_user_prefs.value != '-1' \
        AND ttrss_feeds.last_updated < NOW() - CAST((ttrss_user_prefs.value || ' minutes') \
          AS INTERVAL)\
      ) OR ( \
        ttrss_feeds.update_interval > 0 \
        AND ttrss_feeds.last_updated < NOW() - CAST((ttrss_feeds.update_interval || ' minutes') \
          AS INTERVAL)\
      ) OR (ttrss_feeds.last_updated IS NULL \
        AND ttrss_user_prefs.value != '-1') \
      OR (last_updated = '1970-01-01 00:00:00' \
        AND ttrss_user_prefs.value != '-1'))";
  } else {
    update_limit_qpart = "AND (( \
        ttrss_feeds.update_interval = 0 \
        AND ttrss_user_prefs.value != '-1' \
        AND ttrss_feeds.last_updated < DATE_SUB(NOW(), INTERVAL \
          CONVERT(ttrss_user_prefs.value, SIGNED INTEGER) MINUTE)\
      ) OR (\
        ttrss_feeds.update_interval > 0 \
        AND ttrss_feeds.last_updated < DATE_SUB(NOW(), \
          INTERVAL ttrss_feeds.update_interval MINUTE)\
      ) OR (ttrss_feeds.last_updated IS NULL \
        AND ttrss_user_prefs.value != '-1') \
      OR (last_updated = '1970-01-01 00:00:00' \
        AND ttrss_user_prefs.value != '-1'))";
  }

  // Test if feed is currently being updated by another process.
  var updstart_thresh_qpart = "AND (ttrss_feeds.last_update_started IS NULL \
    OR ttrss_feeds.last_update_started < DATE_SUB(NOW(), INTERVAL 10 MINUTE))";
  if (config.DB_TYPE === "pgsql") {
    updstart_thresh_qpart = "AND (ttrss_feeds.last_update_started IS NULL \
      OR ttrss_feeds.last_update_started < NOW() - INTERVAL '10 minutes')";
  }

  // Test if there is a limit to number of updated feeds
  var query_limit = "";
  if (limit) query_limit = php.sprintf("LIMIT %d", limit);

  var query = "SELECT DISTINCT ttrss_feeds.feed_url, ttrss_feeds.last_updated \
    FROM ttrss_feeds, ttrss_users, ttrss_user_prefs \
    WHERE ttrss_feeds.owner_uid = ttrss_users.id \
    AND ttrss_user_prefs.profile IS NULL \
    AND ttrss_users.id = ttrss_user_prefs.owner_uid \
    AND ttrss_user_prefs.pref_name = 'DEFAULT_UPDATE_INTERVAL' " +
      login_thresh_qpart + ' ' + update_limit_qpart + ' ' + updstart_thresh_qpart +
    "ORDER BY last_updated $query_limit";

  // We search for feed needing update.
  var result = db.query(query);

  if(debug) {
    funcs._debug(php.sprintf("Scheduled %d feeds to update...", db.num_rows(result)));
  }

  // Here is a little cache magic in order to minimize risk of double feed updates.
  var feeds_to_update = [];
  var line = null;
  while (line = db.fetch_assoc(result)) {
    feeds_to_update.push(db.escape_string(line.feed_url));
  }

  // We update the feed last update started date before anything else.
  // There is no lag due to feed contents downloads
  // It prevent an other process to update the same feed.
  if (feeds_to_update.length > 0) {
    var feeds_quoted = [];
    for (var i in feeds_to_update) {
      if (!feeds_to_update.hasOwnProperty(i)) continue;
      feeds_quoted.push("'" + db.escape_string(feeds_to_update[i]) + "'");
    }
    db.query(php.sprintf("UPDATE ttrss_feeds SET last_update_started = NOW() \
      WHERE feed_url IN (%s)",
      php.implode(',', feeds_quoted)));
  }

  var nf = 0;
  var bstarted = php.microtime(true);

  // For each feed, we call the feed update function.
  for (i in feeds_to_update) {
    if (!feeds_to_update.hasOwnProperty(i)) continue;
    var feed = feeds_to_update[i];
    if (debug) funcs._debug("Base feed: " + feed);

    // since we have the data cached, we can deal with other feeds with the same url

    var tmp_result = db.query("SELECT DISTINCT ttrss_feeds.id, last_updated, \
      ttrss_feeds.owner_uid FROM trss_feeds, ttrss_useres, ttrss_user_prefs \
      WHERE ttrss_user_prefs.owner_uid = ttrss_feeds.owner_uid \
      AND ttrss_users.id = ttrss_user_prefs.owner_uid \
      AND ttrss_user_prefs.pref_name = 'DEFAULT_UPDATE_INTERVAL' \
      AND ttrss_user_prefs.profile IS NULL \
      AND feed_url = '" + db.escape_string(feed) + "' \
      AND (ttrss_feeds.update_interval > 0 \
        OR ttrss_user_prefs.value != '1')" +
      login_thresh_qpart + "ORDER BY ttrss_feeds.id " + query_limit);

    if (db.num_rows(tmp_result) > 0) {
      var rss = false;
      var tline = null;
      while (tline = db.fetch_assoc(tmp_result)) {
        if (debug) {
          funcs._debug(" => " + tline.last_updated + ', ' + tline.id + " " +
            tline.owner_uid);
        }

        var fstarted = php.microtime(true);
        rss = update_rss_feed(tline.id, false); // TODO: implement update_rss_feed()
        funcs._debug_supress(false);

        funcs._debug(php.sprintf(" %.4f (sec)", php.microtime(true) - fstarted));

        ++nf;
      }
    }
  }

  if (nf > 0) {
    funcs._debug(php.sprintf("Processed %d feeds in %.4f (sec), %.4f (sec/feed avg)", nf,
      php.microtime(true) - bstarted, (php.microtime(true) - bstarted) / nf));
  }

  // Send feed digests by email if needed.
  //require('./digest').send_headlines_digests(debug); // TODO: low priority to implement

  return nf;
}
exports.update_daemon_common = update_daemon_common;

/**
 * A long ass function that is probably horribly written
 *
 * @param int feed_id the database id of the feed to update
 * @param boolean no_cache
 * @param Object feed_parser the feed parser object
 * @return Object a feed_parser object (is it ever used?)
 */
var update_rss_feed = function(feed_id, no_cache, feed_parser) {
  no_cache = _get(no_cache, false);
  feed_parser = _get(feed_parser, false);

  var debug_enabled = global.DAEMON_EXTENDED_DEBUG;
  // _debug_supress(!debug_enabled);
  // _debug("start", debug_enabled);

  //var result = db_query();

  // Make parsing pluggable
  //  * XSLT
  //  * regex substitution
  //  * custom form filler
  //  * FeedParser

  var options = {
    'normalize': true, // normalize - Set to false to override Feedparser's
      // default behavior, which is to parse feeds into an object that contains
      // the generic properties patterned after (although not identical to) the
      // RSS 2.0 format, regardless of the feed's format.
    'addmeta': true, // addmeta - Set to false to override Feedparser's default
      // behavior, which is to add the feed's meta information to each article.
    'resume_saxerror': true // resume_saxerror - Set to false to override
      // Feedparser's default behavior, which is to emit any SAXError on error
      // and then automatically resume parsing. In my experience, SAXErrors are
      // not usually fatal, so this is usually helpful behavior. If you want
      // total control over handling these errors and optionally aborting
      // parsing the feed, use this option.
  };

  var dont_run_twice_damnit = 0;

  // 'fetch' method is a Bookshelf method, not a 'fetch this rss feed' method
  var p = new models.Feed({ id: feed_id }).fetch({ require: true });
  //p.on('error', function(error) {
  //
  //})
  return new Promise(function(resolve, reject) {
    p.then(function(feed) {
      if (++dont_run_twice_damnit > 1) return;

      // TODO: cache feeds locally
      // TODO: check favicon

      //console.log('feed', feed);

      if (!feed_parser)
        feed_parser = new FeedParser([options]);

      fetch_feed(feed.get('feed_url'))
      .then(function(req) {
        req.on('error', function(error) {
          // handle any request errors
          console.log('REQUEST ERROR', error);
          reject(error);
        });
        req.on('response', function(res) {
          // TODO: check for HTTP 304
          if (res.statusCode !== 200) {
            req.emit('error', new Error('Bad status code'));
            // TODO: update last_error and last_updated fields
            return reject(new Error('Bad status code'));
          }
          req.pipe(feed_parser);
        });
        feed_parser.on('error', function(error) {
          // always handle errors
          console.log('FEED PARSER ERROR', error);
          // TODO: update last_error and last_updated fields
          reject(error);
        });
        feed_parser.on('meta', function() {
          // update title if it this is the first time updating the feed
          if (!feed.get('title') || feed.get('title') == '[Unknown]') {
            feed.set('title', feed_parser.meta.title.substr(0, 199));
          }

          // update the feed URL if necessary
          //var xmlurl = feed_parser.meta.xmlurl;
          //if (xmlurl && xmlurl !== '' && feed.get('feed_url') !== xmlurl) {
          //  feed.set('feed_url', xmlurl);
          //}
        });
        feed_parser.on('readable', function() {
          var item;
          while ((item = feed_parser.read()) !== null) {
            require('../parsers/default_parser').parse_item(item, feed.get('owner_uid'));
          }
        });
        feed_parser.on('end', function() {

          // Update the feed's 'site_url' attribute
          var site_url = funcs
            .rewrite_relative_url(feed.get('feed_url'), feed_parser.meta.link)
            .substr(0, 245);
          if (site_url && feed.get('site_url') != site_url) {
            feed.set('site_url', site_url);
            console.log('Updated site_url to', site_url);
          }

          // Update the feed's 'last_updated' attribute
          // TODO: consider using http://momentjs.com/
          var mysql_datetime = (new Date()).toISOString().slice(0, 19).replace('T', ' ');
          feed.set('last_updated', mysql_datetime);

          feed.save()
          .then(function(model) {
            //console.log('finished model', model);
            resolve(true);
          });
        });
      });
    });
  });
};
exports.update_rss_feed = update_rss_feed;

/**
 * Fetch a feed either from cache or from the remote source
 *
 * @param string fetch_url the url of the feed to fetch
 * @return Promise/ReadableStream a file or request stream
 */
var fetch_feed = function(fetch_url) {
  return new Promise(function(resolve, reject) {
    var cache_filename = path.resolve(FEED_CACHE_DIR, php.sha1(fetch_url) + '.xml');
    fs.exists(cache_filename, function(exists) {
      if (exists) {
        //debug('Fetching feed from cache...');
        resolve(fetch_feed_from_file(cache_filename));
      } else {
        resolve(fetch_feed_from_source(fetch_url));
      }
    });
  });
};
exports.fetch_feed = fetch_feed;

/**
 *
 */
var fetch_feed_from_source = function(fetch_url) {
  //console.log('fetching', fetch_url, '...'); // _debug('', debug_enabled);
  // _debug('If-Modified-Since:', php.gmdate('D, d M Y H:i:s \G\M\T', last_article_timestamp),
  //    debug_enabled);

  return new Promise(function(resolve, reject) {
    var req = request(fetch_url);
    // auth stuff: https://github.com/request/request#http-authentication
    //req.on('error', function(something) {
      // do something
    //});
    return resolve(req);
  });
};
exports.fetch_feed_from_source = fetch_feed_from_source;

/**
 * Opens a readable stream
 *
 // TODO: allow option to gzip the cached files
 *
 * @param string filename the file path to read
 * @return Promise/ReadableStream a file stream
 */
var fetch_feed_from_file = function(filename) {
  return new Promise(function(resolve, reject) {
    fs.exists(filename, function(exists) {
      if (!exists) {
        console.log('Error:',filename,'does not exist');
        //throw 'FileDoesNotExist';
        return reject('File does not exist');
      }
      var readable_stream = fs.createReadStream(filename, {autoClose: true});
      return resolve(readable_stream);
    });
  });
};
exports.fetch_feed_from_file = fetch_feed_from_file;

/**
 *
 */
exports.cache_images = function(html, site_url, debug) {
  // TODO
};

/**
 *
 */
exports.expire_error_log = function(debug) {
  if (debug) {
    funcs._debug("Removing old error log entries...");
  }

  if (config.DB_TYPE === 'pgsql') {
    db.query("DELETE FROM ttrss_error_log \
      WHERE created_at < NOW() - INTERVAL '7 days'");
  } else {
    db.query("DELETE FROM ttrss_error_log \
      WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)");
  }
}

/**
 *
 */
exports.expire_lock_files = function(debug) {
  // if (debug) _debug("Removing old lock files...");

  var num_deleted = 0;

  if (is_writable(LOCK_DIRECTORY)) { // TODO: implement is_writable()
    var files = glob(LOCK_DIRECTORY + "/*.lock"); // TODO: implement glob()
    if (files) {
      for (var i in files) {
        if (!files.hasOwnProperty(i)) continue;
        var file = files[i];
        if (!file_is_locked(php.basename(file)) && /* TODO: implement file_is_locked() */
            php.time() - filemtime(file) > 86400 * 2) { // TODO: implement filemtime()
          fs.unlink(file);
          ++num_deleted;
        }
      }
    }
  }

  if (debug) {
    funcs._debug("Removed " + num_deleted + " old lock files.");
  }
}

/**
 *
 */
exports.expire_cached_files = function(debug) {
  var caches = ["simplepie", "images", "export", "upload"];
  for (var dir in caches) {
    if (!caches.hasOwnProperty(dir)) continue;
    var cache_dir = CACHE_DIR + "/" + dir;

    // if ($debug) _debug("Expiring $cache_dir");

    var num_deleted = 0;
    var cache_dir_stats = fs.lstatSync(cache_dir);
    if (is_writable(cache_dir)) { // TODO: implement is_writable()
      var files = glob(cache_dir + "/*"); // TODO: implement glob()
      if (files) {
        for (var i in files) {
          if (!files.hasOwnProperty(i)) continue;
          var file = files[i];
          if (php.time() - filemtime(file) > 86400 * 7) { // TODO: implement filemtime()
            fs.unlink(file);
            ++num_deleted;
          }
        }
      }
    }

    if (debug) {
      funcs._debug(cache_dir + ": removed " + num_deleted + " files.");
    }
  }
}

/**
 *
 */
exports.convertUrlQuery = function(query) {
  // TODO
}
exports.get_article_filters = function(filters, title, content, link, timestamp, author, tags) {}

/**
 *
 */
exports.find_article_filter = function(filters, filter_name) {
  for (var i in filters) {
    if (!filters.hasOwnProperty(i)) continue;
    var f = filters[i];
    if (f.type === filter_name) return f;
  }
  return false;
}

/**
 *
 */
exports.calculate_article_score = function(filters) {
  var score = 0;
  for (var i in filters) {
    if (!filters.hasOwnProperty(i)) continue;
    var f = filters[i];
    if (f.type === 'score') score += f.param;
  }
  return score;
}

/**
 *
 */
exports.labels_contains_caption = function(labels, caption) {
  for (var i in labels) {
    if (!labels.hasOwnProperty(i)) continue;
    var label = labels[i];
    if (label[1] === caption) return true;
  }
  return false;
}

/**
 *
 */
exports.assign_article_to_label_filters = function(id, filters, owner_uid, article_labels) {
  // TODO
}

/**
 *
 */
exports.make_guid_from_title = function(title) {
  // TODO
}

/**
 *
 */
exports.housekeeping_common = function(debug) {
  funcs.expire_cached_files(debug);
  funcs.expire_lock_files(debug);
  funcs.expire_error_log(debug);

  var count = update_feedbrowser_cache();
  funcs._debug("Feedbrowser update, " + count + " feeds processed.");

  funcs.purge_orphans(true);
  var rc = funcs.cleanup_tags(15, 50000);

  funcs._debug("Cleaned " + rc + " cached tags.");

  PluginHost.getInstance().run_hooks(PluginHost.HOOK_HOUSE_KEEPING, "hook_house_keeping", "");
}
