var express = require('express');
var socketIo = require('socket.io');

require('./functions');
require('./globals');

var config = require(PATH_CONFIGS + 'config');

var app = express()
  .use(express.logger(config.LOGGER))
  .use(express.static(config.PUBLIC))
  .listen(config.PORT);

var io = socketIo.listen(app);

//require(PATH_MANAGERS + 'model').init();
//require(PATH_MANAGERS + 'service').init();
//require(PATH_MANAGERS + 'controller').init(io.sockets);

require(PATH_CONTROLLERS + 'game').init(io.sockets);

console.log('Server started at port ' + config.PORT);
