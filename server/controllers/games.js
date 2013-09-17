var _ = require('underscore');

/**
 * Timeout for new game after end, ms
 * @const {number}
 */
exports.TIMEOUT_DEFAULT = TIME.MS_IN_MINUTE * 5;

/**
 * Games collection (game ID as key)
 * @type {Object.<string, Game>}
 */
exports.games = {};

exports.createGame = function(config) {
  var gameId = this.newGameId();
  var game = faf.model('game').new({
    config: config,
    id: gameId
  });
  this.reset(game);
  this.games[gameId] = game;
  return game;
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
  game.reset();
  this.resetSockets(game);
  this.setState(game);
};

/**
 * Reset sockets indexes
 * @param {Game} game Game
 */
exports.resetSockets = function(game) {
  // TODO reset UID only for passed game
  _(this.sockets.sockets).each(function(socket) {
    socket.set('index', null);
  }.bind(this));

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
 * Set state on clients
 * @param {Game} game Game
 */
exports.setState = function(game) {
  this.client.setState(null, {
    gameId: game.id,
    state: game.state
  });
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
        // TODO check at game model, not here
        if (game.state.activePlayer !== index) {
          throw 'It\'s not your turn';
        }

        // try to execute command
        if (!game.command(data.data)) {
          throw 'Invalid command';
        }

        // check winner
        // TODO do it at game model
        var winner = game.getWinner();

        if (winner === null) {
          game.nextTurn();
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

      var game = this.createGame(data);
      this.client.setGamesList(null, {
        games: this.getInactiveGames()
      });
      callback(null, {
        gameId: game.id
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
      var index = game.exit(socket.id);

      if (index !== null) {
        if (game.state.winner !== null) {
          this.deferReset(game);
        }
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

      var index = game.exit(socket.id);
      socket.set('index', null, function() {
        callback(null, {
          uid: null
        });

        if (index !== null) {
          if (game.state.winner !== null) {
            this.deferReset(game);
          }
          this.setState(game);
        }
      }.bind(this));
    } catch (err) {
      callback(err);
    }
  },

  getDefaultConfig: function(socket, callback) {
    callback(null, {
      config: faf.model('game').getDefaultConfig()
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

      var index = game.join(socket.id);
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