var CssDom = require('./cssdom');
var fs = require('fs');
var code = fs.readFileSync('./test.css', { encoding: 'utf8' });
var css = new CssDom(code);


console.log(css.beautify());
console.log(css.stringify());