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

  it('miss name', function() {
    var content = '@charset ';

    assert.throws(
      function() {
        var css = new CssDom(content);
      },
      function(err) {
        if (/@charset/.test(err)) {
          return true;
        }
      }
    );
  });

  it('miss quote', function() {
    var content = '@charset UTF-8';

    assert.throws(
      function() {
        var css = new CssDom(content);
      },
      function(err) {
        if (/@charset/.test(err)) {
          return true;
        }
      }
    );
  });

  it('miss ;', function() {
    var content = '@charset "UTF-8"';

    assert.throws(
      function() {
        var css = new CssDom(content);
      },
      function(err) {
        if (/@charset/.test(err)) {
          return true;
        }
      }
    );
  });

  it('not first', function() {
    var content = '.cls{}@charset "UTF-8"';

    assert.throws(
      function() {
        var css = new CssDom(content);
      },
      function(err) {
        if (/@charset/.test(err)) {
          return true;
        }
      }
    );
  });

  it('multiple', function() {
    var content = '@charset "UTF-8";@charset "UTF-8";';

    assert.throws(
      function() {
        var css = new CssDom(content);
      },
      function(err) {
        if (/@charset/.test(err)) {
          return true;
        }
      }
    );
  });
});