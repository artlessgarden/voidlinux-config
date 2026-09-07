import van from "../../vendor/van-1.6.1.js";

const {button, div, span, textarea} = van.tags;

// River is a renderer: it turns workspace snapshots into DOM and translates
// raw DOM events through injected interaction functions. It cannot access the
// repository, persistence, cryptography, API, or session implementations.
export function createRiverView({root, workspace, actionForKey, passwordFeature, openSelectedTextSearch}) {
  let destroyed = false;
  const status = div({class: "sync-status", "data-state": "clean", role: "status", "aria-label": "已保存"});
  const river = div({class: "river", role: "list", "aria-label": "条目河流"});
  const bottom = textarea({class: "bottom-input", rows: 1, spellcheck: false, autocomplete: "off", "aria-label": "输入", placeholder: "o 新增  / 搜索  : 命令"});
  const gear = button({type: "button", class: "gear", "aria-label": "设置", onclick: () => void workspace.dispatch({type: "password/open"})}, "⚙");
  const shell = div({class: "river-shell", "data-mode": "normal"}, status, gear, river, bottom, passwordFeature.element);

  const unsubscribe = workspace.subscribe(render);
  document.addEventListener("keydown", onDocumentKeydown);
  window.addEventListener("focus", onWindowFocus);
  window.addEventListener("beforeunload", onBeforeUnload);
  bottom.addEventListener("input", onBottomInput);
  bottom.addEventListener("keydown", onBottomKeydown);
  bottom.addEventListener("focus", onBottomFocus);

  root.replaceChildren(shell);
  render();

  function render() {
    const state = workspace.snapshot();
    river.replaceChildren(...state.entries.map(entry => renderEntry(entry, state)));
    shell.dataset.mode = state.mode;
    status.dataset.state = state.status;
    status.setAttribute("aria-label", ({clean: "已保存", editing: "正在编辑", saving: "正在保存", failed: "同步失败"})[state.status]);
    bottom.placeholder = state.message || "o 新增  / 搜索  : 命令";

    // The bottom control survives redraws. Its displayed value follows
    // workspace state only at mode boundaries and during live search.
    if (state.mode === "normal") {
      bottom.value = state.query.text ? `/${state.query.text}` : "";
      if (document.activeElement === bottom) bottom.blur();
    }
    if (["add", "search", "command"].includes(state.mode)) {
      bottom.value = state.draft;
      queueMicrotask(() => {
        bottom.focus();
        grow(bottom);
        const start = state.mode === "search" ? 1 : bottom.value.length;
        const end = state.mode === "search" ? bottom.value.length : start;
        bottom.setSelectionRange(start, end);
      });
    }
  }

  function renderEntry(entry, state) {
    const active = entry.id === state.selectedId;
    const editing = state.mode === "edit" && active;
    const body = editing
      ? textarea({class: "entry-editor", "aria-label": "编辑条目", spellcheck: false, value: state.draft,
        oninput: event => { void workspace.dispatch({type: "draft/change", text: event.target.value}); grow(event.target); },
        onkeydown: onEditorKeydown})
      : div({class: "entry-text"}, entry.text || " ");
    const row = div({
      class: `river-entry${active ? " selected" : ""}`,
      role: "listitem",
      "data-entry-id": entry.id,
      onclick: () => void workspace.dispatch({type: "selection/set", id: entry.id}),
    }, span({class: "bullet", "aria-hidden": "true"}, "•"), body);
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
    const state = workspace.snapshot();
    if (passwordFeature.element.open || state.mode !== "normal") return;
    const action = actionForKey(keyEvent(event), state.mode);
    if (!action) return;
    event.preventDefault();
    if (action.type === "selection/search") {
      const text = selectedSearchText(window.getSelection()?.toString());
      if (text) openSelectedTextSearch(text);
      return;
    }
    void workspace.dispatch(action).then(() => {
      if (action.type === "selection/move") selectedRow()?.scrollIntoView({block: "nearest"});
    });
  }

  function onBottomInput() {
    void workspace.dispatch({type: "draft/change", text: bottom.value});
    grow(bottom);
  }

  // Touching the bottom control is the phone equivalent of `/`. During Edit,
  // the entry textarea remains the only writable control until submission.
  function onBottomFocus() {
    const state = workspace.snapshot();
    if (state.mode === "normal") void workspace.dispatch({type: "input/search-start"});
    if (state.mode === "edit") queueMicrotask(() => river.querySelector(".entry-editor")?.focus());
  }

  function onBottomKeydown(event) {
    const action = actionForKey(keyEvent(event), workspace.snapshot().mode);
    if (!action) return;
    event.preventDefault();
    if (action.type !== "input/block-newline") void workspace.dispatch(action);
  }

  function onEditorKeydown(event) {
    const action = actionForKey(keyEvent(event), workspace.snapshot().mode);
    if (!action) return;
    event.preventDefault();
    void workspace.dispatch(action);
  }

  function onWindowFocus() {
    void workspace.dispatch({type: "sync/pull"});
  }

  function onBeforeUnload(event) {
    if (!workspace.snapshot().unsaved) return;
    event.preventDefault();
    event.returnValue = "";
  }

  function selectedRow() {
    return river.querySelector(".river-entry.selected");
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    unsubscribe();
    document.removeEventListener("keydown", onDocumentKeydown);
    window.removeEventListener("focus", onWindowFocus);
    window.removeEventListener("beforeunload", onBeforeUnload);
    bottom.removeEventListener("input", onBottomInput);
    bottom.removeEventListener("keydown", onBottomKeydown);
    bottom.removeEventListener("focus", onBottomFocus);
  }

  return destroy;
}

export function selectedSearchText(value) {
  return String(value ?? "").trim();
}

function grow(element) {
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

function keyEvent(event) {
  return {
    key: event.key,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    isComposing: event.isComposing,
    targetTag: event.target?.tagName,
  };
}
