'use strict'

var l = require('lodash');
var php = require('phpjs');

var db = require('../include/db');
var debug = require('../debug');
var models = require('../models');
var rssfuncs = require('../include/rssfuncs');

var parse_item = function(item, owner_uid) { // TODO: pass feed model instead?
  console.log("***************** ITEM", item.title);

  // guid
  var entry_guid = item.guid;
  if (!entry_guid) entry_guid = item.link;
  //if (!entry_guid) entry_guid = make_guid_from_title(item.title); // TODO: implement make_guid_from_title
  if (!entry_guid) return;
  entry_guid = owner_uid + ',' + entry_guid;
  var entry_guid_hashed = 'SHA1:' + php.sha1(entry_guid);
  debug('guid' + entry_guid + ' / ' + entry_guid_hashed);

  // timestamp
  var entry_timestamp = item.pubdate;
  debug('orig date: ' + item.pubdate);
  if (!entry_timestamp || entry_timestamp == -1) // || entry_timestamp > (new Date())
  {
    entry_timestamp = (new Date()); // TODO: what format?
  }
  var entry_timestamp_fmt = php.strftime("%Y/%m/%d %H:%M:%S", entry_timestamp);
  debug('date ' + entry_timestamp + ' [' + entry_timestamp_fmt + ']');

  // title
  var entry_title = item.title;
  if (!entry_title || entry_title === '')
    entry_title = php.date("Y-m-d H:i:s", entry_timestamp);
  debug('title ' + entry_title);

  // link
  var entry_link = item.link; //funcs.rewrite_relative_url(site_url, item.link);
    // TODO: need access to 'site_url' variable
  debug('link ' + entry_link);

  // content
  var entry_content = item.description;
  if (!entry_content || entry_content === '') entry_content = item.summary;

  // language
  var entry_language = item.meta.language || 'en-us';
  // TODO: manually detect article language
  debug('language ' + entry_language);

  // author
  var entry_author = item.author;
  debug('author ' + entry_author);

  // comments
  var entry_comments = item.comments;
  // if (!entry_comments) fetch_comments(item) // TODO
  var num_comments = 0; // TODO
  debug('num_comments: ' + num_comments);

  // tags
  debug('looking for tags...');
  var additional_tags_src = item.categories || [];
  var entry_tags = l.invoke(l.unique(additional_tags_src), 'toLowerCase');
  // TODO: convert to utf8
  debug('tags found: ' + php.join(',', entry_tags));

  debug('done collecting data.');

  models.Entry.collection.query(
    { where: { guid: entry_guid }},
    { orWhere: { guid: entry_guid_hashed }})
  .fetch()
  .then(function(collection) {
    var base_entry_id = false;
    var entry_stored_hash = '';
    var article_labels = [];
    var entry = null;
    if (collection.length != 0) {
      entry = collection.at(0);
      base_entry_id = entry.id;
      entry_stored_hash = entry.get('content_hash');
      article_labels = get_article_labels(base_entry_id, owner_uid);
    } else {
      entry = new models.Entry();
    }
    var entry_plugin_data = '';
    var entry_current_hash = rssfuncs.calculate_article_hash(article); // TODO: method on Entry

    if (entry_current_hash === entry_stored_hash) {
      debug('stored article seems up to date [IID: ' + base_entry_id + '] updating timestamp only');
      base_entry_id = entry.id;
      var mysql_datetime = (new Date()).toISOString().slice(0, 19).replace('T', ' '); // TODO: fix
      entry.set('date_updated', mysql_datetime);

      // if (!get_pref('ALLOW_DUPLICATE_POSTS', owner_uid, false)) {
      // return;
      // }
    }

    //debug('hash differs, applying plugin filters:');
    //l.forEach(pluginhost.get_hooks(PluginHost.HOOK_ARTICLE_FILTER), function(plugin) {
    //  debug('... ' + plugin.toString()); // get_class(plugin);
    //  var start = php.microtime(true);
    //  article = plugin.hook_article_filter(article);
    //  debug('=== ' + php.sprintf("%.4f (sec)", php.microtime(true) - start));
    //  entry_plugin_data += plugin.toString() + ','; // get_class(plugin);
    //}
    //debug('plugin data: ' + entry_plugin_data);

    //debug('article labels: ' + article.labels);
    debug('force catchup: ' + entry_force_catchup);

    //if (cache_images && fs.isWritable(config.CACHE_DIR + '/images'))
    //  cache_images(entry_content, site_url);

    // start db transaction
    if (collection.length === 0) {
      entry.set({
        title: entry_title,
        guid: entry_guid_hashed,
        link: entry_link,
        updated: entry_timestamp_fmt,
        content: entry_content,
        content_hash: entry_current_hash,
        no_orig_date: false,
        date_updated: mysql_datetime,
        date_entered: date_feed_processed,
        comments: entry_comments,
        num_comments: num_comments,
        plugin_data: entry_plugin_data,
        lang: entry_language,
        author: entry_author
      });
      entry.save();
    }

    var ref_id = entry.id; // TODO: what is the purpose of ref_id?

    // collect article tags here so we can filter by them
    // var article_filters = get_article_filters(filters, entry); // TODO: implement
    //debug('article filters: ' + php.join(',', article_filters);
    //if (find_article_filter(article_filters, 'filter')) {
    //  // close transaction in progress
    //  // return;
    //}

    var score = 0; //calculate_article_score(article_filters); // TODO
    debug('initial score: ' + score);

    // do we allow duplicate posts with same GUID in different feeds?
    // if (get_pref("ALLOW_DUPLICATE_POSTS", $owner_uid, false)) {
    //  dupcheck_qpart = "AND (feed_id = '$feed' OR feed_id IS NULL)";
    // } else {
    //  dupcheck_qpart = "";
    // }

    // TODO: move to UserEntry method
    models.UserEntry.collection.query({
      ref_id: ref_id,
      owner_uid: owner_uid
      // TODO: check dups?
    })
    .fetch()
    .then(function(collection) {
      if (collection.length === 0) {
        debug('user record not found, creating...');

        var unread = false;
        var last_read_qpart = mysql_datetime;
        if (score >= -500 && !find_article_filter(article_filters, 'catchup')
            && !entry_force_catchup) {
          unread = true;
          last_read_qpart = null;
        }
        var marked = !(find_article_filter(article_filters, 'mark') || score > 1000);
        var published = find_article_filter(article_filters, 'publish');
        var last_marked = marked ? mysql_datetime : null;
        var last_published = published ? mysql_datetime : null;

        var user_entry = new models.UserEntry({
          ref_id: ref_id,
          owner_uid: owner_uid,
          feed_id: feed, // ?
          unread: unread,
          last_read: last_read_qpart,
          marked: marked,
          published: published,
          score: score,
          tag_cache: '',
          label_cache: '',
          uuid: '',
          last_marked: last_marked,
          last_published: last_published
        });

        //if (config.PUBSUBHUBBUB_HUB && published) {
        //  var rss_link = get_self_url_prefix() +
        //    'public.php?op=rss&id=-2&key=' +
        //    get_feed_access_key(-2, false, owner_uid);
        //  var p = new Publisher(config.PUBSUBHUBBUB_HUB);
        //  p.publish_update(rss_link);
        //}

        // select int_id FROM ttrss_user_entries WHERE
        //  ref_id = ref_id AND owner_uid = owner_uid
        //  AND feed_id = feed LIMIT 1;
        //  if (result.length === 1) entry_int_id = result[0].int_id;

      } else {
        debug('user record FOUND');
        var user_entry = collection.at(0);
        var entry_ref_id = user_entry.ref_id;
        var entry_int_id = user_entry.int_id;
      }

      debug('RID: ' + entity_ref_id + ', IID: ' + entry_int_id);

      entry.set({ // this is entry, NOT user_entry
        title: entry_title,
        content: entry_content,
        content_hash: entry_content_hash,
        updated: entry_timestamp_fmt,
        num_comments: num_comments,
        plugin_data: entry_plugin_data,
        author: entry_author,
        lang: entry_language
      });
      // where id = ref_id // does this update multiple entries?
      if (mark_unread_on_update) {
        entry.set({
          last_read: null,
          unread: true,
        });
        // where id = ref_id // does this update multiple entries?
      }
      entry.save()
      .then(function(saved_entry) {

        //debug('assigning labels [other]...');
        //l.forEach(article_labels, function(label) {
        //  label_add_article(entry_ref_id, label[1], owner_uid);
        //});

        //debug('assigning labels [filters]...');
        //assign_article_to_label_filters(entry_ref_id, article_filters, owner_uid, article_labels);

        //debug('looking for enclosures...');
        //var enclosures = [];
        //var encs = item.get_enclosures(); // ???
        //l.forEach(encs, function(e) {
        //  var e_item = [ e.link, e.type, e.length, e.title, e.width, e.height ];
        //  enclosures.push(e_item);
        //});
        //debug('article enclosures:' + enclosures.toString());

        // begin transaction
        //l.forEach(enclosures, function(enc) {
        //  var enc_url = enc[0];
        //  var enc_type = enc[1];
        //  var enc_dur = enc[2];
        //  var enc_title = enc[3];
        //  var enc_width = enc[4]; //convert to int
        //  var enc_height = enc[5]; // convert to int
        //  select id from ttrss_enclosures where content_url = enc_url AND post_id = entity_ref_id;
        //  if (result.length === 0) {
        //    new models.Enclosure({
        //      content_url: enc_url,
        //      content_type: enc_type,
        //      title: enc_title,
        //      duration: enc_dur,
        //      post_id: entry_ref_id,
        //      width: enc_width,
        //      height: enc_height
        //    })
        //    .save();
        //  }
        //});
        // commit transaction

        // check for manual tags (have to do it here since they're loaded from filters
        //
        // just put this in another function...shit

        debug('article processed');

        // at some point...
        // purge_feed(feed, 0);
        // update ttrss_feeds set last_updated = mysql_datetime, last_error = '' where id = feed;
        // debug('done');
        // return feed_parser; // why?

      });

    });

    //entry.save();
  });

};
exports.parse_item = parse_item;
