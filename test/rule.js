var CssDom = require('../cssdom');
var assert = require('assert');

describe('css rule', function() {
  it('same property', function() {
    var code = '.cls{display:-webkit-box;display:-moz-box;display:-webkit-flex;display:flex;}';
    var css = new CssDom(code);

    assert.equal(code, css.stringify());
  });
});