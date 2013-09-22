angular
  .module('quoridor.game', [
    'quoridor.quoridor',
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

    $scope.model = {
      gameId: $stateParams.gameId
    };

    /**
     * Page initialization
     */
    $scope.init = function() {
      $scope.$watch('model.gameId', function(gameId) {
        if (!gameId) {
          $state.go('home');
        }
      });
    };

    /**
     * Open games list page
     */
    $scope.openGamesList = function() {
      $scope.model.gameId = null;
    };
  });
