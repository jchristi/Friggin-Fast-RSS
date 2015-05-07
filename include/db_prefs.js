var db = require('./db');
//var Db_Prefs = require('../classes/db/prefs');

exports.get_pref = function(pref_name, user_id, die_on_error) {
  user_id = (typeof user_id !== 'undefined') ? user_id : false;
  die_on_error = (typeof die_on_error !== 'undefined') ? die_on_error : false;

  //return Db_Prefs.get().read(pref_name, user_id, die_on_error); // TODO
  return '';
}

exports.set_pref = function(pref_name, value, user_id, strip_tags) {
  user_id = (typeof user_id !== 'undefined') ? user_id : false;
  strip_tags = (typeof strip_tags !== 'undefined') ? strip_tags : true;

  //return Db_Prefs.get().write(pref_name, value, user_id, strip_tags); // TODO
  return '';
}
