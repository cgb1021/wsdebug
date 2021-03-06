"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _config = require("./config");

var _base = _interopRequireDefault(require("./base"));

/* 控制端（debug） */
function Master() {
  var onerror = arguments.length > 4 && typeof arguments[4] === 'function' ? arguments[4] : (0, _typeof2["default"])(arguments[0]) === 'object' && typeof arguments[0].onerror === 'function' ? arguments[0].onerror : null;
  var callbackMap = {};
  var data = {
    connectedCallbacks: [],
    role: 'master',
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

        if (typeof callbackMap[id] === 'function') {
          callbackMap[id](null, result);
        } else if (callbackMap[id] && onerror) {
          onerror(callbackMap[id]);
        }
      }

      if (!data.indexOf(_config.protocol.error)) {
        var _result = data.substr(_config.protocol.error.length);

        var error = new Error(_result ? _result : 'unknow error');

        if (typeof callbackMap[id] === 'function') {
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

  this.run = function (script, callback, timeout) {
    var id = this.send("".concat(_config.protocol.script).concat(this.sessionId(), "/").concat(script));

    if (id && typeof callback === 'function') {
      callbackMap[id] = callback;
      setTimeout(function () {
        callbackMap[id] = new Error('RunTimeout');
      }, timeout && timeout > 0 ? timeout * 1000 : 90000); // 5min timeout
    }
  };

  this.connect = this.setId;
}

Master.prototype = _base["default"].prototype;
var _default = Master;
exports["default"] = _default;