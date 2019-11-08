var CssDom = require('../cssdom');
var assert = require('assert');

describe('css rule', function() {
  it('same property', function() {
    var code = '.cls{display:-webkit-box;display:-moz-box;display:-webkit-flex;display:flex;}';
    var css = new CssDom(code);

    assert.equal('.cls{display:-webkit-box;display:-moz-box;display:-webkit-flex;display:flex}', css.stringify());
  });

  it('multiple semicolon', function() {
    var code = '.cls {color: red; ; ;}';
    var css = new CssDom(code);

    assert.equal('.cls{color:red}', css.stringify());
  });

  it('empty rule', function() {
    var code = '.a{}.cls {}';
    var css = new CssDom(code);

    assert.equal('', css.stringify());
  });

  it('unopen', function() {
    var css = new CssDom('a');

    assert.deepEqual({
      type: 'rule',
      selectors: ['a'],
      declarations: {}
    }, css.dom[0]);
  });

  it('unclose', function() {
    var css = new CssDom('a{');

    assert.deepEqual({
      type: 'rule',
      selectors: ['a'],
      declarations: {}
    }, css.dom[0]);
  });
});