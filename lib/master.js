"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _config = require("./config");

var _prototype = _interopRequireDefault(require("./prototype"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/* 控制端（debug） */
function Master(host, port, ssl) {
  var _this = this;

  if (!port) {
    port = ssl ? 443 : 8081;
  }

  var url = "".concat(ssl ? 'wss' : 'ws', "://").concat(host || '127.0.0.1', ":").concat(port, "/websocket");
  var callbackMap = {};
  var connectedCallbacks = [];
  this.socket = new WebSocket(url);
  this.socket.addEventListener('open', function () {
    _this.socket.send("".concat(_config.protocol.role, "master"));
  });
  this.socket.addEventListener('error', function (err) {
    console.error(err.message ? err.message : 'websocket error');
  });
  this.socket.addEventListener('message', function (_ref) {
    var data = _ref.data;

    if (!data.indexOf(_config.protocol.result)) {
      var reg = new RegExp("^".concat(_config.protocol.result, "(?:(\\w+)/)?(.+)$"));
      var match = data.match(reg);

      if (match) {
        var id = match[1];

        if (id && callbackMap[id]) {
          callbackMap[id](match[2]);
          delete callbackMap[id];
        } else {
          _this.receive(match[2]);
        }
      }
    }

    if (!data.indexOf(_config.protocol.connect)) {
      var arr = new Array(2);

      try {
        arr = data.substr(_config.protocol.connect.length).split('/');
      } catch (e) {
        console.error(e);
      }

      connectedCallbacks.forEach(function (fn) {
        fn({
          id: arr[0],
          value: arr[1]
        });
      });
    }

    if (!data.indexOf(_config.protocol.error)) {
      var _reg = new RegExp("^".concat(_config.protocol.error, "(?:(\\w+)/)?(.+)$"));

      var _match = data.match(_reg);

      if (_match) {
        var _id = _match[1];

        if (_id && callbackMap[_id]) {
          delete callbackMap[_id];
        }
      }

      console.error(data.substr(_config.protocol.error.length));
    }
  });

  this.run = function (script, callback) {
    if (typeof callback === 'function') {
      var id = Date.now() * 100 + Math.floor(Math.random() * 100);
      callbackMap[id] = callback;
      this.socket.send("".concat(_config.protocol.script).concat(id, "/").concat(script));
    } else {
      this.socket.send("".concat(_config.protocol.script).concat(script));
    }
  };

  this.connect = function (id) {
    var opt = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

    if (id) {
      opt = opt === 1 ? 1 : 0;
      this.socket.send("".concat(_config.protocol.id).concat(id, ":").concat(opt));
    }
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
        }

        break;

      default:
        !revmoe ? this.socket.addEventListener(type, func) : this.socket.removeEventListener(type, func);
    }
  };
}

Object.assign(Master.prototype, _prototype["default"]);

Master.prototype.receive = function (msg) {
  console.log('receive', msg);
};

var _default = Master;
exports["default"] = _default;