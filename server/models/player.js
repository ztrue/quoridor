var _ = require('underscore');

module.exports = {
  /**
   * @see abstract::constructor()
   */
  constructor: function(opt_data) {
    this.index = null;
    this.uid = null;
    this.walls = 0;
    this.position = {
      col: null,
      row: null
    };
    this.finish = {
      col: null,
      row: null
    };

    this.set(opt_data);
  },

  /**
   * Is player at the finish line
   * @returns {boolean}
   */
  isWinner: function() {
    var atFinishRow = this.position.row !== null && this.position.row === this.finish.row;
    var atFinishCol = this.position.col !== null && this.position.col === this.finish.col;
    return this.uid !== null && (atFinishRow || atFinishCol);
  },

  /**
   * Reset player user data
   */
  reset: function() {
    this.set({
      position: {
        col: null,
        row: null
      },
      uid: null
    });
  }
};

module.exports.constructor.prototype = module.exports;
