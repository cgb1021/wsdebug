import { protocol } from './config';

export default {
  close: function() {
    this.socket.close();
  },
  send: function(msg) {
    this.socket.send(msg);
  },
  query: function() {
    this.socket.send(`${protocol.query}1`);
  },
  live: function() {
    this.socket.send(`${protocol.live}1`);
  }
};