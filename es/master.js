/* 控制端（debug） */
import { v4 as uuidv4 } from 'uuid';
import { protocol, idReg } from './config';
import Base from './base';

function Master() {
  const connectedCallbacks = [];
  Base.apply(this, [...arguments, connectedCallbacks]);
  const callbackMap = {};
  let password = '';
  let name = '';
  this.on('open', () => {
    this.send(`${protocol.role}master/${name}:${password}`);
  });
  this.name = function (str) {
    name = str;
  };
  this.password = function (str) {
    password = str;
  };
  this.connect = this.setId;
  this.run = function(script, callback) {
    if (this.readyState() !== 1) return;
    if (typeof callback === 'function') {
      const id = uuidv4();
      callbackMap[id] = callback;
      this.send(`${protocol.script}${id}/${script}`);
      setTimeout(() => {
        delete callbackMap[id];
      }, 180000); // 5min timeout
    } else {
      this.send(`${protocol.script}${script}`);
    }
  };
  this.on('message', ({ data }) => {
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
          increase: arr[0],
          reduce: arr[1]
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