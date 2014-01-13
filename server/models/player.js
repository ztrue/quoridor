module.exports = {
  /**
   * @see abstract::constructor()
   */
  constructor: function(opt_data) {
    this.index = null;
    this.uid = null;
    this.walls = 0;
    this.position = this.model('position').new();
    this.finish = this.model('position').new();

    this.set(opt_data);
  },

  /**
   * Is cell a finish for player
   * @param {Position} position
   * @returns {boolean}
   */
  isFinishCell: function(position) {
    return this.finish.isFinish(position);
  },

  /**
   * Is player at the finish line
   * @returns {boolean}
   */
  isWinner: function() {
    return this.isFinishCell(this.position);
  },

  /**
   * Reset player user data
   */
  reset: function() {
    this.position.reset();

    this.set({
      uid: null
    });
  }
};

module.exports.constructor.prototype = module.exports;
