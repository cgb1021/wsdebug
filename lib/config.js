"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.idReg = exports.protocol = void 0;
var protocol = {
  script: 'script://',
  result: 'result://',
  connect: 'connect://',
  query: 'query://',
  live: 'live://',
  close: 'close://',
  id: 'id://',
  role: 'role://',
  error: 'error://',
  version: 'version://',
  channel: 'channel://'
};
exports.protocol = protocol;
var idReg = '(?:([\\w-]+)/)?(.+)$';
exports.idReg = idReg;