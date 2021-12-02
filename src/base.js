/* 客户端 */
import { protocol } from './config';
const { version } = require('../package.json');

function Base(host, port, ssl, onerror, connectedCallbacks) {
  if (arguments.length === 2 && typeof arguments[0] === 'object') {
    const arg = arguments[0];
    if (typeof arg.host !== 'undefined') host = arg.host;
    if (typeof arg.port !== 'undefined') port = arg.port;
    if (typeof arg.ssl !== 'undefined') ssl = arg.ssl;
    if (typeof arg.onerror !== 'undefined') onerror = arg.onerror;
    connectedCallbacks = arguments[1];
  }
  if (!port) {
    port = ssl ? 443 : 8081;
  }
  const url = `${ssl ? 'wss' : 'ws'}://${host || '127.0.0.1'}:${port}/websocket`;
  this.socket = new WebSocket(url);
  this.socket.addEventListener('error', function (err) {
    if (typeof onerror === 'function') {
      onerror(err);
    } else {
      console.error(err.message ? err.message : 'websocket error');
    }
  });
  this.on = function(type, func, revmoe) {
    switch (type) {
    case 'connect': if (typeof func === 'function') {
      const index = connectedCallbacks.indexOf(func);
      if (!revmoe && index === -1) {
        connectedCallbacks.push(func);
      }
      if (revmoe && index > -1) {
        connectedCallbacks.splice(index, 1);
      }
    }
      break;
    default: !revmoe ? this.socket.addEventListener(type, func) : this.socket.removeEventListener(type, func);
    }
  };
}
Base.prototype.version = function (remote) {
  if (remote) {
    return this.socket && this.socket.readyState === 1 && this.socket.send(`${protocol.version}*`);
  }
  return version;
};
Base.prototype.setId = function(str, opt = 1) {
  if (this.socket && this.socket.readyState === 1) {
    opt = opt === 1 ? 1 : 0;
    if (!/^[\w,.-]+$/.test(str)) {
      str = '*';
    }
    this.socket.send(`${protocol.id}${str}/${opt}`);
  }
};
Base.prototype.getId = function() {
  return this.ids;
};
Base.prototype.close = function() {
  this.socket && this.socket.close();
};
Base.prototype.send = function(msg) {
  if (this.socket && this.socket.readyState === 1) this.socket.send(msg);
};
Base.prototype.query = function() {
  if (this.socket && this.socket.readyState === 1) this.socket.send(`${protocol.query}1`);
};
Base.prototype.live = function() {
  if (this.socket && this.socket.readyState === 1) this.socket.send(`${protocol.live}1`);
};
Base.prototype.receive = function(msg) {
  console.log(msg);
};

export default Base;