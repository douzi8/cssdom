var assert = require('assert');
var uglify = require('../../uglify/index');

describe('Uglify', function() {
  it('zero', function() {
    assert.equal(uglify.declarations([
      { key: 'width', value: '0px' },
      { key: 'height', value: '50px' }
    ]), 'width:0;height:50px');
  });

  it('background-image', function () {
    assert.equal(uglify.declarations([
      { key: 'background-image', value: `url("data:image/svg+xml;utf8,<svg></svg>")` },
    ]), `background-image:url("data:image/svg+xml;utf8,<svg></svg>")`);

   
  })

  it('background', function() {
     assert.equal(uglify.declarations([
      { key: 'background', value: `url('https://img08.lechebangstatic.com/lizard/ui/loadingb47a44f2ae.png') no-repeat center center` },
    ]), `background:url(https://img08.lechebangstatic.com/lizard/ui/loadingb47a44f2ae.png) no-repeat center center`)
  })
});