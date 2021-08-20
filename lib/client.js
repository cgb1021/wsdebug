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

function Client(host, port, ssl, onerror) {
  var _this = this;

  if (!port) {
    port = ssl ? 443 : 8081;
  }

  var url = "".concat(ssl ? 'wss' : 'ws', "://").concat(host || '127.0.0.1', ":").concat(port, "/websocket");
  var context = null;
  var ids = [];
  var funcMap = {};
  var connectedCallbacks = [];
  this.socket = new WebSocket(url);
  this.socket.addEventListener('error', function (err) {
    if (typeof onerror === 'function') {
      onerror(err);
    } else {
      console.error(err.message ? err.message : 'websocket error');
    }
  });
  this.socket.addEventListener('message', function (_ref) {
    var data = _ref.data;

    if (!data.indexOf(_config.protocol.script)) {
      var reg = new RegExp("^".concat(_config.protocol.script, "(?:(\\w+)/)?(.+)$"));
      var match = data.match(reg);

      if (match) {
        var id = match[1];
        var script = match[2];
        var result = void 0;

        var send = function send(err, res) {
          if (err) {
            var msg = err.message ? err.message : 'error';

            if (id) {
              _this.socket.send("".concat(_config.protocol.error).concat(id, "/").concat(msg));
            } else {
              _this.socket.send("".concat(_config.protocol.error).concat(msg));
            }

            return;
          }

          if (_typeof(res) === 'object') {
            res = JSON.stringify(res);
          }

          if (id) {
            _this.socket.send("".concat(_config.protocol.result).concat(id, "/").concat(res));
          } else {
            _this.socket.send("".concat(_config.protocol.result).concat(res));
          }
        };

        try {
          var res = espree.parse(script);
          var bCalled = false;

          if (res.body.length && res.body[0].expression.callee.name) {
            var fnName = res.body[0].expression.callee.name;
            var func = funcMap[fnName] ? funcMap[fnName] : typeof window[fnName] === 'function' ? window[fnName] : null;

            if (func) {
              var getValue = function getValue(node) {
                if (typeof node.properties !== 'undefined') {
                  var value = {};
                  node.properties.forEach(function (item) {
                    value[item.key.name] = getValue(item.value);
                  });
                  return value;
                } else if (typeof node.elements !== 'undefined') {
                  var _value = [];
                  node.elements.forEach(function (item) {
                    _value.push(getValue(item));
                  });
                  return _value;
                }

                return node.value;
              };

              var args = [];
              res.body[0].expression.arguments.forEach(function (item) {
                args.push(getValue(item));
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
          send(e);
          return;
        }

        if (result instanceof Promise) {
          result.then(function (res) {
            return send(null, res);
          })["catch"](function (e) {
            console.error(e);
            send(e);
          });
        } else {
          send(null, result);
        }
      }
    }

    if (!data.indexOf(_config.protocol.connect)) {
      var val = data.substr(_config.protocol.connect.length);
      connectedCallbacks.forEach(function (fn) {
        fn(val);
      });
    }

    if (!data.indexOf(_config.protocol.id)) {
      var str = data.substr(_config.protocol.id.length);

      if (str) {
        ids = str.split(',');
      } else {
        ids = [];
      }
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
    var opt = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

    if (this.socket.readyState === 1 && any && /^\w+$/.test(any)) {
      opt = opt === 1 ? 1 : 0;
      this.socket.send("".concat(_config.protocol.id).concat(any, ":").concat(opt));
    }
  };

  this.getId = function () {
    return ids;
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

Object.assign(Client.prototype, _prototype["default"]);
var _default = Client;
exports["default"] = _default;