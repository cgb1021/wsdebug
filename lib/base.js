"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _config = require("./config");

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

var _require = require('../package.json'),
    version = _require.version;

function idSplit(str, role) {
  var list = [];

  if (str) {
    str.split(',').map(function (name) {
      var item = {
        name: name,
        list: []
      };

      if (role === 'master') {
        var arr = name.split(':');
        item.name = arr[0];

        if (arr[1]) {
          item.list = arr[1].split('|');
        }
      }

      list.push(item);
    });
  }

  return list;
}

function Base(host, port, ssl, timeout, onerror) {
  var _this = this;

  switch (arguments.length) {
    case 4:
      timeout = 0;
      break;

    case 3:
      ssl = true;
      break;

    case 2:
      if (_typeof(arguments[0]) === 'object') {
        var arg = arguments[0];
        if (typeof arg.host !== 'undefined') host = arg.host;
        if (typeof arg.port !== 'undefined') port = arg.port;
        if (typeof arg.ssl !== 'undefined') ssl = arg.ssl;
        if (typeof arg.onerror === 'function') onerror = arg.onerror;
        if (typeof arg.timeout !== 'undefined') timeout = arg.timeout;
      } else {
        port = 0;
      }

      break;

    case 1:
      host = '';
      break;
  }

  var _arguments = arguments[arguments.length - 1],
      connectedCallbacks = _arguments.connectedCallbacks,
      role = _arguments.role,
      onmessage = _arguments.onmessage;
  var promiseCallback = {};
  ssl = typeof ssl === 'boolean' && !ssl ? false : true;

  if (!port) {
    port = ssl ? 443 : 8081;
  }

  var ids = [];
  var sessionId = '';
  var intervalId = 0;
  var counter = 0;
  var url = "".concat(ssl ? 'wss' : 'ws', "://").concat(host || '127.0.0.1', ":").concat(port, "/websocket");
  this.name = '';
  this.password = '';
  var socket = new WebSocket(url);
  socket.addEventListener('error', function (err) {
    if (typeof onerror === 'function') {
      onerror(err);
    } else {
      console.error(err.message ? err.message : 'websocket error');
    }
  });
  socket.addEventListener('open', function () {
    _this.send("".concat(_config.protocol.role).concat(role, "/").concat(_this.name, ":").concat(_this.password));

    if (timeout && timeout > 0) {
      intervalId = window.setInterval(function () {
        return _this.send("".concat(_config.protocol.live, "1"));
      }, timeout * 1000);
    }
  });
  socket.addEventListener('close', function () {
    if (intervalId) {
      intervalId = window.clearInterval(intervalId);
    }
  });
  socket.addEventListener('message', function (_ref) {
    var data = _ref.data;
    var msgId = data.match(/#(\w+)$/);
    var message = data.replace(/#\w+$/, '');
    var id = msgId ? msgId[1] : '';

    if (!message.indexOf(_config.protocol.sid)) {
      sessionId = message.substr(_config.protocol.sid.length);
      return;
    }

    if (!message.indexOf(_config.protocol.connect)) {
      var arr = message.substr(_config.protocol.connect.length).split('/');
      var arg1 = idSplit(arr[0], role);
      var arg2 = arr.length > 1 ? +arr[1] : undefined;
      connectedCallbacks.forEach(function (fn) {
        return fn(arg1, arg2);
      });
      return;
    }

    if (id && typeof promiseCallback[id] !== 'undefined') {
      var item = promiseCallback[id];
      window.clearTimeout(item.timeoutId);
      item.resolve(message);
      delete promiseCallback[id]; // console.log('delete promiseCallback[id]', promiseCallback);
    }

    onmessage({
      data: message,
      id: id
    });
  });

  this.role = function () {
    return role;
  };

  this.url = function () {
    return url;
  };

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
        } else {
          connectedCallbacks.length = 0;
        }

        break;

      default:
        !revmoe ? socket.addEventListener(type, func) : socket.removeEventListener(type, func);
    }
  };

  this.send = function (msg) {
    var id = '';

    if (socket && socket.readyState === 1) {
      id = "".concat(Date.now()).concat(counter++);
      socket.send("".concat(msg, "#").concat(id));
    }

    return id;
  };

  this.send2 = function (msg, timeout) {
    var id = this.send(msg);
    return new Promise(function (resolve, reject) {
      if (!id) resolve(id);else {
        var timeoutId = window.setTimeout(function () {
          delete promiseCallback[id];
          reject();
        }, timeout && timeout > 0 ? timeout * 1000 : 5000);
        promiseCallback[id] = {
          resolve: resolve,
          timeoutId: timeoutId
        };
      }
    });
  };

  this.sessionId = function () {
    return sessionId;
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
  var _this2 = this;

  return this.send2("".concat(_config.protocol.query, "1")).then(function (data) {
    return idSplit(data.substr(_config.protocol.query.length), _this2.role());
  });
};

var _default = Base;
exports["default"] = _default;