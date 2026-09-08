import van from "../../vendor/van-1.6.1.js";
import {buildAgenda} from "../core/agenda.js";
import {runQuery} from "../core/query.js";
import {createEntry} from "../model.js";

const {button, div, span, textarea} = van.tags;

// The river owns unfinished UI state. Durable text enters the repository only
// when a click outside the editor commits the single active draft.
export function createRiverView({root, repository, saver, sync, queryLocation, now = () => new Date()}) {
  let query = queryLocation.read();
  let editing = null;
  let selectedText = "";
  let holdTimer = null;
  let holdOrigin = null;
  let longPressed = false;
  let destroyed = false;

  const status = div({class: "sync-status", "data-state": "clean", role: "status", "aria-label": "已保存"});
  const river = div({class: "river", role: "list", "aria-label": "条目河流"});
  const search = textarea({class: "search-input", rows: 1, spellcheck: false, autocomplete: "off", "aria-label": "搜索", placeholder: "搜索"});
  const searchTrigger = button({type: "button", class: "search-trigger", "aria-label": "搜索，长按新增"});
  const searchControl = div({class: "search-control", "data-open": "false", "data-has-query": String(Boolean(query.trim()))}, searchTrigger, search);
  const selectionSearch = button({type: "button", class: "selection-search", hidden: true, "aria-label": "在新标签搜索选中文字"});
  const shell = div({class: "river-shell"}, status, river, searchControl, selectionSearch);

  const cleanups = [
    repository.subscribe(renderEntries),
    saver.subscribe(renderStatus),
    sync.subscribe(renderStatus),
    queryLocation.subscribe(onLocationChange),
  ];
  search.addEventListener("input", onSearch);
  search.addEventListener("keydown", onSearchKeydown);
  document.addEventListener("pointerdown", onDocumentPointerDown, true);
  document.addEventListener("keydown", onDocumentKeydown);
  document.addEventListener("selectionchange", onSelectionChange);
  window.addEventListener("focus", onWindowFocus);
  window.addEventListener("beforeunload", onBeforeUnload);
  selectionSearch.addEventListener("pointerdown", event => event.preventDefault());
  selectionSearch.addEventListener("click", openSelectionSearch);
  searchTrigger.addEventListener("click", onTriggerClick);
  searchTrigger.addEventListener("pointerdown", onTriggerPointerDown);
  searchTrigger.addEventListener("pointermove", onTriggerPointerMove);
  searchTrigger.addEventListener("pointerup", cancelHold);
  searchTrigger.addEventListener("pointercancel", cancelHold);
  searchTrigger.addEventListener("contextmenu", event => event.preventDefault());
  searchControl.addEventListener("transitionend", onSearchTransitionEnd);

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
    const rows = renderAgenda(entries());
    river.replaceChildren(...rows);
    if (editing) queueMicrotask(() => {
      const editor = river.querySelector(".entry-editor");
      if (!editor) return;
      // Existing entries start at their rendered height, so entering edit mode
      // does not move the river. New entries have no rendered height to inherit.
      if (!editing.initialHeight) grow(editor);
      editor.focus();
      const start = caret?.start ?? editor.value.length;
      editor.setSelectionRange(start, caret?.end ?? start);
    });
  }

  function renderAgenda(filteredEntries) {
    const instant = now();
    const agenda = buildAgenda(filteredEntries, instant);
    const today = dateKey(instant);
    const rows = [];
    for (const day of agenda.days) {
      rows.push(renderDateHeading(day.date, day.date === today));
      rows.push(...day.entries.map(renderEntry));
      if (day.date === today && editing?.isNew) rows.push(renderEditorRow("new"));
    }
    // Future references use the same date-and-entry grammar as the river.
    // A query already contains those entries, so its result does not repeat them.
    if (!query.trim() && agenda.reminders.length) {
      const futureRows = [];
      let lastDate = "";
      for (const reminder of agenda.reminders) {
        if (reminder.date !== lastDate) {
          futureRows.push(renderDateHeading(reminder.date, false));
          lastDate = reminder.date;
        }
        futureRows.push(row(null, div({class: "entry-text reminder-text"}, reminder.entry.text || " "), "reminder-entry"));
      }
      rows.push(div({class: "agenda-future"},
        div({class: "date-heading future-heading"}, div({class: "date-main"}, "未来...")),
        ...futureRows));
    }
    return rows;
  }

  function renderEntry(entry) {
    if (editing?.id === entry.id) return renderEditorRow(entry.id);
    return row(entry.id, div({class: "entry-text", onclick: event => startEdit(entry, event.currentTarget)}, cleanText(entry.text) || " "));
  }

  function renderEditorRow(id) {
    const editor = textarea({
      class: "entry-editor", "data-editor-id": id, "aria-label": "编辑条目", spellcheck: false, rows: 1,
      value: editing.draft,
      style: editing.initialHeight ? `height:${editing.initialHeight}px` : "",
      oninput: event => { editing.draft = event.target.value; grow(event.target); renderStatus(); },
      onkeydown: event => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        void commitEdit();
      },
    });
    return row(id, editor);
  }

  function row(id, body, extraClass = "") {
    const attributes = {class: `river-entry ${extraClass}`.trim(), role: "listitem"};
    if (id) attributes["data-entry-id"] = id;
    return div(attributes, span({class: "entry-marker", "aria-hidden": "true"}), body);
  }

  function startEdit(entry, source) {
    if (editing) return;
    editing = {id: entry.id, draft: entry.text, original: entry.text, isNew: false, initialHeight: source?.getBoundingClientRect().height || 0};
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
    searchTrigger.disabled = true;
    hideSearch();
    hideSelectionSearch();
    renderEntries();
    renderStatus();
  }

  async function commitEdit() {
    if (!editing) return;
    const finished = editing;
    const text = cleanText(finished.draft);
    editing = null;
    longPressed = false;
    search.disabled = false;
    searchTrigger.disabled = false;

    let changed = false;
    if (finished.isNew && text) {
      const instant = now();
      const iso = instant instanceof Date ? instant.toISOString() : String(instant);
      repository.upsert({...createEntry({existingIDs: repository.knownIDs(), now: iso}), text, updatedAt: iso});
      changed = true;
    } else if (!finished.isNew && text !== finished.original) {
      repository.updateEntryText(finished.id, text);
      changed = true;
    }
    renderEntries();
    renderStatus();
    if (changed) try { await saver.save(); } catch {}
  }

  function onDocumentPointerDown(event) {
    if (searchControl.dataset.open === "true" && !searchControl.contains(event.target)) hideSearch();
    const editor = river.querySelector(".entry-editor");
    if (!editing || !editor || editor.contains(event.target)) return;

    // Commit the active entry before interpreting another surface.
    // Entry switching intentionally takes a second click, preventing an
    // outside-save gesture from also opening an unintended entry.
    const wantsEntry = event.target.closest?.(".river-entry");
    const wantsSearch = event.target.closest?.(".search-input");
    if (wantsEntry || wantsSearch) {
      event.preventDefault();
      event.stopPropagation();
    }
    void commitEdit();
    if (wantsSearch) showSearch();
  }

  function onDocumentKeydown(event) {
    if (event.isComposing || event.altKey) return;
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && selectedText) {
      event.preventDefault();
      openSelectionSearch();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.target.closest?.("textarea, input")) return;
    if (event.key === "/") {
      event.preventDefault();
      showSearch();
    } else if (event.key.toLowerCase() === "o") {
      event.preventDefault();
      startAdd();
    }
  }

  function onSearchKeydown(event) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    hideSearch();
  }

  function showSearch() {
    if (editing) return;
    search.style.height = "48px";
    searchControl.dataset.open = "true";
    queueMicrotask(() => {
      search.focus();
      search.setSelectionRange(search.value.length, search.value.length);
    });
  }

  function hideSearch() {
    if (!query.trim() && query) {
      query = "";
      search.value = "";
      queryLocation.write("");
      searchControl.dataset.hasQuery = "false";
      renderEntries();
    }
    searchControl.dataset.open = "false";
    search.blur();
    search.style.height = "";
  }

  function onTriggerClick(event) {
    if (longPressed) {
      event.preventDefault();
      longPressed = false;
      return;
    }
    showSearch();
  }

  function onTriggerPointerDown(event) {
    if (searchTrigger.disabled) return;
    holdOrigin = {x: event.clientX, y: event.clientY};
    holdTimer = setTimeout(() => {
      holdTimer = null;
      longPressed = true;
      startAdd();
    }, 500);
  }

  function onTriggerPointerMove(event) {
    if (!holdOrigin || Math.hypot(event.clientX - holdOrigin.x, event.clientY - holdOrigin.y) <= 10) return;
    cancelHold();
  }

  function onSearchTransitionEnd(event) {
    if (event.propertyName === "width" && searchControl.dataset.open === "true") grow(search);
  }

  function cancelHold() {
    if (holdTimer !== null) clearTimeout(holdTimer);
    holdTimer = null;
    holdOrigin = null;
  }

  function onSearch() {
    if (editing) return;
    query = search.value;
    searchControl.dataset.hasQuery = String(Boolean(query.trim()));
    queryLocation.write(query);
    renderEntries();
    grow(search);
  }

  function onLocationChange(value) {
    if (editing) return;
    query = value;
    search.value = value;
    searchControl.dataset.hasQuery = String(Boolean(query.trim()));
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
    selectionSearch.hidden = !window.matchMedia("(max-width: 600px)").matches;
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

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    for (const cleanup of cleanups) cleanup();
    document.removeEventListener("pointerdown", onDocumentPointerDown, true);
    document.removeEventListener("keydown", onDocumentKeydown);
    document.removeEventListener("selectionchange", onSelectionChange);
    window.removeEventListener("focus", onWindowFocus);
    window.removeEventListener("beforeunload", onBeforeUnload);
    searchControl.removeEventListener("transitionend", onSearchTransitionEnd);
    if (holdTimer !== null) clearTimeout(holdTimer);
  }

  return destroy;
}

function renderDateHeading(key, today) {
  const [year, month, day] = key.split("-").map(Number);
  const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][new Date(year, month - 1, day).getDay()];
  return div({class: `date-heading${today ? " today" : ""}`},
    div({class: "date-main"}, `${year}年${month}月${day}日`),
    div({class: "date-meta"}, weekday));
}

function dateKey(value) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

// Stored entries have no meaningful whitespace outside their first and last
// visible character. Interior spaces and blank lines remain untouched.
function cleanText(text) {
  return text.trim();
}

function grow(element) {
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}
