var assert = require('assert');
var uglify = require('../../lib/uglify');

describe('Uglify', function() {
  it('zero', function() {
    assert.equal(uglify({
      width: '0px',
      height: '50px'
    }), 'width:0;height:50px');
  });
});