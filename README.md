# wsdebug

使用websocket对远程页面进行debug调试。

## step1. server
```
// mkdir ./logs
// mkdir ./store
// vim ./store/auth.json

const server = require('wsdebug');
server(8081);
```

## step2. client
```
import { Client } from 'wsdebug/es';
// import { Client } from 'wsdebug/lib';

function dosomething (arg) {
  // do something
  console.log('do something', arg);
  return Date.now();
}
let intervalId = 0
const client = new Client();
client.receive = function(msg) {
  console.log(msg);
};
client.on('open', () => {
  client.setId(`uid_123456`);
  intervalId = setInterval(() => client.live(), 5000)
})
client.on('close', () => {
  clearInterval(intervalId)
})
client.on('connect', (data) => {
  console.log('master connected', data);
})
client.register('dosomething', dosomething);
client.register('doasync', () => {
  return new Promise()
});
window.test = function () {
  console.log('test');
  return 'window.test';
}
```

## step3. master
```
import { Master } from 'wsdebug/es';
// import { Master } from 'wsdebug/lib';

let intervalId = 0;
const master = new Master();
master.name = 'admin';
master.password = '123456';
master.receive = function(msg) {
  console.log(msg);
};
master.on('open', () => {
  master.connect('uid_123456');
  intervalId = setInterval(() => master.live(), 5000)
})
client.on('close', () => {
  clearInterval(intervalId)
})
// arr: ['id1', ...], opt: undefined|0|1, 0: decrease, 1: increase
master.on('connect', (arr, opt) => {
  console.log(arr, opt);
  master.run('dosomething("test")', (msg) => {
    console.log('result', msg);
  })
  master.run('window.test()', (msg) => {
    console.log('result', msg);
  })
})
```

## API
### server

```
@param {String} port
@param {Number} timeout 30
server()
```
### client

```
@description: constructor
@param {String} host
@param {Number} port
@param {Boolean} ssl
@param {Function} onerror
Client()

@description: addEventListener
@param {String} type
@param {Function} func
on()

@description: get session id
@return {String}
sessionId()

@description: send data
@param {String} msg
send()

@description: close websocket
close()

@description: get websocket readyState
@return {Number}
readyState()

@description: client id
@param {String} id
@param {Number} opt 1: add 0: remove
setId()

@return {Array}
getId()

@description: query master
query()

@description: send live heart
live()

@description: receive data
receive()

@description: register function
@param {String} name
@param {Function} func
register()

@description: remove function
@param {String} name
@param {Function} func
remove()

@description: bind register function context
@param {Object} self
bind()
```

### master

```
@description: constructor
@param {String} host
@param {Number} port
@param {Boolean} ssl
@param {Function} onerror
Master()

@description: addEventListener
@param {String} type
@param {Function} func
on()

@description: get session id
@return {String}
sessionId()

@description: send data
@param {String} msg
send()

@description: close websocket
close()

@description: get websocket readyState
@return {Number}
readyState()

@description: client id
@param {String} id
@param {Number} opt 1: add 0: remove
setId()

@return {Array}
getId()

@description: query master
query()

@description: send live heart
live()

@description: receive data
receive()

@description: eval client scripts
@param {String} script
@param {Function} callback
run()

@description: setId
@param {String} id
connect()
```
