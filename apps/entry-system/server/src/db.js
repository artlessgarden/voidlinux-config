import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const dataDir = process.env.ENTRY_DATA_DIR || join(process.cwd(), 'data');
mkdirSync(dataDir, { recursive: true });

export const dbPath = join(dataDir, 'entry-system.db');
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 0,
  conflict_of TEXT
);

CREATE TABLE IF NOT EXISTS ops (
  server_seq INTEGER PRIMARY KEY AUTOINCREMENT,
  op_id TEXT UNIQUE NOT NULL,
  device_id TEXT NOT NULL,
  client_seq INTEGER NOT NULL,
  type TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  base_version INTEGER,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
  id UNINDEXED,
  content,
  tokenize='unicode61'
);
`);

const deleteFts = db.prepare(`DELETE FROM entries_fts WHERE id = ?`);
const insertFts = db.prepare(`
INSERT INTO entries_fts(rowid, id, content)
VALUES ((SELECT rowid FROM entries WHERE id = @id), @id, @content)
`);

function upsertFts(entry) {
  deleteFts.run(entry.id);
  insertFts.run(entry);
}

const getEntry = db.prepare(`SELECT * FROM entries WHERE id = ?`);
const insertEntry = db.prepare(`
INSERT INTO entries(id, content, created_at, updated_at, deleted, version, conflict_of)
VALUES (@id, @content, @created_at, @updated_at, @deleted, @version, @conflict_of)
`);
const updateEntry = db.prepare(`
UPDATE entries
SET content = @content, updated_at = @updated_at, deleted = @deleted, version = @version
WHERE id = @id
`);
const insertOp = db.prepare(`
INSERT INTO ops(op_id, device_id, client_seq, type, entry_id, base_version, payload, created_at)
VALUES (@op_id, @device_id, @client_seq, @type, @entry_id, @base_version, @payload, @created_at)
`);

export function now() {
  return Date.now();
}

export function listEntries({ q = '' } = {}) {
  const query = String(q || '').trim();
  if (query) {
    return db.prepare(`
      SELECT e.*
      FROM entries_fts f
      JOIN entries e ON e.id = f.id
      WHERE entries_fts MATCH ?
        AND e.deleted = 0
      ORDER BY e.updated_at DESC
      LIMIT 200
    `).all(query);
  }
  return db.prepare(`
    SELECT * FROM entries
    WHERE deleted = 0
    ORDER BY updated_at DESC
    LIMIT 200
  `).all();
}

function applyEntryChange(op, payload) {
  const existing = getEntry.get(op.entry_id);
  const timestamp = op.created_at || now();

  if (op.type === 'create_entry') {
    if (existing) return existing;
    const entry = {
      id: op.entry_id,
      content: String(payload.content || ''),
      created_at: payload.created_at || timestamp,
      updated_at: payload.updated_at || timestamp,
      deleted: 0,
      version: 1,
      conflict_of: null,
    };
    insertEntry.run(entry);
    upsertFts(entry);
    return entry;
  }

  if (!existing) {
    const entry = {
      id: op.entry_id,
      content: String(payload.content || ''),
      created_at: payload.created_at || timestamp,
      updated_at: payload.updated_at || timestamp,
      deleted: op.type === 'delete_entry' ? 1 : 0,
      version: 1,
      conflict_of: null,
    };
    insertEntry.run(entry);
    if (!entry.deleted) upsertFts(entry);
    return entry;
  }

  if (op.type === 'update_entry' && op.base_version != null && op.base_version < existing.version) {
    const conflict = {
      id: crypto.randomUUID(),
      content: String(payload.content || ''),
      created_at: timestamp,
      updated_at: timestamp,
      deleted: 0,
      version: 1,
      conflict_of: existing.id,
    };
    insertEntry.run(conflict);
    upsertFts(conflict);
    return conflict;
  }

  const next = {
    ...existing,
    content: op.type === 'delete_entry' ? existing.content : String(payload.content || ''),
    updated_at: payload.updated_at || timestamp,
    deleted: op.type === 'delete_entry' ? 1 : 0,
    version: existing.version + 1,
  };
  updateEntry.run(next);
  if (next.deleted) deleteFts.run(next.id);
  else upsertFts(next);
  return next;
}

export const applyOp = db.transaction((rawOp) => {
  const duplicate = db.prepare(`SELECT * FROM ops WHERE op_id = ?`).get(rawOp.op_id);
  if (duplicate) return duplicate;

  const op = {
    op_id: rawOp.op_id || crypto.randomUUID(),
    device_id: rawOp.device_id || 'unknown',
    client_seq: Number(rawOp.client_seq || 0),
    type: rawOp.type,
    entry_id: rawOp.entry_id,
    base_version: rawOp.base_version == null ? null : Number(rawOp.base_version),
    payload: typeof rawOp.payload === 'string' ? rawOp.payload : JSON.stringify(rawOp.payload || {}),
    created_at: Number(rawOp.created_at || now()),
  };
  insertOp.run(op);
  const saved = db.prepare(`SELECT * FROM ops WHERE op_id = ?`).get(op.op_id);
  applyEntryChange(saved, JSON.parse(saved.payload || '{}'));
  return saved;
});

export function pullOps(after = 0) {
  return db.prepare(`
    SELECT * FROM ops
    WHERE server_seq > ?
    ORDER BY server_seq ASC
    LIMIT 1000
  `).all(Number(after || 0));
}

export function latestSeq() {
  return db.prepare(`SELECT COALESCE(MAX(server_seq), 0) AS seq FROM ops`).get().seq;
}
