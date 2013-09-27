var _ = require('underscore');

module.exports = {
  /**
   * Available walls directions
   * @enum {string}
   */
  Directions: {
    CENTER: 'center',
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical'
  },

  /**
   * @see abstract::constructor()
   */
  constructor: function(opt_data) {
    this.direction = null;
    this.position = this.model('position').new();

    if (opt_data.position) {
      opt_data.position = this.model('position').new(opt_data.position);
    }

    this.set(opt_data);
  },

  /**
   * @see abstract::validate()
   */
  validate: function() {
    if (!this.position.isLegal()) {
      throw 'Wall position is not legal';
    }

    if (!_(this.Directions).contains(this.direction)) {
      throw 'Invalid wall direction: \'' + this.direction + '\'';
    }
  }
};

module.exports.constructor.prototype = module.exports;
