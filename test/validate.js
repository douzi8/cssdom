var CssDom = require('../cssdom');
var assert = require('assert');

describe('Validate css dom', function() {
  it('charset', function() {
    var css = new CssDom('');

    assert.throws(
      function() {
        css.validateDom({ type: 'charset' });
      },
      function(err) {
        return true;
      }
    );
  });

  it('import', function() {
    var css = new CssDom('');

    assert.throws(
      function() {
        css.validateDom({ type: 'import' });
      },
      function(err) {
        return true;
      }
    );
  });

  it('rule', function() {
    var css = new CssDom('');

    assert.throws(
      function() {
        css.validateDom({ type: 'rule' });
      },
      function(err) {
        return true;
      }
    );

    assert.throws(
      function() {
        css.validateDom({ type: 'rule', selectors: [] });
      },
      function(err) {
        return true;
      }
    );
  });

  it('keyframes', function() {
    var css = new CssDom('');

    assert.throws(
      function() {
        css.validateDom({ type: 'keyframes' });
      },
      function(err) {
        return true;
      }
    );
  });

  it('media', function() {
    var css = new CssDom('');

    assert.throws(
      function() {
        css.validateDom({ type: 'media' });
      },
      function(err) {
        return true;
      }
    );
  });

  it('comment', function() {
    var css = new CssDom('');

    assert.throws(
      function() {
        css.validateDom({ type: 'comment' });
      },
      function(err) {
        return true;
      }
    );

    assert.throws(
      function() {
        css.validateDom({ type: 'comment', value: '/*comment*/' });
      },
      function(err) {
        return true;
      }
    );
  });

  it('array', function() {
    var css = new CssDom('');

    assert.throws(
      function() {
        css.validateDom([{ type: 'import' }]);
      },
      function(err) {
        return true;
      }
    );
  });
});