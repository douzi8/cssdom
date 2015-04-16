(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.CssDom = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var strip = require('strip-comment');
var util = require('utils-extend');
var uglify = require('./lib/uglify');

function clean(str) {
  return str.replace(/\s+/, ' ').trim();
}

function CssDom(str, filepath) {
  this.filepath = filepath || '';
  this._str = strip.css(str, true).trimRight();
  this._line = 1;
  this._column = 1;
  this.dom = [];
  this._scanner();
}

CssDom.prototype._scanner = function() {
  this._atrule();

  while (this._str) {
    this._whitespace();
    this._atrule() || this._rule();
  }
};

// match and update position
CssDom.prototype._match = function(reg) {
  var match = this._str.match(reg);

  if (!match) {
    return false;
  }

  this._updatePos(match[0]);
  return match;
};

// Update search position and save line, column
CssDom.prototype._updatePos = function(str) {
  var lines = str.match(/\n/g);
  var l = str.length;
  if (lines) this._line += lines.length;
  var i = str.lastIndexOf('\n');

  this._column = ~i ? l - i : this._column + l;
  this._str = this._str.slice(l);
};

// Exception handler
CssDom.prototype._error = function(msg) {
  msg = this.filepath + 'SyntaxError:' + msg + 
        ' at ' + this._line + ' line ' + 
        this._column + ' column';

  throw new Error(msg);
};

CssDom.prototype._whitespace = function() {
  this._match(/^\s+/);
};

CssDom.prototype._open = function() {
  if (!this._match(/^\{/)) {
    this._error('Missing {');
  }
};

CssDom.prototype._close = function() {
  if (!this._match(/^\}/)) {
    this._error('Missing }');
  }
};

/**
 * @description
 * Match @ rule
 * support
 * @media, @keyframes, @font-face, @important
 */
CssDom.prototype._atrule = function() {
  if (this._str[0] !== '@') return false;

  var result = this._atcharset() || 
               this._atmedia() || 
               this._atkeyframes() ||
               this._atfontface() ||
               this._atimport();
  return result;
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

  if (obj) {
    obj.rules.push(data);
  } else {
    this.dom.push(data);
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
CssDom.prototype._atcharset = function() {
  var match = this._match(/^\s*@charset\s*/);

  if (!match) return false;

  if (this._charsetChecked) {
    return this._error('@charset must be the first element');
  }

  this._charsetChecked = true;

  if (/^\s+/.test(match[0])) {
    return this._error('@charset can not after a space');
  }

  var encoding = this._match(/^'([^']+)'|"([^"]+)"/);

  if (!encoding) {
    return this._error('@charset without \' or ", the charset is not a string');
  }

  if (!this._match(/^;/)) {
    return this._error('@charset missing ;');
  }

  this.dom.push({
    type: 'charset',
    value: encoding[1] ? encoding[1] : encoding[2]
  });
  return true;
};

/**
 * @description
 * Match media rule
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media
 * @media <media-query>
 */
CssDom.prototype._atmedia = function() {
  var match = this._match(/^@media/);

  if (!match) return false;

  if (!this._match(/^\s+/)) {
    return this._error('@media missing spacing before name');
  }
  // fixed -o-min-device-pixel-ratio: 2/1 bug
  var name = this._match(/^[\(\)\s\w-:,\/]+/);

  if (!name) return this._error('@media missing name');

  this._open();
  var obj = {
    type: 'media',
    value: clean(name[0]),
    rules: []
  };

  while (this._str) {
    this._whitespace();

    if (this._str[0] === '}') {
      break;
    }

    this._rule(obj);
  }

  this._close();
  this.dom.push(obj);
  return true;
};

/**
 * @description
 * @keyframes <identifier>
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@keyframes
 */
CssDom.prototype._atkeyframes = function() {
  var match = this._match(/^@([\w-]*)keyframes\s*/);

  if (!match) return false;

  var name = this._match(/^[\w-\s]+/);

  if (!name) return this._error('@keyframes miss name');

  this._open();
  var obj = {
    type: 'keyframes',
    value: clean(name[0]),
    vendor: match[1],
    rules: []
  };

  while (this._str) {
    this._whitespace();

    if (this._str[0] === '}') {
      break;
    }

    this._rule(obj);
  }

  this._close();
  this.dom.push(obj);
  return true;
};

/**
 * @description
 * Syntax: @font-face
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face
 */
CssDom.prototype._atfontface = function() {
  if (/^@font-face/.test(this._str)) {
    this._rule();
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
  var match = this._match(/^@import\s*/);

  if (!match) return false;

  var name = this._match(/^('[^']*'|"[^"]*"|[\w-\s\(\),:])+/);

  if (!name) return this._error('@import missing name');

  if (!this._match(/^;/)) {
    return this._error('@import missing ;');
  }

  this.dom.push({
    type: 'import',
    value: name[0]
  });
  return true;
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
  var selectorReg = /^(?:'[^']*'|"[^"]*"|[^{,])+/;

  while (this._str) {
    this._whitespace();
    match = this._match(selectorReg);

    if (!match) {
      return this._error('Selector missing');
    }

    selector.push(match[0]);

    if (this._str[0] === '{') {
      break;
    }

    this._updatePos(',');
  }

  this._open();
  return selector.map(clean);
};

// fixed css rule with same property bug
var idCounter = 0;
function fixedProp() {
  return '__' + idCounter++;
}

CssDom.prototype._declaration = function() {
  var propertyReg = /^[\*_]?[\w-]+/;
  var valueReg = /^(?:'[^']*'|"[^"]*"|\([^\)]*\)|,\s*|[^;}\n])+/;
  var declaration = {};
  var property, value;

  while (this._str) {
    this._whitespace();

    if (this._str[0] === '}') {
      break;
    }

    property = this._match(propertyReg);

    if (!property) {
      return this._error('Declaration with property error');
    }

    if (!this._match(/^\s*:/)) {
      return this._error('Declaration error with missing :');
    }

    value = this._match(valueReg);

    if (this._str[0] === '\n' && !/^\s*}/.test(this._str)) {
      return this._error('Declaration error with missing ;');
    }

    // Skip to next declaration, fixed like ``color: red; ;``
    this._match(/^;(\s*;)*/);
    property = property[0].trim();
    value = value ? value[0].trim() : '';
    
    
    if (declaration[property]) {
      property = property + fixedProp();
    }

    declaration[property] = value;
  }

  this._close();
  return declaration;
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
    code.push(uglify.selectors(dom.selectors) + '{');
    code.push(uglify.declarations(dom.declarations));
    code.push('}');
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
        code.push('/*' + dom.value +'*/');
    }
  });

  return code.join('');
};

