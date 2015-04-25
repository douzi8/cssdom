var REG = require('./lib/reg');
var util = require('utils-extend');
var uglify = require('./lib/uglify');
// fixed css rule with same property bug
var idCounter = 0;

function fixedProp() {
  return '__' + idCounter++;
}

function clean(str) {
  return str.replace(REG.COMMENT, '').replace(/\s+/g, ' ').trim();
}

function CssDom(str) {
  this._str = str.trimRight();
  this.dom = [];
  this._scanner();
}

CssDom.prototype._scanner = function() {
  while (this._str) {
    if (this._skip('rule')) {
      continue;
    }
    this._atrule() || this._rule();
  }
};

// match and update position
CssDom.prototype._match = function(reg) {
  var match = this._str.match(reg);

  if (!match) {
    return false;
  }

  this._str = this._str.slice(match[0].length);
  return match;
};

/**
 * Skip empty string and comment.
 * comment is rule comment or declaration comment.
 */
// rule comment: /* rule */ a { }
// declaration comment: a { /* declaration */color: red; }
CssDom.prototype._skip = function(type, obj) {
  this._match(REG.WHITESPACE);
  var match = this._match(REG.COMMENT_START);
  var value;

  if (match) {
    match = this._match(REG.COMMENT_END);

    if (match) {
      value = match[1];
    } else {
      value = this._str;
      this._str = '';
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

CssDom.prototype._first = function(str) {
  if (this._str[0] === str) {
    this._str = this._str.slice(1);
    return true;
  } else {
    return false;
  }
};

CssDom.prototype._open = function() {
  this._match(REG.OPEN_BRACE);
};

CssDom.prototype._close = function() {
  this._match(REG.CLOSE_BRACE);
};

/**
 * @description
 * Match @ rule
 * support
 * @media, @keyframes, @font-face, @important
 */
CssDom.prototype._atrule = function() {
  if (this._str[0] === '@') {
    var result = this._atcharset() ||
      this._atmedia() ||
      this._atkeyframes() ||
      this._atimport();
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
CssDom.prototype._rule = function(obj) {
  var data = {
    type: 'rule',
    selectors: this._selector(),
    declarations: this._declaration()
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
CssDom.prototype._selector = function() {
  var selector = [];
  var match;

  while (this._str) {
    match = this._match(REG.SELECTOR);

    if (match) {
      selector.push(clean(match[0]));
      if (this._first('{')) {
        break;
      }
      this._first(',');
    } else {
      break;
    }
  }

  return selector;
};

// property: value
CssDom.prototype._declaration = function() {
  var declaration = {};
  var match;

  while (this._str) {
    if (this._skip('declaration', declaration)) {
      continue;
    }

    if (this._first('}')) {
      break;
    }

    match = this._match(REG.DECLARATION);

    if (match) {
      match = clean(match[0]);
      var index = match.indexOf(':');

      if (index !== -1) {
        var key = match.slice(0, index);
        var value = match.slice(index + 1);

        if (declaration[key]) {
          key = key + fixedProp();
        }

        declaration[key] = clean(value);
      }

      this._first(';');
    }
  }

  return declaration;
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
CssDom.prototype._atcharset = function() {
  var match = this._match(REG.CHARSET);

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
CssDom.prototype._atmedia = function() {
  var match = this._match(REG.MEDIA);

  if (match) {
    var obj = {
      type: 'media',
      value: clean(match[1]),
      rules: []
    };
    this._first('{');

    while (this._str) {
      if (this._skip('rule', obj.rules)) {
        continue;
      }

      if (this._first('}')) {
        break;
      }

      this._rule(obj);
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
CssDom.prototype._atkeyframes = function() {
  var match = this._match(REG.KEYFRAMES);

  if (match) {
    var obj = {
      type: 'keyframes',
      value: clean(match[2]),
      vendor: match[1],
      rules: []
    };
    this._first('{');

    while (this._str) {
      if (this._skip('rule', obj.rules)) {
        continue;
      }

      if (this._first('}')) {
        break;
      }

      this._rule(obj);
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
CssDom.prototype._atimport = function() {
  var match = this._match(REG.IMPORT);

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

// Traverse css dom
CssDom.prototype._search = function(callback) {
  var self = this;

  this.dom.forEach(function(dom) {
    if (dom.type === 'rule') {
      callback.call(self, dom);
    } else if (dom.rules) {
      dom.rules.forEach(callback.bind(self));
    }
  });
};

// Change css declarations
CssDom.prototype.css = function(dom, css) {
  for (var i in css) {
    var item = css[i];

    if (util.isFunction(item)) {
      var value = item.call(this, dom.declarations[i], dom);

      if (util.isUndefined(value) || value === '') {
        delete dom.declarations[i];
      } else {
        dom.declarations[i] = value;
      }
    } else {
      if (item === '') {
        delete dom.declarations[i];
      } else {
        dom.declarations[i] = item;
      }
    }
  }
};

/**
 * @description
 * Change css dom by selector
 * @example
 * css.selector('.cls');
 * css.selector('.cls', {key: 'value', 'background': function(value) { return value; }  });
 */
CssDom.prototype.selector = function(selector, css) {
  var result = [];

  this._search(function(dom) {
    if (dom.selectors.indexOf(selector) !== -1) {
      if (css) {
        this.css(dom, css);
      } else {
        result.push(dom);
      }
    }
  });

  if (!css) {
    return result;
  }
};

/**
 * @description
 * Change css dom by property
 * @example
 * css.property('background');
 * css.property('background', {key: 'value', 'background': function(value) { return value; }  });
 */
CssDom.prototype.property = function(property, css) {
  var result = [];

  this._search(function(dom) {
    if (dom.declarations[property]) {
      if (css) {
        this.css(dom, css);
      } else {
        result.push(dom);
      }
    }
  });

  if (!css) {
    return result;
  }
};

/**
 * @description
 * Create css dom
 */
CssDom.prototype.validateDom = function(dom) {
  dom = Array.isArray(dom) ? dom : [dom];

  function validate(dom) {
    switch (dom.type) {
      case 'charset':
        if (!dom.value) {
          throw new Error('@charset miss value');
        }
        break;
      case 'import':
        if (!dom.value) {
          throw new Error('@import miss value');
        }
        break;
      case 'rule':
        if (!Array.isArray(dom.selectors)) {
          throw new Error('Rule selectors must be array');
        } else if (!dom.selectors.length) {
          throw new Error('Rule selectors can not be empty array');
        }

        if (!util.isObject(dom.declarations)) {
          throw new Error('Rule declarations must be object');
        }
        break;
      case 'keyframes':
        if (!dom.value) {
          throw new Error('@keyframes miss value');
        }
        break;
      case 'media':
        if (!dom.value) {
          throw new Error('@media miss value');
        }

        if (!Array.isArray(dom.rules)) {
          throw new Error('@media rules must be array');
        }
        break;
      case 'comment':
        if (!dom.value) {
          throw new Error('@charset miss value');
        }

        if (dom.value.indexOf('/*') === 0) {
          throw new Error('comment value do not need /**/');
        }
        break;
      default:
        throw new Error('unkown dom type');
    }
  }

  dom.forEach(validate);
  return dom;
};

/**
 * @description
 * Insert css dom at the top
 */
CssDom.prototype.unshift = function(dom) {
  dom = this.validateDom(dom);
  var doms = this.dom;
  var self = this;
  var type;

  for (var i = 0, l = doms.length; i < l; i++) {
    type = doms[i].type;
    if (type !== 'import' && type !== 'charset') {
      break;
    }
  }

  dom.forEach(function(item) {
    self.dom.splice(i++, 0, item);
  });
};

/**
 * @description
 * Append css dom
 */
CssDom.prototype.push = function(dom) {
  dom = this.validateDom(dom);
  var self = this;

  dom.forEach(function(item) {
    self.dom.push(item);
  });
};

CssDom.prototype.stringify = function() {
  var code = [];

  function rule(dom) {
    var result = [];
    var decs = dom.declarations;

    // Object to array
    for (var i in decs) {
      var key = i.replace(/__\w+$/, '');
      if (key !== 'comment') {
        result.push({
          key: key,
          value: decs[i]
        });
      }
    }

    if (result.length) {
      code.push(uglify.selectors(dom.selectors) + '{');
      code.push(uglify.declarations(result));
      code.push('}');
    }
  }

  this.dom.forEach(function(dom) {
    switch (dom.type) {
      case 'charset':
        code.push("@charset '" + dom.value + "';");
        break;
      case 'import':
        code.push('@import ' + dom.value + ';');
        break;
      case 'rule':
        rule(dom);
        break;
      case 'keyframes':
      case 'media':
        var vendor = dom.vendor ? dom.vendor : '';
        code.push('@' + vendor + dom.type + ' ' + dom.value + '{');
        dom.rules.forEach(rule);
        code.push('}');
        break;
      case 'comment':
        if (dom.value.indexOf('!') === 0) {
          code.push('/*' + dom.value + '*/');
        }
    }
  });

  return code.join('');
};

CssDom.prototype.beautify = function(options) {
  options = util.extend({
    indent: '  ',
    separateRule: false
  }, options);
  var code = [];
  var separateRule = options.separateRule ? '\n\n' : '\n';

  function rule(dom, child) {
    var childIndent = util.isUndefined(child) ? '' : options.indent;
    var selectors = childIndent + dom.selectors.join(',\n' + childIndent) + ' {\n';
    var declaration;

    code.push(selectors);

    for (var i in dom.declarations) {
      var key = i.replace(/__\w+$/, '');

      if (key === 'comment') {
        declaration = childIndent + options.indent + '/*' + dom.declarations[i] + '*/\n';
      } else {
        declaration = childIndent + options.indent + key + ': ' + dom.declarations[i] + ';\n';
      }

      code.push(declaration);
    }

    code.push(childIndent + '}' + separateRule);
  }

  this.dom.forEach(function(dom) {
    switch (dom.type) {
      case 'charset':
        code.push("@charset '" + dom.value + "';");
        break;
      case 'import':
        code.push('@import ' + dom.value + ';');
        break;
      case 'rule':
        rule(dom);
        break;
      case 'keyframes':
      case 'media':
        var vendor = dom.vendor ? dom.vendor : '';
        code.push('@' + vendor + dom.type + ' ' + dom.value + ' {\n');
        dom.rules.forEach(rule);
        code.push('}' + separateRule);
        break;
      case 'comment':
        code.push('/*' + dom.value + ' */' + separateRule);
    }
  });

  return code.join('').trim();
};

module.exports = CssDom;