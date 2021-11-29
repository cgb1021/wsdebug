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

  var connectedCallbacks = [];

  _base["default"].apply(this, [].concat(Array.prototype.slice.call(arguments), [connectedCallbacks]));

  var callbackMap = {};

  this.run = function (script, callback) {
    if (this.socket.readyState !== 1) return;

    if (typeof callback === 'function') {
      var id = (0, _uuid.v4)();
      callbackMap[id] = callback;
      this.socket.send("".concat(_config.protocol.script).concat(id, "/").concat(script));
      setTimeout(function () {
        delete callbackMap[id];
      }, 300000); // 5min timeout
    } else {
      this.socket.send("".concat(_config.protocol.script).concat(script));
    }
  };

  this.socket.addEventListener('message', function (_ref) {
    var data = _ref.data;

    if (!data.indexOf(_config.protocol.result)) {
      var reg = new RegExp("^".concat(_config.protocol.result).concat(_config.idReg));
      var match = data.match(reg);

      if (match) {
        var id = match[1];

        if (id && callbackMap[id]) {
          callbackMap[id](match[2]);
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
      var _reg = new RegExp("^".concat(_config.protocol.error).concat(_config.idReg));

      var _match = data.match(_reg);

      if (_match) {
        var _id = _match[1];

        if (_id && callbackMap[_id]) {
          callbackMap[_id](null, new Error(_match[2]));
        }
      }

      console.error(data.substr(_config.protocol.error.length));
    }
  });
}

Master.prototype = _base["default"].prototype;
var _default = Master;
exports["default"] = _default;