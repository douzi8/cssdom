/**
 * uglify margin
 * @example
 * margin-top: 10px; margin-bottom: 5px;  -> margin: 10px auto 5px;
 */
var important = /!\s*important/;

function stringify(obj, type) {
  var result = [];
  var value;

  for (var i in obj) {
    value = obj[i];

    switch (i) {
      case type + '-top':
        result[0] = value;
        break;
      case type + '-right':
        result[1] = value;
        break;
      case type + '-bottom':
        result[2] = value;
        break;
      case type + '-left':
        result[3] = value;
        break;
      case type:
        value = value.split(/\s+/);
        var l = value.length;

        if (l === 1) {
          result[0] = result[1] = result[2] = result[3] = value[0];
        } else if (l === 2) {
          result[0] = result[2] = value[0];
          result[1] = result[3] = value[1];
        } else if (l === 3) {
          result[0] = value[0];
          result[1] = result[3] = value[1];
          result[2] = value[2];
        } else {
          result = value;
        }
    }
  }

  if (result[1] === result[3]) {
    result.splice(3, 1);
    if (result[0] === result[2]) {
      result.splice(2, 1);
      if (result[0] === result[1]) {
        result.splice(1, 1);
      }
    }
  }

  return {
    key: type,
    value: result.join(' ')
  };
}

module.exports = function(decs) {
  var margin = {};
  var padding = {};
  var marginPos, paddingPos;

  decs.forEach(function(item, index) {
    var key = item.key;
    var value = item.value;

    // margin property
    if (key.indexOf('margin') === 0 && !important.test(value)) {
      marginPos = index;
      margin[key] = item.value;
    }

    // padding property
    if (key.indexOf('padding') === 0 && !important.test(value)) {
      paddingPos = index;
      padding[key] = item.value;
    }
  });

  function exclude(obj, type, pos) {
    var l = Object.keys(obj).length;
    
    if (obj[type] || l === 4) {
      decs = decs.filter(function(item, index) {
        return item.key.indexOf(type) !== 0 || important.test(item.value);
      });
      decs.splice(pos - l + 1, 0, stringify(obj, type));
    }
  }

  exclude(margin, 'margin', marginPos);
  exclude(padding, 'padding', paddingPos);

  return decs;
};