"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _config = require("./config");

/* 客户端 */
var _require = require('../package.json'),
    version = _require.version;

function idSplit(str, role) {
  var list = [];

  if (str) {
    str.split(',').map(function (name) {
      var item = {
        name: name
      };

      if (role === 'master') {
        var arr = name.split(':');
        item.name = arr[0];
        item.list = arr[1] ? arr[1].split('|') : [];
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
      if ((0, _typeof2["default"])(arguments[0]) === 'object') {
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
  var delayMsgs = [];
  var ids = [];
  var sessionId = '';
  var intervalId = 0;
  var counter = 0;
  ssl = typeof ssl === 'boolean' && !ssl ? false : true;

  if (!port) {
    port = ssl ? 443 : 8081;
  }

  this.name = '';
  this.password = '';
  var socket = new WebSocket("".concat(ssl ? 'wss' : 'ws', "://").concat(host || '127.0.0.1', ":").concat(port, "/websocket"));
  socket.addEventListener('error', function (err) {
    if (typeof onerror === 'function') {
      onerror(err);
    } else {
      console.error(err.message ? err.message : 'websocket error');
    }
  });
  socket.addEventListener('open', function () {
    if (timeout && timeout > 0) {
      intervalId = window.setInterval(function () {
        return _this.send("".concat(_config.protocol.live, "1"));
      }, timeout * 1000);
    }

    _this.send("".concat(_config.protocol.role).concat(role, "/").concat(_this.name, ":").concat(_this.password));

    if (delayMsgs.length) {
      delayMsgs.forEach(function (_ref) {
        var msg = _ref.msg,
            id = _ref.id;
        return socket.send("".concat(msg, "#").concat(id));
      });
      delayMsgs.length = 0;
    }
  });
  socket.addEventListener('close', function () {
    if (intervalId) {
      intervalId = window.clearInterval(intervalId);
    }
  });
  socket.addEventListener('message', function (_ref2) {
    var data = _ref2.data;
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
    return socket.url;
  };

  this.sessionId = function () {
    return sessionId;
  };

  this.readyState = function () {
    return socket.readyState;
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
    if (socket.readyState > 1) {
      return '';
    }

    var id = "".concat(Date.now()).concat(counter++);

    if (!socket.readyState) {
      delayMsgs.push({
        msg: msg,
        id: id
      });
    }

    if (socket.readyState === 1) {
      socket.send("".concat(msg, "#").concat(id));
    }

    return id;
  };

  this.send2 = function (msg, timeout) {
    var id = this.send(msg);
    return new Promise(function (resolve, reject) {
      if (!id) reject(new Error('Close'));else {
        var timeoutId = window.setTimeout(function () {
          delete promiseCallback[id];
          reject(new Error('Timeout'));
        }, timeout && timeout > 0 ? timeout * 1000 : 5000);
        promiseCallback[id] = {
          resolve: resolve,
          timeoutId: timeoutId
        };
      }
    });
  };

  this.close = function () {
    socket && socket.close();
  };

  this.setId = function (str) {
    var opt = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

    if (str) {
      var arr = str.split(',');
      arr.forEach(function (id) {
        if (id && /^[\w,.-]+$/.test(id)) {
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

Base.prototype.version = /*#__PURE__*/function () {
  var _ref3 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(remote) {
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            if (!remote) {
              _context.next = 2;
              break;
            }

            return _context.abrupt("return", this.send2("".concat(_config.protocol.version, "*")).then(function (data) {
              return data.substr(_config.protocol.version.length);
            }));

          case 2:
            return _context.abrupt("return", version);

          case 3:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function (_x) {
    return _ref3.apply(this, arguments);
  };
}();

Base.prototype.query = function () {
  var _this2 = this;

  return this.send2("".concat(_config.protocol.query, "1")).then(function (data) {
    return idSplit(data.substr(_config.protocol.query.length), _this2.role());
  });
};

var _default = Base;
exports["default"] = _default;