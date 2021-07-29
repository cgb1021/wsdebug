"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _config = require("./config");

var _default = {
  close: function close() {
    this.socket.close();
  },
  send: function send(msg) {
    this.socket.send("".concat(_config.protocol.result).concat(msg));
  }
};
exports["default"] = _default;