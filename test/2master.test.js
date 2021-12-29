/* eslint-disable */
import { assert } from 'chai';
import Master from '../es/master';

let gClient2

describe('#Master', function () {
  describe('##Create', function () {
    it('normal', function (done) {
      this.timeout(5000);
      const master = new Master('127.0.0.1', 8081, false, 2);
      gClient2 = master;
      let result = 0;
      setTimeout(() => {
        assert.equal(result, 1, 'SetTimeout');
        done();
      }, 4000)
      master.name = 'admin';
      master.password = 'yy123456';
      master.on('open', () => {
        assert.equal(result, 0, 'Open');
      });
      master.on('message', ({ data }) => {
        // console.log('normal sessionid', val);
        const protocol = 'role://';
        if (!data.indexOf(protocol)) {
          result = 1;
          assert.equal(data.substr(protocol.length).replace(/#[^#]+$/, ''), 'master', 'Receive');
        }
      })
      master.on('close', () => {
        result = 2
      });
    });
    it('exists', function (done) {
      // this.timeout(5000);
      const master = new Master('127.0.0.1', 8081, false, 0, (err) => {
        assert.equal(err.message, 'Master exists', 'Master exists');
        done();
      });
      master.name = 'admin';
      master.password = 'yy123456';
    });
    it('password', function (done) {
      // this.timeout(5000);
      const master = new Master('127.0.0.1', 8081, false, 0, (err) => {
        assert.equal(err.message, 'Auth error', 'Auth error');
        done();
      });
      master.name = 'admin';
      master.password = 'yy';
    });
    it('noadmin', function (done) {
      // this.timeout(5000);
      const master = new Master('127.0.0.1', 8081, false, 0, (err) => {
        assert.equal(err.message, 'Auth error', 'Auth error');
        done();
      });
      master.name = 'admin9';
      master.password = 'yy123456';
    });
    it('another', function (done) {
      this.timeout(4000);
      const now = Date.now();
      const master = new Master('127.0.0.1', 8081, false, 0);
      master.name = 'admin2';
      master.password = 'yy123456';
      master.on('message', ({ data }) => {
        const protocol = 'role://';
        if (!data.indexOf(protocol)) {
          assert.equal(data.substr(protocol.length).replace(/#[^#]+$/, ''), 'master', 'Receive');
        }
      })
      master.on('close', () => {
        assert.equal(Math.floor((Date.now() - now) / 1000), 3, 'Close');
        done();
      });
    });
  })
  describe('##ID', function () {
    it('set', function () {
      gClient2.setId(`uid_3,uid_4`);
      assert.equal('uid_3,uid_4', gClient2.getId());
    })
  })
  describe('##Connect', function () {
    let bDone = false
    it('increase', function (done) {
      gClient2.on('connect', (data) => {
        assert.isTrue(Array.isArray(data));
        if (data.length && !bDone) {
          assert.equal(data[0].list[0], 'uid_0', 'Increase');
          bDone = true;
          done();
        }
      });
      gClient2.connect('uid_0');
      assert.equal('uid_3,uid_4,uid_0', gClient2.getId());
    })
    it('decrease', function (done) {
      const master = new Master('127.0.0.1', 8081, false, 2);
      master.name = 'admin4';
      master.password = 'yy123456';
      master.on('open', () => {
        master.connect('uid_0');
        assert.equal('uid_0', master.getId());
      });
      master.on('connect', (data) => {
        if (data.length) {
          assert.equal(data[0].list[0], 'uid_0', 'Increase');
          master.connect('uid_0', 0);
        } else {
          assert.equal(data.length, 0, 'Decrease');
          done();
        }
      });
    })
  })
  describe('##Script', function () {
    this.timeout(4000);
    let counter = 0;
    const master = new Master('127.0.0.1', 8081, false, 2);
    master.name = 'admin3';
    master.password = 'yy123456';
    master.on('message', ({ data }) => {
      // console.log('gaclient sessionid', data);
      const protocol = 'role://';
      if (!data.indexOf(protocol)) {
        assert.equal(data.substr(protocol.length).replace(/#[^#]+$/, ''), 'master', 'Receive');
      }
    })
    it('run', function (done) {
      master.connect('uid_1,uid_101');
      gClient2.run('getCounter()', (e, data) => {
        assert.equal(data, 2, 'getCounter');
        done();
      });
    })
    it('eval', function (done) {
      gClient2.run('location.href', (e, data) => {
        assert.equal(data, 'http://localhost:8082/context.html', 'location.href');
        done();
      });
    })
    it('test', function (done) {
      gClient2.run('test()', (e, data) => {
        assert.match(data, /^client_normal:\d+$/, 'test');
        done();
      });
    })
    it('mult', function (done) {
      master.run('test()', (e, data) => {
        counter++;
        assert.match(data, /^client(_normal|\d):\d+$/, 'mult test');
        if (counter === 3) {
          done();
        }
      });
    })
  })
});