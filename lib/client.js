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

  var onerror = arguments.length > 3 && typeof arguments[3] === 'function' ? arguments[3] : null;
  var funcMap = {};
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

  this.bind = function (self) {
    if (_typeof(self) === 'object') {
      context = self;
    }
  };

  this.on('message', function (_ref) {
    var data = _ref.data;

    if (!data.indexOf(_config.protocol.script)) {
      var reg = new RegExp("^".concat(_config.protocol.script).concat(_config.idReg));
      var match = data.match(reg);

      if (match) {
        var sid = match[1];
        var reg2 = new RegExp("^".concat(_config.idReg));
        var match2 = match[2].match(reg2);
        var id = match2 ? match2[1] : '';
        var script = match2 ? match2[2] : match[2];
        var result = void 0;

        var send = function send(err, res) {
          var message = '';

          if (err) {
            var msg = err.message ? err.message : 'error';

            if (id) {
              message = "".concat(_config.protocol.error).concat(id, "/").concat(msg);
            } else {
              message = "".concat(_config.protocol.error).concat(msg);
            }
          } else {
            if (_typeof(res) === 'object') {
              res = JSON.stringify(res);
            }

            if (id) {
              message = "".concat(_config.protocol.result).concat(id, "/").concat(res);
            } else {
              message = "".concat(_config.protocol.result).concat(res);
            }
          }

          _this.send("".concat(_config.protocol.route).concat(sid, "/").concat(message));
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

      return;
    }

    if (!data.indexOf(_config.protocol.error)) {
      var msg = data.substr(_config.protocol.error.length);

      if (onerror) {
        onerror(new Error(msg));
        return;
      } else {
        console.error(msg);
      }
    }

    _this.receive(data);
  });
}

Client.prototype = _base["default"].prototype;
var _default = Client;
exports["default"] = _default;