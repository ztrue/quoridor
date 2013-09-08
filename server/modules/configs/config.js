exports.PORT = 80;

exports.LOGGER = '';

exports.PUBLIC = PATH_BIN; // PATH_BUILD for dev

var configLocal = require(PATH_CONFIGS + 'config.local');

// rewrite default config with local config
for (var param in this) {
  if (configLocal[param] !== undefined) {
    this[param] = configLocal[param];
  }
}
