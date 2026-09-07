import van from "../vendor/van-1.6.1.js";
import {rewrapVault} from "./crypto.js";
import {createModes} from "./modes.js";
import {createEntry} from "./model.js";

const {button, dialog, div, form, input, p, span, textarea} = van.tags;

export function nextIndex(index, length, direction) {
  if (length === 0) return -1;
  return Math.max(0, Math.min(length - 1, index + direction));
}

export function selectedSearchText(value) {
  return String(value ?? "").trim();
}

export function modeForKey({key, ctrlKey = false, metaKey = false, isComposing = false, targetTag = ""}) {
  if (isComposing) return null;
  if ((ctrlKey || metaKey) && key === "Enter") return "search-selection";
  if (["INPUT", "TEXTAREA", "SELECT"].includes(String(targetTag).toUpperCase())) return null;
  return ({j: "next", k: "previous", i: "edit", Enter: "edit", o: "add", "/": "search", ":": "command"})[key] ?? null;
}

export function renderRiverApplication({root, repository, saver, sync, key, api, tabSession}) {
  const initialQuery = readQuery();
  const modes = createModes(initialQuery);
  let selectedID = "";
  let entries = [];
  let message = "";
  let destroyed = false;

  const status = div({class: "sync-status", "data-state": "clean", role: "status", "aria-label": "已保存"});
  const river = div({class: "river", role: "list", "aria-label": "条目河流"});
  const bottom = textarea({class: "bottom-input", rows: 1, spellcheck: false, autocomplete: "off", "aria-label": "输入", placeholder: "o 新增  / 搜索  : 命令"});
  const gear = button({type: "button", class: "gear", "aria-label": "设置", onclick: openPasswordDialog}, "⚙");
  const passwordDialog = buildPasswordDialog();
  const shell = div({class: "river-shell", "data-mode": "normal"}, status, gear, river, bottom, passwordDialog);

  const unsubscribeRepository = repository.subscribe(event => {
    if (event.type === "rename" && selectedID === event.from) selectedID = event.to;
    render();
  });
  const unsubscribeSaver = saver.subscribe(renderStatus);
  const unsubscribeSync = sync.subscribe(render);

  document.addEventListener("keydown", onDocumentKeydown);
  window.addEventListener("hashchange", onLocationChange);
  window.addEventListener("focus", onWindowFocus);
  window.addEventListener("beforeunload", onBeforeUnload);
  bottom.addEventListener("input", onBottomInput);
  bottom.addEventListener("keydown", onBottomKeydown);
  bottom.addEventListener("focus", onBottomFocus);

  root.replaceChildren(shell);
  render();

  function render() {
    const state = modes.state();
    entries = repository.queryEntries(state.query);
    if (!entries.some(entry => entry.id === selectedID)) selectedID = entries[0]?.id ?? "";
    river.replaceChildren(...entries.map(entry => renderEntry(entry, state)));
    shell.dataset.mode = state.name;
    if (state.name === "normal" && document.activeElement !== bottom) bottom.value = state.query ? `/${state.query}` : "";
    renderStatus();
  }

  function renderEntry(entry, state) {
    const active = entry.id === selectedID;
    const editing = state.name === "edit" && state.id === entry.id;
    const body = editing
      ? textarea({class: "entry-editor", "aria-label": "编辑条目", spellcheck: false, value: state.draft,
        oninput: event => { modes.setDraft(event.target.value); grow(event.target); },
        onkeydown: onEditorKeydown})
      : div({class: "entry-text"}, entry.text || " ");
    const row = div({class: `river-entry${active ? " selected" : ""}`, role: "listitem", "data-entry-id": entry.id,
      onclick: () => {
        if (["edit", "add"].includes(modes.state().name)) return;
        selectedID = entry.id;
        render();
      }}, span({class: "bullet", "aria-hidden": "true"}, "•"), body);
    if (editing) queueMicrotask(() => {
      const editor = row.querySelector(".entry-editor");
      if (!editor) return;
      grow(editor);
      editor.focus();
      editor.setSelectionRange(editor.value.length, editor.value.length);
    });
    return row;
  }

  function onDocumentKeydown(event) {
    if (passwordDialog.open || modes.state().name !== "normal") return;
    const action = modeForKey({key: event.key, ctrlKey: event.ctrlKey, metaKey: event.metaKey, isComposing: event.isComposing, targetTag: event.target?.tagName});
    if (!action) return;
    if (action === "search-selection") {
      const text = selectedSearchText(window.getSelection()?.toString());
      if (text) window.open(queryURL(text), "_blank", "noopener");
      return;
    }
    event.preventDefault();
    if (action === "next" || action === "previous") moveSelection(action === "next" ? 1 : -1);
    if (action === "edit") enterEdit();
    if (action === "add") enterBottom("add");
    if (action === "search") enterBottom("search");
    if (action === "command") enterBottom("command");
  }

  function moveSelection(direction) {
    const current = entries.findIndex(entry => entry.id === selectedID);
    const index = nextIndex(current < 0 ? 0 : current, entries.length, direction);
    selectedID = entries[index]?.id ?? "";
    render();
    river.querySelector(`[data-entry-id="${selectedID}"]`)?.scrollIntoView({block: "nearest"});
  }

  function enterEdit() {
    const entry = repository.get(selectedID);
    if (!entry) return;
    modes.enterEdit(entry.id, entry.text);
    render();
  }

  function enterBottom(name) {
    if (name === "add") modes.enterAdd();
    if (name === "search") modes.enterSearch();
    if (name === "command") modes.enterCommand();
    bottom.value = modes.state().draft;
    render();
    bottom.focus();
    grow(bottom);
    if (name === "search") bottom.setSelectionRange(1, bottom.value.length);
    else bottom.setSelectionRange(bottom.value.length, bottom.value.length);
  }

  function onBottomInput() {
    modes.setDraft(bottom.value);
    grow(bottom);
    if (modes.state().name === "search") {
      writeQuery(modes.state().query);
      render();
      bottom.focus();
    }
  }

  // Tapping the command line is the touch-friendly equivalent of `/`.
  // During Edit the active entry remains the only writable control.
  function onBottomFocus() {
    const name = modes.state().name;
    if (name === "normal") enterBottom("search");
    if (name === "edit") queueMicrotask(() => river.querySelector(".entry-editor")?.focus());
  }


  function onBottomKeydown(event) {
    if (event.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      void commitEscape();
      return;
    }
    if (event.key === "Enter" && !event.shiftKey && modes.state().name === "add") {
      event.preventDefault();
      void commitEscape();
      return;
    }
    if (event.key === "Enter" && modes.state().name === "command") {
      event.preventDefault();
      const action = modes.executeCommand(bottom.value);
      if (action.type === "change-password") openPasswordDialog();
      else setMessage(action.message);
      render();
      return;
    }
    if (event.key === "Enter" && modes.state().name === "search") event.preventDefault();
  }

  function onEditorKeydown(event) {
    if (event.isComposing || (event.key !== "Escape" && (event.key !== "Enter" || event.shiftKey))) return;
    event.preventDefault();
    void commitEscape();
  }

  async function commitEscape() {
    const action = modes.escape();
    if (action.type === "edit") repository.updateEntryText(action.id, action.text);
    if (action.type === "add") {
      const now = new Date().toISOString();
      const entry = {...createEntry({existingIDs: repository.knownIDs(), now}), text: action.text, updatedAt: now};
      repository.upsert(entry);
      selectedID = entry.id;
    }
    if (action.type === "search") writeQuery(action.query);
    bottom.blur();
    render();
    if (action.type === "edit" || action.type === "add") {
      try { await saver.save(); } catch {}
      renderStatus();
    }
  }

  function buildPasswordDialog() {
    const first = input({type: "password", minlength: 16, autocomplete: "new-password", required: true, "aria-label": "新主密码"});
    const repeated = input({type: "password", minlength: 16, autocomplete: "new-password", required: true, "aria-label": "重复新主密码"});
    const error = p({class: "dialog-error", role: "alert"});
    const submit = button({type: "submit"}, "修改密码");
    const close = button({type: "button", onclick: () => passwordDialog.close()}, "取消");
    return dialog({class: "password-dialog", onclose: () => {
      first.value = "";
      repeated.value = "";
      error.textContent = "";
    }}, form({method: "dialog", onsubmit: async event => {
      event.preventDefault();
      if (first.value !== repeated.value) {
        error.textContent = "两次主密码不一致";
        return;
      }
      submit.disabled = true;
      error.textContent = "正在修改…";
      try {
        const rotated = await rewrapVault(first.value, key);
        await api.rekey(rotated.header, rotated.credential);
        tabSession.offer({key, csrfToken: api.csrfToken()});
        passwordDialog.close();
      } catch (cause) {
        error.textContent = cause?.message || "修改失败";
      } finally {
        submit.disabled = false;
      }
    }}, div({class: "dialog-title"}, "修改主密码"), first, repeated, error, div({class: "dialog-actions"}, close, submit)));
  }

  function openPasswordDialog() {
    if (!passwordDialog.open) passwordDialog.showModal();
  }

  function renderStatus() {
    const mode = modes.state().name;
    const saveState = saver.status();
    const syncState = sync.status();
    let state = "clean";
    if (repository.hasQuarantined() || repository.hasConflicts() || ["failed", "conflict"].includes(saveState) || ["failed", "conflict"].includes(syncState)) state = "failed";
    else if (mode === "edit" || mode === "add") state = "editing";
    else if (repository.hasPendingChanges() || saveState === "dirty" || saveState === "saving") state = "saving";
    status.dataset.state = state;
    status.setAttribute("aria-label", ({clean: "已保存", editing: "正在编辑", saving: "正在保存", failed: "同步失败"})[state]);
  }

  function setMessage(value) {
    message = value;
    bottom.setAttribute("data-message", message);
    bottom.placeholder = message;
    setTimeout(() => {
      if (message !== value || destroyed) return;
      message = "";
      bottom.removeAttribute("data-message");
      bottom.placeholder = "o 新增  / 搜索  : 命令";
    }, 3000);
  }

  function onLocationChange() {
    if (modes.state().name !== "normal") return;
    modes.enterSearch(readQuery());
    modes.escape();
    render();
  }

  function onWindowFocus() {
    void sync.pull().catch(() => {});
  }

  function onBeforeUnload(event) {
    if (!["edit", "add"].includes(modes.state().name) && !repository.hasPendingChanges()) return;
    event.preventDefault();
    event.returnValue = "";
  }

  function destroy() {
    destroyed = true;
    unsubscribeRepository();
    unsubscribeSaver();
    unsubscribeSync();
    document.removeEventListener("keydown", onDocumentKeydown);
    window.removeEventListener("hashchange", onLocationChange);
    window.removeEventListener("focus", onWindowFocus);
    window.removeEventListener("beforeunload", onBeforeUnload);
  }

  return {destroy};
}

function grow(element) {
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

function readQuery() {
  return new URLSearchParams(location.hash.slice(1)).get("q") ?? "";
}

function writeQuery(query) {
  history.replaceState(history.state, "", queryURL(query));
}

function queryURL(query) {
  const url = new URL(location.href);
  url.hash = query ? new URLSearchParams({q: query}).toString() : "";
  return url.href;
}
