// Get the location of the config file:
//  * FFRSS_CONFIG environment variable
//  * global variable global.FFRSS_CONFIG
var config_file = process.env.FFRSS_CONFIG || global.FFRSS_CONFIG

// remove the '.js' file extension if present
if (config_file.substr(-3) === '.js') {
  config_file = config_file.substr(0, config_file.length-3);
}

// add leading './' if necessary
if (config_file.substr(0,1) !== '.' && config_file.substr(0,1) !== '/') {
  config_file = './' + config_file;
}

// TODO: Check config_file exists

var config = require(config_file);

// set contants
config.DB_PREFIX = 'ttrss_';

// debug mode
config.DEBUG = process.env.DEBUG == '1' || config.DEBUG;

module.exports = config;
