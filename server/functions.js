/**
 * Trim string
 * @param {string} string
 * @returns {string} Trimmed string
 */
GLOBAL.trim = function(string) {
  return string.replace(/^\s+|\s+$/g, '');
};

/**
 * Capitalize string
 * @param {string} string
 * @returns {string} Capitalized string
 */
GLOBAL.capitalize = function(string) {
  return string.charAt(0).toUpperCase() + string.substr(1);
};

/**
 * Escape RegExp
 * @param {string} string Part of RegExp
 * @returns {string} Escaped string
 */
GLOBAL.escapeRegExp = function(string) {
  return string.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
};

/**
 * Is object
 * @param {*} value
 * @returns {boolean}
 */
GLOBAL.isObject = function(value) {
  return value !== null && typeof value === 'object';
};
