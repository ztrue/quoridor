angular
  .module('quoridor.home', [
    'quoridor.game',
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
  .controller('HomeCtrl', function($scope, titleService) {
      titleService.setTitle('Home');
  });
