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
        assert.equal(arr[0], 'admin5', 'connect opt');
        if (opt === 1) {
          master.connect('uid_301', 0);
        } else if (opt === 0) {
          done();
        }
      } else {
        assert.equal(opt, undefined, 'connect undefined');
        assert.isEmpty(arr[0], 'connect empty');
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
          assert.equal(arr[0], 'uid_302', 'connect opt');
          if (opt === 1) {
            client.setId('uid_302', 0);
          } else if (opt === 0) {
            done();
          }
        } else {
          assert.equal(opt, undefined, 'connect undefined');
          assert.isEmpty(arr[0], 'connect empty');
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
          assert.equal(arr[0], 'client888', 'connect opt');
          if (opt === 1) {
            client.setId('uid_303', 0);
          } else if (opt === 0) {
            master.close();
            done();
          }
        } else {
          assert.equal(opt, undefined, 'connect undefined');
          assert.isEmpty(arr[0], 'connect empty');
        }
      })
    })
    it('query', function (done) {
      const master = new Master('127.0.0.1', 8081, false, 2);
      master.name = 'admin7';
      master.password = 'yy123456';
      client.setId(`uid_303`);
      master.on('open', () => {
        master.query();
      })
      master.on('message', ({ data }) => {
        const protocol = 'query://'
        if (!data.indexOf(protocol)) {
          const val = data.substr(protocol.length);
          assert.match(val, /^client888:uid_303,(?:0:[\w,]+)+$/, 'test');
          done();
        }
      })
    })
  })
});