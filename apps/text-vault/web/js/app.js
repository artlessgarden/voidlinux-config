import van from "../vendor/van-1.6.1.js";
import {APIError, createAPI} from "./api.js";
import {createCommands} from "./commands.js";
import {createVault, deriveServerCredential, rewrapVault, unlockVault} from "./crypto.js";
import {decryptSnapshot} from "./load.js";
import {createEntry, formatMemoTime} from "./model.js";
import {createRepository} from "./repository.js";
import {createSaveCoordinator} from "./save.js";
import {createSyncCoordinator} from "./sync.js";
import {createTabSession} from "./tab-session.js";

const {button, div, form, h1, input, label, main, p, section, span, textarea} = van.tags;
const root = document.querySelector("#app");
const api = createAPI();
const tabSession = createTabSession();
window.addEventListener("unload", () => tabSession.close(), {once: true});

initialize();

async function initialize() {
  let header;
  try {
    header = await api.vault();
  } catch (cause) {
    if (cause instanceof APIError && cause.status === 404) {
      renderSetup();
      return;
    }
    renderAuthMessage("无法连接", "暂时无法读取保险库。", initialize);
    return;
  }

  // A live unlocked tab gets the first chance to supply its in-memory key.
  // Nothing secret is persisted when that tab disappears.
  const shared = await tabSession.request();
  if (shared) {
    api.setCSRFToken(shared.csrfToken);
    try {
      await openVault(shared.key, await api.snapshot());
      return;
    } catch {}
  }
  renderUnlock(header);
}

function renderSetup() {
  const password = input({type: "password", autocomplete: "new-password", minlength: 16, required: true});
  const repeated = input({type: "password", autocomplete: "new-password", minlength: 16, required: true});
  const error = p({class: "auth-error", role: "alert"});
  const submit = button({type: "submit"}, "创建保险库");
  mountAuth("创建保险库", "主密码只在当前浏览器中解密数据。", form({onsubmit: async event => {
    event.preventDefault();
    if (password.value !== repeated.value) {
      error.textContent = "两次主密码不一致";
      return;
    }
    submit.disabled = true;
    error.textContent = "正在生成密钥…";
    try {
      const created = await createVault(password.value);
      await api.setup(created.header, created.credential);
      await openVault(created.key, {manifest: {generation: 0}, objects: {}});
    } catch (cause) {
      error.textContent = cause?.message || "创建失败";
      submit.disabled = false;
    }
  }}, label("新主密码", password), label("重复主密码", repeated), error, submit));
  password.focus();
}

function renderUnlock(header) {
  const password = input({type: "password", autocomplete: "current-password", required: true});
  const error = p({class: "auth-error", role: "alert"});
  const submit = button({type: "submit"}, "解锁");
  mountAuth("解锁保险库", "明文只存在于已解锁页面的内存中。", form({onsubmit: async event => {
    event.preventDefault();
    submit.disabled = true;
    error.textContent = "正在解锁…";
    try {
      const credential = await deriveServerCredential(password.value, header);
      await api.login(credential);
      const key = await unlockVault(password.value, header);
      await openVault(key, await api.snapshot());
    } catch (cause) {
      error.textContent = cause?.status === 429 ? "尝试过多，请稍后再试" : "主密码不正确或数据无法解密";
      submit.disabled = false;
    }
  }}, label("主密码", password), error, submit));
  password.focus();
}

async function openVault(key, snapshot) {
  const loaded = await decryptSnapshot(key, snapshot);
  const repository = createRepository(loaded.objects.filter(object => object.kind === "entry"));
  for (const failure of loaded.failures) repository.quarantine(failure.id, failure.error);
  let saver;
  let sync;
  saver = createSaveCoordinator({
    repository, api, key, generation: snapshot.manifest?.generation ?? 0,
    beforeSave: () => sync.pull(),
    onGeneration: generation => sync.setGeneration(generation),
  });
  sync = createSyncCoordinator({
    repository, api, key, generation: snapshot.manifest?.generation ?? 0,
    onGeneration: generation => saver.setGeneration(generation),
  });

  tabSession.offer({key, csrfToken: api.csrfToken()});
  tabSession.subscribe(session => api.setCSRFToken(session.csrfToken));
  renderApplication({repository, saver, sync, key});
  sync.start();
}

