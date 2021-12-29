/* 客户端 */
import { protocol } from './config';
const { version } = require('../package.json');

function idSplit (str, role) {
  const list = [];
  if (str) {
    str.split(',').map((name) => {
      const item = {
        name,
        list: []
      };
      if (role === 'master') {
        const arr = name.split(':');
        item.name = arr[0];
        if (arr[1]) {
          item.list = arr[1].split('|');
        }
      }
      list.push(item);
    });
  }
  return list;
}

function Base(host, port, ssl, timeout, onerror) {
  switch (arguments.length) {
  case 4: timeout = 0;
    break;
  case 3: ssl = true;
    break;
  case 2:
    if (typeof arguments[0] === 'object') {
      const arg = arguments[0];
      if (typeof arg.host !== 'undefined') host = arg.host;
      if (typeof arg.port !== 'undefined') port = arg.port;
      if (typeof arg.ssl !== 'undefined') ssl = arg.ssl;
      if (typeof arg.onerror === 'function') onerror = arg.onerror;
      if (typeof arg.timeout !== 'undefined') timeout = arg.timeout;
    } else {
      port = 0;
    }
    break;
  case 1: host = '';
    break;
  }
  const {
    connectedCallbacks,
    role,
    onmessage
  } = arguments[arguments.length - 1];
  const promiseCallback = {};
  ssl = typeof ssl === 'boolean' && !ssl ? false : true;
  if (!port) {
    port = ssl ? 443 : 8081;
  }
  let ids = [];
  let sessionId = '';
  let intervalId = 0;
  let counter = 0;
  const url = `${ssl ? 'wss' : 'ws'}://${host || '127.0.0.1'}:${port}/websocket`;
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
    this.send(`${protocol.role}${role}/${this.name}:${this.password}`);
    if (timeout && timeout > 0) {
      intervalId = window.setInterval(() => this.send(`${protocol.live}1`), timeout * 1000);
    }
  });
  socket.addEventListener('close', () => {
    if (intervalId) {
      intervalId = window.clearInterval(intervalId);
    }
  });
  socket.addEventListener('message', ({ data }) => {
    const msgId = data.match(/#(\w+)$/);
    const message = data.replace(/#\w+$/, '');
    const id = msgId ? msgId[1] : '';
    if (!message.indexOf(protocol.sid)) {
      sessionId = message.substr(protocol.sid.length);
      return;
    }
    if (!message.indexOf(protocol.connect)) {
      const arr = message.substr(protocol.connect.length).split('/');
      const arg1 = idSplit(arr[0], role);
      const arg2 = arr.length > 1 ? +arr[1] : undefined;
      connectedCallbacks.forEach((fn) => fn(
        arg1,
        arg2
      ));
      return;
    }
    if (id && typeof promiseCallback[id] !== 'undefined') {
      const item = promiseCallback[id];
      window.clearTimeout(item.timeoutId);
      item.resolve(message);
      delete promiseCallback[id];
      // console.log('delete promiseCallback[id]', promiseCallback);
    }
    onmessage({ data: message, id });
  });
  this.role = () => role;
  this.url = () => url;
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
  this.send = function(msg) {
    let id = '';
    if (socket && socket.readyState === 1) {
      id = `${Date.now()}${counter++}`;
      socket.send(`${msg}#${id}`);
    }
    return id;
  };
  this.send2 = function(msg, timeout) {
    const id = this.send(msg);
    return new Promise((resolve, reject) => {
      if (!id) resolve(id);
      else {
        const timeoutId = window.setTimeout(() => {
          delete promiseCallback[id];
          reject();
        }, timeout && timeout > 0 ? timeout * 1000 : 5000);
        promiseCallback[id] = {
          resolve,
          timeoutId
        };
      }
    });
  };
  this.sessionId = function() {
    return sessionId;
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
Base.prototype.query = function () {
  return this.send2(`${protocol.query}1`).then((data) => {
    return idSplit(data.substr(protocol.query.length), this.role());
  });
};

export default Base;