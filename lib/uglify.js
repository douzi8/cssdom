var color = require('./color');
var margin = require('./margin');

function stripQuote(str) {
  return str.replace(/^['"]|['"]$/g, '');
}

function uglifyValue(value, key) {
  value = color(value);

  // strip 0 unit
  value = value.replace(/\b0(px|pt|em)\b/g, '0');

  // strip url quote
  value = value.replace(/url\(('[^']+'|"[^"]+")\)/g, function(match, $1) {
    return 'url(' + stripQuote($1) + ')';
  });

  // font-weight, 400 is the same as normal, and 700 is the same as bold
  if (key === 'font-weight') {
    value = value.replace('normal', 400).replace('bold', 700);
  }

  // !important
  value = value.replace(/\s+!important/g, '!important');

  return value;
}

exports.declarations = function(declarations) {
  var result = [];
  var str = '';

  // Object to array
  for (var i in declarations) {
    var key = i.replace(/__\w+$/, '');

    if (key !== 'comment') {
      result.push({
        key: key,
        value: declarations[i]
      });
    }
  }

  result = margin(result);
  var l = result.length;
  result.forEach(function(item, index) {
    var last = ';';

    if (index + 1 == l) {
      last = '';
    }

    str += item.key + ':' + uglifyValue(item.value, item.key) + last;
  });

  return str;
};

exports.selectors = function(selectors) {
  selectors  = selectors.join(',');
  // trim >, eg div > a
  selectors = selectors.replace(/\s*>\s*/g, '>');
  // strip quote, eg, [type="text"]
  selectors = selectors.replace(/=\s*('[\w]+'|"[\w]+")/g, function(match, $1) {
    return '=' + stripQuote($1);
  });

  return selectors;
};