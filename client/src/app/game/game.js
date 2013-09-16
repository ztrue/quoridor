angular
  .module('quoridor.game', [
    'quoridor.quoridor',
    'faf',
    'ui.router.state',
    'titleService'
  ])
  .config(function($stateProvider) {
    $stateProvider.state('game', {
      url: '/game',
      views: {
        main: {
          controller: 'GameCtrl',
          templateUrl: '/app/game/game.tpl.html'
        }
      }
    });
  })
  .controller('GameCtrl', function($scope, titleService) {
    titleService.setTitle('Game');

  });
