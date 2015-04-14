var color = require('./color');
/**
 * uglify css declarations value
 */
function uglifyValue(key, value) {
  value = color(value);

  return value;
}

module.exports = function(declarations) {
  var str = '';

  for (var i in declarations) {
      // fixed same property bug
      str += i.replace(/__\w+$/, '') + ':' + uglifyValue(i, declarations[i]) + ';';
  }

  return str;
}