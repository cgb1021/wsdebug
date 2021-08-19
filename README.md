# wsdebug

使用websocket对远程页面进行debug调试。

## step1. server
```
const server = require('wsdebug');
server();
```

## step2. client
```
import { Client } from 'wsdebug/es';
function dosomething (arg) {
  // do something
  console.log('do something', arg);
  return Date.now();
}
let intervalId = 0
const client = new Client();
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
let intervalId = 0;
const master = new Master();
master.on('open', () => {
  master.connect('uid_123456');
  intervalId = setInterval(() => master.live(), 5000)
})
client.on('close', () => {
  clearInterval(intervalId)
})
master.on('connect', (data) => {
  console.log(`[${data.id}]`, data.value);
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
Client()

@description: bind function context
@param {Object} self
bind()

@description: register function
@param {String} name
@param {Function} func
register()

@description: client id
@param {String} id
setId()

@return {String}
getId()

close()

@param {String} msg
send()

@description: query master
query()
```

### master

```
@description: constructor
@param {String} host
@param {Number} port
@param {Boolean} ssl
Master()

@description: eval client scripts
@param {String} script
@param {Function} callback
run()

@description: connect client
@param {String} id
connect()

close()

@description: send message to connected clients
@param {String} msg
send()

@description: query clients
query()
```
