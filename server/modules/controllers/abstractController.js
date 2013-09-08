/**
 * Cookie module
 * @type {Object}
 */
exports.cookie = require('cookie');

/**
 * Sockets
 * @type {Object}
 */
exports.sockets = null;

/**
 * Available events
 * @enum {string}
 */
exports.Events = {
  client: {
    DISCONNECT: 'disconnect'
  },
  server: {}
};

/**
 * On client connection
 * @param {Socket} socket Socket
 */
exports.onConnection = function(socket) {};

/**
 * On client disconnect
 * @param {Socket} socket Socket
 */
exports.onDisconnect = function(socket) {};

/**
 * Controller initialize
 * @param {Object} sockets Sockets
 */
exports.init = function(sockets) {
  this.sockets = sockets;
  sockets.on('connection', this.onConnection.bind(this));
  sockets.on('connection', this.listen.bind(this));
  this.bootstrap();
};

/**
 * Controller bootstrap
 */
exports.bootstrap = function() {};

/**
 * Listen events
 * @param {Socket} socket
 */
exports.listen = function(socket) {
  for (var key in this.Events.client) {
    if (this.Events.client.hasOwnProperty(key)) {
      var event = this.Events.client[key];
      socket.on(event, function(event, data, callback) {
        var handlerName = 'on' + capitalize(event);
        if (this[handlerName] !== undefined) {
          try {
            this[handlerName](
              socket,
              isObject(data) ? data : {},
              this.response.bind(this, callback)
            );
          } catch (err) {
            console.error(err);
          }
        } else {
          this.response(callback, 'Invalid event');
        }
      }.bind(this, event));
    }
  }
};

/**
 * Response to client
 * @param {function(Object)} callback
 * @param {?string} err
 * @param {?Object} data
 */
exports.response = function(callback, err, data) {
  if (err === undefined) {
    err = null;
  }

  if (!isObject(data)) {
    data = {};
  }

  data.success = err === null;
  data.error = err;

  callback(data);
};

/**
 * Send event
 * @param {Object} emitter Event emitter
 * @param {string} event Event name
 * @param {Object} opt_data Event data
 */
exports.send = function(emitter, event, opt_data) {
  emitter.emit(event, opt_data || {});
};

/**
 * Send event for one client
 * @param {Socket} socket Socket
 * @param {string} event Event name
 * @param {Object} opt_data Event data
 */
exports.emit = function(socket, event, opt_data) {
  this.send(socket, event, opt_data);
};

/**
 * Send event for each exclude one client
 * @param {Socket} socket Excluded socket
 * @param {string} event Event name
 * @param {Object} opt_data Event data
 */
exports.broadcast = function(socket, event, opt_data) {
  this.send(socket.broadcast, event, opt_data);
};

/**
 * Send event for each client
 * @param {string} event Event name
 * @param {Object} opt_data Event data
 */
exports.emitAll = function(event, opt_data) {
  this.send(this.sockets, event, opt_data);
};
