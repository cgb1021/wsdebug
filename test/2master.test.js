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
        // console.log('normal sessionid', val);
        const protocol = 'role://';
        if (!val.indexOf(protocol)) {
          result = 1;
          assert.equal(val.substr(protocol.length), 'master', 'Receive');
        }
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
        const protocol = 'role://';
        if (!val.indexOf(protocol)) {
          assert.equal(val.substr(protocol.length), 'master', 'Receive');
        }
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
          assert.equal('uid_0,uid_1,uid_101', str);
          done();
        }
      });
      gClient.query();
    })
  })
  describe('##Connect', function () {
    it('increase', function (done) {
      gClient.on('connect', (data) => {
        assert.equal(data[0], 'uid_0', 'Increase');
        done();
      });
      gClient.connect('uid_0');
      assert.equal('uid_3,uid_4,uid_0', gClient.getId());
    })
    it('decrease', function (done) {
      const master = new Master('127.0.0.1', 8081, false);
      master.name = 'admin4';
      master.password = 'yy123456';
      master.on('open', () => {
        window.setInterval(() => master.live(), 2000);
        master.connect('uid_0');
        assert.equal('uid_0', master.getId());
      });
      master.on('connect', (data) => {
        if (data[0]) {
          assert.equal(data[0], 'uid_0', 'Increase');
          master.connect('uid_0', 0);
        } else {
          assert.isEmpty(data[0], 'Decrease');
          done();
        }
      });
    })
  })
  describe('##Script', function () {
    this.timeout(4000);
    let counter = 0;
    const master = new Master('127.0.0.1', 8081, false);
    master.name = 'admin3';
    master.password = 'yy123456';
    master.on('open', () => {
      window.setInterval(() => master.live(), 2000);
    });
    master.receive = (data) => {
      // console.log('gaclient sessionid', data);
      const protocol = 'role://';
      if (!data.indexOf(protocol)) {
        assert.equal(data.substr(protocol.length), 'master', 'Receive');
      }
    }
    it('run', function (done) {
      master.connect('uid_1,uid_101');
      gClient.run('getCounter()', (data) => {
        assert.equal(data, 2, 'getCounter');
        done();
      });
    })
    it('eval', function (done) {
      gClient.run('location.href', (data) => {
        assert.equal(data, 'http://localhost:8082/context.html', 'location.href');
        done();
      });
    })
    it('test', function (done) {
      gClient.run('test()', (data) => {
        assert.match(data, /^client_normal:\d+$/, 'test');
        done();
      });
    })
    it('mult', function (done) {
      master.run('test()', (data) => {
        counter++;
        assert.match(data, /^client(_normal|\d):\d+$/, 'mult test');
        if (counter === 3) {
          done();
        }
      });
    })
  })
});