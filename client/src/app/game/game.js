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
          templateUrl: '/app/game/game.tpl.html'
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
         * Show game details
         * @type {boolean}
         */
        details: false,
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
          cell: {
            col: null,
            row: null
          },
          wall: {
            col: null,
            direction: null,
            row: null
          }
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
        },
        /**
         * Current user UID
         * @type {?string}
         */
        uid: null
      };

      // init walls directions
      angular.forEach($scope.Directions, function(direction) {
        $scope.model.state.walls[direction] = [];
      });

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
     * @param {number} row
     * @param {number} col
     * @param {Directions} direction
     */
    $scope.build = function(row, col, direction) {
      $scope.command($scope.Commands.BUILD, {
        col: col,
        direction: direction,
        gameId: $scope.model.gameId,
        row: row
      });
    };

    /**
     * Move
     * @param {number} row
     * @param {number} col
     */
    $scope.move = function(row, col) {
      $scope.command($scope.Commands.MOVE, {
        col: col,
        gameId: $scope.model.gameId,
        row: row
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
     * Toggle show details
     */
    $scope.toggleDetails = function() {
      $scope.model.details = !$scope.model.details;
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
     * @param {number} row
     * @param {number} col
     * @param {Directions} direction
     * @returns {boolean}
     */
    $scope.isWall = function(row, col, direction) {
      var exists = false;

      angular.forEach($scope.model.state.walls[direction], function(wall) {
        exists = exists || wall.row === row && wall.col === col;
      });

      return exists;
    };

    /**
     * Hover cell
     * @param {number} row
     * @param {number} col
     */
    $scope.hoverCell = function(row, col) {
      if ($scope.isMyTurn()) {
        $scope.model.hovered.cell.row = row;
        $scope.model.hovered.cell.col = col;
      }
    };

    /**
     * Unhover cell
     */
    $scope.unhoverCell = function() {
      $scope.model.hovered.cell.row = null;
      $scope.model.hovered.cell.col = null;
    };

    /**
     * Is cell hovered
     * @param {number} row
     * @param {number} col
     * @returns {boolean}
     */
    $scope.isCellHovered = function(row, col) {
      return $scope.model.hovered.cell.row === row && $scope.model.hovered.cell.col === col;
    };

    /**
     * Hover wall
     * @param {number} row
     * @param {number} col
     * @param {Directions} direction
     */
    $scope.hoverWall = function(row, col, direction) {
      if ($scope.isMyTurn()) {
        $scope.model.hovered.wall.row = row;
        $scope.model.hovered.wall.col = col;
        $scope.model.hovered.wall.direction = direction;
      }
    };

    /**
     * Unhover wall
     */
    $scope.unhoverWall = function() {
      $scope.model.hovered.wall.row = null;
      $scope.model.hovered.wall.col = null;
      $scope.model.hovered.wall.direction = null;
    };

    /**
     * Is wall hovered (or nearby wall)
     * @param {number} row
     * @param {number} col
     * @param {Directions} direction
     * @returns {boolean}
     */
    $scope.isWallHovered = function(row, col, direction) {
      switch (direction) {
        case $scope.Directions.HORIZONTAL:
          return $scope.model.hovered.wall.direction === direction &&
            $scope.model.hovered.wall.row === row &&
            ($scope.model.hovered.wall.col === col || $scope.model.hovered.wall.col === col - 1);

        case $scope.Directions.VERTICAL:
          return $scope.model.hovered.wall.direction === direction &&
            ($scope.model.hovered.wall.row === row || $scope.model.hovered.wall.row === row - 1) &&
            $scope.model.hovered.wall.col === col;

        case $scope.Directions.CENTER:
          return $scope.model.hovered.wall.row === row && $scope.model.hovered.wall.col === col;

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
     * @param {number} row
     * @param {number} col
     * @returns {?number} Index or null if there is no players at position
     */
    $scope.getPlayerIndex = function(row, col) {
      var existedPlayer = null;

      angular.forEach($scope.model.state.players, function(player) {
        if (player.position.row === row && player.position.col === col) {
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
     * @param {number} row
     * @param {number} col
     * @returns {boolean}
     */
    $scope.isJoinedPlayer = function(row, col) {
      var index = $scope.getPlayerIndex(row, col);
      return index !== null && $scope.model.state.players[index].uid !== null;
    };

    /**
     * Is active player at position
     * @param {number} row
     * @param {number} col
     * @returns {boolean}
     */
    $scope.isActivePlayer = function(row, col) {
      var index = $scope.getPlayerIndex(row, col);
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
  });
