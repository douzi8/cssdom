var CssDom = require('../cssdom');
var assert = require('assert');

describe('css beautify', function() {
  it('rule comment', function() {
    var css = new CssDom('a{/**/color:/**/#ff0/**/;/**/}');
    assert.equal(css.stringify(), 'a{color:#ff0}');

    var css2 = new CssDom('a{/**/}');
    assert.equal(css2.stringify(), '');
  });

  it('keep comment', function() {
    var css = new CssDom('/*!*/a{color:#ff0}')

    assert.equal(css.stringify(), '/*!*/a{color:#ff0}');
  });
});