/* 控制端（debug） */
import { v4 as uuidv4 } from 'uuid';
import { protocol, idReg } from './config';
import Base from './base';

function Master() {
  const connectedCallbacks = [];
  Base.apply(this, [...arguments, connectedCallbacks]);
  const onerror = arguments.length > 3 && typeof arguments[3] === 'function' ? arguments[3] : null;
  const callbackMap = {};
  let sessionId = '';
  this.password = '';
  this.name = '';
  this.on('open', () => {
    this.send(`${protocol.role}master/${this.name}:${this.password}`);
  });
  this.connect = this.setId;
  this.run = function(script, callback) {
    if (this.readyState() !== 1) return;
    if (typeof callback === 'function') {
      const id = uuidv4();
      callbackMap[id] = callback;
      this.send(`${protocol.script}${sessionId}/${id}/${script}`);
      setTimeout(() => {
        delete callbackMap[id];
      }, 180000); // 5min timeout
    } else {
      this.send(`${protocol.script}${sessionId}/${script}`);
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
    if (!data.indexOf(protocol.role)) {
      sessionId = data.substr(protocol.role.length);
      this.receive(sessionId);
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
      let error = null;
      if (match) {
        const id = match[1];
        error = new Error(match[2]);
        if (id && callbackMap[id]) {
          callbackMap[id](null, error);
        }
      }
      if (onerror) {
        onerror(error ? error : new Error('unknow error'));
      } else {
        console.error(error ? error.message : 'unknow error');
      }
    }
  });
}
Master.prototype = Base.prototype;

export default Master;