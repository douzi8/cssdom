var assert = require('assert');
var fs = require('fs');
var path = require('path');
var CssDom = require('../cssdom');


function readFileSync(filepath) {
  return fs.readFileSync(path.join(__dirname, filepath), { encoding: 'utf8' });
}

function writeFileSync(filepath, content) {
  return fs.writeFileSync(path.join(__dirname, filepath), content, { encoding: 'utf8' });
}

describe('bootstrap', function() {
  it('bootstrap.css', function() {
    var content = readFileSync('vendor/bootstrap.css');
    var css = new CssDom(content);

    var contentmin = readFileSync('vendor/bootstrap.min.css');
    var cssmin = new CssDom(contentmin);

    assert.equal(css.dom.length, cssmin.dom.length);
  });

  it('stringify', function() {
    var contentmin = readFileSync('vendor/bootstrap.min.css');
    var cssmin = new CssDom(contentmin);

    writeFileSync('vendor/bootstrap.dest.css', cssmin.stringify());
  });
});