var CssDom = require('../cssdom');
var assert = require('assert');

describe('comment', function() {
  it('Normal', function() {
    var content = '.cls{/* comment */ }';
    var css = new CssDom(content);
    
    assert.equal(content.length, css._column - 1);
  });
});