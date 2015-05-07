var fs = require('fs');
var php = require('phpjs');

var VERSION_STATIC = '1.14';

var get_version = function() {
  var root_dir = __dirname + '../';
  var git_dir = root_dir + ".git";
  /*var stats = fs.lstatSync(git_dir);
  if (stats.isDirectory() && fs.existsSync(git_dir + "refs/heads/master")) {
    var fp = fs.open(git_dir + "refs/heads/master", 'r'); // TODO
    var suffix = php.substr(php.trim(fp.read()), 0, 7); // TODO
    return VERSION_STATIC + "." + suffix;
  }*/
  return VERSION_STATIC;
}

exports.VERSION = get_version();
exports.get_version = get_version;
exports.VERSION_STATIC = VERSION_STATIC;
