angular
  .module('quoridor', [
    'quoridor.game',
    'quoridor.home',
    'faf',
    'ui.router.state'
  ])
  .config(function($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/home');
  })
  .run(function($title) {
    $title.setSuffix(' | ' + $title.getTitle());
  })
  .controller('AppCtrl', function() {});
