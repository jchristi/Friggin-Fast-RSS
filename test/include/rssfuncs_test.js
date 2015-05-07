var expect = require('chai').expect;

var db = require('../../include/db');
var path = require('path');
var rssfuncs = require('../../include/rssfuncs');

var rootpath = path.dirname(path.dirname(__dirname));
var fixtures_dir = path.resolve(rootpath, 'test', 'fixtures');
var cached_feed_file = path.resolve(fixtures_dir, 'winehq.xml');

describe('rssfuncs', function() {

  describe('calculate_article_hash()', function() {
    it('should work like Tiny-Tiny-RSS', function(done) {
      var article = {
        'feed': 'feed ignored',
        'something': 'blagah',
        'array': ['blagah', 'gerber']
      };
      var plugin_host = { get_plugin_names: function() { return ['blagah', 'gerber'] } };
      var result = rssfuncs.calculate_article_hash(article, plugin_host);
      expect(result).to.equal('91de8bc2393d4863156b999bbeaa841294b8ea64');
      done();
    });
  });

  describe('update_feedbrowser_cache()', function() {
    /*it('the first query should return the 2 default rows for Tiny-Tiny-RSS', function(done) {
      var sql = db.dal
      .select('feed_url', 'site_url', 'title', db.dal.raw('COUNT(id) as subscribers'))
      .from('ttrss_feeds')
      .whereRaw(
        /*db.dal('ttrss_feeds as tf')
        .count('id as subscribers2')
        .where('tf.subscribers2', 0)
        .where('tf.feed_url', 'ttrss_feeds.feed_url')
        .andWhere(function() {
          this.whereRaw('private IS true')
          .orWhere('tf.auth_login', '!=', '')
          .orWhere('tf.auth_pass', '!=', '')
          .orWhere('tf.feed_url', 'LIKE', '%:%@%/%');
        })
        //.toSQL();*
        "(SELECT COUNT(id) = 0 FROM ttrss_feeds AS tf \
          WHERE tf.feed_url = ttrss_feeds.feed_url \
          AND ( private IS true OR auth_login != '' OR auth_pass != '' \
          OR feed_url LIKE '%:%@%/%'))"
      )
      .groupByRaw('feed_url, site_url, title')
      .orderBy('subscribers', 'desc')
      .limit(1000)
      .toSQL();
      console.log(sql.sql);
      done();
    });*/

    /*it('should update the feedbrowser_cache', function(done) {
      // TODO: use a separate database snapshot !!!
      db.dal('ttrss_feeds').del().where('id', '>', 4)
      .then(function() {
        rssfuncs.update_feedbrowser_cache()
        .then(function(result) {
          try {
            expect(result).to.equal(2);
            return db.dal.select('*').from('ttrss_feedbrowser_cache');
          } catch(e) {
            done(e);
          }
        }).then(function(result, err) {
          if (!result) return;
          expect(result).to.have.length(2);
          expect(result[0]).to.eql({
            feed_url: 'http://tt-rss.org/releases.rss',
            site_url: '',
            title: 'Tiny Tiny RSS: New Releases',
            subscribers: 1
          });
          expect(result[1]).to.eql({
            feed_url: 'http://tt-rss.org/forum/rss.php',
            site_url: '',
            title: 'Tiny Tiny RSS: Forum',
            subscribers: 1
          });
          done();
        });
      });
    });*/
  });

  describe('fetch_feed_from_source()', function() {
    it('should return a promise', function(done) {
      var p = rssfuncs.fetch_feed_from_source('http://www.google.com');
      expect(p).to.respondTo('then');
      done();
    });
    it('should fetch a remote feed and eventually return a ReadableStream', function(done) {
      rssfuncs.fetch_feed_from_source('http://www.winehq.org/news/rss/')
      .then(function(req) {
        expect(req).to.respondTo('on');
        expect(req).to.respondTo('pipe');
        req.on('data', function() {
          done();
        });
      });
    });
  });

  describe('fetch_feed_from_file()', function() {
    it('should return a promise', function(done) {
      var p = rssfuncs.fetch_feed_from_file(path.resolve(fixtures_dir, 'winehq.xml'));
      expect(p).to.respondTo('then');
      done();
    });
    it('should fetch a feed from a local file and eventually return a ReadableStream', function(done) {
      rssfuncs.fetch_feed_from_file(path.resolve(fixtures_dir, 'winehq.xml'))
      .then(function(rs) {
        expect(rs).to.respondTo('on');
        expect(rs).to.respondTo('pipe');
        rs.on('data', function(data) {
          done();
         });
      });
    });
    //it('should error when given an invalid file', function(done) {
    //
    //});
  });

  describe('fetch_feed()', function() {
    it('should return a promise', function(done) {
      var p1 = rssfuncs.fetch_feed('http://bing.com');
      expect(p1).to.respondTo('then');
      // TODO: error handling for file URL or invalid URL
      //var p2 = rssfuncs.fetch_feed(resolve(fixtures_dir, 'winehq.xml'));
      //expect(p2).to.respondTo('then');
      done();
    });
  });

  describe('update_rss_feed()', function() {
    /*it('should return a promise', function(done) {
      try {
        // TODO: mock for fetch_feed() ?
        var p1 = rssfuncs.update_rss_feed(1);
        expect(p1).to.respondTo('then');
        done();
      } catch(e) { return done(e); }
    });*/
    it('should fetch feed items', function(done) {
      try {
        var p = rssfuncs.update_rss_feed(20);
        expect(p).to.respondTo('then');
        p.then(function() {
          done();
        });
      } catch(e) { return done(e); }
    });
  });

});
