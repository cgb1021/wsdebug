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
  const clients = {};
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
    Object.keys(clients).forEach((key) => {
      const client = clients[key];
      let bSend = false;
      client.ids.forEach((id) => {
        if (!bSend && master.ids.indexOf(id) > -1) {
          toUser(type, client.connection, data);
          bSend = true;
        }
      });
    });
  }

  echo.on('connection', function(conn) {
    const sessionStore = {
      role: 'client',
      id: Date.now() * 10000 + Math.floor(Math.random() * 10000)
    };
    while (sessionStore.id) {
      if (typeof clients[sessionStore.id] === 'undefined') {
        clients[sessionStore.id] = {
          connection: conn,
          ids: []
        };
        break;
      }
      sessionStore.id = Date.now() * 10000 + Math.floor(Math.random() * 10000);
    }
    conn.on('data', function(message) {
      const match = message.match(/^(\w+):\/\/(.+)$/);
      if (match && match.length > 2) {
        const type = match[1];
        const data = match[2];
        switch (type) {
        case 'id': {
          const arr = data.split(':');
          const id = arr[0];
          const opt = arr.length > 1 ? +arr[1] : 1;
          if (sessionStore.role === 'master') {
            const index = master.ids.indexOf(id);
            if ((index > -1 && opt) || (index === -1 && !opt)) {
              return;
            }
            if (opt) {
              master.ids.push(id);
            } else {
              master.ids.splice(index, 1);
            }
            let counter = 0;
            Object.keys(clients).forEach((key) => {
              const client = clients[key];
              if (client.ids.indexOf(id) > -1) {
                counter++;
                toUser(event.CONNECT, client.connection, opt);
              }
            });
            toMaster(event.CONNECT, conn, `${id}/${counter}`);
          } else {
            const client = clients[sessionStore.id];
            const index = client.ids.indexOf(id);
            if ((index > -1 && opt) || (index === -1 && !opt)) {
              return;
            }
            if (opt) {
              client.ids.push(id);
            } else {
              client.ids.splice(index, 1);
            }
            if (master.ids.indexOf(id) > -1) {
              toMaster(event.CONNECT, master.connection, `${id}/${opt}`);
              toUser(event.CONNECT, conn, opt);
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
            let ids = [];
            Object.keys(clients).forEach((key) => {
              ids = ids.concat(clients[key].ids);
            });
            toMaster(event.QUERY, master.connection, ids.length ? [...new Set(ids)].join(',') : '');
          } else {
            toUser(event.QUERY, conn, master.connection ? 1 : 0);
          }
          return;
        }
      }
      if (sessionStore.role === 'master') {
        broadcast('', message);
      } else {
        if (master.connection) {
          let bSend = false;
          clients[sessionStore.id].ids.forEach((id) => {
            if (!bSend && master.ids.indexOf(id) > -1) {
              toMaster('', master.connection, message);
              bSend = true;
            }
          });
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
      } else {
        const client = clients[sessionStore.id];
        client.connection = null;
        if (master.connection) {
          client.ids.forEach((id) => {
            if (master.ids.indexOf(id) > -1) {
              toMaster(event.CONNECT, master.connection, `${id}/0`);
            }
          });
        }
        delete clients[sessionStore.id];
      }
    });
  });

  const server = http.createServer();
  echo.installHandlers(server, {
    prefix:''
  });
  server.listen(port, '0.0.0.0');
};