module.exports = CssDom;
},{"./lib/uglify":4,"strip-comment":5,"utils-extend":9}],2:[function(require,module,exports){
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
var RBG_REG = /rgb\s*\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/;

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
  value = value.replace(RBG_REG, rgbToHex);

  // To lowercase hex
  value = value.replace(/#[0-9A-F]{3,6}/g, function(match) {
    return match.toLowerCase();
  });

  // For short
  value = value.replace(/#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3/g, '#$1$2$3');

  return value;
};
},{}],3:[function(require,module,exports){
/**
 * uglify margin
 * @example
 * margin-top: 10px; margin-bottom: 5px;  -> margin: 10px auto 5px;
 */

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

    // margin property
    if (key.indexOf('margin') === 0) {
      marginPos = index;
      margin[key] = item.value;
    }

    // padding property
    if (key.indexOf('padding') === 0) {
      paddingPos = index;
      padding[key] = item.value;
    }
  });

  function exclude(obj, type, pos) {
    var l = Object.keys(obj).length;
    
    if (obj[type] || l === 4) {
      decs = decs.filter(function(item, index) {
        return item.key.indexOf(type) !== 0;
      });
      decs.splice(pos - l + 1, 0, stringify(obj, type));
    }
  }

  exclude(margin, 'margin', marginPos);
  exclude(padding, 'padding', paddingPos);

  return decs;
};
},{}],4:[function(require,module,exports){
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
},{"./color":2,"./margin":3}],5:[function(require,module,exports){
var JsScanner = require('./lib/js-scanner');
var CssScaner = require('./lib/css-scanner');

function strip(code, keepLine) {
  // Remove html comment
  code = strip.html(code, keepLine);

  // Remove css comment
  code = code.replace(
    /<style([^>]*)>([\s\S]+?)<\/style>/g,
    function(match, $1, $2) {
      return '<style'+ $1 +'>' + strip.css($2, keepLine) + '</style>';
    }
  );

  // Remove js code
  code = code.replace(
    /<script([^>]*)>([\s\S]+?)<\/script>/g,
    function(match, $1, $2) {
      var type = $1.match(/type=(?:"([^"]+)"|'([^']+)')/);

      if (type) {
        if (type[1] && type[1] !== 'text/javascript') return match;
        if (type[2] && type[2] !== 'text/javascript') return match;
      }

      return '<script' + $1 + '>' + strip.js($2, keepLine) + '</script>';
    }
  );

  return code;
}

function scanner(obj, code, keepLine) {
  var result = [];
  var index = 0;
  
  obj.on('comment', function(match, start) {
    var content = code.slice(index, start);

    if (keepLine) {
      content += match.replace(/[^\r\n]/g, ' ');
    }

    result.push(content);
    index = start + match.length;
  });

  obj.scanner();

  result.push(code.slice(index));

  return result.join('');
}

/**
 * @description
 * Strip js comments.
 */
// var str = '// not a comment';
// var str = '/* not a comment */';
// var reg = /dasda\/* */;
strip.js = function(code, keepLine) {
  var js = new JsScanner(code);
  
  return scanner(js, code, keepLine);
};

/**
 * @description
 * Strip html comments.
 */
strip.html = function(code, keepLine) {
  return code.replace(/<!--[\s\S]*?-->/g, function(match) {
    if (keepLine) {
      return match.replace(/[^\r\n]/g, ' ');
    } else {
      return '';
    }
  });
};

/**
 * @description
 * Strip css comments.
 */
strip.css = function(code, keepLine) {
  var css = new CssScaner(code);

  return scanner(css, code, keepLine);
};

module.exports = strip;
},{"./lib/css-scanner":6,"./lib/js-scanner":7}],6:[function(require,module,exports){
var util = require('util');
var Scanner = require('./scanner');

function CssScanner(str) {
  Scanner.call(this, str);
}

util.inherits(CssScanner, Scanner);

CssScanner.prototype.scanner = function() {
  var item;
  while (this._str) {
    item = this._str[0];

    if (this._singleQuote()) {
      continue;
    }

    if (this._doubleQuote()) {
      continue;
    }

    if (this._blockComment()) {
      continue;
    }

    this._updatePos(item);
  }
}

module.exports = CssScanner;
},{"./scanner":8,"util":14}],7:[function(require,module,exports){
var util = require('util');
var Scanner = require('./scanner');

function JsScanner(str) {
  Scanner.call(this, str);
  this._prev = '';
}

util.inherits(JsScanner, Scanner);

JsScanner.prototype.scanner = function() {
  var item;
  while (this._str) {
    item = this._str[0];

    if (this._singleQuote()) {
      continue;
    }

    if (this._doubleQuote()) {
      continue;
    }

    if (this._blockComment()) {
      continue;
    }

    if (this._lineComment()) {
      continue;
    }

    if (this._regexp()) {
      continue;
    }

    if (item !== ' ') {
      this._prev = item;
    }

    this._updatePos(item);
  }
}

JsScanner.prototype._lineComment = function() {
  if (this._str[0] + this._str[1] !== '//') return false;
  var start = this._index;
  var match = this._match(/\/\/.*/);

  this.emit('comment', match[0], start);
  return true;
}

JsScanner.prototype._regexp = function() {
  if (this._str[0] !== '/') return false;
  // Filter division method
  if (/[\d\)\w\$]/.test(this._prev)) return false;

  return this._match(/\/(?:[^\/\\\r\n]|\\.)*\//);
}

module.exports = JsScanner;
},{"./scanner":8,"util":14}],8:[function(require,module,exports){
var util = require('util');
var EventEmitter = require('events').EventEmitter;

function Scanner(str) {
  this._str = str;
  this._line = 1;
  this._column = 1;
  this._index = 0;
}

util.inherits(Scanner, EventEmitter);

// abstract method.  to be overridden in specific implementation classes.
Scanner.prototype.scanner = function() {
  throw new Error('not implemented');
};

// match and update position
Scanner.prototype._match = function(reg) {
  var match = this._str.match(reg);

  if (!match) {
    return false;
  }

  this._updatePos(match[0]);
  return match;
};

// Update search position and save line, column
Scanner.prototype._updatePos = function(str) {
  var lines = str.match(/\n/g);
  var l = str.length;
  if (lines) this._line += lines.length;
  var i = str.lastIndexOf('\n');

  this._column = ~i ? l - i : this._column + l;
  this._str = this._str.slice(l);
  this._index += l;
};

// Exception handler
Scanner.prototype._error = function(msg) {
  msg = 'SyntaxError:' + msg + 
        ' at ' + this._line + ' line ' + 
        this._column + ' column';

  throw new Error(msg);
};

/**
 * @description
 * Match block comment
 */
Scanner.prototype._blockComment = function() {
  if (this._str[0] + this._str[1] !== '/*') return false;
  var start = this._index;
  var match = this._match(/\/\*[\s\S]*?\*\//);

  if (!match) return this._error('Unexpected block comment /*');

  this.emit('comment', match[0], start);
  return true;
};

/**
 * @description
 * Match single quote
 */
Scanner.prototype._singleQuote = function(single) {
  if (this._str[0] !== "'") return false;
  var start = this._index;
  var match = this._match(/'(?:[^'\\]|\\.)*'/);

  if (!match) return this._error("Unexpected signle quote");

  this.emit('quote', match[0], start);
  return true;
}

/**
 * @description
 * Match double quote
 */
Scanner.prototype._doubleQuote = function(single) {
  if (this._str[0] !== '"') return false;
  var start = this._index;
  var match = this._match(/"(?:[^"\\]|\\.)*"/);

  if (!match) return this._error("Unexpected double quote");

  this.emit('quote', match[0], start);
  return true;
}

module.exports = Scanner;
},{"events":10,"util":14}],9:[function(require,module,exports){
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
},{"_process":12,"util":14}],10:[function(require,module,exports){
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

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],14:[function(require,module,exports){
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
},{"./support/isBuffer":13,"_process":12,"inherits":11}]},{},[1])(1)
});