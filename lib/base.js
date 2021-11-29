"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _config = require("./config");

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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
  this.socket = new WebSocket(url);
  this.socket.addEventListener('error', function (err) {
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
        !revmoe ? this.socket.addEventListener(type, func) : this.socket.removeEventListener(type, func);
    }
  };
}

Base.prototype.setId = function (str) {
  var opt = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

  if (this.socket && this.socket.readyState === 1 && /^[\w.-]+$/.test(str)) {
    opt = opt === 1 ? 1 : 0;
    this.socket.send("".concat(_config.protocol.id).concat(str, "/").concat(opt));
  }
};

Base.prototype.getId = function () {
  return this.ids;
};

Base.prototype.close = function () {
  this.socket && this.socket.close();
};

Base.prototype.send = function (msg) {
  if (this.socket && this.socket.readyState === 1) this.socket.send(msg);
};

Base.prototype.query = function () {
  if (this.socket && this.socket.readyState === 1) this.socket.send("".concat(_config.protocol.query, "1"));
};

Base.prototype.live = function () {
  if (this.socket && this.socket.readyState === 1) this.socket.send("".concat(_config.protocol.live, "1"));
};

Base.prototype.receive = function (msg) {
  console.log(msg);
};

var _default = Base;
exports["default"] = _default;