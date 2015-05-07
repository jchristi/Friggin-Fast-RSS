// Dependencies
var FeedParser = require('feedparser');
var request = require('request');

var req = request('http://www.winehq.org/news/rss/');

// FeedParser options
var options = {
  'normalize': true, // normalize - Set to false to override Feedparser's
    // default behavior, which is to parse feeds into an object that contains
    // the generic properties patterned after (although not identical to) the
    // RSS 2.0 format, regardless of the feed's format.
  'addmeta': true, // addmeta - Set to false to override Feedparser's default
    // behavior, which is to add the feed's meta information to each article.
  'resume_saxerror': true // resume_saxerror - Set to false to override
    // Feedparser's default behavior, which is to emit any SAXError on error
    // and then automatically resume parsing. In my experience, SAXErrors are
    // not usually fatal, so this is usually helpful behavior. If you want
    // total control over handling these errors and optionally aborting
    // parsing the feed, use this option.
};
var feedparser = new FeedParser([options]);

req.on('error', function (error) {
  // handle any request errors
});
req.on('response', function (res) {
  var stream = this;

  if (res.statusCode !== 200) return this.emit('error', new Error('Bad status code'));

  stream.pipe(feedparser);
});


feedparser.on('error', function(error) {
  // always handle errors
});
feedparser.on('readable', function() {
  // This is where the action is!
  var stream = this;

  // **NOTE** the "meta" is always available in the context of the feedparser instance
  var meta = this.meta, item;

  while ((item = stream.read()) !== null) {
    console.log("\n*****************", item.title);
  }
});
