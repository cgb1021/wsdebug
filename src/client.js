/* 客户端 */
import prototype from './prototype';
import { protocol } from './config';
import * as espree from 'espree';

function Client(host, port, ssl) {
  if (!port) {
    port = ssl ? 443 : 8081;
  }
  const url = `${ssl ? 'wss' : 'ws'}://${host || '127.0.0.1'}:${port}/websocket`;
  let context = null;
  let ids = [];
  const funcMap = {};
  const connectedCallbacks = [];
  this.socket = new WebSocket(url);
  this.socket.addEventListener('error', function (err) {
    this.socket = null;
    console.error(err.message ? err.message : 'websocket error');
  });
  this.socket.addEventListener('message', ({ data }) => {
    if (!data.indexOf(protocol.script)) {
      const reg = new RegExp(`^${protocol.script}(?:(\\w+)/)?(.+)$`);
      const match = data.match(reg);
      if (match) {
        const id = match[1];
        const script = match[2];
        let result = void 0;
        const send = (err, res) => {
          if (err) {
            const msg = err.message ? err.message : 'error';
            if (id) {
              this.socket.send(`${protocol.error}${id}/${msg}`);
            } else {
              this.socket.send(`${protocol.error}${msg}`);
            }
            return;
          }
          if (typeof res === 'object') {
            res = JSON.stringify(res);
          }
          if (id) {
            this.socket.send(`${protocol.result}${id}/${res}`);
          } else {
            this.socket.send(`${protocol.result}${res}`);
          }
        };
        try {
          const res = espree.parse(script);
          let bCalled = false;
          if (res.body.length && res.body[0].expression.callee.name) {
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
              result = func.apply(null, args);
              bCalled = true;
            }
          }
          if (!bCalled) {
            result = eval(script);
          }
        } catch (e) {
          console.error(e);
          send(e);
          return;
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
    if (!data.indexOf(protocol.id)) {
      const str = data.substr(protocol.id.length);
      if (str) {
        ids = str.split(',');
      } else {
        ids = [];
      }
    }
    if (!data.indexOf(protocol.error)) {
      console.error(data.substr(protocol.error.length));
    }
  });
  this.bind = function(self) {
    if (self && typeof self === 'object') {
      context = self;
    }
  };
  this.register = function(name, func) {
    if (typeof func !== 'function') return;
    funcMap[name] = context ? func.bind(context) : func;
  };
  this.setId = function(any, opt = 1) {
    if (this.socket && any && /^\w+$/.test(any)) {
      opt = opt === 1 ? 1 : 0;
      this.socket.send(`${protocol.id}${any}:${opt}`);
    }
  };
  this.getId = function() {
    return ids;
  };
  this.on = function(type, func, revmoe) {
    if (!this.socket) return;
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
Object.assign(Client.prototype, prototype);

export default Client;