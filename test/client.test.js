/* eslint-disable */
import { assert } from 'chai';
import Client from '../es/client';

describe('#Client', function () {
	it('normal', function (done) {
    this.timeout(5000);
    const client = new Client('127.0.0.1', 8081, false);
    let result = 0;
    setTimeout(() => {
      assert.equal(result, 1, 'SetTimeout');
      done();
    }, 4000)
    client.on('open', () => {
      assert.equal(result, 0, 'Open');
      result = 1;
      window.setInterval(() => client.live(), 2000);
    });
    client.on('close', () => {
      result = 2
    });
  });
	it('timeout', function (done) {
    this.timeout(4000);
    const now = Date.now();
    const client = new Client('127.0.0.1', 8081, false);
    client.on('close', () => {
      assert.equal(Math.floor((Date.now() - now) / 1000), 3, 'Close');
      done();
    });
  });
});