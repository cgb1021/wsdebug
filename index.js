module.exports = function (port = 8081, timeout = 30) {
  const http = require('http');
  const sockjs = require('sockjs');
  // const fs = require('fs');
  const event = {
    CONNECT: 'connect',
    SCRIPT: 'script',
    ERROR: 'error',
    QUERY: 'query',
    LIVE: 'live',
    ID: 'id'
  };
  const error = (err, conn) => {
    // console.log(err);
    conn && conn.write(`${event.ERROR}://${err.message ? err.message : 'error'}`);
  };
  let masterId = 0;
  const clients = {};
  const echo = sockjs.createServer();
  function toUser(type, conn, data) {
    switch (type) {
    case event.CONNECT:
    case event.QUERY:
    case event.ID: conn.write(`${type}://${data}`);
      break;
    default: conn.write(data);
    }
  }
  function toMaster(type, conn, data) {
    switch (type) {
    case event.CONNECT:
    case event.QUERY: conn.write(`${type}://${data}`);
      break;
    default: conn.write(data);
    }
  }
  function broadcast (type, data) {
    if (!masterId) return;
    const master = clients[masterId];
    Object.keys(clients).forEach((key) => {
      if (+key === masterId) return;
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
  if (timeout && timeout > 0) {
    timeout *= 1000;
  }
  echo.on('connection', function(conn) {
    const sessionStore = {
      role: 'client',
      timeoutId: 0,
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
    if (timeout) {
      sessionStore.timeoutId = setTimeout(() => {
        conn.close();
      }, timeout);
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
            const master = clients[sessionStore.id];
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
              if (+key === masterId) return;
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
            toUser(event.ID, conn, client.ids.join(','));
            if (masterId && clients[masterId].ids.indexOf(id) > -1) {
              toMaster(event.CONNECT, clients[masterId].connection, `${id}/${opt}`);
            }
          }
        }
          return;
        case 'role': {
          const role = data !== 'client' ? 'master' : 'client';
          if (sessionStore.role !== role) {
            if (role === 'master' && (!masterId || typeof clients[masterId] === 'undefined')) {
              masterId = sessionStore.id;
            } else {
              error(new Error('Master already exists'), conn);
              return;
            }
            if (role === 'client') {
              broadcast(event.CONNECT, 0);
              masterId = 0;
            }
            clients[sessionStore.id].ids.length = 0;
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
              if (+key === sessionStore.id) return;
              ids = ids.concat(clients[key].ids);
            });
            toMaster(event.QUERY, conn, ids.length ? [...new Set(ids)].join(',') : '');
          } else {
            toUser(event.QUERY, conn, masterId ? 1 : 0);
          }
          return;
        case event.LIVE:
          if (timeout) {
            clearTimeout(sessionStore.timeoutId);
            sessionStore.timeoutId = setTimeout(() => {
              conn.close();
            }, timeout);
          }
          return;
        }
      }
      if (sessionStore.role === 'master') {
        broadcast('', message);
      } else {
        if (masterId) {
          let bSend = false;
          const master = clients[masterId];
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
      if (sessionStore.timeoutId) clearTimeout(sessionStore.timeoutId);
      const role = sessionStore.role;
      const id = sessionStore.id;
      const client = clients[id];
      if (role === 'master') {
        broadcast(event.CONNECT, 0);
        masterId = 0;
      } else if (masterId) {
        const master = clients[masterId];
        client.ids.forEach((id) => {
          if (master.ids.indexOf(id) > -1) {
            toMaster(event.CONNECT, master.connection, `${id}/0`);
          }
        });
      }
      client.connection = null;
      delete clients[id];
    });
  });

  const server = http.createServer();
  echo.installHandlers(server, {
    prefix:''
  });
  server.listen(port, '0.0.0.0');
};