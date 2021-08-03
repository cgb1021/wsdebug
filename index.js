module.exports = function (port = 8081) {
  const http = require('http');
  const sockjs = require('sockjs');
  // const fs = require('fs');
  const event = {
    CONNECT: 'connect',
    SCRIPT: 'script',
    ERROR: 'error',
    QUERY: 'query'
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
    ids: [],
    userIds: []
  };
  const echo = sockjs.createServer();
  function toUser(type, conn, data) {
    switch (type) {
    case event.CONNECT: conn.write(`${event.CONNECT}://${data}`);
      break;
    case event.QUERY: conn.write(`${event.QUERY}://${data}`);
      break;
    default: conn.write(data);
    }
  }
  function toMaster(type, conn, data) {
    switch (type) {
    case event.CONNECT: conn.write(`${event.CONNECT}://${data}`);
      break;
    case event.QUERY: conn.write(`${event.QUERY}://${data}`);
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
              toUser(event.CONNECT, connection.client[id], 1);
              toMaster(event.CONNECT, conn, `${id}/1`);
            }
            if (store.ids.indexOf(id) === -1) {
              store.ids.push(id);
            }
          } else {
            if (sessionStore.id && sessionStore.id !== id) {
              delete connection.client[sessionStore.id];
              store.userIds.splice(store.userIds.indexOf(sessionStore.id), 1);
              if (store.ids.indexOf(sessionStore.id) > -1 && connection.master) {
                toMaster(event.CONNECT, connection.master, `${sessionStore.id}/0`);
              }
            }
            if (typeof connection.client[id] === 'undefined') {
              connection.client[id] = conn;
              sessionStore.id = id;
              store.userIds.push(id);
              if (store.ids.indexOf(id) > -1 && connection.master) {
                toUser(event.CONNECT, conn, 1);
                toMaster(event.CONNECT, connection.master, `${id}/1`);
              }
            } else {
              error(new Error('User already exists'), conn);
            }
          }
        }
          return;
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
              broadcast(event.CONNECT, 0);
              store.ids.length = 0;
            }
          }
          sessionStore.role = role;
        }
          return;
        case event.SCRIPT:
          broadcast(event.SCRIPT, message);
          return;
        case event.QUERY:
          if (sessionStore.role === 'master') {
            toMaster(event.QUERY, connection.master, store.userIds.join(','));
          } else {
            toUser(event.QUERY, conn, connection.master ? 1 : 0);
          }
          return;
        }
      }
      if (sessionStore.role === 'master') {
        broadcast('', message);
      } else {
        const id = sessionStore.id;
        if (id && store.ids.indexOf(id) > -1 && connection.master) {
          toMaster('', connection.master, message);
        } else {
          error(new Error('Master not connected'), conn);
        }
      }
    });
    conn.on('close', function() {
      if (sessionStore.role === 'master') {
        connection.master = null;
        broadcast(event.CONNECT, 0);
        store.ids.length = 0;
      } else if (sessionStore.id) {
        const id = sessionStore.id;
        if (store.ids.indexOf(id) > -1 && connection.master) {
          toMaster(event.CONNECT, connection.master, `${id}/0`);
        }
        delete connection.client[id];
        store.userIds.splice(store.userIds.indexOf(id), 1);
      }
    });
  });

  const server = http.createServer();
  echo.installHandlers(server, {
    prefix:''
  });
  server.listen(port, '0.0.0.0');
};