// css comment
exports.COMMENT_REG = /\/\*([\s\S]*?)\*\//;

exports.WHITESPACE = /^\s+/;

exports.OPEN_BRACE = /^\{/;

exports.CLOSE_BRACE = /^\}/;

exports.LINE = /\n/g;

// css selector
exports.SELECTOR = /^(?:'[^']*'|"[^"]*"|[^{,])+/;

// css property
exports.PROPERTY = /^[\*_]?[\w-]+/;

// css value
exports.VALUE = /^(?:'[^']*'|"[^"]*"|\([^\)]*\)|,\s*|[^;}\n])+/;

// RBG
exports.RBG = /rgb\s*\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/;

// hex
exports.UPPERCASE_HEX = /#[0-9A-F]{3,6}/g;

// for short hex
exports.SHORT_HEX = /#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3/g;