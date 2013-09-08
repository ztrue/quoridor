var fs = require('fs');

exports.PORT = 80;

exports.LOGGER = '';

exports.PUBLIC = PATH_BIN; // PATH_BUILD for dev

if (fs.existsSync(PATH_CONFIGS + 'config.local.js')) {
  var configLocal = require(PATH_CONFIGS + 'config.local');

  // rewrite default config with local config
  for (var param in this) {
    if (configLocal[param] !== undefined) {
      this[param] = configLocal[param];
    }
  }
}
