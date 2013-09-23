var _ = require('underscore');

/**
 * Timeout for new game after end, ms
 * @const {number}
 */
var TIMEOUT_DEFAULT = TIME.MS_IN_SECOND * 5;

/**
 * Games collection (game ID as key)
 * @type {Object.<string, Game>}
 */
var games = {};

/**
 * Create new game
 * @param {Object} config Game config
 * @returns {Game} Created game
 */
function createGame(config) {
  var gameId = generateGameId();
  var game = faf.model('game').new({
    config: config,
    id: gameId
  });
  games[gameId] = game;
  return game;
}

/**
 * Generate unique game ID
 * @returns {string} Game ID
 */
function generateGameId() {
  do {
    var gameId = Math.random().toString().replace(/^0\./, '');
  } while(!gameId || games[gameId]);

  return gameId;
}

/**
 * Reset game
 * @param {Game} game Game
 */
function reset(game) {
  game.reset();
  resetSockets(game);
  setState(game);
  setGamesList();
}

/**
 * Reset sockets indexes
 * @param {Game} game Game
 */
function resetSockets(game) {
  var uids = [];

  game.state.players.forEach(function(player) {
    if (player.uid) {
      uids.push(player.uid);
    }
  });

  // TODO reset UID only for passed game
  uids.forEach(function(uid) {
    faf.module('auth').set(uid, 'index', null);
  });

  module.exports.client.resetUid(null, {
    gameId: game.id
  });
}

/**
 * Game reset with timeout
 * @param {Game} game Game
 * @param {number=} opt_timeout Timeout, ms
 */
function deferReset(game, opt_timeout) {
  setTimeout(reset.bind(this, game), opt_timeout || TIMEOUT_DEFAULT);
}

/**
 * Set state on clients
 * @param {Game} game Game
 */
function setState(game) {
  module.exports.client.setState(null, {
    gameId: game.id,
    state: game.state
  });
}

/**
 * Set games list on client
 */
function setGamesList() {
  module.exports.client.setGamesList(null, {
    games: getJoinableGames()
  });
}

/**
 * Get joinable games list
 * @returns {Array.<Object>}
 */
function getJoinableGames() {
  var data = [];

  _(games).each(function(game) {
    if (!game.state.inProgress) {
      data.push({
        config: game.config,
        id: game.id,
        joinedPlayers: game.countPlayers()
      });
    }
  });

  return data;
}

module.exports = {
  /**
   * @see abstract::clientEmitters
   */
  clientEmitters: {
    resetUid: null,
    setGamesList: null,
    setState: null
  },

  /**
   * @see abstract::clientListeners
   */
  clientListeners: {
    /**
     * On command event
     * @param {Socket} socket Socket
     * @param {function(?string, Object)} callback Event callback
     * @param {Object} data Event data
     */
    command: function(socket, callback, data) {
      try {
        var game = games[data.gameId];
        if (!game) {
          throw 'Game does not exists';
        }

        var index = faf.module('auth').getBySocketId(socket.id, 'index');
        // TODO check by UID, not by index
        // TODO check at game model, not here
        if (index === null || game.state.activePlayer !== index) {
          throw 'It\'s not your turn';
        }

        // try to execute command
        game.command(data);

        // check winner
        // TODO do it at game model
        var winner = game.getWinner();

        if (winner === null) {
          game.nextTurn();
        } else {
          game.state.activePlayer = null;
          game.state.winner = winner;
          deferReset(game);
        }

        setState(game);
        callback();
      } catch (err) {
        callback(err);
      }
    },

    /**
     * On user connection
     * @param {Socket} socket Socket
     */
    connection: function(socket) {
      // uid is equal to socket ID
      faf.module('auth').bind(socket.id, socket.id);
    },

    /**
     * On create game event
     * @param {Socket} socket Socket
     * @param {function(?string, Object)} callback Event callback
     * @param {Object} data Event data
     */
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

        var game = createGame(data);
        setGamesList();
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
      var uid = faf.module('auth').getUserId(socket.id);

      _(games).each(function(game) {
        var index = game.exit(uid);

        if (index !== null) {
          if (game.state.winner !== null) {
            deferReset(game);
          }
          setState(game);
          setGamesList();
        }
      });
    },

    /**
     * On exit event
     * @param {Socket} socket Socket
     * @param {function(?string, Object)} callback Event callback
     * @param {Object} data Event data
     */
    exit: function(socket, callback, data) {
      try {
        var game = games[data.gameId];
        if (!game) {
          throw 'Game not exists';
        }

        var uid = faf.module('auth').getUserId(socket.id);

        var index = game.exit(uid);

        faf.module('auth').setBySocketId(socket.id, 'index', null);

        callback(null, {
          uid: null
        });

        if (index !== null) {
          if (game.state.winner !== null) {
            deferReset(game);
          }
          setState(game);
          setGamesList();
        }
      } catch (err) {
        callback(err);
      }
    },

    /**
     * On get default config event
     * @param {Socket} socket Socket
     * @param {function(?string, Object)} callback Event callback
     */
    getDefaultConfig: function(socket, callback) {
      callback(null, {
        config: faf.model('game').getDefaultConfig()
      })
    },

    /**
     * On get games list event
     * @param {Socket} socket Socket
     * @param {function(?string, Object)} callback Event callback
     */
    getGamesList: function(socket, callback) {
      callback(null, {
        games: getJoinableGames()
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
        var game = games[data.gameId];
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
        var game = games[data.gameId];
        if (!game) {
          throw 'Game not exists';
        }

        var uid = faf.module('auth').getUserId(socket.id);

        var index = game.join(uid);
        if (index === null) {
          throw 'Game is full';
        }

        faf.module('auth').setBySocketId(socket.id, 'index', index);

        callback(null, {
          uid: uid
        });

        setState(game);
        setGamesList();
      } catch (err) {
        callback(err);
      }
    }
  }
};
