// titleService from ng-boilerplate
angular
  .module('titleService', [])
  .factory('titleService', function($document) {
    var suffix = '';
    var title = '';

    return {
      setSuffix: function(value) {
        suffix = value;
      },

      getSuffix: function() {
        return suffix;
      },

      setTitle: function(value) {
        title = suffix + value;
        $document.prop('title', title);
      },

      getTitle: function() {
        return $document.prop('title');
      }
    }
  });
