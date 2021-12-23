/* 控制端（debug） */
import { v4 as uuidv4 } from 'uuid';
import { protocol, idReg } from './config';
import Base from './base';

function Master() {
  const onerror = arguments.length > 4 && typeof arguments[4] === 'function' ? arguments[4] : null;
  const callbackMap = {};
  const data = {
    connectedCallbacks: [],
    type: 'master',
    onmessage: ({ data }) => {
      if (!data.indexOf(protocol.result)) {
        const reg = new RegExp(`^${protocol.result}${idReg}`);
        const match = data.match(reg);
        if (match) {
          const id = match[1];
          if (id && callbackMap[id]) {
            callbackMap[id](match[2]);
            return;
          }
        }
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
          return;
        } else {
          console.error(error ? error.message : 'unknow error');
        }
      }
    }
  };
  Base.apply(this, [...arguments, data]);
  this.connect = this.setId;
  this.run = function(script, callback) {
    if (this.readyState() !== 1) return;
    const sessionId = this.sessionId();
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
}
Master.prototype = Base.prototype;

export default Master;