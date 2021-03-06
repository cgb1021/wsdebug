/* 控制端（debug） */
import { protocol } from './config';
import Base from './base';

function Master() {
  const onerror = arguments.length > 4 && typeof arguments[4] === 'function' ?
    arguments[4] :
    (typeof arguments[0] === 'object' && typeof arguments[0].onerror === 'function' ? arguments[0].onerror : null);
  const callbackMap = {};
  const data = {
    connectedCallbacks: [],
    role: 'master',
    onmessage: ({ data, id }) => {
      if (!data.indexOf(protocol.result)) {
        let result = data.substr(protocol.result.length);
        if (result) {
          try {
            result = JSON.parse(result);
          } catch (e) {} // eslint-disable-line
        }
        if (typeof callbackMap[id] === 'function') {
          callbackMap[id](null, result);
        } else if (callbackMap[id] && onerror) {
          onerror(callbackMap[id]);
        }
      }
      if (!data.indexOf(protocol.error)) {
        const result = data.substr(protocol.error.length);
        const error = new Error(result ? result : 'unknow error');
        if (typeof callbackMap[id] === 'function') {
          callbackMap[id](error, null);
          return;
        }
        if (onerror) {
          onerror(error);
        } else {
          console.error(error);
        }
      }
    }
  };
  Base.apply(this, [...arguments, data]);
  this.run = function(script, callback, timeout) {
    const id = this.send(`${protocol.script}${this.sessionId()}/${script}`);
    if (id && typeof callback === 'function') {
      callbackMap[id] = callback;
      setTimeout(() => {
        callbackMap[id] = new Error('RunTimeout');
      }, timeout && timeout > 0 ? timeout * 1000 : 90000); // 5min timeout
    }
  };
  this.connect = this.setId;
}
Master.prototype = Base.prototype;

export default Master;