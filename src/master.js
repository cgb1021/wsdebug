/* 控制端（debug） */
import { v4 as uuidv4 } from 'uuid';
import { protocol, idReg } from './config';
import Base from './base';

function Master() {
  const connectedCallbacks = [];
  Base.apply(this, [...arguments, connectedCallbacks]);
  const callbackMap = {};
  this.socket.addEventListener('open', () => {
    this.socket.send(`${protocol.role}master`);
  });
  this.connect = function(id, opt = 1) {
    if (this.socket.readyState === 1 && id) {
      opt = opt === 1 ? 1 : 0;
      this.socket.send(`${protocol.id}${id}/${opt}`);
    }
  };
  this.run = function(script, callback) {
    if (this.socket.readyState !== 1) return;
    if (typeof callback === 'function') {
      const id = uuidv4();
      callbackMap[id] = callback;
      this.socket.send(`${protocol.script}${id}/${script}`);
      setTimeout(() => {
        delete callbackMap[id];
      }, 180000); // 5min timeout
    } else {
      this.socket.send(`${protocol.script}${script}`);
    }
  };
  this.socket.addEventListener('message', ({ data }) => {
    if (!data.indexOf(protocol.result)) {
      const reg = new RegExp(`^${protocol.result}${idReg}`);
      const match = data.match(reg);
      if (match) {
        const id = match[1];
        if (id && callbackMap[id]) {
          callbackMap[id](match[2]);
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
      const reg = new RegExp(`^${protocol.error}${idReg}`);
      const match = data.match(reg);
      if (match) {
        const id = match[1];
        if (id && callbackMap[id]) {
          callbackMap[id](null, new Error(match[2]));
        }
      }
      console.error(data.substr(protocol.error.length));
    }
  });
}
Master.prototype = Base.prototype;

export default Master;