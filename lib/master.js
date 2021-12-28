"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _config = require("./config");

var _base = _interopRequireDefault(require("./base"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function Master() {
  var onerror = arguments.length > 4 && typeof arguments[4] === 'function' ? arguments[4] : _typeof(arguments[0]) === 'object' && typeof arguments[0].onerror === 'function' ? arguments[0].onerror : null;
  var callbackMap = {};
  var data = {
    connectedCallbacks: [],
    type: 'master',
    onmessage: function onmessage(_ref) {
      var data = _ref.data,
          id = _ref.id;

      if (!data.indexOf(_config.protocol.result)) {
        var result = data.substr(_config.protocol.result.length);

        if (result) {
          try {
            result = JSON.parse(result);
          } catch (e) {} // eslint-disable-line

        }

        if (typeof callbackMap[id] !== 'undefined') {
          callbackMap[id](null, result);
        }
      }

      if (!data.indexOf(_config.protocol.error)) {
        var _result = data.substr(_config.protocol.error.length);

        var error = new Error(_result ? _result : 'unknow error');

        if (typeof callbackMap[id] !== 'undefined') {
          callbackMap[id](error, null);
          return;
        }

        if (onerror) {
          onerror(error);
        } else {
          console.error(error);
        }
      }
    }
  };

  _base["default"].apply(this, [].concat(Array.prototype.slice.call(arguments), [data]));

  this.connect = this.setId;

  this.run = function (script, callback) {
    var id = this.send("".concat(_config.protocol.script).concat(this.sessionId(), "/").concat(script));

    if (id && typeof callback === 'function') {
      callbackMap[id] = callback;
      setTimeout(function () {
        delete callbackMap[id];
      }, 90000); // 5min timeout
    }
  };
}

Master.prototype = _base["default"].prototype;
var _default = Master;
exports["default"] = _default;