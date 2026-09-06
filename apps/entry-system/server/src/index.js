import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { WebSocketServer } from 'ws';
import bonjourService from 'bonjour-service';
import { networkInterfaces } from 'node:os';
import { applyOp, dbPath, latestSeq, listEntries, now, pullOps } from './db.js';

const port = Number(process.env.PORT || 38521);
const hostname = process.env.HOST || '0.0.0.0';
const app = new Hono();
const sockets = new Set();

app.use('/api/*', cors());

app.get('/api/health', (c) => c.json({ ok: true, hostname, port, dbPath, seq: latestSeq() }));

app.get('/api/entries', (c) => {
  return c.json({ entries: listEntries({ q: c.req.query('q') || '' }), seq: latestSeq() });
});

app.post('/api/entries', async (c) => {
  const body = await c.req.json();
  const timestamp = now();
  const entryId = body.id || crypto.randomUUID();
  const op = applyOp({
    op_id: body.op_id || crypto.randomUUID(),
    device_id: body.device_id || 'server-web',
    client_seq: body.client_seq || timestamp,
    type: 'create_entry',
    entry_id: entryId,
    payload: { content: body.content || '', created_at: timestamp, updated_at: timestamp },
    created_at: timestamp,
  });
  broadcast({ type: 'ops', ops: [op] });
  return c.json({ op, seq: latestSeq() });
});

app.put('/api/entries/:id', async (c) => {
  const body = await c.req.json();
  const timestamp = now();
  const op = applyOp({
    op_id: body.op_id || crypto.randomUUID(),
    device_id: body.device_id || 'server-web',
    client_seq: body.client_seq || timestamp,
    type: 'update_entry',
    entry_id: c.req.param('id'),
    base_version: body.base_version,
    payload: { content: body.content || '', updated_at: timestamp },
    created_at: timestamp,
  });
  broadcast({ type: 'ops', ops: [op] });
  return c.json({ op, seq: latestSeq() });
});

app.get('/api/sync/pull', (c) => c.json({ ops: pullOps(c.req.query('after') || 0), seq: latestSeq() }));

app.post('/api/sync/push', async (c) => {
  const body = await c.req.json();
  const ops = [];
  for (const op of body.ops || []) ops.push(applyOp(op));
  if (ops.length) broadcast({ type: 'ops', ops });
  return c.json({ ok: true, ops, seq: latestSeq() });
});

app.use('/*', serveStatic({ root: '../client/dist' }));
app.get('*', serveStatic({ path: '../client/dist/index.html' }));

function broadcast(message) {
  const data = JSON.stringify(message);
  for (const ws of sockets) {
    if (ws.readyState === ws.OPEN) ws.send(data);
  }
}

function localAddress() {
  for (const infos of Object.values(networkInterfaces())) {
    for (const info of infos || []) {
      if (info.family === 'IPv4' && !info.internal) return info.address;
    }
  }
  return '127.0.0.1';
}

const server = serve({ fetch: app.fetch, hostname, port }, (info) => {
  const host = localAddress();
  console.log(`entry-system server: http://localhost:${info.port}`);
  console.log(`entry-system lan:    http://${host}:${info.port}`);
  console.log(`sqlite: ${dbPath}`);
});

const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
  sockets.add(ws);
  ws.send(JSON.stringify({ type: 'hello', seq: latestSeq() }));
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(String(data));
      if (msg.type === 'push' && Array.isArray(msg.ops)) {
        const ops = msg.ops.map((op) => applyOp(op));
        broadcast({ type: 'ops', ops });
      }
    } catch {
      // Ignore malformed client messages.
    }
  });
  ws.on('close', () => sockets.delete(ws));
});

const { Bonjour } = bonjourService;
const bonjour = new Bonjour();
bonjour.publish({ name: 'entry-system', type: 'entry-system', port, protocol: 'tcp' });

let closing = false;
function shutdown(signal) {
  if (closing) return;
  closing = true;
  console.log(`\n${signal}: stopping entry-system server`);
  for (const ws of sockets) ws.close(1000, 'server stopping');
  wss.close(() => {});
  bonjour.destroy();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
