/* 客户端 */
import prototype from './prototype';
import { protocol } from './config';
import * as espree from 'espree';

function Client(host = '127.0.0.1', port = 8081) {
  const url = `ws://${host}:${port}/websocket`;
  let context = null;
  let id = Date.now() * 100 + Math.floor(Math.random() * 100);
  const funcMap = {};
  const connectedCallbacks = [];
  this.socket = new WebSocket(url);
  this.socket.addEventListener('error', function (err) {
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
              const args = [];
              res.body[0].expression.arguments.forEach((item) => {
                args.push(item.value);
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
  this.setId = function(any) {
    if (any && /^\w+$/.test(any)) {
      id = any;
    }
    this.socket.send(`${protocol.id}${id}`);
  };
  this.getId = function() {
    return id;
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
Object.assign(Client.prototype, prototype);

export default Client;