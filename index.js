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
    ROUTE: 'route',
    SID: 'sid'
  };
  const clients = {};
  let masterMap = {};

  function sendMessage(conn, data, type = '', msgId = '') {
    switch (type) {
    case event.CONNECT:
    case event.QUERY:
    case event.ERROR:
    case event.VERSION:
    case event.RESULT:
    case event.ROLE:
    case event.ROUTE:
    case event.SID:
    case event.ID: conn.write(`${type}://${data}${msgId}`);
      break;
    default: conn.write(`${data}${msgId}`);
    }
  }
  function onConnectIdsChange (client, oldConnectIds) {
    const sessionId = client.sid;
    const bMaster = client.role === 'master';
    const connectIds = client.connectIds;
    const oldConnectedList = Object.keys(client.connectedMap);
    const map = {};
    const ids = [];
    const clientName = client.name;
    Object.keys(clients).forEach((key) => {
      if (key === sessionId || (bMaster && typeof masterMap[key] !== 'undefined') || (!bMaster && typeof masterMap[key] === 'undefined')) return;
      const client = clients[key];
      const oldIndex = oldConnectedList.indexOf(key);
      let bConnect = false;
      for (let index = 0; index < client.connectIds.length; index++) {
        const id = client.connectIds[index];
        if (connectIds.indexOf(id) > -1) {
          bConnect = true;
          map[key] = id;
          if (oldIndex === -1 && typeof client.connectedMap[sessionId] === 'undefined') {
            sendMessage(client.connection, `${clientName ? clientName : '0'}${!bMaster ? ':' + connectIds.join(',') : ''}/1`, event.CONNECT);
          }
          ids.push(bMaster? `${client.name ? client.name : '0'}:${client.connectIds.join('|')}` : client.name);
          client.connectedMap[sessionId] = id;
          break;
        }
      }
      if (!bConnect && oldIndex > -1 && typeof clients[key].connectedMap[sessionId] !== 'undefined') {
        delete clients[key].connectedMap[sessionId];
        sendMessage(clients[key].connection, `${clientName ? clientName : '0'}${!bMaster ? ':' + oldConnectIds.join(',') : ''}/0`, event.CONNECT);
      }
    });
    client.connectedMap = map;
    sendMessage(client.connection, ids.join(','), event.CONNECT);
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
    sendMessage(conn, sessionId, event.SID);
    conn.on('data', function(message) {
      const msgId = message.match(/#\w+$/);
      const match = message.replace(/#\w+$/, '').match(/^(\w+):\/\/(.+)$/);
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
          const oldConnectIds = [...client.connectIds];
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
          onConnectIdsChange(client, oldConnectIds);
        }
          return;
        case event.ROLE: {
          const dataArr = data.split(dataSplit);
          const role = dataArr[0] !== 'master' ? 'client' : 'master';
          const auth = dataArr.length > 1 ? dataArr[1].split(':') : [];
          if (client.role !== role) {
            // client -> master
            const oldConnectIds = [...client.connectIds];
            if (role === 'master') {
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
                onConnectIdsChange(client, oldConnectIds);
                masterMap[sessionId] = auth[0];
              } else {
                sendMessage(conn, 'Master exists', event.ERROR);
                return;
              }
            }
            // master -> client
            if (role === 'client') {
              client.connectIds.length = 0;
              onConnectIdsChange(client, oldConnectIds);
              delete masterMap[sessionId];
            }
          }
          client.role = role;
          if (client.role === 'client') {
            client.name = auth[0];
          }
          sendMessage(conn, client.role, event.ROLE);
        }
          return;
        case event.QUERY: {
          if (client.role === 'master') {
            let ids = [];
            Object.keys(clients).forEach((key) => {
              const client = clients[key];
              if (typeof masterMap[key] !== 'undefined' || !client.connectIds.length) return;
              ids = ids.concat(`${client.name ? client.name : '0'}:${client.connectIds.join('|')}`);
            });
            sendMessage(conn, ids.join(','), event.QUERY, msgId ? msgId[0] : '');
          } else {
            const names = [];
            Object.keys(masterMap).forEach((key) => {
              names.push(clients[key].name);
            });
            sendMessage(conn, names.join(','), event.QUERY, msgId ? msgId[0] : '');
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
      const oldConnectIds = [...client.connectIds];
      client.connectIds.length = 0;
      onConnectIdsChange(client, oldConnectIds);
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