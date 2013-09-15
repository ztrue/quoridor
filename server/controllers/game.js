/**
 * Number of players
 * @const {number}
 */
exports.PLAYERS_MIN = 2;
exports.PLAYERS_MAX = 4;
exports.PLAYERS_DEFAULT = 2;

/**
 * Field size
 * @const {number}
 */
exports.SIZE_MIN = 3;
exports.SIZE_MAX = 99;
exports.SIZE_DEFAULT = 9;

/**
 * Number of walls, each player has
 * @const {number}
 */
exports.MIN_WALLS = 0;
exports.MAX_WALLS = 100;
exports.WALLS_DEFAULT = 10;

/**
 * Timeout for new game after end, ms
 * @const {number}
 */
exports.TIMEOUT_DEFAULT = 5000;

/**
 * @see abstractController::Events
 */
exports.Events = {
  client: {
    COMMAND: 'command',
    DISCONNECT: 'disconnect',
    EXIT: 'exit',
    // get state by request (on first load)
    GET_STATE: 'getState',
    JOIN: 'join'
  },
  server: {
    RESET_UID: 'resetUid',
    // set state when it is updated
    SET_STATE: 'setState'
  }
};

/**
 * Available commands
 * @enum {string}
 */
exports.Commands = {
  BUILD: 'build',
  MOVE: 'move',
  SKIP: 'skip'
};

/**
 * Available walls directions
 * @enum {string}
 */
exports.Directions = {
  CENTER: 'center',
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical'
};

/**
 * Game state
 * @type {State}
 */
exports.state = {};

/**
 * Players start positions
 * @type {Array.<Position>}
 * @schema {
 *   col: number,
 *   row: number
 * }
 */
exports.startPositions = [];

/**
 * Players end positions
 * @type {Array.<Position>}
 */
exports.endPositions = [];

/**
 * @see abstractController::bootstrap()
 */
exports.init = function() {
  this.reset({
    players: this.PLAYERS_DEFAULT,
    size: this.SIZE_DEFAULT,
    walls: this.WALLS_DEFAULT
  });
};

/**
 * Reset game
 * @param {Object} config Game config
 */
exports.reset = function(config) {
  this.resetPositions(config);
  this.resetState(config);
  this.resetPlayers(config);
  this.resetSockets();
  this.setState();
};

/**
 * Reset start and end positions
 * @param {Object} config Game config
 */
exports.resetPositions = function(config) {
  var middleCell = Math.floor(config.size / 2);
  var maxCell = config.size - 1;

  this.startPositions = [
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
  ];

  this.endPositions = [
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
  ];
};

/**
 * Reset game state
 * @param {Object} config Game config
 */
exports.resetState = function(config) {
  this.state = {
    /**
     * Active player index
     * @type {?number}
     */
    activePlayer: null,
    /**
     * Game config
     * @type {Object}
     */
    config: config,
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
  for (var key in this.Directions) {
    if (this.Directions.hasOwnProperty(key)) {
      var direction = this.Directions[key];
      this.state.walls[direction] = [];
    }
  }
};

/**
 * Reset players
 * @param {Object} config Game config
 */
exports.resetPlayers = function(config) {
  for (var i = 0; i < config.players; i++) {
    this.state.players.push({
      finish: {
        col: null,
        row: null
      },
      index: i,
      position: {
        col: null,
        row: null
      },
      uid: null,
      walls: config.walls
    });
  }
};

/**
 * Reset sockets indexes
 */
exports.resetSockets = function() {
  for (var socketId in this.sockets.sockets) {
    if (this.sockets.sockets.hasOwnProperty(socketId)) {
      this.sockets.sockets[socketId].set('index', null);
    }
  }

  this.client.resetUid();
};

/**
 * Game reset with timeout
 * @param {Object} config Game config
 * @param {number} timeout Timeout, ms
 */
exports.deferReset = function(config, timeout) {
  setTimeout(this.reset.bind(this, config), timeout || this.TIMEOUT_DEFAULT);
};

/**
 * Start game
 */
exports.start = function() {
  this.state.inProgress = true;
  this.state.activePlayer = Math.floor(
    Math.random() * this.state.config.players
  );
};

/**
 * Join game
 * @param {string} uid UID
 * @returns {?number} Index if user has been joined
 */
exports.join = function(uid) {
  var index = this.addPlayer(uid);
  if (index !== null && this.isFull()) {
    this.start();
  }
  return index;
};

/**
 * Exit from game
 * @param {string} uid
 * @returns {?number} Index if user has been exit
 */
exports.exit = function(uid) {
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
        this.deferReset(this.state.config);
        // if more than one and there is a turn of user that exit
      } else if (this.state.activePlayer === index) {
        this.nextTurn();
      }
    }
  }
  return index;
};

/**
 * Get game winner
 * @returns {?number} Winner index if exists
 */
