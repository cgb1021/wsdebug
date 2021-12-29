/* 客户端 */
import * as espree from 'espree';
import { protocol, idReg } from './config';
import Base from './base';

function Client() {
  const onerror = arguments.length > 4 && typeof arguments[4] === 'function' ?
    arguments[4] :
    (typeof arguments[0] === 'object' && typeof arguments[0].onerror === 'function' ? arguments[0].onerror : null);
  const funcMap = {};
  let context = null;
  const data = {
    connectedCallbacks: [],
    role: 'client',
    onmessage: ({ data, id }) => {
      if (!data.indexOf(protocol.script)) {
        const reg = new RegExp(`^${protocol.script}${idReg}`);
        const match = data.match(reg);
        if (match) {
          const sid = match[1];
          const script = match[2];
          let result = void 0;
          const send = (err, res) => {
            let message = '';
            if (err) {
              message = `${protocol.error}${err.message ? err.message : 'error'}`;
            } else {
              message = `${protocol.result}${JSON.stringify(res)}`;
            }
            this.send(`${protocol.route}${sid}/${message}#${id}`);
          };
          let bCalled = false;
          try {
            const res = espree.parse(script);
            if (res.body.length && res.body[0].expression.callee && res.body[0].expression.callee.name) {
              const fnName = res.body[0].expression.callee.name;
              const func = funcMap[fnName] ? funcMap[fnName] : (typeof window[fnName] === 'function' ? window[fnName] : null);
              if (func) {
                const getValue = (node) => {
                  if (typeof node.properties !== 'undefined') {
                    const value = {};
                    node.properties.forEach((item) => {
                      value[item.key.name] = getValue(item.value);
                    });
                    return value;
                  } else if (typeof node.elements !== 'undefined') {
                    const value = [];
                    node.elements.forEach((item) => {
                      value.push(getValue(item));
                    });
                    return value;
                  }
                  return node.value;
                };
                const args = [];
                res.body[0].expression.arguments.forEach((item) => {
                  args.push(getValue(item));
                });
                result = func.apply(context, args);
                bCalled = true;
              }
            }
          } catch (e) {} // eslint-disable-line
          if (!bCalled) {
            try {
              result = eval(script);
            } catch (e) {
              send(e);
              return;
            }
          }
          if (result instanceof Promise) {
            result.then((res) => send(null, res)).catch(send);
          } else {
            send(null, result);
          }
        }
        return;
      }
      if (!data.indexOf(protocol.error)) {
        const msg = data.substr(protocol.error.length);
        if (onerror) {
          onerror(new Error(msg));
          return;
        } else {
          console.error(msg);
        }
      }
    }
  };
  Base.apply(this, [...arguments, data]);
  this.register = function(name, func) {
    if (typeof func !== 'function') return;
    funcMap[name] = func;
  };
  this.remove = function(name, func) {
    if (name) return delete funcMap[name];
    if (typeof func === 'function') {
      for (const key in funcMap) {
        if (funcMap[key] === func) {
          return delete funcMap[key];
        }
      }
    }
    return false;
  };
  this.bind = function(self) {
    if (typeof self === 'object') {
      context = self;
    }
  };
}
Client.prototype = Base.prototype;

export default Client;