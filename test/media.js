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

  it('@support', function() {
    var css = new CssDom('@media and @supports{}');

    assert.equal(css.stringify(), '@media and @supports{}');
  });
});