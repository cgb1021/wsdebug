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
const client = new Client();
client.on('open', () => {
  client.setId(`uid_123456`);
})
client.on('connected', (data) => {
  console.log('master connected', data);
})
client.register('dosomething', dosomething);
```

## step3. master
```
import { Master } from 'wsdebug/es';
master.on('connected', (data) => {
  console.log(`[${data.id}]`, data.value);
  master.run('dosomething("test")', (msg) => {
    console.log('result', msg);
  })
})
master.connect('uid_123456');
```