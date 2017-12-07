# cssdom — Simplified css syntax check or css dom handle
[![NPM](https://nodei.co/npm/cssdom.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/cssdom/)
```js
var CssDom = require('cssdom');
```

## install
```
npm install cssdom --save
```

### test
```
npm test
```

### browserify
Exports cssdom to front
```
browserify cssdom.js -s CssDom > cssdom.front.js
```

### online demo
[http://douzi8.github.io/cssdom/](http://douzi8.github.io/cssdom/)

## API
### CssDom(str)
* {string} ``str`` required
```js
var css = new CssDom('a{}');
```

### css.dom
The structure of css dom, it's an array with object item, list item type
* ``charset``
```js
// @charset 'utf8';

{
  type: 'charset',
  value: 'utf8'
}
```
* ``import``
```js
// @import 'custom.css';

{
  type: 'import',
  value: "'custom.css'"
}
```
* ``rule``
```js
// .a { color: #333;}

{
  type: 'rule',
  selectors: ['.a'],
  declarations: {
    color: '#333'
  }
}
```
* ``keyframes``
```js
// @-webkit-keyframes progress-bar-stripes{}

{
  type: 'keyframes',
  vendor: '-webkit-',
  value: 'progress-bar-stripes',
  rules: [
    // It's rule type
    ...
  ]
}
```
* ``document``
```js
{
  type: 'document',
  vendor: '-moz-',
  value: 'url-prefix()',
  rules: [
    // It's rule type
    ...
  ]
}
```
* ``media``
```js
// @media print {body { font-size: 10pt }}

{
  type: 'media',
  value: 'print',
  rules: [
    // It's rule type
    ...
  ]
}
```
* ``supports``
```js
// @supports (display: flex) {}

{
  type: 'supports',
  value: '(display: flex)',
  rules: [
    // It's rule type
    ...
  ]
}
```
* ``comment``
```js
// /*1*/

{
  type: 'comment',
  value: '1'
}
```
### css.css(dom, css)
Change css declarations
* {object} ``dom`` required
* {object} ``css`` required
```js
css.css(css.dom[0], {
  'color': 'red'
});
```

### css.selector(selector, css)
Change css by selector, if css is empty, it will return css dom
* {string} ``selector`` required
* {object} ``css``
```js
css.selector('.cls', {
  width: '200px',
  height: function(value, dom) {
    // value -> origin value
    // dom -> current css dom
    return value;
  },
  // delete color key
  color: ''
});

css.selector('.cls');
```

### css.property(property, css)
Change css by property
* {string} ``selector`` required
* {object} ``css`` required
```js
css.property('background', {
  background: function(value) {
    return value;
  }
});

var child = css.property('background');

child.forEach(function(dom) {
  css.css(dom, {
    background: function(value) {
      return value.replce(/url\(('[^']*'|"[^"]*"|[^)]*)\)/, function(src) {
        return src;
      });
    }
  });
});
```

### css.unshift(dom)
* {object} ``dom`` required  
Insert a new css dom to the top of css code
```js
css.unshift({
  type: 'comment',
  value: 'banner'
});
```

### css.push(dom)
* {object} ``dom`` required  
Push a new css dom
```js
css.push({
  type: 'rule',
  selectors: ['a'],
  declarations: {
    color: '#333',
    'line-height': '20px'
  }
});
```

### css.validateDom(dom)
* {object|array} ``dom`` required  
Validate the css dom, it's useful for handle css dom by youself
```
css.validateDom({});
css.validateDom([{}]);
```

### css.stringify()
Uglify css code.  
it will remove all comment, if you want to keep some comment, your comments will start with ``/*!``
```css
/*!
 * keep this comment
 */
```
```js
css.stringify();
```
### css.beautify(options)
Beautify css code
* {object} [options]
  * {string} [options.indent = '  ']  
Code indent
  * {boolean} [options.separateRule = false]  
Separate rules by new lines, default is a blank line