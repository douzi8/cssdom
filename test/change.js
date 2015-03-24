var CssDom = require('../cssdom');
var assert = require('assert');

describe('change css dom', function() {
  describe('unshift', function() {
    it('normal', function() {
      var css = new CssDom('');
      var rule = {
        type: 'rule',
        selectors: ['a'],
        declarations: {}
      };

      css.unshift(rule);
      assert.deepEqual(css.dom, [rule]);
    });

    it('after charset', function() {
      var css = new CssDom('@charset "utf8";');
      var rule = {
        type: 'rule',
        selectors: ['a'],
        declarations: {}
      };

      css.unshift(rule);
      assert.deepEqual(css.dom, [{
        type: 'charset',
        value: 'utf8'
      }, rule]);
    });

    it('after import', function() {
      var css = new CssDom('@import name;');
      var rule = {
        type: 'rule',
        selectors: ['a'],
        declarations: {}
      };

      css.unshift(rule);
      assert.deepEqual(css.dom, [{
        type: 'import',
        value: 'name'
      }, rule]);
    });

    it('unshift array', function() {
      var css = new CssDom('');
      var charset = {
        type: 'charset',
        value: 'utf8'
      };
      var importobj = {
        type: 'import',
        value: 'url()'
      };

      css.unshift([charset, importobj]);
      assert.deepEqual(css.dom, [
        charset,
        importobj
      ]);
    });
  });

  describe('push', function() {
    it('push single', function() {
      var css = new CssDom('');
      var charset = {
        type: 'charset',
        value: 'utf8'
      };
      var importobj = {
        type: 'import',
        value: 'url()'
      };

      css.push(charset);
      css.push(importobj);

      assert.deepEqual(css.dom, [
        charset,
        importobj
      ]);
    });

    it('push array', function() {
      var css = new CssDom('');
      var charset = {
        type: 'charset',
        value: 'utf8'
      };
      var importobj = {
        type: 'import',
        value: 'url()'
      };

      css.push([charset, importobj]);
      assert.deepEqual(css.dom, [
        charset,
        importobj
      ]);
    });
  });

  describe('select', function() {
    it('css', function() {
      var css = new CssDom('.cls{width: 200px;height: 200px;}');

      css.css(css.dom[0], {
        width: '',
        height: function() {

        },
        key: 'value'
      });

      assert.deepEqual(css.dom[0].declarations, {
        key: 'value'
      });
    });

    it('selector', function() {
      var css = new CssDom('.cls1{width: 200px;}@media print{.cls2{}.cls1{}}');
      var cls = css.selector('.cls1');

      cls.forEach(function(dom) {
        assert.deepEqual(dom.selectors, ['.cls1'])
      });
    });

    it('selector assign', function() {
      var css = new CssDom('.cls1{width: 200px;}@media print{.cls2{}}');

      css.selector('.cls1', {
        width: function(value, dom) {
          assert.equal(value, '200px');
          assert.deepEqual(dom.declarations, {
            width: '200px'
          });
          assert.equal(this, css);
          return '210px';
        },
        'border-left': '1px solid red'
      });

      css.selector('.cls2', {
        width: '200px'
      });

      assert.deepEqual(css.dom[0], {
        type: 'rule',
        selectors: ['.cls1'],
        declarations: {
          width: '210px',
          'border-left': '1px solid red'
        }
      });

      assert.deepEqual(css.dom[1], {
        type: 'media',
        value: 'print',
        rules: [
          {
            type: 'rule',
            selectors: ['.cls2'],
            declarations: {
              width: '200px'
            }
          }
        ]
      });
    });    

    it('property', function() {
      var css = new CssDom('.cls1{background: url();}.cls2{background:url();}');
      var child = css.property('background');

      child.forEach(function(dom) {
        css.css(dom, {
          background: 'url(demo.png)'
        });
      });

      assert.deepEqual(css.dom[0].declarations, {
        background: 'url(demo.png)'
      });
    });

    it('property assign', function() {
      var css = new CssDom('.cls1{background: url();}.cls2{background:url();}');

      css.property('background', {
        background: function(value, dom) {
          assert.equal(value, 'url()');

          if (dom.selectors[0] !== '.cls1' && dom.selectors[0] !== '.cls2') {
            assert.fail('dom value wrong');
          }

          return '1';
        }
      });

      assert.equal(css.dom[0].declarations.background, '1');
      assert.equal(css.dom[1].declarations.background, '1');
    });
  });
});