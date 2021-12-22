/* 客户端 */
import { protocol } from './config';
const { version } = require('../package.json');

function Base(host, port, ssl, timeout, onerror) {
  if (arguments.length === 2 && typeof arguments[0] === 'object') {
    const arg = arguments[0];
    if (typeof arg.host !== 'undefined') host = arg.host;
    if (typeof arg.port !== 'undefined') port = arg.port;
    if (typeof arg.ssl !== 'undefined') ssl = arg.ssl;
    if (typeof arg.onerror !== 'undefined') onerror = arg.onerror;
    if (typeof arg.timeout !== 'undefined') timeout = arg.timeout;
  }
  const {
    connectedCallbacks,
    type
  } = arguments[arguments.length - 1];
  if (!port) {
    port = ssl ? 443 : 8081;
  }
  const url = `${ssl ? 'wss' : 'ws'}://${host || '127.0.0.1'}:${port}/websocket`;
  let ids = [];
  let sessionId = '';
  let intervalId = 0;
  this.name = '';
  this.password = '';
  const socket = new WebSocket(url);
  socket.addEventListener('error', function (err) {
    if (typeof onerror === 'function') {
      onerror(err);
    } else {
      console.error(err.message ? err.message : 'websocket error');
    }
  });
  socket.addEventListener('open', () => {
    this.send(`${protocol.role}${type}/${this.name}:${this.password}`);
    if (timeout && timeout > 0) {
      intervalId = window.setInterval(() => this.send(`${protocol.live}1`), timeout * 1000);
    }
  });
  socket.addEventListener('close', () => {
    if (intervalId) {
      intervalId = window.clearInterval(intervalId);
      intervalId = 0;
    }
  });
  socket.addEventListener('message', ({ data }) => {
    if (!data.indexOf(protocol.sid)) {
      sessionId = data.substr(protocol.sid.length);
      return;
    }
    if (!data.indexOf(protocol.connect)) {
      let arr = [''];
      try {
        arr = data.substr(protocol.connect.length).split('/');
      } catch (e) {
        console.error(e);
      }
      connectedCallbacks.forEach((fn) => fn(arr[0].split(','), arr.length > 1 ? +arr[1] : undefined));
      return;
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
    } else {
      connectedCallbacks.length = 0;
    }
      break;
    default: !revmoe ? socket.addEventListener(type, func) : socket.removeEventListener(type, func);
    }
  };
  this.sessionId = function() {
    return sessionId;
  };
  this.send = function(msg) {
    if (socket && socket.readyState === 1) socket.send(msg);
  };
  this.close = function() {
    socket && socket.close();
  };
  this.readyState = function() {
    return socket.readyState;
  };
  this.setId = function(str, opt = 1) {
    const arr = str.split(',');
    if (arr.length && arr[0]) {
      arr.forEach((id) => {
        if (/^[\w,.-]+$/.test(id)) {
          const index = ids.indexOf(id);
          if (opt && index === -1) {
            ids.push(id);
          } else if (!opt && index > -1) {
            ids.splice(index, 1);
          }
        }
      });
    } else {
      ids.length = 0;
    }
    this.send(`${protocol.id}${ids.length ? ids.join(',') : '*'}`);
  };
  this.getId = function() {
    return ids;
  };
}
Base.prototype.version = function (remote) {
  if (remote) {
    return this.send(`${protocol.version}*`);
  }
  return version;
};
Base.prototype.query = function() {
  this.send(`${protocol.query}1`);
};
Base.prototype.receive = function(msg) {
  console.log(msg);
};

export default Base;