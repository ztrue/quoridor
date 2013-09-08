/**
 * Add range to array
 */
angular.module('range', [])
.filter('range', function() {
  return function(array, iterations) {
    iterations = parseInt(iterations, 10);
    for (var i = 0; i < iterations; i++) {
      array.push(i);
    }
    return array;
  };
});
