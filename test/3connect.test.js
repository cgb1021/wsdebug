/* eslint-disable */
import { assert } from 'chai';
import Master from '../es/master';
import Client from '../es/client';

describe('#Client', function () {
  const master = new Master('127.0.0.1', 8081, false, 2);
  master.name = 'admin5';
  master.password = 'yy123456';
  it('normal', function (done) {
    const client = new Client('127.0.0.1', 8081, false, 2);
    client.on('open', () => {
      client.setId(`uid_301`);
      master.connect('uid_301');
    });
    client.on('connect', (arr, opt) => {
      if (typeof opt === 'number') {
        assert.equal(arr[0].name, 'admin5', 'connect opt');
        assert.equal(typeof arr[0].list, 'undefined', 'connect opt');
        if (opt === 1) {
          master.connect('uid_301', 0);
        } else if (opt === 0) {
          done();
        }
      } else {
        assert.equal(opt, undefined, 'connect undefined');
        assert.isTrue(Array.isArray(arr), 'connect opt');
      }
    })
  })
  it('remove', function (done) {
    this.timeout(5000);
    const client = new Client('127.0.0.1', 8081, false, 2);
    const master = new Master('127.0.0.1', 8081, false, 2);
    master.name = 'admin301';
    master.password = 'yy123456';
    let counter = 0;
    client.on('open', () => {
      client.setId(`uid_304`);
      master.connect('uid_304');
    });
    client.on('connect', (arr, opt) => {
      if (arr.length) {
        counter++;
        assert.equal(counter, 1, 'connect remove1');
        client.on('connect', undefined, 1);
        master.close();
        window.setTimeout(() => {
          assert.equal(counter, 1, 'connect remove2');
          client.close();
          done()
        }, 3000);
      }
    })
  })
  it('remove2', function (done) {
    this.timeout(5000);
    const client = new Client('127.0.0.1', 8081, false, 2);
    const master = new Master('127.0.0.1', 8081, false, 2);
    master.name = 'admin301';
    master.password = 'yy123456';
    let counter = 0;
    const connect = (arr, opt) => {
      if (arr.length) {
        counter++;
        assert.equal(counter, 1, 'connect remove');
        client.on('connect', connect, 1);
        master.close();
        window.setTimeout(() => {
          assert.equal(counter, 1, 'connect remove');
          client.close();
          done()
        }, 3000);
      }
    }
    client.on('open', () => {
      client.setId(`uid_304`);
      master.connect('uid_304');
    });
    client.on('connect', connect)
  })
  it('error', function (done) {
    this.timeout(5000);
    const msg = 'from master';
    const client = new Client('127.0.0.1', 8081, false, 2, (e) => {
      assert.instanceOf(e, Error, 'error');
      assert.equal(e.message, msg, 'error');
      client.close();
      master.close();
      done();
    });
    const master = new Master('127.0.0.1', 8081, false, 2);
    master.name = 'admin301';
    master.password = 'yy123456';
    client.setId(`uid_304`);
    master.on('open', () => {
      master.connect('uid_304');
    });
    client.on('connect', (arr, opt) => {
      if (arr.length) {
        master.send(`error://${msg}`);
      }
    })
  })
});
describe('#Master', function () {
  describe('##ID', function () {
    const client = new Client('127.0.0.1', 8081, false, 2);
    it('normal', function (done) {
      const master = new Master('127.0.0.1', 8081, false, 2);
      master.name = 'admin6';
      master.password = 'yy123456';
      master.on('open', () => {
        master.connect('uid_302');
        client.setId(`uid_302`);
      });
      master.on('connect', (arr, opt) => {
        if (typeof opt === 'number') {
          assert.equal(arr[0].name, '0', 'connect opt');
          assert.equal(arr[0].list[0], 'uid_302', 'connect opt');
          if (opt === 1) {
            client.setId('uid_302', 0);
          } else if (opt === 0) {
            done();
          }
        } else {
          assert.equal(opt, undefined, 'connect undefined');
          assert.equal(arr.length, 0, 'connect empty');
        }
      })
    })
  })
  describe('##NAME', function () {
    const client = new Client('127.0.0.1', 8081, false, 2);
    client.name = 'client888';
    it('normal', function (done) {
      const master = new Master('127.0.0.1', 8081, false, 2);
      master.name = 'admin7';
      master.password = 'yy123456';
      master.on('open', () => {
        master.connect('uid_303');
        client.setId(`uid_303`);
      });
      master.on('connect', (arr, opt) => {
        if (typeof opt === 'number') {
          assert.equal(arr[0].name, 'client888', 'connect opt');
          if (opt === 1) {
            client.setId('uid_303', 0);
          } else if (opt === 0) {
            master.close();
            done();
          }
        } else {
          assert.equal(opt, undefined, 'connect undefined');
          assert.equal(arr.length, 0, 'connect empty');
        }
      })
    })
    it('query', function (done) {
      const master = new Master('127.0.0.1', 8081, false, 2);
      master.name = 'admin7';
      master.password = 'yy123456';
      client.setId(`uid_303`);
      master.on('open', () => {
        master.query().then((data) => {
          assert.isTrue(Array.isArray(data));
          assert.equal(data[0].name, 'client888');
          assert.equal(data[0].list[0], 'uid_303');
          done();
        });
      })
    })
  })
});