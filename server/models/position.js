module.exports = {
  /**
   * @see abstract::constructor()
   */
  constructor: function(opt_data) {
    this.row = null;
    this.col = null;

    this.set(opt_data);
  },

  /**
   * Reset position data
   */
  reset: function() {
    this.row = null;
    this.col = null;
  },

  /**
   * Is position has concrete place
   * @returns {boolean}
   */
  isLegal: function() {
    return this.row !== null && this.col !== null;
  },

  /**
   * Is position equals to another
   * @param {Position} position
   * @returns {boolean}
   */
  isEquals: function(position) {
    return this.row === position.row && this.col === position.col;
  },

  /**
   * Is passed position a finish (like this)
   * @param {Position} position
   * @returns {boolean}
   */
  isFinish: function(position) {
    return (this.row === null || this.row === position.row) &&
      (this.col === null || this.col === position.col);
  },

  /**
   * Get cell to the left
   * @param {number=} opt_shift Cell shift
   * @returns {Position}
   */
  left: function(opt_shift) {
    opt_shift = opt_shift || 1;

    return this.clone({
      col: this.col - opt_shift
    });
  },

  /**
   * Get cell to the right
   * @param {number=} opt_shift Cell shift
   * @returns {Position}
   */
  right: function(opt_shift) {
    opt_shift = opt_shift || 1;

    return this.clone({
      col: this.col + opt_shift
    });
  },

  /**
   * Get cell to the top
   * @param {number=} opt_shift Cell shift
   * @returns {Position}
   */
  up: function(opt_shift) {
    opt_shift = opt_shift || 1;

    return this.clone({
      row: this.row - opt_shift
    });
  },

  /**
   * Get cell to the bottom
   * @param {number=} opt_shift Cell shift
   * @returns {Position}
   */
  down: function(opt_shift) {
    opt_shift = opt_shift || 1;

    return this.clone({
      row: this.row + opt_shift
    });
  }
};

module.exports.constructor.prototype = module.exports;
