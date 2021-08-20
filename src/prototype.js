import { protocol } from './config';

export default {
  close: function() {
    this.socket.close();
  },
  send: function(msg) {
    if (this.socket.readyState === 1) this.socket.send(msg);
  },
  query: function() {
    if (this.socket.readyState === 1) this.socket.send(`${protocol.query}1`);
  },
  live: function() {
    if (this.socket.readyState === 1) this.socket.send(`${protocol.live}1`);
  }
};