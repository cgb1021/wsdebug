/* eslint-disable */
import { assert } from 'chai';
import Client from '../es/client';
import Master from '../es/master';

let gClient1
let counter = 0;

describe('#Client', function () {
  describe('##Create', function () {
    it('normal', function (done) {
      this.timeout(5000);
      const client = new Client('127.0.0.1', 8081, false, 2);
      gClient1 = client;
      let result = 0;
      setTimeout(() => {
        assert.equal(result, 1, 'SetTimeout');
        done();
      }, 4000)
      client.on('open', () => {
        assert.equal(result, 0, 'Open');
        result = 1;
      });
      client.on('close', () => {
        result = 2
      });
    });
    it('timeout', function (done) {
      this.timeout(4000);
      const now = Date.now();
      const client = new Client('127.0.0.1', 8081, false, 0);
      client.on('close', () => {
        assert.equal(Math.floor((Date.now() - now) / 1000), 3, 'Close');
        done();
      });
    });
  })
  describe('##Arguments', function () {
    it('object', function (done) {
      const client = new Client({ host: '127.0.0.1', port: 8081, ssl: false, timeout: 0 });
      client.on('open', () => {
        done();
      });
    });
    it('empty', function () {
      const client = new Client();
      assert.equal(client.url(), `wss://127.0.0.1:443/websocket`, 'Empty');
    });
    it('one', function () {
      const host = '172.0.0.1';
      const client = new Client(host);
      assert.equal(client.url(), `wss://${host}:443/websocket`, 'One');
    });
    it('two', function () {
      const host = '172.0.0.1';
      const port = 8181;
      const client = new Client(host, port);
      assert.equal(client.url(), `wss://${host}:${port}/websocket`, 'Two');
    });
    it('three', function (done) {
      const host = '127.0.0.1';
      const port = 8081;
      const client = new Client(host, port, false);
      client.on('open', () => {
        assert.equal(client.url(), `ws://${host}:${port}/websocket`, 'Three');
        done();
      });
    });
    it('five', function (done) {
      this.timeout(4000);
      const host = '127.0.0.1';
      const port = 9999;
      const client = new Client(host, port, false, 0, () => {
        assert.equal(client.url(), `ws://${host}:${port}/websocket`, 'Five');
        done();
      });
    });
  })
  describe('##ID', function () {
    it('set', function () {
      gClient1.setId(`uid_${counter++}`);
      assert.equal('uid_0', gClient1.getId());
      gClient1.setId(`uid_${counter++}`);
      assert.equal('uid_0,uid_1', gClient1.getId());
    })
    it('qeury', function (done) {
      gClient1.query().then((data) => {
        assert.isTrue(Array.isArray(data));
        assert.equal(data[0].name, 'admin3');
        done();
      });
    })
  })
  describe('##Script', function () {
    it('register', function () {
      const client = new Client('127.0.0.1', 8081, false, 2);
      client.on('open', () => {
        client.setId('uid_101');
      });
      client.register('test', () => {
        return `client1:${Date.now()}`;
      });
      const client2 = new Client('127.0.0.1', 8081, false, 2);
      client2.on('open', () => {
        client2.setId('uid_101');
      });
      client2.register('test', () => {
        return `client2:${Date.now()}`;
      });
      gClient1.register('getCounter', () => {
        assert.equal(counter, 2, 'Register');
        return counter;
      });
      gClient1.register('test', () => {
        return `client_normal:${Date.now()}`;
      });
    })
    it('register2', function (done) {
      this.timeout(4000);
      let counter = 0;
      const callback = function (a, b, d, e) {
        counter++;
        return { counter, a, b, c: this.c, d: d.a.b, e: e[1] };
      };
      const obj = {
        c: 'objc'
      }
      const client = new Client('127.0.0.1', 8081, false, 2);
      client.on('open', () => {
        client.setId('uid_133');
      });
      client.register('test', callback);
      client.bind(obj);
      const master = new Master('127.0.0.1', 8081, false, 2);
      master.name = 'admin133'
      master.password = 'yy123456'
      master.on('open', () => {
        master.setId('uid_133');
      });
      master.on('connect', (data) => {
        if (data.length) {
          master.run('test(100, "100", { a: { b: "250"}}, [0, 360])', (e, data) => {
            assert.equal(data.counter, 1);
            assert.equal(data.a, 100);
            assert.equal(data.b, '100');
            assert.equal(data.c, obj.c);
            assert.equal(data.d, '250');;
            assert.equal(data.e, 360);
            master.close();
            client.close();
            done();
          });
        }
      });
    })
    it('register3', function (done) {
      this.timeout(4000);
      let counter = 0;
      window.test2 = function (a, b, d) {
        counter++;
        return { counter, a, b, c: this.c, d: d.a.b };
      };
      const obj = {
        c: 'objc'
      }
      const client = new Client('127.0.0.1', 8081, false, 2);
      client.on('open', () => {
        client.setId('uid_134');
      });
      client.bind(obj);
      const master = new Master('127.0.0.1', 8081, false, 2);
      master.name = 'admin134'
      master.password = 'yy123456'
      master.on('open', () => {
        master.setId('uid_134');
      });
      master.on('connect', (data) => {
        if (data.length) {
          master.run('test2(100, "100", { a: { b: "250"}})', (e, data) => {
            assert.equal(data.counter, 1);
            assert.equal(data.a, 100);
            assert.equal(data.b, '100');
            assert.equal(data.c, obj.c);
            assert.equal(data.d, '250');
            master.close();
            client.close();
            done();
          });
        }
      });
    })
    it('register4', function (done) {
      this.timeout(4000);
      let counter = 0;
      const client = new Client('127.0.0.1', 8081, false, 2);
      client.on('open', () => {
        client.setId('uid_135');
      });
      client.register('test', async function () {
        counter++;
        return counter;
      });
      const master = new Master('127.0.0.1', 8081, false, 2);
      master.name = 'admin135'
      master.password = 'yy123456'
      master.on('open', () => {
        master.setId('uid_135');
      });
      master.on('connect', (data) => {
        if (data.length) {
          master.run('test()', (e, data) => {
            assert.equal(data, 1);
            master.close();
            client.close();
            done();
          });
        }
      });
    })
    it('register5', function (done) {
      this.timeout(4000);
      const msg = 'register5 test';
      const client = new Client('127.0.0.1', 8081, false, 2);
      client.on('open', () => {
        client.setId('uid_136');
      });
      client.register('test', async function () {
        throw new Error(msg);
      });
      const master = new Master('127.0.0.1', 8081, false, 2);
      master.name = 'admin136'
      master.password = 'yy123456'
      master.on('open', () => {
        master.setId('uid_136');
      });
      master.on('connect', (data) => {
        if (data.length) {
          master.run('test()', (e, data) => {
            assert.isNull(data, 'register5');
            assert.instanceOf(e, Error, 'register5');
            assert.equal(e.message, msg, 'register5');
            master.close();
            client.close();
            done();
          });
        }
      });
    })
    it('remove', function (done) {
      this.timeout(4000);
      let counter = 0;
      const client = new Client('127.0.0.1', 8081, false, 2);
      client.on('open', () => {
        client.setId('uid_131');
      });
      client.register('test', () => {
        counter++;
        return counter;
      });
      const master = new Master('127.0.0.1', 8081, false, 2);
      master.name = 'admin131'
      master.password = 'yy123456'
      master.on('open', () => {
        master.setId('uid_131');
      });
      master.on('connect', (data) => {
        if (data.length) {
          master.run('test()', (e, data) => {
            assert.equal(data, 1);
            const b = client.remove('test');
            assert.equal(b, true);
            master.run('test()', (e, data) => {
              assert.isNull(data, 'Remove2');
              assert.instanceOf(e, Error, 'Remove3');
              assert.equal(e.message, 'test is not defined', 'Remove4');
              master.close();
              client.close();
              done();
            })
          });
        }
      });
    })
    it('remove2', function (done) {
      this.timeout(4000);
      let counter = 0;
      const callback = function () {
        counter++;
        return counter;
      };
      const client = new Client('127.0.0.1', 8081, false, 2);
      client.on('open', () => {
        client.setId('uid_132');
      });
      client.register('test', callback);
      const master = new Master('127.0.0.1', 8081, false, 2);
      master.name = 'admin132'
      master.password = 'yy123456'
      master.on('open', () => {
        master.setId('uid_132');
      });
      master.on('connect', (data) => {
        if (data.length) {
          master.run('test(100, "100")', (e, data) => {
            assert.equal(data, 1);
            const b = client.remove('', callback);
            assert.equal(b, true);
            master.run('test()', (e, data) => {
              assert.instanceOf(e, Error, 'Remove4');
              master.close();
              client.close();
              done();
            })
          });
        }
      });
    })
  })
});