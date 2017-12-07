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

// @supports <supports-condition> { <group-rule-body>}
exports.SUPPORTS = /^@supports((?:\([^\)]*\)|[^{])*)/;

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