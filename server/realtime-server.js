const http = require('node:http');
const { WebSocketServer } = require('ws');
const db = require('./database');

const port = Number(process.env.PORT || 8787);
const clients = new Map();

function send(ws, payload) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
}

function broadcast(payload, except) {
  for (const ws of clients.keys()) {
    if (ws !== except) send(ws, payload);
  }
}

function chatIdFor(a, b) {
  return `dm:${[a, b].sort().join(':')}`;
}

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ name: 'Tangent realtime relay', online: clients.size }));
});
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.on('message', async (raw) => {
    let payload;
    try { payload = JSON.parse(raw.toString()); } catch { return; }

    if (payload.type === 'hello') {
      const username = String(payload.username || '').toLowerCase();
      const name = String(payload.name || username).slice(0, 80);
      if (!/^[a-z0-9._-]{3,24}$/.test(username)) return ws.close(1008, 'Invalid username');
      ws.username = username;
      clients.set(ws, username);
      await db.upsertUser({ username, name });
      send(ws, { type: 'directory', users: await db.listUsers() });
      for (const message of await db.listMessagesFor(username)) {
        send(ws, { type: 'message', message });
      }
      broadcast({ type: 'presence', username, online: true }, ws);
      return;
    }

    const username = clients.get(ws);
    if (!username) return;
    if (payload.type === 'message') {
      const to = String(payload.to || '').toLowerCase();
      const text = String(payload.text || '').trim().slice(0, 2000);
      if (!to || !text) return;
      const message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        chatId: chatIdFor(username, to),
        sender: username,
        mine: false,
        kind: 'text',
        text,
        createdAt: Date.now(),
        receipt: 'delivered',
        replyToId: payload.replyToId,
        reactions: [],
        to,
      };
      await db.insertMessage(message);
      const recipient = [...clients.entries()].find(([, user]) => user === to)?.[0];
      if (recipient) send(recipient, { type: 'message', message });
      send(ws, { type: 'ack', id: payload.clientId, serverId: message.id });
    }
  });
  ws.on('close', () => {
    const username = clients.get(ws);
    clients.delete(ws);
    if (username) broadcast({ type: 'presence', username, online: false });
  });
});

async function start() {
  await db.initializeDatabase();
  await db.healthcheck();
  server.listen(port, () => console.log(`Tangent realtime relay listening on :${port}`));
}

start().catch((error) => {
  console.error('Unable to start Tangent relay:', error.message);
  process.exitCode = 1;
});