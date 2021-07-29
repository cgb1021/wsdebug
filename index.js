module.exports = function (port = 8081) {
  const http = require('http');
  const sockjs = require('sockjs');
  // const fs = require('fs');
  const event = {
    CONNECTED: 'connected',
    SCRIPT: 'script',
    RESULT: 'result',
    ERROR: 'error'
  };
  const error = (err, conn) => {
    // console.log(err);
    conn && conn.write(`${event.ERROR}://${err.message ? err.message : 'error'}`);
  };
  const connection = {
    master: null,
    client: {}
  };
  const store = {
    ids: []
  };
  const echo = sockjs.createServer();
  function toUser(type, conn, data) {
    switch (type) {
    case event.CONNECTED: conn.write(`${event.CONNECTED}://${data}`);
      break;
    default: conn.write(data);
    }
  }
  function toMaster(type, conn, data) {
    switch (type) {
    case event.CONNECTED: conn.write(`${event.CONNECTED}://${data}`);
      break;
    default: conn.write(data);
    }
  }
  function broadcast (type, data) {
    store.ids.forEach(function (id) {
      if (typeof connection.client[id] !== 'undefined') {
        toUser(type, connection.client[id], data);
      }
    });
  }

  echo.on('connection', function(conn) {
    const sessionStore = {
      role: 'client',
      id: 0
    };
    conn.on('data', function(message) {
      const match = message.match(/^(\w+):\/\/(.+)$/);
      if (match && match.length > 2) {
        const type = match[1];
        const data = match[2];
        switch (type) {
        case 'id': {
          const id = data;
          if (sessionStore.role === 'master') {
            if (typeof connection.client[id] !== 'undefined') {
              toUser(event.CONNECTED, connection.client[id], 1);
              toMaster(event.CONNECTED, conn, `${id}/1`);
            }
            if (store.ids.indexOf(id) === -1) {
              store.ids.push(id);
            }
          } else {
            if (typeof connection.client[id] === 'undefined') {
              sessionStore.id = id;
              connection.client[id] = conn;
              if (store.ids.indexOf(id) > -1 && connection.master) {
                toUser(event.CONNECTED, conn, 1);
                toMaster(event.CONNECTED, connection.master, `${id}/1`);
              }
            } else {
              error(new Error('User already exists'), conn);
            }
          }
        }
          break;
        case 'role': {
          const role = data !== 'client' ? 'master' : 'client';
          if (sessionStore.role !== role) {
            if (role === 'master' && !connection.master) {
              connection.master = conn;
            } else {
              error(new Error('Master already exists'), conn);
            }
            if (role === 'client') {
              connection.master = null;
              broadcast(event.CONNECTED, 0);
              store.ids.length = 0;
            }
          }
          sessionStore.role = role;
        }
          break;
        case 'script':
          broadcast(event.SCRIPT, message);
          break;
        case 'result': {
          const id = sessionStore.id;
          if (id && store.ids.indexOf(id) > -1 && connection.master) {
            toMaster(event.RESULT, connection.master, message);
          } else {
            error(new Error('Master not connected'), conn);
          }
        }
          break;
        default: conn.write(0);
        }
      }
    });
    conn.on('close', function() {
      if (sessionStore.role === 'master') {
        connection.master = null;
        broadcast(event.CONNECTED, 0);
        store.ids.length = 0;
      } else if (sessionStore.id) {
        const id = sessionStore.id;
        if (store.ids.indexOf(id) > -1 && connection.master) {
          toMaster(event.CONNECTED, connection.master, `${id}/0`);
        }
        delete connection.client[id];
      }
    });
  });

  const server = http.createServer();
  echo.installHandlers(server, {
    prefix:''
  });
  server.listen(port, '0.0.0.0');
};