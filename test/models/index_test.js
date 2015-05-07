var expect = require('chai').expect;

var models = require('../../models');
var orm = models.orm;

describe('models/index', function() {
  it('should load the bookshelf library', function(done) {
    expect(orm).to.exist;
    done();
  });
});
