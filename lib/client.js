"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _prototype = _interopRequireDefault(require("./prototype"));

var _config = require("./config");

var espree = _interopRequireWildcard(require("espree"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function Client() {
  var _this = this;

  var host = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '127.0.0.1';
  var port = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 8081;
  var url = "ws://".concat(host, ":").concat(port, "/websocket");
  var context = null;
  var id = Date.now() * 100 + Math.floor(Math.random() * 100);
  var funcMap = {};
  var connectedCallbacks = [];
  this.socket = new WebSocket(url);
  this.socket.addEventListener('error', function (err) {
    console.error(err.message ? err.message : 'websocket error');
  });
  this.socket.addEventListener('message', function (_ref) {
    var data = _ref.data;

    if (!data.indexOf(_config.protocol.script)) {
      var reg = new RegExp("^".concat(_config.protocol.script, "(?:(\\w+)/)?(.+)$"));
      var match = data.match(reg);

      if (match) {
        var _id = match[1];
        var script = match[2];
        var result = void 0;

        try {
          var res = espree.parse(script);
          var bCalled = false;

          if (res.body.length && res.body[0].expression.callee.name) {
            var fnName = res.body[0].expression.callee.name;
            var func = funcMap[fnName] ? funcMap[fnName] : typeof window[fnName] === 'function' ? window[fnName] : null;

            if (func) {
              var args = [];
              res.body[0].expression.arguments.forEach(function (item) {
                args.push(item.value);
              });
              result = func.apply(null, args);
              bCalled = true;
            }
          }

          if (!bCalled) {
            result = eval(script);
          }
        } catch (e) {
          console.error(e);
        }

        if (_id) {
          _this.socket.send("".concat(_config.protocol.result).concat(_id, "/").concat(result));
        } else {
          _this.socket.send("".concat(_config.protocol.result).concat(result));
        }
      }
    }

    if (!data.indexOf(_config.protocol.connected)) {
      var val = data.substr(_config.protocol.connected.length);
      connectedCallbacks.forEach(function (fn) {
        fn(val);
      });
    }

    if (!data.indexOf(_config.protocol.error)) {
      console.error(data.substr(_config.protocol.error.length));
    }
  });

  this.bind = function (self) {
    if (self && _typeof(self) === 'object') {
      context = self;
    }
  };

  this.register = function (name, func) {
    if (typeof func !== 'function') return;
    funcMap[name] = context ? func.bind(context) : func;
  };

  this.setId = function (any) {
    if (any && /^\w+$/.test(any)) {
      id = any;
    }

    this.socket.send("".concat(_config.protocol.id).concat(id));
  };

  this.getId = function () {
    return id;
  };

  this.on = function (type, func, revmoe) {
    switch (type) {
      case 'connected':
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

Object.assign(Client.prototype, _prototype["default"]);
var _default = Client;
exports["default"] = _default;