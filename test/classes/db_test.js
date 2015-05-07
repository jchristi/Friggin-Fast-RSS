var should = require('chai').should();
var expect = require('chai').expect;
var Db = require('../../classes/db').Db;

describe('Db', function() {
  var db = null;

  before(function() {
    db = Db({
      type: 'sqlite3',
      filename: './db_test.sqlite'
    });
  });

  describe('.quote()', function() {
    it('should quote a string properly', function(done) {
      expect(db.quote('blagah')).to.equal("'blagah'");
      done();
    });
  });

  // TODO
  // describe('.query()', function() {
  //  it('should work', function(done){});
  // });

  after(function(){
    // remove db file
  });

});