exports.getWinner = function() {
  var index = null;

  this.state.players.forEach(function(player) {
    var atFinishRow = player.position.row !== null && player.position.row === player.finish.row;
    var atFinishCol = player.position.col !== null && player.position.col === player.finish.col;
    if (player.uid !== null && (atFinishRow || atFinishCol)) {
      index = player.index;
    }
  }.bind(this));

  return index;
};

/**
 * Next turn
 */
exports.nextTurn = function() {
  this.state.activePlayer++;
  if (this.state.activePlayer >= this.state.config.players) {
    this.state.activePlayer = 0;
  }

  if (this.state.players[this.state.activePlayer].uid === null) {
    this.nextTurn();
  }
};

/**
 * Set state on clients
 */
exports.setState = function() {
  this.client.setState(null, {
    state: this.state
  });
};

/**
 * Add player to game
 * @param {string} uid UID
 * @returns {?number} Player index if added
 */
exports.addPlayer = function(uid) {
  if (this.state.activePlayer !== null) {
    return null;
  }

  var emptyIndex = null;

  var players = this.state.players;

  for (var index in players) {
    if (players.hasOwnProperty(index)) {
      if (players[index].uid === uid) {
        // player already exists
        return null;
      } else if (emptyIndex === null && players[index].uid === null) {
        emptyIndex = index;
      }
    }
  }

  if (emptyIndex !== null) {
    players[emptyIndex].uid = uid;
    players[emptyIndex].position.row = this.startPositions[emptyIndex].row;
    players[emptyIndex].position.col = this.startPositions[emptyIndex].col;
    players[emptyIndex].finish.row = this.endPositions[emptyIndex].row;
    players[emptyIndex].finish.col = this.endPositions[emptyIndex].col;
  }

  return emptyIndex;
};

/**
 * Remove player from game
 * @param {string} uid UID
 * @returns {?number} Player index if removed
 */
exports.removePlayer = function(uid) {
  var index = null;

  this.state.players.forEach(function(player) {
    if (player.uid === uid) {
      player.uid = null;
      player.position.row = null;
      player.position.col = null;
      index = player.index;
    }
  }.bind(this));

  return index;
};

/**
 * Count players in game
 * @returns {number}
 */
exports.countPlayers = function() {
  var counter = 0;

  var players = this.state.players;

  for (var index in players) {
    if (players.hasOwnProperty(index)) {
      if (players[index].uid !== null) {
        counter++;
      }
    }
  }

  return counter;
};

/**
 * Is game full
 * @returns {boolean}
 */
exports.isFull = function() {
  return this.countPlayers() === this.state.config.players;
};

/**
 * Execute command
 * @param {Object} data Command data
 * @returns {boolean} Success
 */
exports.command = function(data) {
  var row = parseInt(data.row || 0, 10);
  var col = parseInt(data.col || 0, 10);

  switch (data.command) {
    case this.Commands.BUILD:
      return this.build(this.state.activePlayer, row, col, data.direction);

    case this.Commands.MOVE:
      return this.move(this.state.activePlayer, row, col);

    case this.Commands.SKIP:
      return true;

    default:
      return false;
  }
};

/**
 * Build a wall
 * @param {number} index Player index
 * @param {number} row
 * @param {number} col
 * @param {Directions} direction
 * @returns {boolean} Success
 */
