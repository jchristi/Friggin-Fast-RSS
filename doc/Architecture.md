# Caches

A list of database tables that could make use of a key/value store like memcache, redis, pgsql hstore or other.

Tiny-Tiny-RSS | Friggin-Fast-RSS | Comments
------------- | ---------------- | --------
cat_counters_cache | cache_category_count | caches the unread feed count per category
counters_cache | cache_count | ?
feedbrowser_cache | cache_feed_browser | a cache of the most subscribed feeds (unused in single-user mode?)
sessions | sessions | not really a cache but also something that could use a k/v store


# Queues

The following is a list of ideas for things that do not necessarily need to be run within the main codepath. To use Drupal as an analogy, think of batch jobs (queues) that are run via cron hooks. Unlike Drupal though, these should be separate queues that run independently of each other so failures do not affect one another.

Note: several queue jobs are for updating cache (see Cache section above)

## Update feed browser cache
Updates a cache with a list of the top most subscribed feeds. This is *probably* useless in single-user mode, so should be disabled in that case.

## Subscribe to feed
Can probably be broken out into several independent queues:
  * getting favicon

## Fetching and parsing a feed
This can also probably be broken up into several independent queues:
  * download (and perhaps cache) raw response from remote source
  * parse the source for each user that has specified a custom parser, otherwise parse with the default parser
    * TODO: is a full-article fetcher going to be implemented as a custom parser or as something entirely separate?
  * TODO: Plugins? Plugins as implemented by ttrss can hook into several different events and are not just limited to one point. Think hooks and Drupal modules. This is probably the way to go (ie have custom parsers be implemented within a plugin)
    * on second thought, drupal hooks are not a great example, since its function-based. Class-based would be better.
    * Also keep in mind the trade-off in a parseable plugin format vs executable code (potentially unsafe!)
  * checking if favicon needs update
    * updating favicon (same step?)

## Purging old feed posts
See functions.purge_feed().

## Get Article Tags
See functions2.get_article_tags().

## Filters
Filters do a lot of things since they can be assigned custom actions. Definitely something that should be done out-of-band.

## Get feed score
Not sure where this is calculated. Note this is another thing that is per-user, per-feed.

## Cleanup tags
see functions.cleanup_tags().


# Full article scraping

## Implementation
 * Where to implement this regarding the feed parsing life cycle?
 * Should this be implemented as a full plugin (ie potentially unsafe code injection) or as simply a set of rules (ie CSS/jQuery selectors) for specifying article endpoints.

## Storage backend
There are several interesting options here. My initial thought was to store this in a database table either re-using a TEXT field with hex encoding or a new binary BLOB field. However, a good argument can be made for storing this as a compressed binary file and simply linking to it from the db. An interesting note is that the data could be stored in plain text if the underlying filesystem had encryption enabled (btrfs lzo, etc), though that is so rare as to not even take into consideration. However, configuration here would allow for that option. I am interested to know what the overhead would be in all the above implementations. Another consideration is how long-lived the full article content would live. In many cases, the full article might be desired for longer than normal feed articles (think archived or saved articles).
