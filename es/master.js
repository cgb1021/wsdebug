/* 控制端（debug） */
import { protocol } from './config';
import prototype from './prototype';

function Master(host = '127.0.0.1', port = 8081) {
  const url = `ws://${host}:${port}/websocket`;
  const callbackMap = {};
  const connectedCallbacks = [];
  this.socket = new WebSocket(url);
  this.socket.addEventListener('open', () => {
    this.socket.send(`${protocol.role}master`);
  });
  this.socket.addEventListener('error', function (err) {
    console.error(err.message ? err.message : 'websocket error');
  });
  this.socket.addEventListener('message', ({ data }) => {
    if (!data.indexOf(protocol.result)) {
      const reg = new RegExp(`^${protocol.result}(?:(\\w+)/)?(.+)$`);
      const match = data.match(reg);
      if (match) {
        const id = match[1];
        if (id && callbackMap[id]) {
          callbackMap[id](match[2]);
          delete callbackMap[id];
        } else {
          this.receive(match[2]);
        }
      }
    }
    if (!data.indexOf(protocol.connect)) {
      let arr = new Array(2);
      try {
        arr = data.substr(protocol.connect.length).split('/');
      } catch (e) {
        console.error(e);
      }
      connectedCallbacks.forEach((fn) => {
        fn({
          id: arr[0],
          value: arr[1]
        });
      });
    }
    if (!data.indexOf(protocol.error)) {
      const reg = new RegExp(`^${protocol.error}(?:(\\w+)/)?(.+)$`);
      const match = data.match(reg);
      if (match) {
        const id = match[1];
        if (id && callbackMap[id]) {
          delete callbackMap[id];
        }
      }
      console.error(data.substr(protocol.error.length));
    }
  });
  this.run = function(script, callback) {
    if (typeof callback === 'function') {
      const id = Date.now() * 100 + Math.floor(Math.random() * 100);
      callbackMap[id] = callback;
      this.socket.send(`${protocol.script}${id}/${script}`);
    } else {
      this.socket.send(`${protocol.script}${script}`);
    }
  };
  this.connect = function(id, opt = 1) {
    if (id) {
      opt = opt === 1 ? 1 : 0;
      this.socket.send(`${protocol.id}${id}:${opt}`);
    }
  };
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
Object.assign(Master.prototype, prototype);
Master.prototype.receive = function(msg) {
  console.log('receive', msg);
};

export default Master;