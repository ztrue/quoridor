var _ = require('underscore');

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
exports.WALLS_MIN = 0;
exports.WALLS_MAX = 100;
exports.WALLS_DEFAULT = 10;

/**
 * Timeout for new game after end, ms
 * @const {number}
 */
exports.TIMEOUT_DEFAULT = TIME.MS_IN_MINUTE * 5;

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
 * Games collection (game ID as key)
 * @type {Object.<string, Game>}
 */
exports.games = {};

exports.getDefaultConfig = function() {
  return {
    players: this.PLAYERS_DEFAULT,
    size: this.SIZE_DEFAULT,
    walls: this.WALLS_DEFAULT
  };
};

exports.createGame = function(config) {
  this.validateConfig(config);
  var gameId = this.newGameId();
  var game = {
    config: config,
    gameId: gameId,
    positions: null,
    state: null
  };
  this.reset(game);
  this.games[gameId] = game;
  return game;
};

exports.validateConfig = function(config) {
  if (config.players > this.PLAYERS_MAX) {
    throw 'Maximum players: ' + this.PLAYERS_MAX;
  }

  if (config.players < this.PLAYERS_MIN) {
    throw 'Minimum players: ' + this.PLAYERS_MIN;
  }

  if (config.size > this.SIZE_MAX) {
    throw 'Maximum size: ' + this.SIZE_MAX;
  }

  if (config.size < this.SIZE_MIN) {
    throw 'Minimum size: ' + this.SIZE_MIN;
  }

  if (config.walls > this.WALLS_MAX) {
    throw 'Maximum walls: ' + this.WALLS_MAX;
  }

  if (config.walls < this.WALLS_MIN) {
    throw 'Minimum walls: ' + this.WALLS_MIN;
  }
};

exports.newGameId = function() {
  do {
    var gameId = Math.random().toString().replace(/^0\./, '_');
  } while(!gameId || this.games[gameId]);

  return gameId;
};

/**
 * Reset game
 * @param {Game} game Game
 */
exports.reset = function(game) {
  this.resetPositions(game);
  this.resetState(game);
  this.resetPlayers(game);
  this.resetSockets(game);
  this.setState(game);
};

/**
 * Reset start and end positions
 * @param {Game} game Game
 */
