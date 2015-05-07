var config = require('./config');

var debug = config.hasOwnProperty('DEBUG') && config.DEBUG;
// TODO: change this to a logger class and allow configurable outputs (ie. files, console, etc)
// with multiple error levels.
// TODO: search for good node logging modules

module.exports = function(message, enabled) {
  enabled = typeof enabled === 'undefined' ? true : enabled;

  if (debug && enabled) {
    console.log(message);
  }
};
