var db = require('../include/db');
var bookshelf = require('bookshelf')(db.dal);

module.exports = bookshelf;
