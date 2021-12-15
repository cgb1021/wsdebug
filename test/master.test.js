/* eslint-disable */
import { assert } from 'chai';
import Master from '../es/master';

let gClient
const QUERY = 'query://'

describe('#Master', function () {
  describe('##Create', function () {
    it('normal', function (done) {
      this.timeout(5000);
      const master = new Master('127.0.0.1', 8081, false);
      gClient = master;
      let result = 0;
      setTimeout(() => {
        assert.equal(result, 1, 'SetTimeout');
        done();
      }, 4000)
      master.name = 'admin';
      master.password = 'yy123456';
      master.on('open', () => {
        assert.equal(result, 0, 'Open');
        window.setInterval(() => master.live(), 2000);
      });
      master.receive = (val) => {
        result = 1;
        assert.equal(val, '1', 'Receive');
      }
      master.on('close', () => {
        result = 2
      });
    });
    it('exists', function (done) {
      // this.timeout(5000);
      const master = new Master('127.0.0.1', 8081, false, (err) => {
        assert.equal(err.message, 'Master exists', 'Master exists');
        done();
      });
      master.name = 'admin';
      master.password = 'yy123456';
    });
    it('password', function (done) {
      // this.timeout(5000);
      const master = new Master('127.0.0.1', 8081, false, (err) => {
        assert.equal(err.message, 'Auth error', 'Auth error');
        done();
      });
      master.name = 'admin';
      master.password = 'yy';
    });
    it('noadmin', function (done) {
      // this.timeout(5000);
      const master = new Master('127.0.0.1', 8081, false, (err) => {
        assert.equal(err.message, 'Auth error', 'Auth error');
        done();
      });
      master.name = 'admin9';
      master.password = 'yy123456';
    });
    it('another', function (done) {
      this.timeout(4000);
      const now = Date.now();
      const master = new Master('127.0.0.1', 8081, false);
      master.name = 'admin2';
      master.password = 'yy123456';
      master.receive = (val) => {
        assert.equal(val, '1', 'Receive');
      }
      master.on('close', () => {
        assert.equal(Math.floor((Date.now() - now) / 1000), 3, 'Close');
        done();
      });
    });
  })
  describe('##ID', function () {
    it('set', function () {
      gClient.setId(`uid_3,uid_4`);
      assert.equal('uid_3,uid_4', gClient.getId());
    })
    it('qeury', function (done) {
      gClient.on('message', ({ data }) => {
        if (!data.indexOf(QUERY)) {
          const str = data.substr(QUERY.length);
          assert.equal('uid_0,uid_1', str);
          done();
        }
      });
      gClient.query();
    })
    it('connect', function (done) {
      gClient.on('connect', (data) => {
        const increase = data.increase.split(',');
        assert.equal(increase[0], 'uid_0', 'Increase');
        assert.isEmpty(data.reduce, 'Reduce');
        done();
      });
      gClient.connect('uid_0');
      assert.equal('uid_3,uid_4,uid_0', gClient.getId());
    })
  })
});