function renderApplication({repository, saver, sync, key}) {
  let query = readQuery();
  let selectedID = "";
  let selectedIndex = 0;
  let mobilePane = "list";
  let currentItems = [];
  let message = "";

  const status = div({class: "sync-status", "data-state": "clean", role: "status", "aria-label": "已保存", title: "已保存"});
  const results = div({class: "results", role: "listbox", "aria-label": "搜索结果"});
  const editor = textarea({class: "editor", "aria-label": "条目内容", spellcheck: false, disabled: true, placeholder: "选择条目，或新建一条"});
  const selectionSearch = button({type: "button", class: "selection-search", hidden: true, onpointerdown: event => event.preventDefault(), onclick: () => {
    const text = selectedText(editor);
    if (text) window.open(queryURL(text), "_blank", "noopener");
  }}, "在新标签搜索");
  const commandInput = input({type: "search", class: "command-input", role: "searchbox", "aria-label": "搜索条目", autocomplete: "off", autocapitalize: "off", spellcheck: false, placeholder: "搜索 IP、域名、客户……", value: query});
  const back = button({type: "button", class: "back", "aria-label": "返回结果", onclick: showList}, "←");
  const info = span({class: "entry-info"});
  const footerInfo = section({class: "footer-info"}, back, info);
  const shell = main({class: "app-shell", "data-pane": mobilePane}, status,
    div({class: "work-area"}, section({class: "list-pane"}, results), section({class: "content-pane"}, editor, selectionSearch)),
    section({class: "footer-search"},
      form({class: "search-form", onsubmit: event => { event.preventDefault(); void activateCurrent(); }}, commandInput,
        button({type: "button", "aria-label": "新建条目", onclick: () => createNewEntry("")}, "+"),
        button({type: "button", "aria-label": "在新标签页打开查询", onclick: () => window.open(queryURL(query), "_blank", "noopener")}, "↗")),
      footerInfo));

  const commands = createCommands({
    save: () => saver.save(),
    changePassword: async password => {
      const rotated = await rewrapVault(password, key);
      await api.rekey(rotated.header, rotated.credential);
      tabSession.offer({key, csrfToken: api.csrfToken()});
    },
  });

  repository.subscribe(event => {
    if (event.type === "rename" && selectedID === event.from) {
      selectedID = event.to;
      renderEditor();
    }
    renderResults();
    if (event.type === "remote" && event.id === selectedID) renderEditor();
    renderInfo();
    renderStatus();
  });
  saver.subscribe(renderStatus);
  sync.subscribe(state => {
    renderStatus();
    if ((state === "idle" || state === "conflict") && repository.hasPendingChanges()) saver.schedule();
  });

  editor.addEventListener("input", () => {
    if (!selectedID) return;
    repository.updateEntryText(selectedID, editor.value);
    saver.schedule();
  });
  for (const name of ["select", "keyup", "pointerup"]) editor.addEventListener(name, renderSelectionAction);
  commandInput.addEventListener("input", handleInput);
  commandInput.addEventListener("keydown", handleKeys);

  window.addEventListener("hashchange", handleLocation);
  window.addEventListener("popstate", event => {
    mobilePane = event.state?.textVaultPane === "content" ? "content" : "list";
    shell.dataset.pane = mobilePane;
    handleLocation();
  });
  window.addEventListener("focus", () => { void sync.pull().catch(() => {}); });
  window.addEventListener("blur", () => {
    if (repository.hasPendingChanges()) void saver.save().catch(() => {});
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && repository.hasPendingChanges()) void saver.save().catch(() => {});
  });
  window.addEventListener("beforeunload", event => {
    if (!repository.hasPendingChanges()) return;
    event.preventDefault();
    event.returnValue = "";
  });

  root.replaceChildren(shell);
  renderResults();
  renderEditor();
  renderStatus();
  commandInput.focus();

  function handleInput() {
    if (commands.state().stage !== "idle") return;
    if (!commandInput.value.startsWith("/")) {
      query = commandInput.value;
      writeQuery(query);
    }
    selectedIndex = 0;
    renderResults();
  }

  function handleKeys(event) {
    if (event.key === "Escape") {
      if (commands.state().stage !== "idle") {
        commands.cancel();
        restoreSearchInput();
      } else if (mobilePane === "content") showList();
      return;
    }
    if (commands.state().stage !== "idle") {
      if (event.key === "Enter") {
        event.preventDefault();
        void submitCommandValue();
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!currentItems.length) return;
      const direction = event.key === "ArrowDown" ? 1 : -1;
      selectedIndex = (selectedIndex + direction + currentItems.length) % currentItems.length;
      renderResults();
      results.querySelector('[aria-selected="true"]')?.scrollIntoView({block: "nearest"});
    }
    if (event.key === "Enter" && event.ctrlKey) {
      event.preventDefault();
      window.open(queryURL(query), "_blank", "noopener");
    }
  }

  async function activateCurrent() {
    const item = currentItems[selectedIndex];
    if (item?.command) {
      try {
        await commands.execute(item.name);
        if (commands.state().stage === "idle") restoreSearchInput();
        else configureCommandInput();
      } catch {
        setMessage("命令执行失败");
      }
      return;
    }
    if (item) {
      await openEntry(item.id);
      return;
    }
    if (commands.search(commandInput.value) !== null) return;
    createNewEntry(query);
  }

  async function submitCommandValue() {
    const value = commandInput.value;
    commandInput.value = "";
    try {
      const result = await commands.submit(value);
      if (!result.ok) setMessage(result.error);
      if (commands.state().stage === "idle") restoreSearchInput();
      else configureCommandInput();
    } catch {
      setMessage("修改状态不确定；刷新后请先尝试新密码");
      restoreSearchInput();
    }
  }

  function configureCommandInput() {
    const state = commands.state();
    commandInput.type = state.inputType;
    commandInput.setAttribute("aria-label", "命令输入");
    commandInput.placeholder = state.prompt;
    commandInput.autocomplete = state.inputType === "password" ? "new-password" : "off";
    commandInput.value = "";
    renderResults();
    commandInput.focus();
  }

  function restoreSearchInput() {
    commandInput.type = "search";
    commandInput.setAttribute("aria-label", "搜索条目");
    commandInput.placeholder = "搜索 IP、域名、客户……";
    commandInput.autocomplete = "off";
    commandInput.value = query;
    renderResults();
    commandInput.focus();
  }

  function createNewEntry(text) {
    const now = new Date().toISOString();
    const entry = {...createEntry({existingIDs: repository.knownIDs(), now}), text, updatedAt: now};
    repository.upsert(entry);
    selectedID = entry.id;
    saver.schedule();
    showContent();
    renderEditor();
    editor.focus();
  }

  async function openEntry(id) {
    try { await sync.pull(); } catch {}
    if (!repository.get(id)) return;
    selectedID = id;
    if (repository.acknowledgeConflict(id)) saver.schedule();
    showContent();
    renderEditor();
    editor.focus();
  }

  function showContent() {
    mobilePane = "content";
    shell.dataset.pane = mobilePane;
    if (matchMedia("(max-width: 719px)").matches && history.state?.textVaultPane !== "content") {
      history.pushState({...history.state, textVaultPane: "content"}, "", location.href);
    }
    renderInfo();
  }

  function showList() {
    mobilePane = "list";
    shell.dataset.pane = mobilePane;
    if (history.state?.textVaultPane === "content") history.back();
    queueMicrotask(() => commandInput.focus());
  }

  function renderResults() {
    const matches = commands.state().stage === "idle" ? commands.search(commandInput.value) : [];
    currentItems = matches === null ? repository.search(query) : matches.map(command => ({...command, command: true}));
    selectedIndex = Math.max(0, Math.min(selectedIndex, currentItems.length - 1));
    results.replaceChildren(...(currentItems.length ? currentItems.map((item, index) => {
      const active = index === selectedIndex;
      return button({type: "button", class: `result${active ? " selected" : ""}`, role: "option", "aria-selected": String(active), "aria-label": item.command ? `${item.name} ${item.description}` : item.snippet, onclick: () => {
        selectedIndex = index;
        if (item.command) void activateCurrent();
        else void openEntry(item.id);
      }}, span({class: "result-main"}, item.command ? item.name : item.snippet), span({class: "result-detail"}, item.command ? item.description : shortDate(item.updatedAt)));
    }) : [p({class: "empty"}, query ? "没有匹配条目，回车新建" : "回车或 + 新建条目")]));
  }

  function renderEditor() {
    const object = selectedID ? repository.get(selectedID) : null;
    editor.disabled = !object;
    editor.value = object?.text ?? "";
    editor.dataset.objectId = object?.id ?? "";
    renderInfo();
  }

  function renderInfo() {
    const object = selectedID ? repository.get(selectedID) : null;
    info.textContent = message || (object ? `${formatMemoTime(object.id)}  ${object.id}` : "未选择条目");
  }

  function setMessage(value) {
    message = value;
    renderInfo();
    setTimeout(() => { if (message === value) { message = ""; renderInfo(); } }, 3000);
  }

  function renderSelectionAction() {
    selectionSearch.hidden = !selectedText(editor);
  }

  function renderStatus() {
    const saveState = saver.status();
    const syncState = sync.status();
    const state = repository.hasQuarantined() || repository.hasConflicts() || saveState === "failed" || saveState === "conflict" || syncState === "failed" || syncState === "conflict"
      ? "failed"
      : saveState === "dirty" || saveState === "saving" ? "dirty" : "clean";
    const label = state === "clean" ? "已保存" : state === "dirty" ? "尚未保存" : "同步失败";
    status.dataset.state = state;
    status.setAttribute("aria-label", label);
    status.title = label;
  }

  function handleLocation() {
    const next = readQuery();
    if (next === query || commands.state().stage !== "idle") return;
    query = next;
    commandInput.value = query;
    selectedIndex = 0;
    renderResults();
  }
}

function mountAuth(title, copy, body) {
  root.replaceChildren(main({class: "auth-shell"}, section({class: "auth-box"}, h1(title), p(copy), body)));
}

function renderAuthMessage(title, copy, retry) {
  mountAuth(title, copy, button({type: "button", onclick: retry}, "重试"));
}

function readQuery() {
  return new URLSearchParams(location.hash.slice(1)).get("q") ?? "";
}

function writeQuery(query) {
  const url = queryURL(query);
  history.replaceState(history.state, "", url);
}

function queryURL(query) {
  const url = new URL(location.href);
  url.hash = query ? new URLSearchParams({q: query}).toString() : "";
  return url.href;
}

function selectedText(editor) {
  return editor.value.slice(editor.selectionStart, editor.selectionEnd).trim();
}

function shortDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : new Intl.DateTimeFormat("zh-CN", {month: "2-digit", day: "2-digit"}).format(date);
}
