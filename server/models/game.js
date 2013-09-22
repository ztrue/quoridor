var _ = require('underscore');

module.exports = {
  /**
   * Number of players
   * @const {number}
   */
  PLAYERS_MIN: 2,
  PLAYERS_MAX: 4,
  PLAYERS_DEFAULT: 2,

  /**
   * Field size
   * @const {number}
   */
  SIZE_MIN: 3,
  SIZE_MAX: 15,
  SIZE_DEFAULT: 9,

  /**
   * Number of walls, each player has
   * @const {number}
   */
  WALLS_MIN: 0,
  WALLS_MAX: 50,
  WALLS_DEFAULT: 10,

  /**
   * Available commands
   * @enum {string}
   */
  Commands: {
    BUILD: 'build',
    MOVE: 'move',
    SKIP: 'skip'
  },

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
    this.config = this.getDefaultConfig();
    this.id = null;
    this.set(opt_data);
    this.reset();
  },

  /**
   * Get default game config
   * @returns {Object}
   */
  getDefaultConfig: function() {
    return {
      players: this.PLAYERS_DEFAULT,
      size: this.SIZE_DEFAULT,
      walls: this.WALLS_DEFAULT
    }
  },

  /**
   * @see abstract::validate()
   */
  validate: function() {
    if (this.config.players > this.PLAYERS_MAX) {
      throw 'Maximum players: ' + this.PLAYERS_MAX;
    }

    if (this.config.players < this.PLAYERS_MIN) {
      throw 'Minimum players: ' + this.PLAYERS_MIN;
    }

    if (this.config.size > this.SIZE_MAX) {
      throw 'Maximum size: ' + this.SIZE_MAX;
    }

    if (this.config.size < this.SIZE_MIN) {
      throw 'Minimum size: ' + this.SIZE_MIN;
    }

    if (this.config.walls > this.WALLS_MAX) {
      throw 'Maximum walls: ' + this.WALLS_MAX;
    }

    if (this.config.walls < this.WALLS_MIN) {
      throw 'Minimum walls: ' + this.WALLS_MIN;
    }
  },

  /**
   * Reset game
   */
  reset: function() {
    this.resetPositions();
    this.resetState();
    this.resetPlayers();
  },

  /**
   * Reset start and end positions
   */
  resetPositions: function() {
    var middleCell = Math.floor(this.config.size / 2);
    var maxCell = this.config.size - 1;

    this.positions = {
      /**
       * Players finish positions
       * @type {Array.<Position>}
       */
      finish: [
        {
          col: maxCell,
          row: null
        },
        {
          col: 0,
          row: null
        },
        {
          col: null,
          row: maxCell
        },
        {
          col: null,
          row: 0
        }
      ],
      /**
       * Players start positions
       * @type {Array.<Position>}
       */
      start: [
        {
          col: 0,
          row: middleCell
        },
        {
          col: maxCell,
          row: middleCell
        },
        {
          col: middleCell,
          row: 0
        },
        {
          col: middleCell,
          row: maxCell
        }
      ]
    };
  },

  /**
   * Reset game state
   */
  resetState: function() {
    this.state = {
      /**
       * Active player index
       * @type {?number}
       */
      activePlayer: null,
      /**
       * Is game in progress
       * @type {boolean}
       */
      inProgress: false,
      /**
       * Players on field
       * @type {Array.<Player>}
       * @schema {
       *   finish: {
       *     col: ?number,
       *     row: ?number
       *   },
       *   index: number,
       *   position: {
       *     col: ?number,
       *     row: ?number
       *   },
       *   uid: ?string,
       *   walls: number
       * }
       */
      players: [],
      /**
       * Walls on field
       * @type {Object.<string, Array.<Position>>}
       * @schema {
       *   col: number,
       *   row: number
       * }
       */
      walls: {},
      /**
       * Winner index
       * @type {?number}
       */
      winner: null
    };

    // init walls directions
    _(this.Directions).each(function(direction) {
      this.state.walls[direction] = [];
    }.bind(this));
  },

  /**
   * Reset players
   */
  resetPlayers: function() {
    for (var i = 0; i < this.config.players; i++) {
      var player = faf.model('player').new({
        index: i,
        finish: {
          col: this.positions.finish[i].col,
          row: this.positions.finish[i].row
        },
        walls: this.config.walls
      });

      this.state.players.push(player);
    }
  },

  /**
   * Start game
   */
  start: function() {
    this.state.inProgress = true;
    this.state.activePlayer = Math.floor(
      Math.random() * this.config.players
    );
  },

  /**
   * Join game
   * @param {string} uid UID
   * @returns {?number} Index if user has been joined
   */
  join: function(uid) {
    var index = this.addPlayer(uid);
    if (this.isFull()) {
      this.start();
    }
    return index;
  },

  /**
   * Exit from game
   * @param {string} uid UID
   * @returns {?number} Index if user has been exit
   */
  exit: function(uid) {
    var index = this.removePlayer(uid);
    if (index !== null) {
      var player = this.state.players[index];
      player.uid = null;

      if (this.state.inProgress) {
        player.position.row = null;
        player.position.col = null;

        // if only one player left
        if (this.countPlayers() === 1) {
          this.state.activePlayer = null;
          this.state.players.forEach(function(player) {
            if (player.uid !== null) {
              // he is a winner
              this.state.winner = player.index;
            }
          }.bind(this));
          // if more than one and there is a turn of user that exit
        } else if (this.state.activePlayer === index) {
          this.nextTurn();
        }
      }
    }
    return index;
  },

  /**
   * Get game winner
   * @returns {?number} Winner index if exists
   */
  getWinner: function() {
    var index = null;

    this.state.players.forEach(function(player) {
      if (player.isWinner()) {
        index = player.index;
      }
    }.bind(this));

    return index;
  },

  /**
   * Next turn
   */
  nextTurn: function() {
    this.state.activePlayer++;
    if (this.state.activePlayer >= this.config.players) {
      this.state.activePlayer = 0;
    }

    if (this.state.players[this.state.activePlayer].uid === null) {
      this.nextTurn();
    }
  },

  /**
   * Add player to game
   * @param {string} uid UID
   * @returns {?number} Player index if added
   */
  addPlayer: function(uid) {
    if (this.state.inProgress) {
      throw 'Game already in progress';
    }

    var emptyIndex = null;

    _(this.state.players).each(function(player, index) {
      if (player.uid === uid) {
        // player already exists
        throw 'Player already exists';
      }

      if (emptyIndex === null && player.uid === null) {
        emptyIndex = index;
      }
    }.bind(this));

    if (emptyIndex === null) {
      throw 'Game is full';
    }

    this.state.players[emptyIndex].set({
      uid: uid,
      position: {
        col: this.positions.start[emptyIndex].col,
        row: this.positions.start[emptyIndex].row
      }
    });

    return emptyIndex;
  },

  /**
   * Remove player from game
   * @param {string} uid UID
   * @returns {?number} Player index if removed
   */
  removePlayer: function(uid) {
    var index = null;

    this.state.players.forEach(function(player) {
      if (player.uid === uid) {
        player.reset();
        index = player.index;
      }
    }.bind(this));

    return index;
  },

  /**
   * Count players in game
   * @returns {number}
   */
  countPlayers: function() {
    var counter = 0;

    this.state.players.forEach(function(player) {
      if (player.uid !== null) {
        counter++;
      }
    }.bind(this));

    return counter;
  },

  /**
   * Is game full
   * @returns {boolean}
   */
  isFull: function() {
    return this.countPlayers() === this.config.players;
  },

  /**
   * Execute command
   * @param {Object} data Command data
   */
  command: function(data) {
    var row = parseInt(data.row || 0, 10);
    var col = parseInt(data.col || 0, 10);

    switch (data.command) {
      case this.Commands.BUILD:
        this.build(this.state.activePlayer, row, col, data.direction);
        break;

      case this.Commands.MOVE:
        this.move(this.state.activePlayer, row, col);
        break;

      case this.Commands.SKIP:
        break;

      default:
        throw 'Invalid command';
    }
  },

  /**
   * Build a wall
   * @param {number} index Player index
   * @param {number} row
   * @param {number} col
   * @param {Directions} direction
   */
  build: function(index, row, col, direction) {
    var player = this.state.players[index];

    // second cell where wall also will be build
    var nearbyRow = null;
    var nearbyCol = null;

    switch (direction) {
      case this.Directions.HORIZONTAL:
        nearbyRow = row;
        nearbyCol = col + 1;
        break;

      case this.Directions.VERTICAL:
        nearbyRow = row + 1;
        nearbyCol = col;
        break;
    }

    var isValidDirection = [
      this.Directions.HORIZONTAL,
      this.Directions.VERTICAL
    ].indexOf(direction) >= 0;

    if (player.walls === 0 ||
      !isValidDirection ||
      !this.isValidPosition(row, col, true, direction) ||
      !this.isValidPosition(nearbyRow, nearbyCol, true, direction) ||
      !this.isValidPosition(row, col, true, this.Directions.CENTER) ||
      !this.isEmptyWall(row, col, direction) ||
      !this.isEmptyWall(nearbyRow, nearbyCol, direction) ||
      !this.isEmptyWall(row, col, this.Directions.CENTER) ||
      !this.checkWay([
        {
          col: col,
          direction: direction,
          row: row
        },
        {
          col: col,
          direction: this.Directions.CENTER,
          row: row
        },
        {
          col: nearbyCol,
          direction: direction,
          row: nearbyRow
        }
      ])
    ) {
      throw 'Incorrect build';
    }

    this.state.walls[direction].push({
      col: col,
      row: row
    });
    this.state.walls[this.Directions.CENTER].push({
      col: col,
      row: row
    });
    this.state.walls[direction].push({
      col: nearbyCol,
      row: nearbyRow
    });

    player.walls--;
  },

  /**
   * Move a player
   * @param {number} index Player index
   * @param {number} row
   * @param {number} col
   */
  move: function(index, row, col) {
    var position = this.state.players[index].position;

    var isDirectMove = this.isDirectMove(row, col, position);
    var isHop = this.isHop(row, col, position);
    var isDiagonalHop = this.isDiagonalHop(row, col, position);

    if (!this.isValidPosition(row, col) ||
      !this.isEmptyCell(row, col) ||
      !isDirectMove && !isHop && !isDiagonalHop
    ) {
      throw 'Incorrect move';
    }

    position.row = row;
    position.col = col;
  },

  /**
   * Is move a direct (to nearby row or col)
   * @param {number} row
   * @param {number} col
   * @param {Position} position
   * @returns {boolean}
   */
  isDirectMove: function(row, col, position) {
    var isRowMove = col === position.col && (
      row === position.row - 1 &&
        this.isEmptyWall(position.row - 1, position.col, this.Directions.HORIZONTAL) ||
      row === position.row + 1 &&
        this.isEmptyWall(position.row, position.col, this.Directions.HORIZONTAL)
    );
    var isColMove = row === position.row && (
      col === position.col - 1 &&
        this.isEmptyWall(position.row, position.col - 1, this.Directions.VERTICAL) ||
      col === position.col + 1 &&
        this.isEmptyWall(position.row, position.col, this.Directions.VERTICAL)
    );

    return isRowMove || isColMove;
  },

  /**
   * Is move a hop (through other player)
   * @param {number} row
   * @param {number} col
   * @param {Position} position
   * @returns {boolean}
   */
  isHop: function(row, col, position) {
    var isRowHop = col === position.col && (
      row === position.row - 2 &&
        !this.isEmptyCell(position.row - 1, col) &&
        this.isEmptyWall(position.row - 1, position.col, this.Directions.HORIZONTAL) &&
        this.isEmptyWall(position.row - 2, position.col, this.Directions.HORIZONTAL) ||
      row === position.row + 2 &&
        !this.isEmptyCell(position.row + 1, col) &&
        this.isEmptyWall(position.row, position.col, this.Directions.HORIZONTAL) &&
        this.isEmptyWall(position.row + 1, position.col, this.Directions.HORIZONTAL)
    );
    var isColHop = row === position.row && (
      col === position.col - 2 &&
        !this.isEmptyCell(row, position.col - 1) &&
        this.isEmptyWall(position.row, position.col - 1, this.Directions.VERTICAL) &&
        this.isEmptyWall(position.row, position.col - 2, this.Directions.VERTICAL) ||
      col === position.col + 2 &&
        !this.isEmptyCell(row, position.col + 1) &&
        this.isEmptyWall(position.row, position.col, this.Directions.VERTICAL) &&
        this.isEmptyWall(position.row, position.col + 1, this.Directions.VERTICAL)
    );

    return isRowHop || isColHop;
  },

  /**
   * Is move a diagonal hop (through other player)
   * @param {number} row
   * @param {number} col
   * @param {Position} position
   * @returns {boolean}
   */
  isDiagonalHop: function(row, col, position) {
    var rowIncrease = row > position.row;
    var colIncrease = col > position.col;
    var isNearbyRow = Math.abs(position.row - row) === 1;
    var isNearbyCol = Math.abs(position.col - col) === 1;
    var isPlayerHorizontal = !this.isEmptyCell(position.row, col);
    var isPlayerVertical = !this.isEmptyCell(row, position.col);
    var isWayToHorizontal = this.isEmptyWall(position.row, colIncrease ? position.col : col, this.Directions.VERTICAL);
    var isWayToVertical = this.isEmptyWall(rowIncrease ? position.row : row, position.col, this.Directions.HORIZONTAL);
    var isWayFromHorizontal = this.isEmptyWall(rowIncrease ? position.row : row, col, this.Directions.HORIZONTAL);
    var isWayFromVertical = this.isEmptyWall(row, colIncrease ? position.col : col, this.Directions.VERTICAL);
    var rowBehind = rowIncrease ? row + 1 : row - 1;
    var colBehind = colIncrease ? col + 1 : col - 1;
    var isWayBehindHorizontal = this.isValidPosition(position.row, colBehind) &&
      this.isEmptyCell(position.row, colBehind) &&
      this.isEmptyWall(position.row, colIncrease ? col : colBehind, this.Directions.VERTICAL);
    var isWayBehindVertical = this.isValidPosition(rowBehind, position.col) &&
      this.isEmptyCell(rowBehind, position.col) &&
      this.isEmptyWall(rowIncrease ? row : rowBehind, position.col, this.Directions.HORIZONTAL);

    return isNearbyRow && isNearbyCol && (
      isPlayerHorizontal && isWayToHorizontal && isWayFromHorizontal && !isWayBehindHorizontal ||
      isPlayerVertical && isWayToVertical && isWayFromVertical && !isWayBehindVertical
    );
  },

  /**
   * Check that all players has way to finish
   * @param {Array.<Object>} walls Additional walls
   * @returns {boolean} Way exists for each player
   */
  checkWay: function(walls) {
    var existsAll = true;

    this.state.players.forEach(function(player) {
      if (existsAll) {
        var exists = false;

        var cells = [
          {
            col: player.position.col,
            row: player.position.row
          }
        ];

        // get all cells that not separated by walls
        // and check that at least one of those is a finish
        this.getAvailableCells(player.position, walls, cells).forEach(function(cell) {
          if (player.finish.row !== null && player.finish.row === cell.row ||
            player.finish.col !== null && player.finish.col === cell.col
          ) {
            exists = true;
          }
        }.bind(this));

        existsAll = exists;
      }
    }.bind(this));

    return existsAll;
  },

  /**
   * Get available cells (not separated by walls)
   * @param {Position} position
   * @param {Array.<Object>} walls Additional walls
   * @param {Array.<Position>} cells Existed cells
   * @returns {Array.<Position>} Existed cells (same as param)
   */
  getAvailableCells: function(position, walls, cells) {
    cells = cells || [];

    this.getAvailableNearbyCells(position, walls).forEach(function(newCell) {
      var exists = false;

      cells.forEach(function(cell) {
        if (cell.row === newCell.row && cell.col === newCell.col) {
          exists = true;
        }
      }.bind(this));

      if (!exists) {
        cells.push(newCell);

        this.getAvailableCells(newCell, walls, cells);
      }
    }.bind(this));

    return cells;
  },

  /**
   * Get available nearby cells (not separated by walls)
   * @param {Position} position
   * @param {Array.<Object>} walls Additional walls
   * @returns {Array.<Position>} Cells
   */
  getAvailableNearbyCells: function(position, walls) {
    var maxCol = this.config.size - 1;

    var cells = [];

    // left
    if (position.col > 0 &&
      this.isEmptyWallAdditional(position.row, position.col - 1, this.Directions.VERTICAL, walls)
    ) {
      cells.push({
        col: position.col - 1,
        row: position.row
      });
    }

    // right
    if (position.col < maxCol &&
      this.isEmptyWallAdditional(position.row, position.col, this.Directions.VERTICAL, walls)
    ) {
      cells.push({
        col: position.col + 1,
        row: position.row
      });
    }

    // top
    if (position.row > 0 &&
      this.isEmptyWallAdditional(position.row - 1, position.col, this.Directions.HORIZONTAL, walls)
    ) {
      cells.push({
        col: position.col,
        row: position.row - 1
      });
    }

    // bottom
    if (position.row < maxCol &&
      this.isEmptyWallAdditional(position.row, position.col, this.Directions.HORIZONTAL, walls)
    ) {
      cells.push({
        col: position.col,
        row: position.row + 1
      });
    }

    return cells;
  },

  /**
   * Check wall is empty and it does not exists at additional walls
   * @param {number} row
   * @param {number} col
   * @param {Directions} direction
   * @param {Array.<Object>} walls
   * @returns {boolean} Is empty
   */
  isEmptyWallAdditional: function(row, col, direction, walls) {
    var isEmpty = this.isEmptyWall(row, col, direction);

    if (isEmpty) {
      walls.forEach(function(wall) {
        if (wall.row === row && wall.col === col && wall.direction === direction) {
          isEmpty = false;
        }
      }.bind(this));
    }

    return isEmpty;
  },

  /**
   * Is valid position
   * @param {number} row
   * @param {number} col
   * @param {boolean} isWall
   * @param {Directions} direction
   * @returns {boolean}
   */
  isValidPosition: function(row, col, isWall, direction) {
    var maxRow = this.config.size - 1;
    var maxCol = this.config.size - 1;

    if (isWall && direction === this.Directions.HORIZONTAL) {
      maxRow--;
    }

    if (isWall && direction === this.Directions.VERTICAL) {
      maxCol--;
    }

    return row >= 0 &&
      row <= maxRow &&
      col >= 0 &&
      col <= maxCol;
  },

  /**
   * Is cell empty
   * @param {number} row
   * @param {number} col
   * @returns {boolean}
   */
  isEmptyCell: function(row, col) {
    var isEmpty = true;

    this.state.players.forEach(function(player) {
      if (player.position.row === row && player.position.col === col) {
        isEmpty = false;
      }
    }.bind(this));

    return isEmpty;
  },

  /**
   * Is wall empty
   * @param {number} row
   * @param {number} col
   * @param {Directions} direction
   * @returns {boolean}
   */
  isEmptyWall: function(row, col, direction) {
    var isEmpty = true;

    this.state.walls[direction].forEach(function(wall) {
      if (wall.row === row && wall.col === col) {
        isEmpty = false;
      }
    }.bind(this));

    return isEmpty;
  }
};

module.exports.constructor.prototype = module.exports;
