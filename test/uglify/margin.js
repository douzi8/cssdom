var assert = require('assert');
var margin = require('../../lib/margin');

describe('Uglify margin and padding', function() {
  it('none margin', function() {
    var rule = [
      { key: 'width', value: '10px'}
    ];
    
    assert.deepEqual(margin(rule), [{
      key: 'width',
      value: '10px'
    }]);
  });

  it('important', function() {
    var rule = [
      { key: 'padding', value: '10px 15px 10px' },
      { key: 'padding-right', value: '0 !important' }
    ];
    
    assert.deepEqual(margin(rule), [{
      key: 'padding',
      value: '10px 15px'
    }, {
      key: 'padding-right',
      value: '0 !important'
    }]);
  });

  describe('margin', function() {
    it('one', function() {
      var rule = [
        { key: 'margin', value: '10px 10px 10px 10px'}
      ];
      
      assert.deepEqual(margin(rule), [{
        key: 'margin',
        value: '10px'
      }]);

      var rule = [
        { key: 'margin', value: '10px 15px 10px'}
      ];
      
      assert.deepEqual(margin(rule), [{
        key: 'margin',
        value: '10px 15px'
      }]);

      var rule = [
        { key: 'margin', value: '10px 15px 20px 25px'}
      ];
      
      assert.deepEqual(margin(rule), [{
        key: 'margin',
        value: '10px 15px 20px 25px'
      }]);


      var rule3 = [
        { key: 'margin', value: '0 0 10px'}
      ];
      
      assert.deepEqual(margin(rule3), [{
        key: 'margin',
        value: '0 0 10px'
      }]);
    });

    it('four', function() {
      var rule = [
        { key: 'margin-top', value: '10px' },
        { key: 'margin-right', value: '15px' },
        { key: 'margin-bottom', value: '15px' },
        { key: 'margin-left', value: '15px' }
      ];
      
      assert.deepEqual(margin(rule), [{
        key: 'margin',
        value: '10px 15px 15px'
      }]);
    });

    it('mixture', function() {
      var rule = [
        { key: 'margin-top', value: '10px' },
        { key: 'margin', value: '15px' },
      ];
      
      assert.deepEqual(margin(rule), [{
        key: 'margin',
        value: '15px'
      }]);

      var rule2 = [
        { key: 'margin', value: '15px' },
        { key: 'margin-top', value: '10px' }
      ];
      
      assert.deepEqual(margin(rule2), [{
        key: 'margin',
        value: '10px 15px 15px'
      }]);
    });

    it('pos', function() {
      var rule2 = [
        { key: 'width', value: '10px' },
        { key: 'color', value: '#fff' },
        { key: 'margin-bottom', value: '5px' },
        { key: 'background', value: '1' },
        { key: 'margin', value: '5px 10px 10px' },
        { key: 'margin-top', value: '10px' },
        { key: 'height', value: '10px' }
      ];

      assert.deepEqual(margin(rule2), [
        { key: 'width', value: '10px' },
        { key: 'color', value: '#fff' },
        { key: 'background', value: '1' },
        { key: 'margin', value: '10px' },
        { key: 'height', value: '10px' }
      ]);
    });
  });
  
  describe('padding', function() {
    it('one', function() {
      var rule = [
        { key: 'padding', value: '10px 10px 10px 10px'}
      ];
      
      assert.deepEqual(margin(rule), [{
        key: 'padding',
        value: '10px'
      }]);

      var rule = [
        { key: 'padding', value: '10px 15px 10px'}
      ];
      
      assert.deepEqual(margin(rule), [{
        key: 'padding',
        value: '10px 15px'
      }]);

      var rule = [
        { key: 'padding', value: '10px 15px 20px 25px'}
      ];
      
      assert.deepEqual(margin(rule), [{
        key: 'padding',
        value: '10px 15px 20px 25px'
      }]);

    });

    it('four', function() {
      var rule = [
        { key: 'padding-top', value: '10px' },
        { key: 'padding-right', value: '15px' },
        { key: 'padding-bottom', value: '15px' },
        { key: 'padding-left', value: '15px' }
      ];
      
      assert.deepEqual(margin(rule), [{
        key: 'padding',
        value: '10px 15px 15px'
      }]);
    });

    it('mixture', function() {
      var rule = [
        { key: 'padding-top', value: '10px' },
        { key: 'padding', value: '15px' },
      ];
      
      assert.deepEqual(margin(rule), [{
        key: 'padding',
        value: '15px'
      }]);

      var rule2 = [
        { key: 'padding', value: '15px' },
        { key: 'padding-top', value: '10px' }
      ];
      
      assert.deepEqual(margin(rule2), [{
        key: 'padding',
        value: '10px 15px 15px'
      }]);
    });

    it('pos', function() {
      var rule2 = [
        { key: 'width', value: '10px' },
        { key: 'color', value: '#fff' },
        { key: 'background', value: '1' },
        { key: 'padding', value: '5px 10px 10px' },
        { key: 'padding-top', value: '10px' },
        { key: 'height', value: '10px' }
      ];

      assert.deepEqual(margin(rule2), [
        { key: 'width', value: '10px' },
        { key: 'color', value: '#fff' },
        { key: 'background', value: '1' },
        { key: 'padding', value: '10px' },
        { key: 'height', value: '10px' }
      ]);
    });
  });

  it('mixture', function() {
    var rule = [
      { key: 'padding-top', value: '10px' },
      { key: 'margin-right', value: '15px' },
      { key: 'padding-bottom', value: '15px' },
      { key: 'margin-left', value: '15px' }
    ];
      
      assert.deepEqual(margin(rule), rule);
  });

  it('pos', function() {
    var rule = [
      { key: 'height', value: '10px'},
      { key: 'width', value: '10px'},
      { key: 'margin', value: '10px' },
      { key: 'border', value: '10px'}
    ];
    
    assert.deepEqual(margin(rule), rule);
  });
});