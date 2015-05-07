#!/usr/bin/env node

var DISABLE_SESSIONS = true; // XXX

var l = require('lodash');
var fs = require('fs');

//require('./include/autoload');
var funcs = require('./include/functions');
var rssfuncs = require('./include/rssfuncs');
var config = require('./config');
//require('./include/sanity_check');
var db = require('./include/db');
var db_prefs = require('./include/db_prefs');
var version = require('./include/version');

funcs.init_plugins();

var longopts = ["feeds",
      "feedbrowser",
      "daemon",
      "daemon-loop",
      "task:",
      "cleanup-tags",
      "quiet",
      "log:",
      "indexes",
      "pidlock:",
      "update-schema",
      "convert-filters",
      "force-update",
      "list-plugins",
      "help"];

// foreach pluginhost.getInstance().get_commands() as command => data {
//   longopts[] = command + "" + data['suffix'];
// }

// XXX: ensure only run on command line (should be easy to do...put in /usr/bin or something)

var yargs = require('yargs')
  .describe({
    'feeds':            'update feeds',
    'feedbrowser':      'update feedbrowser',
    'daemon':           'start single-process update daemon',
    'task':             'create lockfile using given task id',
    'cleanup-tags':     'perform tags table maintenance',
    'quiet':            'don\'t output messages to stdout',
    'log':              'log messages to FILE',
    'indexes':          'recreate missing schema indexes',
    'update-schema':    'update database schema',
    'convert-filters':  'convert type1 filters to type2',
    'force-update':     'force update of all feeds',
    'list-plugins':     'list all available plugins',
    /* print "Plugin options:\n";

    foreach (PluginHost::getInstance()->get_commands() as $command => $data) {
      $args = $data['arghelp'];
      printf(" --%-19s - %s\n", "$command $args", $data["description"]);
    }*/
  })
  .help('help', 'show this help')
  .version(version.get_version())
  .usage("Friggin Fast RSS data update script.\n\nUsage: ffrss-update [OPTIONS]")
  .strict();

var options = l.intersection(longopts, l.keys(yargs.argv));

if (options.length === 0 || l.contains(options, 'help')) {
  console.err(yargs.help());
  process.exit(1);
}

if ('daemon' in options) {
  require('./include/errorhandler'); // TODO: this is kind of a php-specific thing
}

if ('update-schema' in options) {
  var schema_version = funcs.get_schema_version();
  if (schema_version !== config.SCHEMA_VERSION) {
    console.error("Schema version is wrong, please upgrade the database");
    process.exit(1);
  }
}

var QUIET = 'quiet' in options;

if ('log' in options) {
  funcs._debug('Logging to ' + options.log);
  var LOGFILE = options.log;
}

if ('daemon' in options) {
  var lock_filename = 'update.lock';
} else {
  var lock_filename = 'update_daemon.lock';
}

if ('task' in options) {
  funcs._debug('Using task id ' + options.task);
  lock_filename += '-task_' + options.task;
}

funcs._debug('Lock: ' + lock_filename);

var lock_handle = funcs.make_lockfile(lock_filename);
var must_exit = false;

if ('task' in options && 'pidlock' in options) {
  var waits = options.task * 5; // TODO: verify options.task is an int?
  funcs._debug('Waiting before update(' + waits + ')');
  //sleep(waits); // TODO: waiting probably not a good idea
}

// Try to lock a file in order to avoid concurrent update.
if (!lock_handle) {
  console.error("error: Can't create lockfile (" + lock_filename + "). " +
    "Maybe another update process is already running.");
  process.exit(1);
}

if ('force-update' in options) {
  funcs._debug("marking all feeds as needing update...");
  db.query("UPDATE ttrss_feeds SET last_update_started = '1970-01-01', last_updated = '1970-01-01'");
}

if ('feeds' in options) {
  rssfuncs.update_daemon_common();
  rssfuncs.housekeeping_common();
  //PluginHost.getInstance().run_hooks(PluginHost.HOOK_UPDATE_TASK, "hook_update_tasks", op);
}

if ('feedbrowser' in options) {
  var count = rssfuncs.update_feedbrowser_cache();
  console.log("Finished, " + count + " feeds processed.\n");
}

if ('daemon' in options) {
  // XXX: implement me
}

if ('daemon-loop' in options) {
 // XXX: implement me
}

if ('cleanup-tags' in options) {
  // XXX: implement me
}

if ('indexes' in options) {
  // XXX: implement me
}

if ('convert-filters' in options) {
  // XXX: implement me
}

if ('update-schema' in options) {
  // XXX: implement me
}

if ('list-plugins' in options) {
  // XXX: implement me
}

//PluginHost.getInstance().run_commands(options);

fs.exists(global.LOCK_DIRECTORY + "/" + lock_filename, function(exists) {
  if (exists) {
    fs.close(lock_handle);
    fs.unlink(lock_filename);
  }
});
