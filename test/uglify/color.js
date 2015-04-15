var assert = require('assert');
var color = require('../../lib/color');

describe('Uglify css color', function() {
  it('word', function() {
    assert.equal(color('tan'), '#d2b48c');
    assert.equal(color('important'), 'important');
  });

  it('color', function() {
    var value = 'blanchedalmond';

    assert.equal(color(value), '#ffebcd');
    assert.equal(color('aliceblue'), '#f0f8ff');
  });

  it('rgb', function() {
    assert.equal(color('rgb(255,0, 0)'), '#f00');
    assert.equal(color('rgb (255 , 32 , 80)'), '#ff2050');
  });

  it('lowercase', function() {
    assert.equal(color('#FA0'), '#fa0');
    assert.equal(color('#EEFFCD'), '#eeffcd');
  });

  it('short', function() {
    assert.equal(color('#EEFFAA'), '#efa');
    assert.equal(color('#0099aa'), '#09a');
  });
});