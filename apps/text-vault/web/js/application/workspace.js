import {runQuery as defaultRunQuery} from "../core/query.js";
import {createEntry} from "../model.js";
import {createModes} from "../modes.js";

// Workspace is the application boundary between user intent and storage. It
// owns transient editing state and coordinates persistence, but knows nothing
// about DOM nodes, browser URLs, encryption details, or concrete renderers.
export function createWorkspace({
  repository,
  saver,
  sync,
  initialQuery = "",
  openPassword = () => {},
  runQuery = defaultRunQuery,
  now = () => new Date(),
}) {
  const modes = createModes(initialQuery);
  const subscribers = new Set();
  const cleanups = [];
  let selectedId = "";
  let message = "";
  let destroyed = false;

  cleanups.push(repository.subscribe(event => {
    if (event.type === "rename" && selectedId === event.from) selectedId = event.to;
    normalizeSelection();
    notify();
  }));
  cleanups.push(saver.subscribe(notify));
  cleanups.push(sync.subscribe(notify));
  normalizeSelection();

  function snapshot() {
    const mode = modes.state();
    const entries = entriesFor(mode.query);
    return {
      query: querySpec(mode.query),
      view: {type: "river"},
      selectedId,
      mode: mode.name,
      draft: mode.draft,
      entries,
      status: deriveStatus(mode.name),
      unsaved: ["edit", "add"].includes(mode.name) || repository.hasPendingChanges(),
      message,
    };
  }

  async function dispatch(action) {
    if (destroyed || !action || typeof action.type !== "string") return;
    let publish = true;
    if (action.type === "selection/move") moveSelection(action.offset);
    else if (action.type === "selection/set") select(action.id);
    else if (action.type === "entry/edit-start") startEdit();
    else if (action.type === "entry/add-start") modes.enterAdd();
    else if (action.type === "input/search-start") modes.enterSearch();
    else if (action.type === "input/command-start") modes.enterCommand();
    else if (action.type === "draft/change") {
      const liveQuery = modes.state().name === "search";
      modes.setDraft(action.text);
      // The active textarea already displays ordinary draft input. Publishing
      // only live-search drafts avoids rebuilding and refocusing it per key.
      publish = liveQuery;
    }
    else if (action.type === "query/change") setQuery(action.text);
    else if (action.type === "draft/submit" || action.type === "input/close") await submitDraft();
    else if (action.type === "command/execute") await executeCommand();
    else if (action.type === "password/open") await openPassword();
    else if (action.type === "sync/pull") {
      try { await sync.pull(); } catch {}
    }
    normalizeSelection();
    if (publish) notify();
  }

  function moveSelection(offset) {
    const entries = entriesFor(modes.state().query);
    if (!entries.length) {
      selectedId = "";
      return;
    }
    const current = Math.max(0, entries.findIndex(entry => entry.id === selectedId));
    const index = Math.max(0, Math.min(entries.length - 1, current + Number(offset || 0)));
    selectedId = entries[index].id;
  }

  function select(id) {
    if (["edit", "add"].includes(modes.state().name)) return;
    if (entriesFor(modes.state().query).some(entry => entry.id === id)) selectedId = id;
  }

  function startEdit() {
    const entry = repository.get(selectedId);
    if (entry?.kind === "entry") modes.enterEdit(entry.id, entry.text);
  }

  function setQuery(text) {
    modes.enterSearch(String(text ?? ""));
    modes.escape();
  }

  async function submitDraft() {
    const result = modes.escape();
    if (result.type === "edit") repository.updateEntryText(result.id, result.text);
    if (result.type === "add") {
      const instant = now();
      const iso = instant instanceof Date ? instant.toISOString() : String(instant);
      const entry = {...createEntry({existingIDs: repository.knownIDs(), now: iso}), text: result.text, updatedAt: iso};
      repository.upsert(entry);
      selectedId = entry.id;
    }
    if (result.type === "edit" || result.type === "add") {
      try { await saver.save(); } catch {}
    }
  }

  async function executeCommand() {
    const result = modes.executeCommand(modes.state().draft);
    if (result.type === "change-password") await openPassword();
    if (result.type === "error") message = result.message;
  }

  function normalizeSelection() {
    const entries = entriesFor(modes.state().query);
    if (!entries.some(entry => entry.id === selectedId)) selectedId = entries[0]?.id ?? "";
  }

  function entriesFor(text) {
    return runQuery(querySpec(text), repository.values());
  }

  function deriveStatus(mode) {
    const saveState = saver.status();
    const syncState = sync.status();
    if (repository.hasQuarantined() || repository.hasConflicts() ||
        ["failed", "conflict"].includes(saveState) || ["failed", "conflict"].includes(syncState)) return "failed";
    if (mode === "edit" || mode === "add") return "editing";
    if (repository.hasPendingChanges() || saveState === "dirty" || saveState === "saving") return "saving";
    return "clean";
  }

  function subscribe(callback) {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  }

  function notify() {
    if (destroyed) return;
    for (const subscriber of subscribers) subscriber(snapshot());
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    for (const cleanup of cleanups) cleanup();
    subscribers.clear();
  }

  return {snapshot, dispatch, subscribe, destroy};
}

function querySpec(text) {
  return {type: "full-text", text, orderBy: "createdAt", direction: "asc"};
}
