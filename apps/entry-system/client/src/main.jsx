import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function apiBase() {
  if (import.meta.env.VITE_API_BASE) return import.meta.env.VITE_API_BASE;
  if (location.port === '5173') return `${location.protocol}//${location.hostname}:38521`;
  return '';
}

function wsBase() {
  if (import.meta.env.VITE_WS_BASE) return import.meta.env.VITE_WS_BASE;
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  if (location.port === '5173') return `${protocol}//${location.hostname}:38521`;
  return `${protocol}//${location.host}`;
}

const deviceId = localStorage.getItem('entry-device-id') || randomId();
localStorage.setItem('entry-device-id', deviceId);

async function api(path, options = {}) {
  const res = await fetch(`${apiBase()}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function formatTime(ms) {
  return new Date(ms).toLocaleString('zh-CN', { hour12: false });
}

function firstLine(text) {
  return (text || '').split(/\n/).find((line) => line.trim()) || '空条目';
}

function App() {
  const [entries, setEntries] = useState([]);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('连接中');

  async function load(q = query) {
    const data = await api(`/api/entries?q=${encodeURIComponent(q)}`);
    setEntries(data.entries || []);
    if (selected) {
      const next = data.entries.find((entry) => entry.id === selected.id);
      if (next) setSelected(next);
    }
  }

  useEffect(() => {
    load('').catch((err) => setStatus(err.message));
    const ws = new WebSocket(wsBase());
    ws.onopen = () => setStatus('实时同步已连接');
    ws.onclose = () => setStatus('实时同步已断开');
    ws.onerror = () => setStatus('实时同步错误');
    ws.onmessage = () => load().catch(() => {});
    return () => ws.close();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      load(query).catch((err) => setStatus(err.message));
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  const selectedVersion = useMemo(() => selected?.version ?? null, [selected]);

  async function createEntry() {
    const content = draft.trim();
    if (!content) return;
    await api('/api/entries', {
      method: 'POST',
      body: JSON.stringify({ device_id: deviceId, content }),
    });
    setDraft('');
    await load();
  }

  async function saveEntry() {
    if (!selected) return;
    await api(`/api/entries/${selected.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        device_id: deviceId,
        content: draft,
        base_version: selectedVersion,
      }),
    });
    await load();
  }

  function choose(entry) {
    setSelected(entry);
    setDraft(entry.content || '');
  }

  return (
    <main className="app">
      <aside className="sidebar">
        <div className="toolbar">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索"
          />
          <button onClick={() => load()}>刷新</button>
        </div>
        <div className="status">{status}</div>
        <div className="list">
          {entries.map((entry) => (
            <button
              key={entry.id}
              className={selected?.id === entry.id ? 'item selected' : 'item'}
              onClick={() => choose(entry)}
            >
              <strong>{firstLine(entry.content)}</strong>
              <span>{formatTime(entry.updated_at)}</span>
            </button>
          ))}
        </div>
      </aside>
      <section className="editor">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="写一条内容"
        />
        <div className="actions">
          <button onClick={createEntry}>新建</button>
          <button onClick={saveEntry} disabled={!selected}>保存当前</button>
          <button onClick={() => { setSelected(null); setDraft(''); }}>清空</button>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
