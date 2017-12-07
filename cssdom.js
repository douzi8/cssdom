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
      case 'supports':
        if (!dom.value) {
          throw new Error('@supports miss value');
        }

        if (!Array.isArray(dom.rules)) {
          throw new Error('@supports rules must be array');
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
      case 'supports':
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
      case 'supports':
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