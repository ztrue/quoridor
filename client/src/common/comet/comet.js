/**
 * Comet via socket.io
 */
angular.module('comet', [])
.factory('comet', function($rootScope) {
  /**
   * Connected socket
   * @type {?Socket}
   */
  var socket = null;

  /**
   * Event handler or callback wrapper
   * @param {function(data)} opt_callback Original handler or callback
   * @param {Object} data Event data
   */
  var handler = function(opt_callback, data) {
    if (opt_callback) {
      opt_callback(data);
      $rootScope.$digest();
    }
  };

  /**
   * Not connected error
   */
  var notConnected = function() {
    console.error('Socket not connected');
  };

  return {
    /**
     * Connect to server
     * @returns {this}
     */
    connect: function() {
      if (socket === null) {
        socket = io.connect();
      }

      return this;
    },

    /**
     * Listen
     * @param {Array.<string>|string} events Events names
     * @param {function(Object)} callback Event handler
     * @returns {this}
     */
    on: function(events, callback) {
      if (!angular.isArray(events)) {
        events = [events];
      }

      if (socket !== null) {
        angular.forEach(events, function(event) {
          socket.on(event, handler.bind(this, callback));
        }.bind(this));
      } else {
        notConnected();
      }

      return this;
    },

    /**
     * Send event
     * @param {string} event Event name
     * @param {Object} opt_data Event data
     * @param {function(Object)} opt_callback Event callback
     * @returns {this}
     */
    emit: function(event, opt_data, opt_callback) {
      if (socket !== null) {
        socket.emit(event, opt_data, handler.bind(this, opt_callback));
      } else {
        notConnected();
      }

      return this;
    }
  };
});
