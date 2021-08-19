"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _config = require("./config");

var _default = {
  close: function close() {
    if (this.socket) this.socket.close();
  },
  send: function send(msg) {
    if (this.socket) this.socket.send(msg);
  },
  query: function query() {
    if (this.socket) this.socket.send("".concat(_config.protocol.query, "1"));
  },
  live: function live() {
    if (this.socket) this.socket.send("".concat(_config.protocol.live, "1"));
  }
};
exports["default"] = _default;