exports.resetPositions = function(game) {
  var middleCell = Math.floor(game.config.size / 2);
  var maxCell = game.config.size - 1;

  game.positions = {
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
};

/**
 * Reset game state
 * @param {Game} game Game
 */
exports.resetState = function(game) {
  game.state = {
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
  for (var key in this.Directions) {
    if (this.Directions.hasOwnProperty(key)) {
      var direction = this.Directions[key];
      game.state.walls[direction] = [];
    }
  }
};

/**
 * Reset players
 * @param {Game} game Game
 */
exports.resetPlayers = function(game) {
  for (var i = 0; i < game.config.players; i++) {
    game.state.players.push({
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
      walls: game.config.walls
    });
  }
};

/**
 * Reset sockets indexes
 * @param {Game} game Game
 */
exports.resetSockets = function(game) {
  for (var socketId in this.sockets.sockets) {
    if (this.sockets.sockets.hasOwnProperty(socketId)) {
      this.sockets.sockets[socketId].set('index', null);
    }
  }

  this.client.resetUid();
};

/**
 * Game reset with timeout
 * @param {Game} game Game
 * @param {number} timeout Timeout, ms
 */
exports.deferReset = function(game, timeout) {
  setTimeout(this.reset.bind(this, game), timeout || this.TIMEOUT_DEFAULT);
};

/**
 * Start game
 */
exports.start = function(game) {
  game.state.inProgress = true;
  game.state.activePlayer = Math.floor(
    Math.random() * game.config.players
  );
};

/**
 * Join game
 * @param {Game} game Game
 * @param {string} uid UID
 * @returns {?number} Index if user has been joined
 */
exports.join = function(game, uid) {
  var index = this.addPlayer(game, uid);
  if (index !== null && this.isFull(game)) {
    this.start(game);
  }
  return index;
};

/**
 * Exit from game
 * @param {Game} game Game
 * @param {string} uid
 * @returns {?number} Index if user has been exit
 */
exports.exit = function(game, uid) {
  var index = this.removePlayer(game, uid);
  if (index !== null) {
    var player = game.state.players[index];
    player.uid = null;

    if (game.state.inProgress) {
      player.position.row = null;
      player.position.col = null;

      // if only one player left
      if (this.countPlayers(game) === 1) {
        game.state.activePlayer = null;
        game.state.players.forEach(function(player) {
          if (player.uid !== null) {
            // he is a winner
            game.state.winner = player.index;
          }
        }.bind(this));
        this.deferReset(game);
        // if more than one and there is a turn of user that exit
      } else if (game.state.activePlayer === index) {
        this.nextTurn(game);
      }
    }
  }
  return index;
};

/**
 * Get game winner
 * @param {Game} game Game
 * @returns {?number} Winner index if exists
 */
exports.getWinner = function(game) {
  var index = null;

  game.state.players.forEach(function(player) {
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
 * @param {Game} game Game
 */
exports.nextTurn = function(game) {
  game.state.activePlayer++;
  if (game.state.activePlayer >= game.config.players) {
    game.state.activePlayer = 0;
  }

  if (game.state.players[game.state.activePlayer].uid === null) {
    this.nextTurn(game);
  }
};

/**
 * Set state on clients
 * @param {Game} game Game
 */
exports.setState = function(game) {
  this.client.setState(null, {
    gameId: game.gameId,
    state: game.state
  });
};

/**
 * Add player to game
 * @param {Game} game Game
 * @param {string} uid UID
 * @returns {?number} Player index if added
 */
exports.addPlayer = function(game, uid) {
  if (game.state.inProgress) {
    return null;
  }

  var emptyIndex = null;

  var players = game.state.players;

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
    players[emptyIndex].position.row = game.positions.start[emptyIndex].row;
    players[emptyIndex].position.col = game.positions.start[emptyIndex].col;
    players[emptyIndex].finish.row = game.positions.finish[emptyIndex].row;
    players[emptyIndex].finish.col = game.positions.finish[emptyIndex].col;
  }

  return emptyIndex;
};

/**
 * Remove player from game
 * @param {Game} game Game
 * @param {string} uid UID
 * @returns {?number} Player index if removed
 */
exports.removePlayer = function(game, uid) {
  var index = null;

  game.state.players.forEach(function(player) {
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
 * @param {Game} game Game
 * @returns {number}
 */
exports.countPlayers = function(game) {
  var counter = 0;

  var players = game.state.players;

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
 * @param {Game} game Game
 * @returns {boolean}
 */
exports.isFull = function(game) {
  return this.countPlayers(game) === game.config.players;
};

exports.getInactiveGames = function() {
  var games = [];

  _(this.games).each(function(game) {
    if (!game.state.inProgress) {
      games.push({
        config: game.config,
        gameId: games.gameId
      });
    }
  });

  return games;
};

/**
 * Execute command
 * @param {Game} game Game
 * @param {Object} data Command data
 * @returns {boolean} Success
 */
exports.command = function(game, data) {
  var row = parseInt(data.row || 0, 10);
  var col = parseInt(data.col || 0, 10);

  switch (data.command) {
    case this.Commands.BUILD:
      return this.build(game, game.state.activePlayer, row, col, data.direction);

    case this.Commands.MOVE:
      return this.move(game, game.state.activePlayer, row, col);

    case this.Commands.SKIP:
      return true;

    default:
      return false;
  }
};

/**
 * Build a wall
 * @param {Game} game Game
 * @param {number} index Player index
 * @param {number} row
 * @param {number} col
 * @param {Directions} direction
 * @returns {boolean} Success
 */
exports.build = function(game, index, row, col, direction) {
  var player = game.state.players[index];

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
    this.isValidPosition(game, row, col, true, direction) &&
    this.isValidPosition(game, nearbyRow, nearbyCol, true, direction) &&
    this.isValidPosition(game, row, col, true, this.Directions.CENTER) &&
    this.isEmptyWall(game, row, col, direction) &&
    this.isEmptyWall(game, nearbyRow, nearbyCol, direction) &&
    this.isEmptyWall(game, row, col, this.Directions.CENTER) &&
    this.checkWay(game, [
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
    game.state.walls[direction].push({
      col: col,
      row: row
    });
    game.state.walls[this.Directions.CENTER].push({
      col: col,
      row: row
    });
    game.state.walls[direction].push({
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
 * @param {Game} game Game
 * @param {number} index Player index
 * @param {number} row
 * @param {number} col
 * @returns {boolean} Success
 */
exports.move = function(game, index, row, col) {
  var position = game.state.players[index].position;

  var isDirectMove = this.isDirectMove(game, row, col, position);
  var isHop = this.isHop(game, row, col, position);
  var isDiagonalHop = this.isDiagonalHop(game, row, col, position);

  if (this.isValidPosition(game, row, col) &&
    this.isEmptyCell(game, row, col) &&
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
 * @param {Game} game Game
 * @param {number} row
 * @param {number} col
 * @param {Position} position
 * @returns {boolean}
 */
exports.isDirectMove = function(game, row, col, position) {
  var isRowMove = col === position.col && (
    row === position.row - 1 &&
      this.isEmptyWall(game, position.row - 1, position.col, this.Directions.HORIZONTAL) ||
    row === position.row + 1 &&
      this.isEmptyWall(game, position.row, position.col, this.Directions.HORIZONTAL)
  );
  var isColMove = row === position.row && (
    col === position.col - 1 &&
      this.isEmptyWall(game, position.row, position.col - 1, this.Directions.VERTICAL) ||
    col === position.col + 1 &&
      this.isEmptyWall(game, position.row, position.col, this.Directions.VERTICAL)
  );

  return isRowMove || isColMove;
};

/**
 * Is move a hop (through other player)
 * @param {Game} game Game
 * @param {number} row
 * @param {number} col
 * @param {Position} position
 * @returns {boolean}
 */
exports.isHop = function(game, row, col, position) {
  var isRowHop = col === position.col && (
    row === position.row - 2 &&
      !this.isEmptyCell(game, position.row - 1, col) &&
      this.isEmptyWall(game, position.row - 1, position.col, this.Directions.HORIZONTAL) &&
      this.isEmptyWall(game, position.row - 2, position.col, this.Directions.HORIZONTAL) ||
    row === position.row + 2 &&
      !this.isEmptyCell(game, position.row + 1, col) &&
      this.isEmptyWall(game, position.row, position.col, this.Directions.HORIZONTAL) &&
      this.isEmptyWall(game, position.row + 1, position.col, this.Directions.HORIZONTAL)
  );
  var isColHop = row === position.row && (
    col === position.col - 2 &&
      !this.isEmptyCell(game, row, position.col - 1) &&
      this.isEmptyWall(game, position.row, position.col - 1, this.Directions.VERTICAL) &&
      this.isEmptyWall(game, position.row, position.col - 2, this.Directions.VERTICAL) ||
    col === position.col + 2 &&
      !this.isEmptyCell(game, row, position.col + 1) &&
      this.isEmptyWall(game, position.row, position.col, this.Directions.VERTICAL) &&
      this.isEmptyWall(game, position.row, position.col + 1, this.Directions.VERTICAL)
  );

  return isRowHop || isColHop;
};

/**
 * Is move a diagonal hop (through other player)
 * @param {Game} game Game
 * @param {number} row
 * @param {number} col
 * @param {Position} position
 * @returns {boolean}
 */
exports.isDiagonalHop = function(game, row, col, position) {
  var rowIncrease = row > position.row;
  var colIncrease = col > position.col;
  var isNearbyRow = Math.abs(position.row - row) === 1;
  var isNearbyCol = Math.abs(position.col - col) === 1;
  var isPlayerHorizontal = !this.isEmptyCell(game, position.row, col);
  var isPlayerVertical = !this.isEmptyCell(game, row, position.col);
  var isWayToHorizontal = this.isEmptyWall(game, position.row, colIncrease ? position.col : col, this.Directions.VERTICAL);
  var isWayToVertical = this.isEmptyWall(game, rowIncrease ? position.row : row, position.col, this.Directions.HORIZONTAL);
  var isWayFromHorizontal = this.isEmptyWall(game, rowIncrease ? position.row : row, col, this.Directions.HORIZONTAL);
  var isWayFromVertical = this.isEmptyWall(game, row, colIncrease ? position.col : col, this.Directions.VERTICAL);
  var rowBehind = rowIncrease ? row + 1 : row - 1;
  var colBehind = colIncrease ? col + 1 : col - 1;
  var isWayBehindHorizontal = this.isValidPosition(game, position.row, colBehind) &&
    this.isEmptyCell(game, position.row, colBehind) &&
    this.isEmptyWall(game, position.row, colIncrease ? col : colBehind, this.Directions.VERTICAL);
  var isWayBehindVertical = this.isValidPosition(game, rowBehind, position.col) &&
    this.isEmptyCell(game, rowBehind, position.col) &&
    this.isEmptyWall(game, rowIncrease ? row : rowBehind, position.col, this.Directions.HORIZONTAL);

  return isNearbyRow && isNearbyCol && (
      isPlayerHorizontal && isWayToHorizontal && isWayFromHorizontal && !isWayBehindHorizontal ||
      isPlayerVertical && isWayToVertical && isWayFromVertical && !isWayBehindVertical
    );
};

/**
 * Check that all players has way to finish
 * @param {Game} game Game
 * @param {Array.<Object>} walls Additional walls
 * @returns {boolean} Way exists for each player
 */
exports.checkWay = function(game, walls) {
  var existsAll = true;

  game.state.players.forEach(function(player) {
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
      this.getAvailableCells(game, player.position, walls, cells).forEach(function(cell) {
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
 * @param {Game} game Game
 * @param {Position} position
 * @param {Array.<Object>} walls Additional walls
 * @param {Array.<Position>} cells Existed cells
 * @returns {Array.<Position>} Existed cells (same as param)
 */
exports.getAvailableCells = function(game, position, walls, cells) {
  cells = cells || [];

  this.getAvailableNearbyCells(game, position, walls).forEach(function(newCell) {
    var exists = false;

    cells.forEach(function(cell) {
      if (cell.row === newCell.row && cell.col === newCell.col) {
        exists = true;
      }
    }.bind(this));

    if (!exists) {
      cells.push(newCell);

      this.getAvailableCells(game, newCell, walls, cells);
    }
  }.bind(this));

  return cells;
};


/**
 * Get available nearby cells (not separated by walls)
 * @param {Game} game Game
 * @param {Position} position
 * @param {Array.<Object>} walls Additional walls
 * @returns {Array.<Position>} Cells
 */
exports.getAvailableNearbyCells = function(game, position, walls) {
  var maxCol = game.config.size - 1;

  var cells = [];

  // left
  if (position.col > 0 &&
    this.isEmptyWallAdditional(game, position.row, position.col - 1, this.Directions.VERTICAL, walls)
  ) {
    cells.push({
      col: position.col - 1,
      row: position.row
    });
  }

  // right
  if (position.col < maxCol &&
    this.isEmptyWallAdditional(game, position.row, position.col, this.Directions.VERTICAL, walls)
  ) {
    cells.push({
      col: position.col + 1,
      row: position.row
    });
  }

  // top
  if (position.row > 0 &&
    this.isEmptyWallAdditional(game, position.row - 1, position.col, this.Directions.HORIZONTAL, walls)
  ) {
    cells.push({
      col: position.col,
      row: position.row - 1
    });
  }

  // bottom
  if (position.row < maxCol &&
    this.isEmptyWallAdditional(game, position.row, position.col, this.Directions.HORIZONTAL, walls)
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
 * @param {Game} game Game
 * @param {number} row
 * @param {number} col
 * @param {Directions} direction
 * @param {Array.<Object>} walls
 * @returns {boolean} Is empty
 */
exports.isEmptyWallAdditional = function(game, row, col, direction, walls) {
  var isEmpty = this.isEmptyWall(game, row, col, direction);

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
 * @param {Game} game Game
 * @param {number} row
 * @param {number} col
 * @param {boolean} isWall
 * @param {Directions} direction
 * @returns {boolean}
 */
exports.isValidPosition = function(game, row, col, isWall, direction) {
  var maxRow = game.config.size - 1;
  var maxCol = game.config.size - 1;

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
 * @param {Game} game Game
 * @param {number} row
 * @param {number} col
 * @returns {boolean}
 */
exports.isEmptyCell = function(game, row, col) {
  var isEmpty = true;

  game.state.players.forEach(function(player) {
    if (player.position.row === row && player.position.col === col) {
      isEmpty = false;
    }
  }.bind(this));

  return isEmpty;
};

/**
 * Is wall empty
 * @param {Game} game Game
 * @param {number} row
 * @param {number} col
 * @param {Directions} direction
 * @returns {boolean}
 */
exports.isEmptyWall = function(game, row, col, direction) {
  var isEmpty = true;

  game.state.walls[direction].forEach(function(wall) {
    if (wall.row === row && wall.col === col) {
      isEmpty = false;
    }
  }.bind(this));

  return isEmpty;
};

exports.clientEmitters = {
  resetUid: null,
  setGamesList: null,
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
        var game = this.games[data.gameId];
        if (!game) {
          throw 'Game not exists';
        }

        if (typeof index === 'string') {
          index = parseInt(index, 10);
        }

        // TODO check by UID, not by index
        if (game.state.activePlayer !== index) {
          throw 'It\'s not your turn';
        }

        // try to execute command
        if (!this.command(game, data.data)) {
          throw 'Invalid command';
        }

        // check winner
        var winner = this.getWinner(game);

        if (winner === null) {
          this.nextTurn(game);
        } else {
          game.state.activePlayer = null;
          game.state.winner = winner;
          this.deferReset(game);
        }

        this.setState(game);
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

  create: function(socket, callback, data) {
    try {
      if (data.players !== undefined) {
        data.players = parseInt(data.players, 10) || 0;
      }

      if (data.size !== undefined) {
        data.size = parseInt(data.size, 10) || 0;
      }

      if (data.walls !== undefined) {
        data.walls = parseInt(data.walls, 10) || 0;
      }

      var config = this.getDefaultConfig();
      var game = this.createGame(_(config).extend(data));
      this.client.setGamesList(null, {
        games: this.getInactiveGames()
      });
      callback(null, {
        gameId: game.gameId
      });
    } catch (err) {
      callback(err);
    }
  },

  /**
   * On user disconnect
   * @param {Socket} socket Socket
   */
  disconnect: function(socket) {
    _(this.games).each(function(game) {
      var index = this.exit(game, socket.id);

      if (index !== null) {
        this.setState(game);
      }
    }.bind(this));
  },

  /**
   * On exit event
   * @param {Socket} socket Socket
   * @param {function(?string, Object)} callback Event callback
   * @param {Object} data Event data
   */
  exit: function(socket, callback, data) {
    try {
      var game = this.games[data.gameId];
      if (!game) {
        throw 'Game not exists';
      }

      var index = this.exit(game, socket.id);
      socket.set('index', null, function() {
        callback(null, {
          uid: null
        });

        if (index !== null) {
          this.setState(game);
        }
      }.bind(this));
    } catch (err) {
      callback(err);
    }
  },

  getDefaultConfig: function(socket, callback) {
    callback(null, {
      config: this.getDefaultConfig()
    })
  },

  getGamesList: function(socket, callback) {
    callback(null, {
      games: this.getInactiveGames()
    });
  },

  /**
   * On get state event
   * @param {Socket} socket Socket
   * @param {function(?string, Object)} callback Event callback
   * @param {Object} data Event data
   */
  getState: function(socket, callback, data) {
    try {
      var game = this.games[data.gameId];
      if (!game) {
        throw 'Game not exists';
      }

      callback(null, {
        config: game.config,
        state: game.state
      });
    } catch (err) {
      callback(err);
    }
  },

  /**
   * On join event
   * @param {Socket} socket Socket
   * @param {function(?string, Object)} callback Event callback
   * @param {Object} data Event data
   */
  join: function(socket, callback, data) {
    try {
      var game = this.games[data.gameId];
      if (!game) {
        throw 'Game not exists';
      }

      var index = this.join(game, socket.id);
      if (index === null) {
        throw 'Game is full';
      }

      socket.set('index', index, function() {
        callback(null, {
          uid: socket.id
        });

        this.setState(game);
      }.bind(this));
    } catch (err) {
      callback(err);
    }
  }
};