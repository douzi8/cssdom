(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.CssDom = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var util = require('utils-extend');
var uglify = require('./uglify/index');
var Scanner = require('./lib/scanner');

function CssDom(str) {
  str = str || '';
  // Css scanner
  var scanner = new Scanner(str);
  this.dom = scanner.dom;
}

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

  function mediarule(dom) {
    if (dom.type === 'comment') {
      if (dom.value.indexOf('!') === 0) {
        code.push('/*' + dom.value + '*/');
      }
    } else {
      rule(dom);
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
      case 'document':
      case 'keyframes':
      case 'media':
        var vendor = dom.vendor ? dom.vendor : '';
        code.push('@' + vendor + dom.type + ' ' + dom.value + '{');
        dom.rules.forEach(mediarule);
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

  function mediarule(dom, index) {
    if (dom.type === 'comment') {
      code.push(options.indent + '/*' + dom.value + '*/' + separateRule);
    } else {
      rule(dom, index);
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
      case 'document':
        var vendor = dom.vendor ? dom.vendor : '';
        code.push('@' + vendor + dom.type + ' ' + dom.value + ' {\n');
        dom.rules.forEach(mediarule);
        code.push('}' + separateRule);
        break;
      case 'comment':
        code.push('/*' + dom.value + ' */' + separateRule);
    }
  });

  return code.join('').trim();
};

module.exports = CssDom;
},{"./lib/scanner":3,"./uglify/index":6,"utils-extend":4}],2:[function(require,module,exports){
exports.WHITESPACE = /^([;\s]\s*)+/;

// comment start
exports.COMMENT_START = /^\/\*/;

// comment end
exports.COMMENT_END = /([\s\S]*?)\*\//;

exports.COMMENT = /\/\*([\s\S]*?)\*\//g;

// css selector
exports.SELECTOR = /^(?:'[^']*'|"[^"]*"|\/\*[\s\S]*?\*\/|[^{,}])+/;

// css declaration
exports.DECLARATION = /^(?:'[^']*'|"[^"]*"|\/\*[\s\S]*?\*\/|\([^)]*\)|[^;}])+/;


// @charset "UTF-8";
exports.CHARSET = /^@charset\s*(?:"([^"]*)"|'([^']*)')\s*;/;

// @media <media-query> { }
exports.MEDIA = /^@media((?:\([^\)]*\)|[^{])*)/;

// @keyframes <identifier> {
exports.KEYFRAMES = /^@([\w-]*)keyframes\s*([^{]+)/;

// @import url list-of-media-queries;
exports.IMPORT = /^@import\s*((?:'[^']*'|"[^"]*"|\([^)]*\)|[^;])+)/;

exports.DOCUMENT = /^@([\w-]*)document\s*([^{]+)/;

// RBG
exports.RBG = /rgb\s*\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/;

// hex
exports.UPPERCASE_HEX = /#[0-9A-F]{3,6}/g;

// for short hex
exports.SHORT_HEX = /#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3/g;
},{}],3:[function(require,module,exports){
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
},{"./reg":2}],4:[function(require,module,exports){
(function (process){
/**
 * @fileoverview Extend node util module
 * @author douzi <liaowei08@gmail.com> 
 */
var util = require('util');
var toString = Object.prototype.toString;
var isWindows = process.platform === 'win32';

function isObject(value) {
  return toString.call(value) === '[object Object]';
}

// And type check method: isFunction, isString, isNumber, isDate, isRegExp, isObject
['Function', 'String', 'Number', 'Date', 'RegExp'].forEach(function(item) {
  exports['is' + item]  = function(value) {
    return toString.call(value) === '[object ' + item + ']';
  };
});

/**
 * @description
 * Deep extend
 * @example
 * extend({ key: { k1: 'v1'} }, { key: { k2: 'v2' }, none: { k: 'v' } });
 * extend({ arr: [] }, { arr: [ {}, {} ] });
 */
function extend(target, source) {
  var value;

  for (var key in source) {
    value = source[key];

    if (Array.isArray(value)) {
      if (!Array.isArray(target[key])) {
        target[key] = [];
      }

      extend(target[key], value);
    } else if (isObject(value)) {
      if (!isObject(target[key])) {
        target[key]  = {};
      }

      extend(target[key], value);
    } else {
      target[key] = value;
    }
  }

  return target;
}

extend(exports, util);

// fixed util.isObject 
exports.isObject = isObject;

exports.extend = function() {
  var args = Array.prototype.slice.call(arguments, 0);
  var target = args.shift();

  args.forEach(function(item) {
    extend(target, item);
  });

  return target;
};

exports.isArray = Array.isArray;

exports.isUndefined = function(value) {
  return typeof value == 'undefined';
};

exports.noop = function() {};

exports.unique = function(array) {
  var result = [];

  array.forEach(function(item) {
    if (result.indexOf(item) == -1) {
      result.push(item);
    }
  });

  return result;
};

exports.escape = function(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

exports.unescape = function(value) {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
};

exports.hrtime = function(time) {
  if (time) {
    var spend = process.hrtime(time);
    
    spend = (spend[0] + spend[1] / 1e9) * 1000 + 'ms';

    return spend;
  } else {
    return process.hrtime();
  }
};

/**
 * @description
 * Return a copy of the object with list keys
 * @example
 * util.pick({ key: 'value' }, 'key', 'key1');
 * util.pick(obj, function(value, key, object) { });
 */
exports.pick = function(obj, iteratee) {
  var result = {};

  if (exports.isFunction(iteratee)) {
    for (var key in obj) {
      var value = obj[key];
      if (iteratee(value, key, obj)) {
        result[key] = value;
      }
    }
  } else {
    var keys = Array.prototype.slice.call(arguments, 1);

    keys.forEach(function(key) {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
  }

  return result;
};

exports.path = {};

if (isWindows) {
  // Regex to split a windows path into three parts: [*, device, slash,
  // tail] windows-only
  var splitDeviceRe =
      /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?([\\\/])?([\s\S]*?)$/;

  exports.path.isAbsolute = function(filepath) {
    var result = splitDeviceRe.exec(filepath),
        device = result[1] || '',
        isUnc = !!device && device.charAt(1) !== ':';
    // UNC paths are always absolute
    return !!result[2] || isUnc;
  };

  // Normalize \\ paths to / paths.
  exports.path.unixifyPath = function(filepath) {
    return filepath.replace(/\\/g, '/');
  };

} else {
  exports.path.isAbsolute = function(filepath) {
    return filepath.charAt(0) === '/';
  };

  exports.path.unixifyPath = function(filepath) {
    return filepath;
  };
}
}).call(this,require('_process'))
},{"_process":9,"util":11}],5:[function(require,module,exports){
var REG = require('../lib/reg');
var COLORS = {
  aliceblue: '#f0f8ff',
  antiquewhite: '#faebd7',
  aqua: '#0ff',
  aquamarine: '#7fffd4',
  azure: '#f0ffff',
  beige: '#f5f5dc',
  bisque: '#ffe4c4',
  black: '#000',
  blanchedalmond: '#ffebcd',
  blue: '#00f',
  blueviolet: '#8a2be2',
  brown: '#a52a2a',
  burlywood: '#deb887',
  cadetblue: '#5f9ea0',
  chartreuse: '#7fff00',
  chocolate: '#d2691e',
  coral: '#ff7f50',
  cornflowerblue: '#6495ed',
  cornsilk: '#fff8dc',
  crimson: '#dc143c',
  cyan: '#0ff',
  darkblue: '#00008b',
  darkcyan: '#008b8b',
  darkgoldenrod: '#b8860b',
  darkgray: '#a9a9a9',
  darkgreen: '#006400',
  darkgrey: '#a9a9a9',
  darkkhaki: '#bdb76b',
  darkmagenta: '#8b008b',
  darkolivegreen: '#556b2f',
  darkorange: '#ff8c00',
  darkorchid: '#9932cc',
  darkred: '#8b0000',
  darksalmon: '#e9967a',
  darkseagreen: '#8fbc8f',
  darkslateblue: '#483d8b',
  darkslategray: '#2f4f4f',
  darkslategrey: '#2f4f4f',
  darkturquoise: '#00ced1',
  darkviolet: '#9400d3',
  deeppink: '#ff1493',
  deepskyblue: '#00bfff',
  dimgray: '#696969',
  dimgrey: '#696969',
  dodgerblue: '#1e90ff',
  firebrick: '#b22222',
  floralwhite: '#fffaf0',
  forestgreen: '#228b22',
  fuchsia: '#f0f',
  gainsboro: '#dcdcdc',
  ghostwhite: '#f8f8ff',
  gold: '#ffd700',
  goldenrod: '#daa520',
  gray: '#808080',
  green: '#008000',
  greenyellow: '#adff2f',
  grey: '#808080',
  honeydew: '#f0fff0',
  hotpink: '#ff69b4',
  indianred: '#cd5c5c',
  indigo: '#4b0082',
  ivory: '#fffff0',
  khaki: '#f0e68c',
  lavender: '#e6e6fa',
  lavenderblush: '#fff0f5',
  lawngreen: '#7cfc00',
  lemonchiffon: '#fffacd',
  lightblue: '#add8e6',
  lightcoral: '#f08080',
  lightcyan: '#e0ffff',
  lightgoldenrodyellow: '#fafad2',
  lightgray: '#d3d3d3',
  lightgreen: '#90ee90',
  lightgrey: '#d3d3d3',
  lightpink: '#ffb6c1',
  lightsalmon: '#ffa07a',
  lightseagreen: '#20b2aa',
  lightskyblue: '#87cefa',
  lightslategray: '#778899',
  lightslategrey: '#778899',
  lightsteelblue: '#b0c4de',
  lightyellow: '#ffffe0',
  lime: '#0f0',
  limegreen: '#32cd32',
  linen: '#faf0e6',
  magenta: '#ff00ff',
  maroon: '#800000',
  mediumaquamarine: '#66cdaa',
  mediumblue: '#0000cd',
  mediumorchid: '#ba55d3',
  mediumpurple: '#9370db',
  mediumseagreen: '#3cb371',
  mediumslateblue: '#7b68ee',
  mediumspringgreen: '#00fa9a',
  mediumturquoise: '#48d1cc',
  mediumvioletred: '#c71585',
  midnightblue: '#191970',
  mintcream: '#f5fffa',
  mistyrose: '#ffe4e1',
  moccasin: '#ffe4b5',
  navajowhite: '#ffdead',
  navy: '#000080',
  oldlace: '#fdf5e6',
  olive: '#808000',
  olivedrab: '#6b8e23',
  orange: '#ffa500',
  orangered: '#ff4500',
  orchid: '#da70d6',
  palegoldenrod: '#eee8aa',
  palegreen: '#98fb98',
  paleturquoise: '#afeeee',
  palevioletred: '#db7093',
  papayawhip: '#ffefd5',
  peachpuff: '#ffdab9',
  peru: '#cd853f',
  pink: '#ffc0cb',
  plum: '#dda0dd',
  powderblue: '#b0e0e6',
  purple: '#800080',
  rebeccapurple: '#663399',
  red: '#f00',
  rosybrown: '#bc8f8f',
  royalblue: '#4169e1',
  saddlebrown: '#8b4513',
  salmon: '#fa8072',
  sandybrown: '#f4a460',
  seagreen: '#2e8b57',
  seashell: '#fff5ee',
  sienna: '#a0522d',
  silver: '#c0c0c0',
  skyblue: '#87ceeb',
  slateblue: '#6a5acd',
  slategray: '#708090',
  slategrey: '#708090',
  snow: '#fffafa',
  springgreen: '#00ff7f',
  steelblue: '#4682b4',
  tan: '#d2b48c',
  teal: '#008080',
  thistle: '#d8bfd8',
  tomato: '#ff6347',
  turquoise: '#40e0d0',
  violet: '#ee82ee',
  wheat: '#f5deb3',
  white: '#fff',
  whitesmoke: '#f5f5f5',
  yellow: '#ff0',
  yellowgreen: '#9acd32'
};
var HEX = '0123456789abcdef';

function toHex(n) {
  n = parseInt(n,10);
  n = Math.max(0, Math.min(n,255));
  return HEX.charAt((n - n % 16 ) / 16) + HEX.charAt(n % 16);
}

function rgbToHex(match, red, green, blue) {
  return '#' + toHex(red) + toHex(green) + toHex(blue);
}

module.exports = function(value) {
  // Replace color to hex
  for (var i in COLORS) {
    value = value.replace(new RegExp('\\b' + i + '\\b'), COLORS[i]);
  }

  // Rgb to hex
  value = value.replace(REG.RBG, rgbToHex);

  // To lowercase hex
  value = value.replace(REG.UPPERCASE_HEX, function(match) {
    return match.toLowerCase();
  });

  // For short
  value = value.replace(REG.SHORT_HEX, '#$1$2$3');

  return value;
};
},{"../lib/reg":2}],6:[function(require,module,exports){
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

exports.declarations = function(decs) {
  var str = '';

  decs = margin(decs);
  var l = decs.length;
  decs.forEach(function(item, index) {
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
},{"./color":5,"./margin":7}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],9:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],10:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],11:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":10,"_process":9,"inherits":8}]},{},[1])(1)
});