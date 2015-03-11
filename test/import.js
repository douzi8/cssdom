var CssDom = require('../cssdom');
var assert = require('assert');

describe('@import', function() {
  it('Normal', function() {
    var content = "@import url('landscape.css') screen and (orientation:landscape);";
    var css = new CssDom(content);
    var dom = css.dom[0];

    assert.equal(dom.type, 'import');
    assert.equal(dom.value, "url('landscape.css') screen and (orientation:landscape)");
  });

  it('miss name', function() {
    var content = '@import ';

    assert.throws(
      function() {
        var css = new CssDom(content);
      },
      function(err) {
        if (/@import/.test(err)) {
          return true;
        }
      }
    );
  });

  it('miss ;', function() {
    var content = '@import url("bluish.css") projection, tv';

    assert.throws(
      function() {
        var css = new CssDom(content);
      },
      function(err) {
        if (/@import/.test(err)) {
          return true;
        }
      }
    );
  });
});