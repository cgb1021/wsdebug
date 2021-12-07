"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var espree = _interopRequireWildcard(require("espree"));

var _config = require("./config");

var _base = _interopRequireDefault(require("./base"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function Client() {
  var _this = this;

  var connectedCallbacks = [];

  _base["default"].apply(this, [].concat(Array.prototype.slice.call(arguments), [connectedCallbacks]));

  var funcMap = {};
  var ids = [];
  var context = null;

  this.register = function (name, func) {
    if (typeof func !== 'function') return;
    funcMap[name] = func;
  };

  this.remove = function (name, func) {
    if (name) return delete funcMap[name];

    if (typeof func === 'function') {
      for (var key in funcMap) {
        if (funcMap[key] === func) {
          return delete funcMap[key];
        }
      }
    }

    return false;
  };

  this.getId = function () {
    return ids;
  };

  this.bind = function (self) {
    if (_typeof(self) === 'object') {
      context = self;
    }
  };

  this.socket.addEventListener('message', function (_ref) {
    var data = _ref.data;

    if (!data.indexOf(_config.protocol.script)) {
      var reg = new RegExp("^".concat(_config.protocol.script).concat(_config.idReg));
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

        var bCalled = false;

        try {
          var res = espree.parse(script);

          if (res.body.length && res.body[0].expression.callee && res.body[0].expression.callee.name) {
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
              result = func.apply(context, args);
              bCalled = true;
            }
          }
        } catch (e) {
          console.log(e.message ? e.message : e);
        }

        if (!bCalled) {
          try {
            result = eval(script);
          } catch (e) {
            console.error(e);
            send(e);
            return;
          }
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
}

Client.prototype = _base["default"].prototype;
var _default = Client;
exports["default"] = _default;