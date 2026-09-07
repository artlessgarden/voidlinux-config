import van from "../vendor/van-1.6.1.js";
import {APIError, createAPI} from "./api.js";
import {createVault, deriveServerCredential, unlockVault} from "./crypto.js";
import {decryptSnapshot} from "./load.js";
import {createRepository} from "./repository.js";
import {renderRiverApplication} from "./river.js";
import {createSaveCoordinator} from "./save.js";
import {createSyncCoordinator} from "./sync.js";
import {createTabSession} from "./tab-session.js";

const {button, form, h1, input, label, main, p, section} = van.tags;
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

  // Another unlocked tab can hand over its in-memory key. Nothing secret is
  // written to persistent browser storage.
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
    repository,
    api,
    key,
    generation: snapshot.manifest?.generation ?? 0,
    beforeSave: () => sync.pull(),
    onGeneration: generation => sync.setGeneration(generation),
  });
  sync = createSyncCoordinator({
    repository,
    api,
    key,
    generation: snapshot.manifest?.generation ?? 0,
    onGeneration: generation => saver.setGeneration(generation),
  });

  tabSession.offer({key, csrfToken: api.csrfToken()});
  tabSession.subscribe(session => api.setCSRFToken(session.csrfToken));
  renderRiverApplication({root, repository, saver, sync, key, api, tabSession});
  sync.start();
}

function mountAuth(title, copy, body) {
  root.replaceChildren(main({class: "auth-shell"}, section({class: "auth-box"}, h1(title), p(copy), body)));
}

function renderAuthMessage(title, copy, retry) {
  mountAuth(title, copy, button({type: "button", onclick: retry}, "重试"));
}
