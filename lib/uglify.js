var color = require('./color');
/**
 * uglify css declarations
 */
exports.declarations = function(value) {
  value = color(value);

  return value;
}