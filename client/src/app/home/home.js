angular
  .module('quoridor.home', [
    'faf',
    'ui.router.state',
    'titleService'
  ])
  .config(function($stateProvider) {
    $stateProvider.state('home', {
      url: '/home',
      views: {
        main: {
          controller: 'HomeCtrl',
          templateUrl: '/app/home/home.tpl.html'
        }
      }
    });
  })
  .controller('HomeCtrl', function($scope, titleService, $comet, $state) {
    titleService.setTitle('Home');

    /**
     * Available events
     * @enum {string}
     */
    $scope.Events = {
      client: {
        CREATE: 'create',
        GET_DEFAULT_CONFIG: 'getDefaultConfig',
        GET_GAMES_LIST: 'getGamesList',
        JOIN: 'join'
      },
      server: {
        SET_GAMES_LIST: 'setGamesList'
      }
    };

    /**
     * Page model
     * @type {Object}
     */
    $scope.model = {
      /**
       * Games
       * @type {Array.<Object>}
       * @schema {
       *   config: Config,
       *   id: string,
       *   state: State
       * }
       */
      games: [],
      /**
       * New game form
       * @type {Object}
       */
      form: {
        /**
         * Form data
         * @type {Object}
         */
        data: {
          /**
           * Number of players
           * @type {string}
           */
          players: '0',
          /**
           * Field size
           * @type {string}
           */
          size: '0',
          /**
           * Number of walls for each player
           * @type {string}
           */
          walls: '0'
        },
        /**
         * Form error
         * @type {string}
         */
        error: null
      }
    };

    /**
     * Page initialization
     */
    $scope.init = function() {
      $comet
        .connect()
        // get default game config
        .emit($scope.Events.client.GET_DEFAULT_CONFIG, function(err, data) {
          if (!err) {
            $scope.model.form.data = data.config;
          }
        })
        // get games list
        .emit($scope.Events.client.GET_GAMES_LIST, function(err, data) {
          if (!err) {
            $scope.setGamesList(data.games);
          }
        })
        // listen games list
        .on($scope.Events.server.SET_GAMES_LIST, function(data) {
          $scope.setGamesList(data.games);
        });
    };

    /**
     * Set games list
     * @param {Array.<Object>} games Joinable games
     */
    $scope.setGamesList = function(games) {
      $scope.model.games = games;
    };

    /**
     * Open game page
     * @param {string} gameId Game ID
     */
    $scope.open = function(gameId) {
      $state.go('game', {
        gameId: gameId
      });
    };

    /**
     * Create new game
     */
    $scope.create = function() {
      $scope.model.form.error = null;

      var data = {
        players: parseInt($scope.model.form.data.players, 10),
        size: parseInt($scope.model.form.data.size, 10),
        walls: parseInt($scope.model.form.data.walls, 10)
      };

      $comet.emit($scope.Events.client.CREATE, data, function(err, data) {
        if (err) {
          $scope.model.form.error = err;
        } else {
          $scope.open(data.gameId);
        }
      });
    };
  });
