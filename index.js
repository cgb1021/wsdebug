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
  const master = {
    connection: null,
    ids: []
  };
  const clients = [];
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
    if (!master.ids.length) return;
    clients.forEach((item) => {
      if (master.ids.indexOf(item.id) > -1) {
        toUser(type, item.connection, data);
      }
    });
  }

  echo.on('connection', function(conn) {
    const sessionStore = {
      role: 'client',
      index: -1
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
            if (master.ids.indexOf(id) === -1) {
              master.ids.push(id);
            } else {
              return;
            }
            let counter = 0;
            clients.forEach((item) => {
              if (item.id === id) {
                counter++;
                toUser(event.CONNECT, item.connection, 1);
              }
            });
            if (counter) {
              toMaster(event.CONNECT, conn, `${id}/${counter}`);
            }
          } else {
            let res = -1;
            let oldId;
            if (sessionStore.index === -1) {
              const info = {
                id,
                connection: conn
              };
              sessionStore.index = clients.push(info) - 1;
            } else {
              const info = clients[sessionStore.index];
              if (info.id === id) {
                return;
              }
              oldId = info.id;
              info.id = id;
            }
            if (master.ids.indexOf(id) > -1) {
              res = 1;
            } else if (oldId && master.ids.indexOf(oldId) > -1) {
              res = 0;
            }
            if (res > -1) {
              toMaster(event.CONNECT, master.connection, `${res ? id : oldId}/${res}`);
              toUser(event.CONNECT, conn, res);
            }
          }
        }
          return;
        case 'role': {
          const role = data !== 'client' ? 'master' : 'client';
          if (sessionStore.role !== role) {
            if (role === 'master' && !master.connection) {
              master.connection = conn;
            } else {
              error(new Error('Master already exists'), conn);
              return;
            }
            if (role === 'client') {
              master.connection = null;
              broadcast(event.CONNECT, 0);
              master.ids.length = 0;
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
            let idsString = '';
            clients.forEach((item) => {
              idsString += `,${item.id}`;
            });
            toMaster(event.QUERY, master.connection, idsString.substr(1));
          } else {
            toUser(event.QUERY, conn, master.connection ? 1 : 0);
          }
          return;
        }
      }
      if (sessionStore.role === 'master') {
        broadcast('', message);
      } else {
        const id = clients[sessionStore.index].id;
        if (id && master.ids.indexOf(id) > -1 && master.connection) {
          toMaster('', master.connection, message);
        } else {
          error(new Error('Master not connected'), conn);
        }
      }
    });
    conn.on('close', function() {
      if (sessionStore.role === 'master') {
        master.connection = null;
        broadcast(event.CONNECT, 0);
        master.ids.length = 0;
      } else if (sessionStore.index > -1) {
        const item = clients[sessionStore.index];
        const id = item.id;
        if (master.ids.indexOf(id) > -1 && master.connection) {
          toMaster(event.CONNECT, master.connection, `${id}/0`);
        }
        item.connection = null;
        clients.splice(sessionStore.index, 1);
      }
    });
  });

  const server = http.createServer();
  echo.installHandlers(server, {
    prefix:''
  });
  server.listen(port, '0.0.0.0');
};