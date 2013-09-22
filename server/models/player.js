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
   * Is cell a finish for player
   * @param {number} row
   * @param {number} col
   * @returns {boolean}
   */
  isFinishCell: function(row, col) {
    var isFinishRow = row !== null && row === this.finish.row;
    var isFinishCol = col !== null && col === this.finish.col;
    return isFinishRow || isFinishCol;
  },

  /**
   * Is player at the finish line
   * @returns {boolean}
   */
  isWinner: function() {
    return this.isFinishCell(this.position.row, this.position.col);
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
