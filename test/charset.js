var CssDom = require('../cssdom');
var assert = require('assert');

describe('@charset', function() {
  it('Normal', function() {
    var content = '@charset "UTF-8";';
    var css = new CssDom(content);
    var dom = css.dom[0];

    assert.equal(dom.type, 'charset');
    assert.equal(dom.value, 'UTF-8');
  });

  it('unusual', function() {
    var css = new CssDom('@charset "UTF-8"');

    assert.equal();
  });
});