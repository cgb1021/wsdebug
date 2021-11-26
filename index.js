module.exports = function (port = 80, timeout = 30) {
  const http = require('http');
  const sockjs = require('sockjs');
  const { v4: uuidv4 } = require('uuid');
  // const fs = require('fs');
  const event = {
    CONNECT: 'connect',
    SCRIPT: 'script',
    ERROR: 'error',
    QUERY: 'query',
    LIVE: 'live',
    ID: 'id'
  };
  const clients = {};
  let masterId = '';

  function sendMessage(conn, data, type) {
    switch (type) {
    case event.CONNECT:
    case event.QUERY:
    case event.ERROR:
    case event.ID: conn.write(`${type}://${data}`);
      break;
    default: conn.write(data);
    }
  }
  function broadcast (type, data) {
    if (!masterId) return;
    const masterIds = clients[masterId].ids;
    if (!masterIds.length) return;
    Object.keys(clients).forEach((key) => {
      if (key === masterId) return;
      const client = clients[key];
      let len = client.ids.length - 1;
      for (; len >= 0; len--) {
        const id = client.ids[len];
        if (masterIds.indexOf(id) > -1) {
          sendMessage(client.connection, data, type);
          break;
        }
      }
    });
  }
  function connection (conn) {
    const session = {
      id: '',
      role: 'client',
      timeoutId: 0
    };
    const tryNum = 5;
    const onTimeout = () => {
      conn.close();
      session.timeoutId = 0;
    };
    for (let i = 0; i < tryNum; i++) {
      session.id = uuidv4();
      if (typeof clients[session.id] === 'undefined') {
        clients[session.id] = {
          connection: conn,
          ids: []
        };
        break;
      }
      if (i === tryNum - 1) {
        conn.close();
        return;
      }
    }
    if (timeout > 0) {
      session.timeoutId = setTimeout(onTimeout, timeout * 1000);
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
          if (session.role === 'master') {
            const master = clients[session.id];
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
              if (key === masterId) return;
              const client = clients[key];
              if (client.ids.indexOf(id) > -1) {
                counter++;
                sendMessage(client.connection, opt, event.CONNECT);
              }
            });
            sendMessage(conn, `${id}/${counter}`, event.CONNECT);
          } else {
            const client = clients[session.id];
            const index = client.ids.indexOf(id);
            if ((index > -1 && opt) || (index === -1 && !opt)) {
              return;
            }
            if (opt) {
              client.ids.push(id);
            } else {
              client.ids.splice(index, 1);
            }
            sendMessage(conn, client.ids.join(','), event.ID);
            if (masterId && clients[masterId].ids.indexOf(id) > -1) {
              sendMessage(clients[masterId].connection, `${id}/${opt}`, event.CONNECT);
            }
          }
        }
          return;
        case 'role': {
          const role = data !== 'client' ? 'master' : 'client';
          if (session.role !== role) {
            if (role === 'master' && (!masterId || typeof clients[masterId] === 'undefined')) {
              masterId = session.id;
            } else {
              sendMessage(conn, 'Master already exists', event.ERROR);
              return;
            }
            if (role === 'client') {
              broadcast(event.CONNECT, 0);
              masterId = '';
            }
            clients[session.id].ids.length = 0;
          }
          session.role = role;
        }
          return;
        case event.SCRIPT:
          broadcast(event.SCRIPT, message);
          return;
        case event.QUERY:
          if (session.role === 'master') {
            let ids = [];
            Object.keys(clients).forEach((key) => {
              if (+key === session.id) return;
              ids = ids.concat(clients[key].ids);
            });
            sendMessage(conn, ids.length ? [...new Set(ids)].join(',') : '', event.QUERY);
          } else {
            sendMessage(conn, masterId ? 1 : 0, event.QUERY);
          }
          return;
        case event.LIVE:
          if (timeout > 0) {
            clearTimeout(session.timeoutId);
            session.timeoutId = setTimeout(onTimeout, timeout * 1000);
          }
          return;
        }
      }
      if (session.role === 'master') {
        broadcast('', message);
      } else {
        if (masterId) {
          let bSend = false;
          const master = clients[masterId];
          clients[session.id].ids.forEach((id) => {
            if (!bSend && master.ids.indexOf(id) > -1) {
              sendMessage(master.connection, message);
              bSend = true;
            }
          });
        } else {
          sendMessage(conn, 'Master not connected', event.ERROR);
        }
      }
    });
    conn.on('close', function() {
      if (session.timeoutId) clearTimeout(session.timeoutId);
      const role = session.role;
      const id = session.id;
      const client = clients[id];
      if (role === 'master') {
        broadcast(event.CONNECT, 0);
        masterId = '';
      } else if (masterId) {
        const master = clients[masterId];
        client.ids.forEach((id) => {
          if (master.ids.indexOf(id) > -1) {
            sendMessage(master.connection, `${id}/0`, event.CONNECT);
          }
        });
      }
      client.connection = null;
      delete clients[id];
    });
  }

  const echo = sockjs.createServer();
  echo.on('connection', connection);
  const server = http.createServer();
  echo.installHandlers(server, {
    prefix:''
  });
  server.listen(port, '0.0.0.0');
};