var CssDom = require('../cssdom');
var assert = require('assert');

describe('css beautify', function() {
  it('rule comment', function() {
    var css = new CssDom('a{/**/color:/**/#ff0/**/;/**/}')

    assert.equal(css.stringify(), 'a{color:#ff0}');
  });

  it('keep comment', function() {
    var css = new CssDom('/*!*/a{color:#ff0}')

    assert.equal(css.stringify(), '/*!*/a{color:#ff0}');
  });
});