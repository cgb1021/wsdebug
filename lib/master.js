"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _uuid = require("uuid");

var _config = require("./config");

var _base = _interopRequireDefault(require("./base"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/* 控制端（debug） */
function Master() {
  var _this = this;

  var data = {
    connectedCallbacks: [],
    type: 'master'
  };

  _base["default"].apply(this, [].concat(Array.prototype.slice.call(arguments), [data]));

  var onerror = arguments.length > 4 && typeof arguments[4] === 'function' ? arguments[4] : null;
  var callbackMap = {};
  this.connect = this.setId;

  this.run = function (script, callback) {
    if (this.readyState() !== 1) return;
    var sessionId = this.sessionId();

    if (typeof callback === 'function') {
      var id = (0, _uuid.v4)();
      callbackMap[id] = callback;
      this.send("".concat(_config.protocol.script).concat(sessionId, "/").concat(id, "/").concat(script));
      setTimeout(function () {
        delete callbackMap[id];
      }, 180000); // 5min timeout
    } else {
      this.send("".concat(_config.protocol.script).concat(sessionId, "/").concat(script));
    }
  };

  this.on('message', function (_ref) {
    var data = _ref.data;

    if (!data.indexOf(_config.protocol.result)) {
      var reg = new RegExp("^".concat(_config.protocol.result).concat(_config.idReg));
      var match = data.match(reg);

      if (match) {
        var id = match[1];

        if (id && callbackMap[id]) {
          callbackMap[id](match[2]);
          return;
        }
      }
    }

    if (!data.indexOf(_config.protocol.error)) {
      var _reg = new RegExp("^".concat(_config.protocol.error).concat(_config.idReg));

      var _match = data.match(_reg);

      var error = null;

      if (_match) {
        var _id = _match[1];
        error = new Error(_match[2]);

        if (_id && callbackMap[_id]) {
          callbackMap[_id](null, error);
        }
      }

      if (onerror) {
        onerror(error ? error : new Error('unknow error'));
        return;
      } else {
        console.error(error ? error.message : 'unknow error');
      }
    }

    _this.receive(data);
  });
}

Master.prototype = _base["default"].prototype;
var _default = Master;
exports["default"] = _default;