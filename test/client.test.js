/* eslint-disable */
import { assert } from 'chai';
import Client from '../es/client';

let gClient
let counter = 0;

describe('#Client', function () {
  describe('##Create', function () {
    it('normal', function (done) {
      this.timeout(5000);
      const client = new Client('127.0.0.1', 8081, false);
      client.name = 'client_normal'
      gClient = client;
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
  })
  describe('##ID', function () {
    it('set', function () {
      gClient.setId(`uid_${counter++}`);
      assert.equal('uid_0', gClient.getId());
      gClient.setId(`uid_${counter++}`);
      assert.equal('uid_0,uid_1', gClient.getId());
    })
  })
  describe('##Script', function () {
    it('register', function () {
      const client = new Client('127.0.0.1', 8081, false);
      client.name = 'client1';
      client.on('open', () => {
        window.setInterval(() => client.live(), 2000);
        client.setId('uid_101');
      });
      client.register('test', () => {
        return `${client.name}:${Date.now()}`;
      });
      const client2 = new Client('127.0.0.1', 8081, false);
      client2.name = 'client2';
      client2.on('open', () => {
        window.setInterval(() => client2.live(), 2000);
        client2.setId('uid_101');
      });
      client2.register('test', () => {
        return `${client2.name}:${Date.now()}`;
      });
      gClient.register('getCounter', () => {
        assert.equal(counter, 2, 'Register');
        return counter;
      });
      gClient.register('test', () => {
        return `${gClient.name}:${Date.now()}`;
      });
    })
  })
});