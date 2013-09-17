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
  .controller('HomeCtrl', function($scope, titleService, $comet) {
    titleService.setTitle('Home');

    /**
     * Available events
     * @enum {string}
     */
    $scope.Events = {
      client: {
        CREATE: 'create',
        GET_DEFAULT_CONFIG: 'getDefaultConfig',
        GET_GAMES_LIST: 'getGamesList'
      },
      server: {
        SET_GAMES_LIST: 'setGamesList'
      }
    };

    $scope.model = {
      games: [],
      form: {
        data: {
          players: 0,
          size: 0,
          walls: 0
        },
        error: null
      }
    };

    $scope.init = function() {
      $comet
        .connect()
        .emit($scope.Events.client.GET_DEFAULT_CONFIG, function(err, data) {
          if (!err) {
            $scope.model.form.data = data.config;
          }
        })
        .emit($scope.Events.client.GET_GAMES_LIST, function(err, data) {
          if (!err) {
            $scope.setGamesList(data.games);
          }
        })
        .on($scope.Events.server.SET_GAMES_LIST, function(data) {
          $scope.setGamesList(data.games);
        });
    };

    $scope.setGamesList = function(games) {
      $scope.model.games = games;
    };

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
          // TODO go to game page
        }
      });
    };
  });
