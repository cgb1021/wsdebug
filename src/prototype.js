import { protocol } from './config';

export default {
  close: function() {
    this.socket.close();
  },
  send: function(msg) {
    this.socket.send(`${protocol.result}${msg}`);
  },
  query: function() {
    this.socket.send(`${protocol.query}1`);
  }
};