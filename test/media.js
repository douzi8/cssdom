var CssDom = require('../cssdom');
var assert = require('assert');

describe('@media', function() {
  it('Normal', function() {
    var content = "@media  screen,  print {body { font-size: 13px }}";
    var css = new CssDom(content);
    var dom = css.dom[0];

    assert.equal(dom.type, 'media');
    assert.equal(dom.value, 'screen, print');
  });

  it('rules', function() {
    var content = "@media  screen,  print {body { font-size: 13px }}";
    var css = new CssDom(content);
   
    assert.deepEqual(css.dom[0].rules, [{
      type: 'rule',
      selectors: ['body'],
      declarations: {
        'font-size': '13px'
      }
    }]);
  });

  it('miss name', function() {
    var content = '@media { ';

    assert.throws(
      function() {
        var css = new CssDom(content);
      },
      function(err) {
        if (/@media/.test(err)) {
          return true;
        }
      }
    );
  });

  it('miss {', function() {
    var content = '@media name';

    assert.throws(
      function() {
        var css = new CssDom(content);
      },
      function(err) {
        if (/\{/.test(err)) {
          return true;
        }
      }
    );
  });

  it('miss }', function() {
    var content = '@media name {.cls{}';

    assert.throws(
      function() {
        var css = new CssDom(content);
      },
      function(err) {
        if (/\}/.test(err)) {
          return true;
        }
      }
    );
  });
});