exports.build = function(index, row, col, direction) {
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

  if (player.walls > 0 &&
    isValidDirection &&
    this.isValidPosition(row, col, true, direction) &&
    this.isValidPosition(nearbyRow, nearbyCol, true, direction) &&
    this.isValidPosition(row, col, true, this.Directions.CENTER) &&
    this.isEmptyWall(row, col, direction) &&
    this.isEmptyWall(nearbyRow, nearbyCol, direction) &&
    this.isEmptyWall(row, col, this.Directions.CENTER) &&
    this.checkWay([
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

    return true;
  }

  return false;
};

/**
 * Move a player
 * @param {number} index Player index
 * @param {number} row
 * @param {number} col
 * @returns {boolean} Success
 */
exports.move = function(index, row, col) {
  var position = this.state.players[index].position;

  var isDirectMove = this.isDirectMove(row, col, position);
  var isHop = this.isHop(row, col, position);
  var isDiagonalHop = this.isDiagonalHop(row, col, position);

  if (this.isValidPosition(row, col) &&
    this.isEmptyCell(row, col) &&
    (isDirectMove || isHop || isDiagonalHop)
  ) {
    position.row = row;
    position.col = col;

    return true;
  }

  return false;
};

/**
 * Is move a direct (to nearby row or col)
 * @param {number} row
 * @param {number} col
 * @param {Position} position
 * @returns {boolean}
 */
exports.isDirectMove = function(row, col, position) {
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
};

/**
 * Is move a hop (through other player)
 * @param {number} row
 * @param {number} col
 * @param {Position} position
 * @returns {boolean}
 */
exports.isHop = function(row, col, position) {
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
};

/**
 * Is move a diagonal hop (through other player)
 * @param {number} row
 * @param {number} col
 * @param {Position} position
 * @returns {boolean}
 */
exports.isDiagonalHop = function(row, col, position) {
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
};

/**
 * Check that all players has way to finish
 * @param {Array.<Object>} walls Additional walls
 * @returns {boolean} Way exists for each player
 */
exports.checkWay = function(walls) {
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
};

/**
 * Get available cells (not separated by walls)
 * @param {Position} position
 * @param {Array.<Object>} walls Additional walls
 * @param {Array.<Position>} cells Existed cells
 * @returns {Array.<Position>} Existed cells (same as param)
 */
exports.getAvailableCells = function(position, walls, cells) {
  if (cells === undefined) {
    cells = [];
  }

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
};


/**
 * Get available nearby cells (not separated by walls)
 * @param {Position} position
 * @param {Array.<Object>} walls Additional walls
 * @returns {Array.<Position>} Cells
 */
exports.getAvailableNearbyCells = function(position, walls) {
  var maxCol = this.state.config.size - 1;

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
};

/**
 * Check wall is empty and it does not exists at additional walls
 * @param {number} row
 * @param {number} col
 * @param {Directions} direction
 * @param {Array.<Object>} walls
 * @returns {boolean} Is empty
 */
exports.isEmptyWallAdditional = function(row, col, direction, walls) {
  var isEmpty = this.isEmptyWall(row, col, direction);

  if (isEmpty) {
    walls.forEach(function(wall) {
      if (wall.row === row && wall.col === col && wall.direction === direction) {
        isEmpty = false;
      }
    }.bind(this));
  }

  return isEmpty;
};

/**
 * Is valid position
 * @param {number} row
 * @param {number} col
 * @param {boolean} isWall
 * @param {Directions} direction
 * @returns {boolean}
 */
exports.isValidPosition = function(row, col, isWall, direction) {
  var maxRow = this.state.config.size - 1;
  var maxCol = this.state.config.size - 1;

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
};

/**
 * Is cell empty
 * @param {number} row
 * @param {number} col
 * @returns {boolean}
 */
exports.isEmptyCell = function(row, col) {
  var isEmpty = true;

  this.state.players.forEach(function(player) {
    if (player.position.row === row && player.position.col === col) {
      isEmpty = false;
    }
  }.bind(this));

  return isEmpty;
};

/**
 * Is wall empty
 * @param {number} row
 * @param {number} col
 * @param {Directions} direction
 * @returns {boolean}
 */
exports.isEmptyWall = function(row, col, direction) {
  var isEmpty = true;

  this.state.walls[direction].forEach(function(wall) {
    if (wall.row === row && wall.col === col) {
      isEmpty = false;
    }
  }.bind(this));

  return isEmpty;
};

exports.clientEmitters = {
  resetUid: null,
  setState: null
};

exports.clientListeners = {
  /**
   * On command event
   * @param {Socket} socket Socket
   * @param {function(?string, Object)} callback Event callback
   * @param {Object} data Event data
   */
  command: function(socket, callback, data) {
    socket.get('index', function(err, index) {
      try {
        if (typeof index === 'string') {
          index = parseInt(index, 10);
        }

        if (this.state.activePlayer !== index) {
          throw 'It\'s not your turn';
        }

        // try to execute command
        if (!this.command(data)) {
          throw 'Invalid command';
        }

        // check winner
        var winner = this.getWinner();

        if (winner === null) {
          this.nextTurn();
        } else {
          this.state.activePlayer = null;
          this.state.winner = winner;
          this.deferReset(this.state.config);
        }

        this.setState();
        callback();
      } catch (err) {
        callback(err);
      }
    }.bind(this));
  },

  /**
   * On user connect
   * @param {Socket} socket Socket
   */
  connection: function(socket) {
    socket.set('index', null);
  },

  /**
   * On user disconnect
   * @param {Socket} socket Socket
   */
  disconnect: function(socket) {
    var index = this.exit(socket.id);

    if (index !== null) {
      this.setState();
    }
  },

  /**
   * On exit event
   * @param {Socket} socket Socket
   * @param {function(?string, Object)} callback Event callback
   */
  exit: function(socket, callback) {
    var index = this.exit(socket.id);
    socket.set('index', null, function() {
      callback(null, {
        uid: null
      });

      if (index !== null) {
        this.setState();
      }
    }.bind(this));
  },

  /**
   * On get state event
   * @param {Socket} socket Socket
   * @param {function(?string, Object)} callback Event callback
   */
  getState: function(socket, callback) {
    callback(null, {
      state: this.state
    });
  },

  /**
   * On join event
   * @param {Socket} socket Socket
   * @param {function(?string, Object)} callback Event callback
   */
  join: function(socket, callback) {
    var index = this.join(socket.id);
    if (index !== null) {
      socket.set('index', index, function() {
        callback(null, {
          uid: socket.id
        });

        this.setState();
      }.bind(this));
    } else {
      callback('Game is full');
    }
  }
};