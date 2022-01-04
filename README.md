# wsdebug
[![Travis CI](https://travis-ci.com/cgb1021/wsdebug.svg?branch=master)](https://travis-ci.com/github/cgb1021/wsdebug)
[![Codecov](https://img.shields.io/codecov/c/github/cgb1021/wsdebug.svg)](https://codecov.io/gh/cgb1021/wsdebug)
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
const client = new Client('127.0.0.1', 8081, false, 3);
client.setId(`uid_123456`);
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

const master = new Master('127.0.0.1', 8081, false, 3);
master.name = 'admin1';
master.password = '123456';
master.connect('uid_123456');
// arr: [{ name: 'string', list: ['string', ...]}, ...], opt: undefined|0|1, 0: decrease, 1: increase
master.on('connect', (arr, opt) => {
  console.log(arr, opt);
  if (arr.length) {
    master.run('dosomething("test")', (error, msg) => {
      console.log('result', msg);
    })
    master.run('window.test()', (error, msg) => {
      console.log('result', msg);
    })
  }
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
@param {Number} timeout
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
@return {String}
send()

@description: send data
@param {String} msg
@param {Number} timeout
@return {Promise}
send2()

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
@return {Promise<String>}
query()

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
@param {Number} timeout
@param {Function} onerror
Master()

@description: addEventListener
@param {String} type
@param {Function} func
on()

@description: get session id
@return {String}
sessionId()

@description: set role & name & password
@return {Promise<Boolean>} success or fail
setRole()

@description: send data
@param {String} msg
send()

@description: send data
@param {String} msg
@param {Number} timeout
@return {Promise}
send2()

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
@return {Promise<String>}
query()

@description: eval client scripts
@param {String} script
@param {Function} callback
@param {Number} timeout
run()

@description: setId
@param {String} id
connect()
```
