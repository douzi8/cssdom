var CssDom = require('../cssdom');
var assert = require('assert');

describe('@keyframes', function() {
  it('Normal', function() {
    var content = "@keyframes progress-bar-stripes {}";
    var css = new CssDom(content);
    var dom = css.dom[0];

    assert.equal(dom.type, 'keyframes');
    assert.equal(dom.value, 'progress-bar-stripes');
  });

  it('vendor', function() {
    var content = "@-o-keyframes progress-bar-stripes{}";
    var css = new CssDom(content);
    var dom = css.dom[0];

    assert.equal(dom.type, 'keyframes');
    assert.equal(dom.value, 'progress-bar-stripes');
    assert.equal(dom.vendor, '-o-');
  });

  it('rules', function() {
    var content = "@-o-keyframes progress-bar-stripes{.cls{width: 200px;}}";
    var css = new CssDom(content);
   
    assert.deepEqual(css.dom[0].rules, [{
      type: 'rule',
      selectors: ['.cls'],
      declarations: {
        width: '200px'
      }
    }]);
  });
});