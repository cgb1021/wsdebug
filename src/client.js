/* 客户端 */
import * as espree from 'espree';
import { protocol, idReg } from './config';
import Base from './base';

function Client() {
  const connectedCallbacks = [];
  Base.apply(this, [...arguments, connectedCallbacks]);
  const onerror = arguments.length > 3 && typeof arguments[3] === 'function' ? arguments[3] : null;
  const funcMap = {};
  let context = null;
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
  this.on('message', ({ data }) => {
    if (!data.indexOf(protocol.result)) {
      const val = data.substr(protocol.result.length);
      this.receive(val);
    }
    if (!data.indexOf(protocol.script)) {
      const reg = new RegExp(`^${protocol.script}${idReg}`);
      const match = data.match(reg);
      if (match) {
        const id = match[1];
        const script = match[2];
        let result = void 0;
        const send = (err, res) => {
          if (err) {
            const msg = err.message ? err.message : 'error';
            if (id) {
              this.send(`${protocol.error}${id}/${msg}`);
            } else {
              this.send(`${protocol.error}${msg}`);
            }
            return;
          }
          if (typeof res === 'object') {
            res = JSON.stringify(res);
          }
          if (id) {
            this.send(`${protocol.result}${id}/${res}`);
          } else {
            this.send(`${protocol.result}${res}`);
          }
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
        } catch (e) {
          console.log(e.message ? e.message : e);
        }
        if (!bCalled) {
          try {
            result = eval(script);
          } catch (e) {
            console.error(e);
            send(e);
            return;
          }
        }
        
        if (result instanceof Promise) {
          result.then((res) => send(null, res)).catch((e) => {
            console.error(e);
            send(e);
          });
        } else {
          send(null, result);
        }
      }
    }
    if (!data.indexOf(protocol.connect)) {
      const val = data.substr(protocol.connect.length);
      connectedCallbacks.forEach((fn) => {
        fn(val);
      });
    }
    if (!data.indexOf(protocol.error)) {
      const msg = data.substr(protocol.error.length);
      if (onerror) {
        onerror(new Error(msg));
      } else {
        console.error(msg);
      }
    }
  });
}
Client.prototype = Base.prototype;

export default Client;