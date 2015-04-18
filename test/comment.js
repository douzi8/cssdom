var CssDom = require('../cssdom');
var stripComment = require('../lib/comment');
var assert = require('assert');

describe('comment', function() {
  it('Normal', function() {
    var content = '.cls{/* comment */ }';
    var css = new CssDom(content);
    
    assert.equal(content.length, css._column - 1);
  });

  it('strip comment', function() {
    assert.equal(stripComment('/**/'), '');
    assert.equal(stripComment('a/**/'), 'a');
    assert.equal(stripComment('a/**//*a*/'), 'a');
    assert.equal(stripComment('a"b/**/"/**/'), 'a"b/**/"');
  });

  it('not normal', function() {
    assert.equal(stripComment('"'), '"');
    assert.equal(stripComment("'"), "'");
    assert.equal(stripComment("a/*"), "a/*");
  });

  it('rule comment', function() {
    assert.deepEqual(new CssDom('/* rule */').dom, [{
      type: 'comment',
      value: 'rule'
    }]);
  });

  it('delcalration comment', function() {
    var dom = new CssDom('a{/* rule */color: red; /* rule */}').dom;
    Object.keys(dom[0].declarations).forEach(function(key) {
      if (key.indexOf('comment') === 0) {
        assert.equal(dom[0].declarations[key], 'rule');
      }
    });
  });

  it('strip selector comment', function() {
    var dom = new CssDom('a /**/, b /**/{}').dom;

    assert.deepEqual(dom[0], {
      type: 'rule',
      selectors: ['a', 'b'],
      declarations: {}
    });
  });

  it('strip value comment', function() {
    var dom = new CssDom('a{color: /* comment */#ff0;}').dom;

    assert.deepEqual(dom, [{
      type: 'rule',
      selectors: ['a'],
      declarations: {
        color: '#ff0'
      }
    }]);

    var dom2 = new CssDom('a{color: #ff0/* comment */;}').dom;

    assert.deepEqual(dom2, [{
      type: 'rule',
      selectors: ['a'],
      declarations: {
        color: '#ff0'
      }
    }]);
  });
});