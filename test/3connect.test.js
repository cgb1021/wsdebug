/* eslint-disable */
import { assert } from 'chai';
import Master from '../es/master';
import Client from '../es/client';

describe('#Client', function () {
  const master = new Master('127.0.0.1', 8081, false);
  master.name = 'admin5';
  master.password = 'yy123456';
  master.on('open', () => {
    window.setInterval(() => master.live(), 2000);
  });
  it('normal', function (done) {
    const client = new Client('127.0.0.1', 8081, false);
    client.on('open', () => {
      window.setInterval(() => client.live(), 2000);
      client.setId(`uid_301`);
      master.connect('uid_301');
    });
    client.on('connect', (arr, opt) => {
      if (typeof opt === 'number') {
        assert.equal(arr[0], 'uid_301', 'connect opt');
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
  const client = new Client('127.0.0.1', 8081, false);
  client.on('open', () => {
    window.setInterval(() => client.live(), 2000);
  });
  it('normal', function (done) {
    const master = new Master('127.0.0.1', 8081, false);
    master.name = 'admin6';
    master.password = 'yy123456';
    master.on('open', () => {
      window.setInterval(() => master.live(), 2000);
      master.connect('uid_302');
      client.setId(`uid_302`);
    });
    master.on('connect', (arr, opt) => {
      if (typeof opt === 'number') {
        assert.equal(arr[0], 'admin6', 'connect opt');
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
});