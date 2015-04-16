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
    if (Object.keys(dom.declarations).length) {
      code.push(uglify.selectors(dom.selectors) + '{');
      code.push(uglify.declarations(dom.declarations));
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
        code.push('/*' + dom.value +'*/');
    }
  });

  return code.join('');
};

module.exports = CssDom;