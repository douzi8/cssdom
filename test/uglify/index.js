var assert = require('assert');
var uglify = require('../../uglify/index');

describe('Uglify', function() {
  it('zero', function() {
    assert.equal(uglify.declarations([
      { key: 'width', value: '0px' },
      { key: 'height', value: '50px' }
    ]), 'width:0;height:50px');
  });
});