var REG = require('./reg');
// fixed css rule with same property bug
var idCounter = 0;

function fixedProp() {
  return '__' + idCounter++;
}

function clean(str) {
  return str.replace(REG.COMMENT, '').replace(/\s+/g, ' ').trim();
}

function Scanner(str) {
  this.str = str;
  this.dom = [];
  this.scanner();
}

Scanner.prototype.scanner = function() {
  while (this.str) {
    if (this.skip('rule')) {
      continue;
    }
    this.atrule() || this.rule();
  }
};

// match and update position
Scanner.prototype.match = function(reg) {
  var match = this.str.match(reg);

  if (!match) {
    return false;
  }

  this.str = this.str.slice(match[0].length);
  return match;
};

/**
 * Skip empty string and comment.
 * comment is rule comment or declaration comment.
 */
// rule comment: /* rule */ a { }
// declaration comment: a { /* declaration */color: red; }
Scanner.prototype.skip = function(type, obj) {
  this.match(REG.WHITESPACE);
  var match = this.match(REG.COMMENT_START);
  var value;

  if (match) {
    match = this.match(REG.COMMENT_END);

    if (match) {
      value = match[1];
    } else {
      value = this.str;
      this.str = '';
    }

    if (type === 'declaration') {
      obj['comment' + fixedProp()] = value;
    } else if (type === 'rule') {
      obj = obj || this.dom;
      obj.push({
        type: 'comment',
        value: value
      });
    }
    return true;
  } else {
    return false;
  }
};

Scanner.prototype.first = function(str) {
  if (this.str[0] === str) {
    this.str = this.str.slice(1);
    return true;
  } else {
    return false;
  }
};

/**
 * @description
 * Match @ rule
 * support
 * @media, @keyframes, @font-face, @important, @-moz-document
 */
Scanner.prototype.atrule = function() {
  if (this.str[0] === '@') {
    var result = this.atcharset() ||
      this.atmedia() ||
      this.atkeyframes() ||
      this.atimport() ||
      this.atdocument();
    return result;
  } else {
    return false;
  }
};

/**
 * @description
 * Match css rule
 * @example
 * selector { property: value; }
 */
Scanner.prototype.rule = function(obj) {
  var data = {
    type: 'rule',
    selectors: this.selector(),
    declarations: this.declaration()
  };

  if (data.selectors.length) {
    if (obj) {
      obj.rules.push(data);
    } else {
      this.dom.push(data);
    }
  }
};

/**
 * @description
 * Match css selector
 * @exmaple
 * a {} 
 * a, b {}
 */
Scanner.prototype.selector = function() {
  var selector = [];
  var match;

  while (this.str) {
    match = this.match(REG.SELECTOR);

    if (match) {
      selector.push(clean(match[0]));
      if (this.first('{')) {
        break;
      }
      this.first(',');
    } else {
      break;
    }
  }

  return selector;
};

// property: value
Scanner.prototype.declaration = function() {
  var declaration = {};
  var match, count = 0;

  while (this.str) {
    if (this.skip('declaration', declaration)) {
      continue;
    }

    if (this.first('}')) {
      break;
    }

    match = this.match(REG.DECLARATION);

    if (match) {
      match = clean(match[0]);
      var index = match.indexOf(':');

      if (index !== -1) {
        var key = match.slice(0, index);
        var value = match.slice(index + 1);

        if (declaration[key]) {
          key += '__' + count++;
        }

        declaration[key] = clean(value);
      }

      this.first(';');
    }
  }

  return declaration;
};

/**
 * @description
 * Match @ rule
 * support
 * @media, @keyframes, @font-face, @important, @document
 */
Scanner.prototype.atrule = function() {
  if (this.str[0] === '@') {
    var result = this.atcharset() ||
      this.atmedia() ||
      this.atsupports() ||
      this.atkeyframes() ||
      this.atdocument() ||
      this.atimport();
    return result;
  } else {
    return false;
  }
};

/**
 * @description
 * Scanner @charset
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@charset
 * @example
 * @charset "UTF-8";
 *  @charset "UTF-8"; Invalid, there is a character (a space) before the at-rule
 * @charset UTF-8; Invalid, without ' or ", the charset is not a CSS <string>
 */
Scanner.prototype.atcharset = function() {
  var match = this.match(REG.CHARSET);

  if (match) {
    var value = match[1] ? match[1] : match[2];
    this.dom.push({
      type: 'charset',
      value: value.trim()
    });
    return true;
  } else {
    return false;
  }
};

/**
 * @description
 * Match media rule
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media
 */
Scanner.prototype.atmedia = function() {
  var match = this.match(REG.MEDIA);

  if (match) {
    var obj = {
      type: 'media',
      value: clean(match[1]),
      rules: []
    };
    this.first('{');

    while (this.str) {
      if (this.skip('rule', obj.rules)) {
        continue;
      }

      if (this.first('}')) {
        break;
      }

      this.rule(obj);
    }

    this.dom.push(obj);
    return true;
  } else {
    return false;
  }
};

Scanner.prototype.atsupports = function() {
  var match = this.match(REG.SUPPORTS);

  if (match) {
    var obj = {
      type: 'supports',
      value: clean(match[1]),
      rules: []
    };
    this.first('{');

    while (this.str) {
      if (this.skip('rule', obj.rules)) {
        continue;
      }

      if (this.first('}')) {
        break;
      }

      this.rule(obj);
    }

    this.dom.push(obj);
    return true;
  } else {
    return false;
  }
};

/**
 * @description
 * @keyframes <identifier>
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@keyframes
 */
Scanner.prototype.atkeyframes = function() {
  var match = this.match(REG.KEYFRAMES);

  if (match) {
    var obj = {
      type: 'keyframes',
      value: clean(match[2]),
      vendor: match[1],
      rules: []
    };
    this.first('{');

    while (this.str) {
      if (this.skip('rule', obj.rules)) {
        continue;
      }

      if (this.first('}')) {
        break;
      }

      this.rule(obj);
    }

    this.dom.push(obj);
    return true;
  } else {
    return false;
  }
};
/**
 * @description
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@document
 */
Scanner.prototype.atdocument = function() {
  var match = this.match(REG.DOCUMENT);

  if (match) {
    var obj = {
      type: 'document',
      value: clean(match[2]),
      vendor: match[1],
      rules: []
    };
    this.first('{');

    while (this.str) {
      if (this.skip('rule', obj.rules)) {
        continue;
      }

      if (this.first('}')) {
        break;
      }

      this.rule(obj);
    }

    this.dom.push(obj);
    return true;
  } else {
    return false;
  }
};

/**
 * @description
 * Syntax: @import url;  or @import url list-of-media-queries;
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@import 
 */
Scanner.prototype.atimport = function() {
  var match = this.match(REG.IMPORT);

  if (match) {
    this.dom.push({
      type: 'import',
      value: match[1]
    });
    return true;
  } else {
    return false;
  }
};

module.exports = Scanner;