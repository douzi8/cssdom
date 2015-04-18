var REG = require('./reg');

module.exports = function(str) {
  var ret = '';
  var skip = 1;
  var singleQuote = /^'[^']*'/;
  var doubleQuote = /^"[^"]*"/;
  var isMatch, reg;

  function quoteReplace(match) {
    isMatch = true;
    ret += match;
    return '';
  }

  function commentReplace() {
    isMatch = true;
    return '';
  }

  while (str) {
    var item = str[0];
    isMatch = false;

    if (item === "'" || item === '"') {
      reg = item === "'" ? singleQuote : doubleQuote;
      str = str.replace(reg, quoteReplace);

      if (isMatch) {
        continue;
      }
    }

    if (item + str[1] === '/*') {
      str = str.replace(REG.COMMENT_REG, commentReplace);

      if (isMatch) {
        continue;
      }
    }
    
    ret += item;
    str = str.slice(1);
  }
  
  return ret;
};