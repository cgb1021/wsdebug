"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _config = require("./config");

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

var _require = require('../package.json'),
    version = _require.version;

function Base(host, port, ssl, onerror, connectedCallbacks) {
  if (arguments.length === 2 && _typeof(arguments[0]) === 'object') {
    var arg = arguments[0];
    if (typeof arg.host !== 'undefined') host = arg.host;
    if (typeof arg.port !== 'undefined') port = arg.port;
    if (typeof arg.ssl !== 'undefined') ssl = arg.ssl;
    if (typeof arg.onerror !== 'undefined') onerror = arg.onerror;
    connectedCallbacks = arguments[1];
  }

  if (!port) {
    port = ssl ? 443 : 8081;
  }

  var url = "".concat(ssl ? 'wss' : 'ws', "://").concat(host || '127.0.0.1', ":").concat(port, "/websocket");
  var ids = [];
  var socket = new WebSocket(url);
  socket.addEventListener('error', function (err) {
    if (typeof onerror === 'function') {
      onerror(err);
    } else {
      console.error(err.message ? err.message : 'websocket error');
    }
  });

  this.on = function (type, func, revmoe) {
    switch (type) {
      case 'connect':
        if (typeof func === 'function') {
          var index = connectedCallbacks.indexOf(func);

          if (!revmoe && index === -1) {
            connectedCallbacks.push(func);
          }

          if (revmoe && index > -1) {
            connectedCallbacks.splice(index, 1);
          }
        }

        break;

      default:
        !revmoe ? socket.addEventListener(type, func) : socket.removeEventListener(type, func);
    }
  };

  this.send = function (msg) {
    if (socket && socket.readyState === 1) socket.send(msg);
  };

  this.close = function () {
    socket && socket.close();
  };

  this.readyState = function () {
    return socket.readyState;
  };

  this.setId = function (str) {
    var opt = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
    var arr = str.split(',');

    if (arr.length && arr[0]) {
      arr.forEach(function (id) {
        if (/^[\w,.-]+$/.test(id)) {
          var index = ids.indexOf(id);

          if (opt && index === -1) {
            ids.push(id);
          } else if (!opt && index > -1) {
            ids.splice(index, 1);
          }
        }
      });
    } else {
      ids.length = 0;
    }

    this.send("".concat(_config.protocol.id).concat(ids.length ? ids.join(',') : '*'));
  };

  this.getId = function () {
    return ids;
  };
}

Base.prototype.version = function (remote) {
  if (remote) {
    return this.send("".concat(_config.protocol.version, "*"));
  }

  return version;
};

Base.prototype.query = function () {
  this.send("".concat(_config.protocol.query, "1"));
};

Base.prototype.live = function () {
  this.send("".concat(_config.protocol.live, "1"));
};

Base.prototype.receive = function (msg) {
  console.log(msg);
};

var _default = Base;
exports["default"] = _default;