module.exports = function (port = 80, timeout = 30) {
  const http = require('http');
  const fs = require('fs');
  const md5 = require('md5');
  const sockjs = require('sockjs');
  const log4js = require('log4js');
  const { version } = require('./package.json');
  // const fs = require('fs');
  const event = {
    CONNECT: 'connect',
    ERROR: 'error',
    RESULT: 'result',
    QUERY: 'query',
    LIVE: 'live',
    ID: 'id',
    VERSION: 'version',
    ROLE: 'role',
    ROUTE: 'route'
  };
  const clients = {};
  let masterMap = {};

  function sendMessage(conn, data, type = '') {
    switch (type) {
    case event.CONNECT:
    case event.QUERY:
    case event.ERROR:
    case event.VERSION:
    case event.RESULT:
    case event.ROLE:
    case event.ROUTE:
    case event.ID: conn.write(`${type}://${data}`);
      break;
    default: conn.write(data);
    }
  }
  function onConnectIdsChange (client) {
    const sessionId = client.sid;
    const oldConnectedList = Object.keys(client.connectedMap);
    const newConnectedList = [];
    const bMaster = client.role === 'master';
    const ids = client.connectIds;
    const map = {};
    const addList = [];
    const reduceList = [];
    Object.keys(clients).forEach((key) => {
      if (key === sessionId || (bMaster && typeof masterMap[key] !== 'undefined') || (!bMaster && typeof masterMap[key] === 'undefined')) return;
      const client = clients[key];
      for (let index = 0; index < client.connectIds.length; index++) {
        const id = client.connectIds[index];
        if (ids.indexOf(id) > -1) {
          map[key] = id;
          newConnectedList.push(key);
          if (oldConnectedList.indexOf(key) === -1 && typeof client.connectedMap[sessionId] === 'undefined') {
            sendMessage(client.connection, `${id}/1`, event.CONNECT);
            addList.push(id);
          }
          client.connectedMap[sessionId] = id;
          break;
        }
      }
    });
    client.connectedMap = map;
    // console.log(client.sid, client.connectIds, client.connectedMap);
    oldConnectedList.forEach((key) => {
      if (newConnectedList.indexOf(key) === -1 && typeof clients[key].connectedMap[sessionId] !== 'undefined') {
        const id = clients[key].connectedMap[sessionId];
        delete clients[key].connectedMap[sessionId];
        sendMessage(clients[key].connection, `${id}/0`, event.CONNECT);
        reduceList.push(id);
      }
    });
    if (addList.length + reduceList.length) {
      sendMessage(client.connection, `${addList.join(',')}/${reduceList.join(',')}`, event.CONNECT);
    }
  }
  function connection (conn) {
    const sessionId = conn.id;
    const onTimeout = () => {
      clients[sessionId].timeoutId = 0;
      conn.close();
    };
    clients[sessionId] = {
      sid: sessionId,
      connection: conn,
      name: '',
      role: 'client',
      timeoutId: 0,
      connectIds: [],
      connectedMap: {}
    };
    if (timeout > 0) {
      clients[sessionId].timeoutId = setTimeout(onTimeout, timeout * 1000);
    }
    conn.on('data', function(message) {
      const match = message.match(/^(\w+):\/\/(.+)$/);
      const client = clients[sessionId];
      const log = log4js.getLogger();
      const idReg = '(?:([\\w-]+)/)?(.+)$';
      const dataSplit = '/';
      if (match) {
        const type = match[1];
        const data = match[2];
        switch (type) {
        case event.ID: {
          const arr = data.split(dataSplit);
          const ids = arr[0].split(',');
          client.connectIds.length = 0;
          if (ids[0] !== '*') {
            // const oldIds = [...client.connectIds];
            ids.forEach((id) => {
              const reg = new RegExp(idReg);
              if (reg.test(id)) {
                client.connectIds.push(id);
              }
            });
          }
          sendMessage(conn, client.connectIds.join(','), event.ID);
          onConnectIdsChange(client);
        }
          return;
        case event.ROLE: {
          const dataArr = data.split(dataSplit);
          const role = dataArr[0] !== 'master' ? 'client' : 'master';
          if (client.role !== role) {
            // client -> master
            if (role === 'master') {
              const auth = dataArr.length > 1 ? dataArr[1].split(':') : [];
              try {
                const json = JSON.parse(fs.readFileSync('./store/auth.json'));
                if (
                  !json ||
                  auth.length !== 2 ||
                  !auth[0] ||
                  !auth[1] ||
                  typeof json[auth[0]] === 'undefined' ||
                  json[auth[0]] !== md5(auth[1])
                ) {
                  sendMessage(conn, 'Auth error', event.ERROR);
                  return;
                }
              } catch (e) {
                const msg = 'unknow error';
                log.error(e && e.message ? e.message : msg);
                sendMessage(conn, msg, event.ERROR);
                return;
              }
              const list = Object.values(masterMap);
              if (list.indexOf(auth[0]) == -1) {
                client.name = auth[0];
                client.connectIds.length = 0;
                onConnectIdsChange(client);
                masterMap[sessionId] = auth[0];
              } else {
                sendMessage(conn, 'Master exists', event.ERROR);
                return;
              }
            }
            // master -> client
            if (role === 'client') {
              client.connectIds.length = 0;
              onConnectIdsChange(client);
              delete masterMap[sessionId];
              client.name = '';
            }
          }
          client.role = role;
          sendMessage(conn, sessionId, event.ROLE);
        }
          return;
        case event.QUERY: {
          if (client.role === 'master') {
            let ids = [];
            Object.keys(clients).forEach((key) => {
              if (typeof masterMap[key] !== 'undefined') return;
              ids = ids.concat(clients[key].connectIds);
            });
            sendMessage(conn, ids.length ? [...new Set(ids)].join(',') : '', event.QUERY);
          } else {
            const names = [];
            Object.keys(masterMap).forEach((key) => {
              names.push(clients[key].name);
            });
            sendMessage(conn, names.join(','), event.QUERY);
          }
        }
          return;
        case event.ROUTE: {
          const arr = data.split(dataSplit);
          if (arr.length && arr[0] && typeof clients[arr[0]] !== 'undefined') {
            const key = arr[0];
            arr.shift();
            sendMessage(clients[key].connection, arr.join(dataSplit));
          } else {
            sendMessage(conn, 'route error', event.ERROR);
          }
        }
          return;
        case event.LIVE:
          if (timeout > 0) {
            clearTimeout(client.timeoutId);
            client.timeoutId = setTimeout(onTimeout, timeout * 1000);
          }
          return;
        case event.VERSION:
          sendMessage(conn, version, event.VERSION);
          return;
        }
      }
      Object.keys(client.connectedMap).forEach((key) => {
        sendMessage(clients[key].connection, message);
      });
    });
    conn.on('close', function() {
      const client = clients[sessionId];
      if (client.timeoutId) clearTimeout(client.timeoutId);
      client.connectIds.length = 0;
      onConnectIdsChange(client);
      if (client.role === 'master') {
        delete masterMap[sessionId];
      }
      client.connection = null;
      delete clients[sessionId];
    });
  }
  log4js.configure({
    appenders: { 
      stdout: {
        type: 'console'
      },
      access: {
        type: 'dateFile',
        filename: './logs/access',
        pattern: 'yyyy-MM-dd.log',
        alwaysIncludePattern: true
      }
    },
    categories: { 
      default: { appenders: ['access', 'stdout'], level: 'info' }
    }
  });
  const echo = sockjs.createServer();
  echo.on('connection', connection);
  const server = http.createServer();
  echo.installHandlers(server, {
    prefix:''
  });
  server.listen(port, '0.0.0.0');
  console.log(version);
};