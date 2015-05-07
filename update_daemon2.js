#!/usr/bin/env node

var DISABLE_SESSIONS = true;

var version = require('./include/version');
//require('./include/autoload');
var funcs = require('./include/functions');
var config = require('./config');
var rssfuncs = require('./include/rssfuncs');
//require('./include/sanity_check');
var db = require('./include/db');
var db_prefs = require('./include/db_prefs');

// defaults
var PURGE_INTERVAL = 3600; // seconds
var MAX_CHILD_RUNTIME = 1800; // seconds
var MAX_JOBS = 2;
var SPAWN_INTERVAL = global.DAEMON_SLEEP_INTERVAL; // seconds

var options = [];

var master_handlers_installed = false;

var children = [];
var ctimes = [];
var last_checkpoint = -1;

// TODO: nodejs implementation will be event-based rather than multi-process
function reap_children() {
  var tmp = [];
  for(var i in children) {
    /* */
  }
  children = tmp;
  return tmp.size;
}
function check_ctimes() {}
function sigchld_handler(signal) {}
function shutdown(caller_pid) {}
function task_shutdown() {}
function sigint_handler() {}
function task_sigint_handler() {}

var longopts = ["log:",
                "tasks:",
                "interval:",
                "quiet",
                "help"];

var yargs = require('yargs')
  .describe({
    'log':      'log messages to FILE',
    'tasks':    'amount of update tasks to run (default: ' + MAX_JOBS + ')',
    'interval': 'task run interval (default: ' + SPAWN_INTERVAL + ' seconds)',
    'quiet':    "don't output messages to stdout",
  })
  .help('help', 'show this help')
  .version(version.get_version())
  .usage("Friggin Fast RSS data update daemon.\n\nUsage: ffrss-daemon [OPTIONS]")
  .strict();

var QUIET = (typeof options.quiet !== 'undefined') && options.quiet;

var max_jobs = MAX_JOBS;
if (typeof options.tasks !== 'undefined') {
  funcs._debug("Set to run " + options.tasks + " tasks.");
  max_jobs = options.tasks;
}

var spawn_interval = SPAWN_INTERVAL;
if (typeof options.interval !== 'undefined') {
  funcs._debug("Run interval: " + options.interval + " seconds.");
  var spawn_interval = options.interval;
}

if (typeof options.log !== 'undefined') {
  funcs._debug("Logging to " + options.log);
   var LOGFILE = options.log;
}

if (funcs.file_is_locked('update_daemon.lock')) { // TODO: implement file_is_locked
  console.error("error: Can't create lockfile. Maybe another daemon is already running.\n");
  process.exit(1);
}

// Try to lock a file in order to avoid concurrent update.
var lock_handle = funcs.make_lockfile("update_daemon.lock");

if (!lock_handle) {
  console.error("error: Can't create lockfile. Maybe another daemon is already running.\n");
  process.exit(1);
}

if (funcs.get_schema_version() !== config.SCHEMA_VERSION) {
  console.error("Schema version is wrong, please upgrade the database\n");
  process.exit(1);
}

while (true) {

  // TODO: do the special sauce

}
