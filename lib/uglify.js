var color = require('./color');
var margin = require('./margin');


function uglifyValue(value) {
  value = color(value);
  value = zero(value);

  return value;
}

function zero(value) {
  return value.replace(/\b0(px|pt|em)\b/g, '0');
}

module.exports = function(declarations) {
  var result = [];
  var str = '';

  // Object to array
  for (var i in declarations) {
    result.push({
      key: i.replace(/__\w+$/, ''),
      value: declarations[i]
    });
  }

  result = margin(result);
  var l = result.length;
  result.forEach(function(item, index) {
    var last = ';';

    if (index + 1 == l) {
      last = '';
    }

    str += item.key + ':' + uglifyValue(item.value) + last;
  });

  return str;
};