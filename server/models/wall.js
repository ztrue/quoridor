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
    this.row = null;
    this.col = null;
    this.direction = null;

    this.set(opt_data);
  }
};

module.exports.constructor.prototype = module.exports;
