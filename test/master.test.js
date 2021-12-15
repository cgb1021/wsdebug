/* eslint-disable */
import { assert } from 'chai';
import Master from '../es/master';

let intervalId = 0;

describe('#Master', function () {
	it('normal', function (done) {
    const master = new Master('127.0.0.1', 8081, false);
    master.name('admin');
    master.password('yy123456');
    master.on('open', () => {
      intervalId = window.setInterval(() => master.live(), 5000);
    });
    master.receive = (val) => {
      assert.equal(val, '1', 'normal');
      done();
    }
  });
	it('exists', function (done) {
    // this.timeout(5000);
    const master = new Master('127.0.0.1', 8081, false, (err) => {
      assert.equal(err.message, 'Master exists', 'Master exists');
      done();
    });
    master.name('admin');
    master.password('yy123456');
  });
	it('password', function (done) {
    // this.timeout(5000);
    const master = new Master('127.0.0.1', 8081, false, (err) => {
      assert.equal(err.message, 'Auth error', 'Auth error');
      done();
    });
    master.name('admin');
    master.password('yy');
  });
	it('noadmin', function (done) {
    // this.timeout(5000);
    const master = new Master('127.0.0.1', 8081, false, (err) => {
      assert.equal(err.message, 'Auth error', 'Auth error');
      done();
    });
    master.name('admin9');
    master.password('yy123456');
  });
	it('another', function (done) {
    // this.timeout(5000);
    const master = new Master('127.0.0.1', 8081, false);
    master.name('admin2');
    master.password('yy123456');
    master.receive = (val) => {
      assert.equal(val, '1', 'Auth error');
      done();
    }
  });
});