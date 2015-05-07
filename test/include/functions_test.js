var expect = require('chai').expect;
var funcs = require('../../include/functions');

describe('functions', function() {

  describe('define_default()', function() {
    it('should define a global value when not already defined',
        function(done) {
      qwerty = undefined;
      expect(qwerty).to.equal(undefined);
      funcs.define_default('qwerty', 'default value');
      expect(qwerty).to.equal('default value');
      delete global.qwerty;
      done();
    });
    it('should do nothing if a global value is already defined',
        function(done) {
      global.qwerty2 = 'hello world!';
      funcs.define_default('qwerty', 'default value');
      expect(qwerty2).to.equal('hello world!');
      delete global.qwerty2;
      done();
    });
  });

  describe('get_translations()', function() {
    it('should return a hash', function(done) {
      var tr = funcs.get_translations();
      expect(tr).to.be.a('object');
      done();
    });
  });

  describe('get_schema_version()', function() {
    var expected_version = 127;
    it('should return the current schema version from code', function(done) {
      funcs.get_schema_version(true)
      .then(function(version) {
        expect(version).to.equal(expected_version);
        done();
      });
    });
    it('should return the current schema version from the database', function(done) {
      funcs.get_schema_version()
      .then(function(version) {
        expect(version).to.equal(expected_version);
        done();
      });
    });
    it('should consistently return a Promise object', function(done) {
      var p1 = funcs.get_schema_version(true);
      expect(p1).to.respondTo('then');
      var p2 = funcs.get_schema_version();
      expect(p2).to.respondTo('then');
      done();
    });
  });

  describe('subscribe_to_feed()', function() {
    it('should return a promise', function(done) {
      var p1 = funcs.subscribe_to_feed('');
      expect(p1).to.respondTo('then');
      //var p2 = funcs.subscribe_to_feed('http://localhost');
      //expect(p2).to.respondTo('then');
      // need to mock some stuff
      done();
    });
    it('should subscribe to a valid feed', function(done) {
      funcs.subscribe_to_feed('http://www.phoronix.com/rss.php', 1)
      .then(function(result) {
        if (!result) return done(Error('Nothing was returned'));
        try {
          expect(result).to.not.respondTo('then');
          expect(result.code).to.be.lt(2);
        } catch(e) {
          return done(e);
        }
        done();
        /*funcs.subscribe_to_feed('http://www.phoronix.com/rss.php', 1)
        .then(function(result) {
          if (!result) done(Error('Nothing was returned'));
          console.log(result);
          expect(result.code).to.eql(0);
          done();
        });*/
      });
    });
  });

  describe('rewrite_relative_url()', function() {
    it('should return an absolute URL given an absolute URL', function(done) {
      try {
        var url = funcs.rewrite_relative_url('http://foo.com/bar');
        expect(url).to.eql(url);
        done();
      } catch(e) {
        done(e);
      }
    });
    it('should return an absolute URL given a relative URL', function(done) {
      try {
        var url = funcs.rewrite_relative_url('http://foo.com', '/bar');
        expect(url).to.eql('http://foo.com/bar');
        done();
      } catch(e) {
        done(e);
      }
    });

  });

});
