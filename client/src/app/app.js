angular.module('quoridor', [
  'templates-app',
  'templates-common',
  'quoridor.home',
  'ui.state',
  'ui.route'
])

.config(function myAppConfig($stateProvider, $urlRouterProvider) {
  $urlRouterProvider.otherwise('/home');
})

.run(function run (titleService) {
  titleService.setSuffix(' | quoridor');
})

.controller('AppCtrl', function AppCtrl($scope, $location) {
})

;
