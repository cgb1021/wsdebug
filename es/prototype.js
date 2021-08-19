import { protocol } from './config';

export default {
  close: function() {
    if (this.socket) this.socket.close();
  },
  send: function(msg) {
    if (this.socket) this.socket.send(msg);
  },
  query: function() {
    if (this.socket) this.socket.send(`${protocol.query}1`);
  },
  live: function() {
    if (this.socket) this.socket.send(`${protocol.live}1`);
  }
};