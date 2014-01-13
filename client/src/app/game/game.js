angular
  .module('quoridor.game', [
    'faf',
    'ui.router.state'
  ])
  .config(function($stateProvider) {
    $stateProvider.state('game', {
      url: '/game/:gameId',
      views: {
        main: {
          controller: 'GameCtrl',
          templateUrl: '/app/game/game.html'
        }
      }
    });
  })
  .controller('GameCtrl', function($scope, $title, $comet, $state, $stateParams) {
    $title.setTitle('Game');

    /**
     * Available commands
     * @enum {string}
     */
    $scope.Commands = {
      BUILD: 'build',
      MOVE: 'move',
      SKIP: 'skip'
    };

    /**
     * Available wall directions
     * @enum {string}
     */
    $scope.Directions = {
      CENTER: 'center',
      HORIZONTAL: 'horizontal',
      VERTICAL: 'vertical'
    };

    /**
     * Available events
     * @enum {string}
     */
    $scope.Events = {
      client: {
        COMMAND: 'command',
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

    $scope.reset = function() {
      /**
       * Game model
       * @type {Object}
       */
      $scope.model = {
        /**
         * Game config
         * @type {Object}
         */
        config: {
          /**
           * Number of players
           * @type {number}
           */
          players: null,
          /**
           * Field size
           * @type {number}
           */
          size: null,
          /**
           * Number of walls, each player has
           * @type {number}
           */
          walls: null
        },
        /**
         * Game ID
         * @type {string}
         */
        gameId: $stateParams.gameId,
        /**
         * Hovered cell and wall
         * @type {Object}
         */
        hovered: {
          /**
           * Hovered cell
           * @type {Position}
           */
          cell: null,
          /**
           * Hovered wall
           * @type {Wall}
           */
          wall: null
        },
        /**
         * Game state
         * @type {State}
         */
        state: {
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
        },
        /**
         * Current user UID
         * @type {?string}
         */
        uid: null
      };

      if ($scope.model.gameId) {
        var data = {
          gameId: $scope.model.gameId
        };

        // load state
        $comet.emit($scope.Events.client.GET_STATE, data, function(err, data) {
          if (err) {
            $scope.openGamesList();
          } else {
            $scope.setConfig(data.config);
            $scope.setState(data.state);
          }
        });
      }
    };

    /**
     * Init game
     */
    $scope.init = function() {
      $comet
        .connect()
        // listen events
        .on($scope.Events.server.RESET_UID, function(data) {
          if (data.gameId === $scope.model.gameId) {
            $scope.model.uid = null;
          }
        })
        .on($scope.Events.server.SET_STATE, function(data) {
          if (data.gameId === $scope.model.gameId) {
            $scope.setState(data.state);
          }
        });

      $scope.reset();
    };

    /**
     * Set game config
     * @param {Object} config Game config
     */
    $scope.setConfig = function(config) {
      $scope.model.config = config;
    };

    /**
     * Set game state
     * @param {State} state Game state
     */
    $scope.setState = function(state) {
      $scope.model.state = state;
    };

    /**
     * Join game
     */
    $scope.join = function() {
      var data = {
        gameId: $scope.model.gameId
      };

      $comet.emit($scope.Events.client.JOIN, data, function(err, data) {
        if (!err) {
          $scope.model.uid = data.uid;
        }
      });
    };

    /**
     * Exit from game
     */
    $scope.exit = function() {
      var data = {
        gameId: $scope.model.gameId
      };

      $comet.emit($scope.Events.client.EXIT, data, function(err) {
        if (!err) {
          $scope.model.uid = null;
        }
      });
    };

    /**
     * Send command
     * @param {Commands} command Command name
     * @param {Object} data Command data
     */
    $scope.command = function(command, data) {
      data = data || {};
      data.command = command;
      data.gameId = $scope.model.gameId;
      $comet.emit($scope.Events.client.COMMAND, data);
    };

    /**
     * Build a wall
     * @param {Wall} wall
     */
    $scope.build = function(wall) {
      $scope.command($scope.Commands.BUILD, {
        wall: wall
      });
    };

    /**
     * Move
     * @param {Position} position
     */
    $scope.move = function(position) {
      $scope.command($scope.Commands.MOVE, {
        position: position
      });
    };

    /**
     * Skip turn
     */
    $scope.skip = function() {
      $scope.command($scope.Commands.SKIP, {
        gameId: $scope.model.gameId
      });
    };

    /**
     * Open games list page
     */
    $scope.openGamesList = function() {
      $scope.exit();
      $state.go('home');
    };

    /**
     * Is current user turn
     * @returns {boolean}
     */
    $scope.isMyTurn = function() {
      return $scope.model.state.activePlayer !== null &&
        $scope.model.uid !== null &&
        $scope.model.uid === $scope.model.state.players[$scope.model.state.activePlayer].uid;
    };

    /**
     * Is wall exists at position
     * @param {Position} position
     * @param {Directions} direction
     * @returns {boolean}
     */
    $scope.isWall = function(position, direction) {
      var exists = false;

      angular.forEach($scope.model.state.walls, function(wall) {
        exists = exists || wall.position.row === position.row && wall.position.col === position.col && wall.direction === direction;
      });

      return exists;
    };

    /**
     * Hover cell
     * @param {Position} position
     */
    $scope.hoverCell = function(position) {
      if ($scope.isMyTurn()) {
        $scope.model.hovered.cell = position;
      }
    };

    /**
     * Unhover cell
     */
    $scope.unhoverCell = function() {
      $scope.model.hovered.cell = null;
    };

    /**
     * Is cell hovered
     * @param {Position} position
     * @returns {boolean}
     */
    $scope.isCellHovered = function(position) {
      return $scope.model.hovered.cell &&
        $scope.model.hovered.cell.row === position.row &&
        $scope.model.hovered.cell.col === position.col;
    };

    /**
     * Hover wall
     * @param {Wall} wall
     */
    $scope.hoverWall = function(wall) {
      if ($scope.isMyTurn()) {
        $scope.model.hovered.wall = wall;
      }
    };

    /**
     * Unhover wall
     */
    $scope.unhoverWall = function() {
      $scope.model.hovered.wall = null;
    };

    /**
     * Is wall hovered (or nearby wall)
     * @param {Position} position
     * @param {Directions} direction
     * @returns {boolean}
     */
    $scope.isWallHovered = function(position, direction) {
      if (!$scope.model.hovered.wall) {
        return false;
      }

      switch (direction) {
        case $scope.Directions.HORIZONTAL:
          return $scope.model.hovered.wall.direction === direction &&
            $scope.model.hovered.wall.position.row === position.row &&
            ($scope.model.hovered.wall.position.col === position.col || $scope.model.hovered.wall.position.col === position.col - 1);

        case $scope.Directions.VERTICAL:
          return $scope.model.hovered.wall.direction === direction &&
            ($scope.model.hovered.wall.position.row === position.row || $scope.model.hovered.wall.position.row === position.row - 1) &&
            $scope.model.hovered.wall.position.col === position.col;

        case $scope.Directions.CENTER:
          return $scope.model.hovered.wall.position.row === position.row && $scope.model.hovered.wall.position.col === position.col;

        default:
          return false;
      }
    };

    /**
     * Can join game now
     * @returns {boolean}
     */
    $scope.isJoinable = function() {
      return $scope.model.uid === null && !$scope.model.state.inProgress;
    };

    /**
     * Can exit from game now
     * @returns {boolean}
     */
    $scope.isExitable = function() {
      return $scope.model.uid !== null;
    };

    /**
     * Get player index at position
     * @param {Position} position
     * @returns {?number} Index or null if there is no players at position
     */
    $scope.getPlayerIndex = function(position) {
      var existedPlayer = null;

      angular.forEach($scope.model.state.players, function(player) {
        if (player.position.row === position.row && player.position.col === position.col) {
          existedPlayer = player;
        }
      });

      return existedPlayer ? existedPlayer.index : null;
    };

    /**
     * Is it index of current user
     * @param {number} index
     * @returns {boolean}
     */
    $scope.isMe = function(index) {
      return $scope.model.uid !== null &&
        $scope.model.state.players[index].uid === $scope.model.uid;
    };

    /**
     * Is joined player at position
     * @param {Position} position
     * @returns {boolean}
     */
    $scope.isJoinedPlayer = function(position) {
      var index = $scope.getPlayerIndex(position);
      return index !== null && $scope.model.state.players[index].uid !== null;
    };

    /**
     * Is active player at position
     * @param {Position} position
     * @returns {boolean}
     */
    $scope.isActivePlayer = function(position) {
      var index = $scope.getPlayerIndex(position);
      return index !== null && index === $scope.model.state.activePlayer;
    };

    /**
     * Count joined players
     */
    $scope.countJoinedPlayers = function() {
      var counter = 0;

      $scope.model.state.players.forEach(function(player) {
        if (player.uid) {
          counter++;
        }
      });

      return counter;
    };

    /**
     * Create position
     * @param {number} row
     * @param {number} col
     * @returns {Object}
     * @todo Use models
     */
    $scope.position = function(row, col) {
      return {
        col: col,
        row: row
      };
    };

    /**
     * Create wall
     * @param {Position} position
     * @param {Directions} direction
     * @returns {Object}
     * @todo Use models
     */
    $scope.wall = function(position, direction) {
      return {
        direction: direction,
        position: position
      };
    };
  });
