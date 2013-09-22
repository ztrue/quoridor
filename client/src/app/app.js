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
  .run(function(titleService) {
    titleService.setSuffix(' | ' + titleService.getTitle());
  })
  .controller('AppCtrl', function($scope, $location) {
  });
