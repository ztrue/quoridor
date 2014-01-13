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
        this.model('position').new({
          col: maxCell
        }),
        this.model('position').new({
          col: 0
        }),
        this.model('position').new({
          row: maxCell
        }),
        this.model('position').new({
          row: 0
        })
      ],
      /**
       * Players start positions
       * @type {Array.<Position>}
       */
      start: [
        this.model('position').new({
          col: 0,
          row: middleCell
        }),
        this.model('position').new({
          col: maxCell,
          row: middleCell
        }),
        this.model('position').new({
          col: middleCell,
          row: 0
        }),
        this.model('position').new({
          col: middleCell,
          row: maxCell
        })
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
       * @type {Array.<Wall>}
       */
      walls: [],
      /**
       * Winner index
       * @type {?number}
       */
      winner: null
    };
  },

  /**
   * Reset players
   */
  resetPlayers: function() {
    for (var i = 0; i < this.config.players; i++) {
      var player = this.model('player').new({
        index: i,
        finish: this.positions.finish[i],
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
      player.reset();

      if (this.state.inProgress) {
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

    this.state.players.forEach(function(player, index) {
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
      position: this.positions.start[emptyIndex].clone()
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
    switch (data.command) {
      case this.Commands.BUILD:
        this.build(this.state.activePlayer, this.model('wall').new(data.wall));
        break;

      case this.Commands.MOVE:
        this.move(this.state.activePlayer, this.model('position').new(data.position));
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
   * @param {Wall} wall
   */
  build: function(index, wall) {
    var player = this.state.players[index];

    // second cell where wall also will be build
    var nearbyPosition = null;

    switch (wall.direction) {
      case this.model('wall').Directions.HORIZONTAL:
        nearbyPosition = wall.position.right();
        break;

      case this.model('wall').Directions.VERTICAL:
        nearbyPosition = wall.position.down();
        break;

      default:
        throw 'Incorrect wall direction: \'' + wall.direction + '\'';
    }

    var nearbyWall = this.model('wall').new({
      direction: wall.direction,
      position: nearbyPosition
    });

    var centerWall = this.model('wall').new({
      direction: this.model('wall').Directions.CENTER,
      position: wall.position.clone()
    });

    if (player.walls === 0 ||
      !this.isValidPosition(wall.position, wall.direction) ||
      !this.isValidPosition(nearbyWall.position, nearbyWall.direction) ||
      !this.isValidPosition(centerWall.position, centerWall.direction) ||
      !this.isEmptyWall(wall.position, wall.direction) ||
      !this.isEmptyWall(nearbyWall.position, nearbyWall.direction) ||
      !this.isEmptyWall(centerWall.position, centerWall.direction) ||
      !this.checkWay([
        wall,
        centerWall,
        nearbyWall
      ])
    ) {
      throw 'Incorrect build';
    }

    this.state.walls.push(wall);
    this.state.walls.push(centerWall);
    this.state.walls.push(nearbyWall);

    player.walls--;
  },

  /**
   * Move a player
   * @param {number} index Player index
   * @param {Position} position
   */
  move: function(index, position) {
    var player = this.state.players[index];

    var isDirectMove = this.isDirectMove(position, player.position);
    var isHop = this.isHop(position, player.position);
    var isDiagonalHop = this.isDiagonalHop(position, player.position);

    if (!this.isValidPosition(position) ||
      !this.isEmptyCell(position) && !player.isFinishCell(position) ||
      !isDirectMove && !isHop && !isDiagonalHop
    ) {
      throw 'Incorrect move';
    }

    player.position = position;
  },

  /**
   * Is move a direct (to nearby row or col)
   * @param {Position} position
   * @param {Position} playerPosition
   * @returns {boolean}
   */
  isDirectMove: function(position, playerPosition) {
    var isRowMove = position.col === playerPosition.col && (
      position.row === playerPosition.row - 1 &&
        this.isEmptyWall(playerPosition.up(), this.model('wall').Directions.HORIZONTAL) ||
      position.row === playerPosition.row + 1 &&
        this.isEmptyWall(playerPosition, this.model('wall').Directions.HORIZONTAL)
    );
    var isColMove = position.row === playerPosition.row && (
      position.col === playerPosition.col - 1 &&
        this.isEmptyWall(playerPosition.left(), this.model('wall').Directions.VERTICAL) ||
      position.col === playerPosition.col + 1 &&
        this.isEmptyWall(playerPosition, this.model('wall').Directions.VERTICAL)
    );

    return isRowMove || isColMove;
  },

  /**
   * Is move a hop (through other player)
   * @param {Position} position
   * @param {Position} playerPosition
   * @returns {boolean}
   */
  isHop: function(position, playerPosition) {
    var isRowHop = position.col === playerPosition.col && (
      playerPosition.isEquals(position.down(2)) &&
        !this.isEmptyCell(position.down()) &&
        this.isEmptyWall(playerPosition.up(), this.model('wall').Directions.HORIZONTAL) &&
        this.isEmptyWall(playerPosition.up(2), this.model('wall').Directions.HORIZONTAL) ||
      playerPosition.isEquals(position.up(2)) &&
        !this.isEmptyCell(position.up()) &&
        this.isEmptyWall(playerPosition, this.model('wall').Directions.HORIZONTAL) &&
        this.isEmptyWall(playerPosition.down(), this.model('wall').Directions.HORIZONTAL)
    );
    var isColHop = position.row === playerPosition.row && (
      playerPosition.isEquals(position.right(2)) &&
        !this.isEmptyCell(position.right()) &&
        this.isEmptyWall(playerPosition.left(), this.model('wall').Directions.VERTICAL) &&
        this.isEmptyWall(playerPosition.left(2), this.model('wall').Directions.VERTICAL) ||
      playerPosition.isEquals(position.left(2)) &&
        !this.isEmptyCell(position.left()) &&
        this.isEmptyWall(playerPosition, this.model('wall').Directions.VERTICAL) &&
        this.isEmptyWall(playerPosition.right(), this.model('wall').Directions.VERTICAL)
    );

    return isRowHop || isColHop;
  },

  /**
   * Is move a diagonal hop (through other player)
   * @param {Position} position
   * @param {Position} playerPosition
   * @returns {boolean}
   */
  isDiagonalHop: function(position, playerPosition) {
    var rowIncrease = position.row > playerPosition.row;
    var colIncrease = position.col > playerPosition.col;
    var isNearbyRow = Math.abs(playerPosition.row - position.row) === 1;
    var isNearbyCol = Math.abs(playerPosition.col - position.col) === 1;
    var isPlayerHorizontal = !this.isEmptyCell(this.model('position').new({
      col: position.col,
      row: playerPosition.row
    }));
    var isPlayerVertical = !this.isEmptyCell(this.model('position').new({
      col: playerPosition.col,
      row: position.row
    }));
    var isWayToHorizontal = this.isEmptyWall(this.model('position').new({
      col: colIncrease ? playerPosition.col : position.col,
      row: playerPosition.row
    }), this.model('wall').Directions.VERTICAL);
    var isWayToVertical = this.isEmptyWall(this.model('position').new({
      col: playerPosition.col,
      row: rowIncrease ? playerPosition.row : position.row
    }), this.model('wall').Directions.HORIZONTAL);
    var isWayFromHorizontal = this.isEmptyWall(this.model('position').new({
      col: position.col,
      row: rowIncrease ? playerPosition.row : position.row
    }), this.model('wall').Directions.HORIZONTAL);
    var isWayFromVertical = this.isEmptyWall(this.model('position').new({
        col: colIncrease ? playerPosition.col : position.col,
        row: position.row
    }), this.model('wall').Directions.VERTICAL);
    var rowBehind = rowIncrease ? position.row + 1 : position.row - 1;
    var colBehind = colIncrease ? position.col + 1 : position.col - 1;
    var isWayBehindHorizontal = this.isValidPosition(this.model('position').new({
        col: colBehind,
        row: playerPosition.row
      })) &&
      this.isEmptyCell(this.model('position').new({
        col: colBehind,
        row: playerPosition.row
      })) &&
      this.isEmptyWall(this.model('position').new({
        col: colIncrease ? position.col : colBehind,
        row: playerPosition.row
      }), this.model('wall').Directions.VERTICAL);
    var isWayBehindVertical = this.isValidPosition(this.model('position').new({
        col: playerPosition.col,
        row: rowBehind
      })) &&
      this.isEmptyCell(this.model('position').new({
        col: playerPosition.col,
        row: rowBehind
      })) &&
      this.isEmptyWall(this.model('position').new({
        col: playerPosition.col,
        row: rowIncrease ? position.row : rowBehind
      }), this.model('wall').Directions.HORIZONTAL);

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
          player.position
        ];

        // get all cells that not separated by walls
        // and check that at least one of those is a finish
        this.getAvailableCells(player.position, walls, cells).forEach(function(cell) {
          if (player.isFinishCell(cell)) {
            exists = true;
          }
        });

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
        if (cell.isEquals(newCell)) {
          exists = true;
        }
      });

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
      this.isEmptyWallAdditional(position.left(), this.model('wall').Directions.VERTICAL, walls)
    ) {
      cells.push(position.left());
    }

    // right
    if (position.col < maxCol &&
      this.isEmptyWallAdditional(position, this.model('wall').Directions.VERTICAL, walls)
    ) {
      cells.push(position.right());
    }

    // up
    if (position.row > 0 &&
      this.isEmptyWallAdditional(position.up(), this.model('wall').Directions.HORIZONTAL, walls)
    ) {
      cells.push(position.up());
    }

    // down
    if (position.row < maxCol &&
      this.isEmptyWallAdditional(position, this.model('wall').Directions.HORIZONTAL, walls)
    ) {
      cells.push(position.down());
    }

    return cells;
  },

  /**
   * Check wall is empty and it does not exists at additional walls
   * @param {Position} position
   * @param {Directions} direction
   * @param {Array.<Object>} walls
   * @returns {boolean} Is empty
   */
  isEmptyWallAdditional: function(position, direction, walls) {
    var isEmpty = this.isEmptyWall(position, direction);

    if (isEmpty) {
      walls.forEach(function(wall) {
        if (wall.position.isEquals(position) && wall.direction === direction) {
          isEmpty = false;
        }
      });
    }

    return isEmpty;
  },

  /**
   * Is valid position
   * @param {Position} position
   * @param {Directions} direction
   * @returns {boolean}
   */
  isValidPosition: function(position, direction) {
    var maxRow = this.config.size - 1;
    var maxCol = this.config.size - 1;

    if (direction === this.model('wall').Directions.HORIZONTAL ||
      direction === this.model('wall').Directions.CENTER
    ) {
      maxRow--;
    }

    if (direction === this.model('wall').Directions.VERTICAL ||
      direction === this.model('wall').Directions.CENTER
    ) {
      maxCol--;
    }

    return position.row >= 0 &&
      position.row <= maxRow &&
      position.col >= 0 &&
      position.col <= maxCol;
  },

  /**
   * Is cell empty
   * @param {Position} position
   * @returns {boolean}
   */
  isEmptyCell: function(position) {
    var isEmpty = true;

    this.state.players.forEach(function(player) {
      if (player.position.isEquals(position)) {
        isEmpty = false;
      }
    });

    return isEmpty;
  },

  /**
   * Is wall empty
   * @param {Position} position
   * @param {Directions} direction
   * @returns {boolean}
   */
  isEmptyWall: function(position, direction) {
    var isEmpty = true;

    this.state.walls.forEach(function(wall) {
      if (wall.position.isEquals(position) && wall.direction === direction) {
        isEmpty = false;
      }
    });

    return isEmpty;
  }
};

module.exports.constructor.prototype = module.exports;
