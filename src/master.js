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
    type: 'master',
    onmessage: ({ data, id }) => {
      if (!data.indexOf(protocol.result)) {
        let result = data.substr(protocol.result.length);
        if (result) {
          try {
            result = JSON.parse(result);
          } catch (e) {} // eslint-disable-line
        }
        if (typeof callbackMap[id] !== 'undefined') {
          callbackMap[id](null, result);
        }
      }
      if (!data.indexOf(protocol.error)) {
        const result = data.substr(protocol.error.length);
        const error = new Error(result ? result : 'unknow error');
        if (typeof callbackMap[id] !== 'undefined') {
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
  this.connect = this.setId;
  this.run = function(script, callback) {
    const id = this.send(`${protocol.script}${this.sessionId()}/${script}`);
    if (id && typeof callback === 'function') {
      callbackMap[id] = callback;
      setTimeout(() => {
        delete callbackMap[id];
      }, 180000); // 5min timeout
    }
  };
}
Master.prototype = Base.prototype;

export default Master;