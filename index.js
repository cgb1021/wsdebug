module.exports = function (port = 80, timeout = 30) {
  const http = require('http');
  const sockjs = require('sockjs');
  // const fs = require('fs');
  const event = {
    CONNECT: 'connect',
    ERROR: 'error',
    QUERY: 'query',
    LIVE: 'live',
    ID: 'id'
  };
  const clients = {};
  let masterId = '';

  function sendMessage(conn, data, type = '') {
    switch (type) {
    case event.CONNECT:
    case event.QUERY:
    case event.ERROR:
    case event.ID: conn.write(`${type}://${data}`);
      break;
    default: conn.write(data);
    }
  }
  function broadcast (data, type = '') {
    if (!masterId) return;
    const masterIds = clients[masterId].ids;
    if (!masterIds.length) return;
    Object.keys(clients).forEach((key) => {
      if (key === masterId) return;
      const client = clients[key];
      for (let len = client.ids.length - 1; len >= 0; len--) {
        const id = client.ids[len];
        if (masterIds.indexOf(id) > -1) {
          sendMessage(client.connection, data, type);
          break;
        }
      }
    });
  }
  function toMaster (ids, message, type = '') {
    if (!masterId || !ids.length) return;
    const master = clients[masterId];
    const masterIds = master.ids;
    if (!masterIds.length) return;
    for (let len = ids.length - 1; len >= 0; len--) {
      const id = ids[len];
      if (masterIds.indexOf(id) > -1) {
        sendMessage(master.connection, message, type);
        return;
      }
    }
  }
  function connection (conn) {
    const sessionId = conn.id;
    const onTimeout = () => {
      clients[sessionId].timeoutId = 0;
      conn.close();
    };
    clients[sessionId] = {
      connection: conn,
      role: 'client',
      timeoutId: 0,
      ids: []
    };
    if (timeout > 0) {
      clients[sessionId].timeoutId = setTimeout(onTimeout, timeout * 1000);
    }
    conn.on('data', function(message) {
      const match = message.match(/^(\w+):\/\/(.+)$/);
      const client = clients[sessionId];
      if (match && match.length > 2) {
        const type = match[1];
        const data = match[2];
        switch (type) {
        case event.ID: {
          const arr = data.split('/');
          const id = arr[0];
          if (!id) {
            // clear
            if (client.role === 'master') {
              broadcast(0, event.CONNECT);
            } else {
              toMaster(client.ids, `${client.ids.join(',')}/0`, event.CONNECT);
            }
            client.ids.length = 0;
            return;
          }
          // const oldIds = [...client.ids];
          const opt = arr.length > 1 ? +arr[1] : 1;
          const index = client.ids.indexOf(id);
          if ((index > -1 && opt) || (index === -1 && !opt)) {
            return;
          }
          if (opt) {
            client.ids.push(id);
          } else {
            client.ids.splice(index, 1);
          }
          if (client.role === 'master') {
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
            if (masterId && clients[masterId].ids.indexOf(id) > -1) {
              sendMessage(conn, opt, event.CONNECT);
            }
            toMaster(client.ids, `${id}/${opt}`, event.CONNECT);
            sendMessage(conn, client.ids.join(','), event.ID);
          }
        }
          return;
        case 'role': {
          const role = data !== 'master' ? 'client' : 'master';
          if (client.role !== role) {
            // client -> master
            if (role === 'master' && (!masterId || typeof clients[masterId] === 'undefined')) {
              masterId = sessionId;
            } else {
              sendMessage(conn, 'Master exists', event.ERROR);
              return;
            }
            // master -> client
            if (role === 'client') {
              broadcast(0, event.CONNECT);
              masterId = '';
            }
            client.ids.length = 0;
          }
          client.role = role;
        }
          return;
        case event.QUERY:
          if (client.role === 'master') {
            let ids = [];
            Object.keys(clients).forEach((key) => {
              if (key === sessionId) return;
              ids = ids.concat(clients[key].ids);
            });
            sendMessage(conn, ids.length ? [...new Set(ids)].join(',') : '', event.QUERY);
          } else {
            sendMessage(conn, masterId ? 1 : 0, event.QUERY);
          }
          return;
        case event.LIVE:
          if (timeout > 0) {
            clearTimeout(client.timeoutId);
            client.timeoutId = setTimeout(onTimeout, timeout * 1000);
          }
          return;
        }
      }
      if (client.role === 'master') {
        broadcast(message);
      } else if (masterId) {
        toMaster(client.ids, message);
      } else {
        sendMessage(conn, 'Master disconnected', event.ERROR);
      }
    });
    conn.on('close', function() {
      const client = clients[sessionId];
      if (client.timeoutId) clearTimeout(client.timeoutId);
      if (client.role === 'master') {
        broadcast(0, event.CONNECT);
        masterId = '';
      } else {
        toMaster(client.ids, `${client.ids.join(',')}/0`, event.CONNECT);
      }
      client.connection = null;
      delete clients[sessionId];
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