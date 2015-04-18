var CssDom = require('../cssdom');
var assert = require('assert');

describe('css beautify', function() {
  it('indent', function() {
    var css = new CssDom('a{color:#ff0;}')

    assert.equal(css.beautify({
      indent: '  '
    }), 'a {\n  color: #ff0;\n}');
  });

  it('separateRule', function() {
    var css = new CssDom('a{}b{}')

    assert.equal(css.beautify({
      separateRule: true
    }), 'a {\n}\n\nb {\n}');
  });

  describe('@media', function() {
    it('indent', function() {
      var css = new CssDom('@media print{a{}}')

      assert.equal(css.beautify(), '@media print {\n  a {\n  }\n}');
    });

    it('indent', function() {
      var css = new CssDom('@media print{a{}b{}}')

      assert.equal(css.beautify({
        separateRule: true
      }), '@media print {\n  a {\n  }\n\n  b {\n  }\n\n}');
    });
  });
});