import van from "../../vendor/van-1.6.1.js";
import {buildAgenda} from "../core/agenda.js";
import {runQuery} from "../core/query.js";
import {createEntry} from "../model.js";

const {button, div, span, textarea} = van.tags;

// The river owns unfinished UI state. Durable text enters the repository only
// when a click outside the editor commits the single active draft.
export function createRiverView({root, repository, saver, sync, queryLocation, view = "river", now = () => new Date()}) {
  let query = queryLocation.read();
  let editing = null;
  let selectedText = "";
  let destroyed = false;

  const status = div({class: "sync-status", "data-state": "clean", role: "status", "aria-label": "已保存"});
  const river = div({class: "river", role: "list", "aria-label": "条目河流"});
  const search = textarea({class: "search-input", rows: 1, spellcheck: false, autocomplete: "off", "aria-label": "搜索", placeholder: "搜索"});
  const add = button({type: "button", class: "add-button", "aria-label": "新增", onclick: startAdd}, "+");
  const selectionSearch = button({type: "button", class: "selection-search", hidden: true, "aria-label": "在新标签搜索选中文字"}, "↗");
  const shell = div({class: `river-shell ${view === "agenda" ? "agenda-view" : ""}`}, status, river, div({class: "bottom-bar"}, search, add), selectionSearch);

  const cleanups = [
    repository.subscribe(renderEntries),
    saver.subscribe(renderStatus),
    sync.subscribe(renderStatus),
    queryLocation.subscribe(onLocationChange),
  ];
  search.addEventListener("input", onSearch);
  document.addEventListener("pointerdown", onDocumentPointerDown, true);
  document.addEventListener("selectionchange", onSelectionChange);
  window.addEventListener("focus", onWindowFocus);
  window.addEventListener("beforeunload", onBeforeUnload);
  selectionSearch.addEventListener("pointerdown", event => event.preventDefault());
  selectionSearch.addEventListener("click", openSelectionSearch);

  root.replaceChildren(shell);
  search.value = query;
  renderEntries();
  renderStatus();

  function entries() {
    return runQuery({type: "full-text", text: query, orderBy: "createdAt", direction: "asc"}, repository.values());
  }

  function renderEntries() {
    if (destroyed) return;
    const oldEditor = river.querySelector(".entry-editor");
    const caret = oldEditor && {start: oldEditor.selectionStart, end: oldEditor.selectionEnd};
    const rows = view === "agenda" ? renderAgenda(entries()) : entries().map(renderEntry);
    if (editing?.isNew && view !== "agenda") rows.push(renderEditorRow("new"));
    river.replaceChildren(...rows);
    if (editing) queueMicrotask(() => {
      const editor = river.querySelector(".entry-editor");
      if (!editor) return;
      grow(editor);
      editor.focus();
      const start = caret?.start ?? editor.value.length;
      editor.setSelectionRange(start, caret?.end ?? start);
    });
  }

  function renderAgenda(filteredEntries) {
    const agenda = buildAgenda(filteredEntries, now());
    const rows = [];
    for (const day of agenda.days) {
      rows.push(div({class: "date-heading"}, day.date));
      rows.push(...day.entries.map(renderEntry));
      if (day.date === todayKey() && editing?.isNew) rows.push(renderEditorRow("new"));
    }
    rows.push(div({class: "agenda-future"},
      div({class: "date-heading future-heading"}, "未来"),
      ...agenda.reminders.map(reminder => div({class: "reminder-entry"},
        span({class: "reminder-date"}, reminder.date),
        div({class: "entry-text reminder-text"}, reminder.entry.text || " ")))));
    return rows;
  }

  function renderEntry(entry) {
    if (editing?.id === entry.id) return renderEditorRow(entry.id);
    return row(entry.id, div({class: "entry-text", onclick: () => startEdit(entry)}, entry.text || " "));
  }

  function renderEditorRow(id) {
    const editor = textarea({
      class: "entry-editor", "data-editor-id": id, "aria-label": "编辑条目", spellcheck: false,
      value: editing.draft,
      oninput: event => { editing.draft = event.target.value; grow(event.target); renderStatus(); },
    });
    return row(id, editor);
  }

  function row(id, body) {
    return div({class: "river-entry", role: "listitem", "data-entry-id": id}, span({class: "bullet", "aria-hidden": "true"}, "•"), body);
  }

  function startEdit(entry) {
    if (editing) return;
    editing = {id: entry.id, draft: entry.text, original: entry.text, isNew: false};
    beginEditing();
  }

  function startAdd() {
    if (editing) return;
    editing = {id: "", draft: "", original: "", isNew: true};
    beginEditing();
    river.scrollTop = river.scrollHeight;
  }

  function beginEditing() {
    search.disabled = true;
    add.disabled = true;
    hideSelectionSearch();
    renderEntries();
    renderStatus();
  }

  async function commitEdit() {
    if (!editing) return;
    const finished = editing;
    editing = null;
    search.disabled = false;
    add.disabled = false;

    let changed = false;
    if (finished.isNew && finished.draft.trim()) {
      const instant = now();
      const iso = instant instanceof Date ? instant.toISOString() : String(instant);
      repository.upsert({...createEntry({existingIDs: repository.knownIDs(), now: iso}), text: finished.draft, updatedAt: iso});
      changed = true;
    } else if (!finished.isNew && finished.draft !== finished.original) {
      repository.updateEntryText(finished.id, finished.draft);
      changed = true;
    }
    renderEntries();
    renderStatus();
    if (changed) try { await saver.save(); } catch {}
  }

  function onDocumentPointerDown(event) {
    const editor = river.querySelector(".entry-editor");
    if (editing && editor && !editor.contains(event.target)) void commitEdit();
  }

  function onSearch() {
    if (editing) return;
    query = search.value;
    queryLocation.write(query);
    renderEntries();
    grow(search);
  }

  function onLocationChange(value) {
    if (editing) return;
    query = value;
    search.value = value;
    renderEntries();
  }

  function onSelectionChange() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return hideSelectionSearch();
    const range = selection.getRangeAt(0);
    const ancestor = range.commonAncestorContainer;
    const node = ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentElement : ancestor;
    if (!node?.closest?.(".entry-text")) return hideSelectionSearch();
    selectedText = selection.toString().trim();
    if (!selectedText) return hideSelectionSearch();
    const box = range.getBoundingClientRect();
    selectionSearch.style.left = `${Math.min(window.innerWidth - 42, Math.max(8, box.right + 6))}px`;
    selectionSearch.style.top = `${Math.min(window.innerHeight - 42, Math.max(8, box.bottom + 6))}px`;
    selectionSearch.hidden = false;
  }

  function openSelectionSearch() {
    if (selectedText) window.open(queryLocation.url(selectedText), "_blank", "noopener");
    hideSelectionSearch();
  }

  function hideSelectionSearch() {
    selectedText = "";
    selectionSearch.hidden = true;
  }

  function renderStatus() {
    let state = "clean";
    if (repository.hasQuarantined() || repository.hasConflicts() || ["failed", "conflict"].includes(saver.status()) || ["failed", "conflict"].includes(sync.status())) state = "failed";
    else if (editing) state = "editing";
    else if (repository.hasPendingChanges() || ["dirty", "saving"].includes(saver.status())) state = "saving";
    status.dataset.state = state;
    status.setAttribute("aria-label", ({clean: "已保存", editing: "正在编辑", saving: "正在保存", failed: "同步失败"})[state]);
  }

  function onWindowFocus() { void sync.pull().catch(() => {}); }

  function onBeforeUnload(event) {
    if (!editing && !repository.hasPendingChanges()) return;
    event.preventDefault();
    event.returnValue = "";
  }

  function todayKey() {
    const value = now();
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    for (const cleanup of cleanups) cleanup();
    document.removeEventListener("pointerdown", onDocumentPointerDown, true);
    document.removeEventListener("selectionchange", onSelectionChange);
    window.removeEventListener("focus", onWindowFocus);
    window.removeEventListener("beforeunload", onBeforeUnload);
  }

  return destroy;
}

function grow(element) {
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}
