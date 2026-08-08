// ==UserScript==
// @name         bilibili 页面净化大师
// @namespace    qute-local
// @version      4.5.5
// @description  qute 适配：JSON 存储 + 页内菜单（上游 festoney8/bilibili-cleaner）
// @license      MIT
// @homepage     https://github.com/festoney8/bilibili-cleaner
// @match        *://*.bilibili.com/*
// @exclude      *://message.bilibili.com/pages/nav/header_sync
// @exclude      *://message.bilibili.com/pages/nav/index_new_pc_sync
// @exclude      *://data.bilibili.com/*
// @exclude      *://cm.bilibili.com/*
// @exclude      *://shop.bilibili.com/*
// @exclude      *://link.bilibili.com/*
// @exclude      *://passport.bilibili.com/*
// @exclude      *://api.bilibili.com/*
// @exclude      *://api.*.bilibili.com/*
// @exclude      *://*.chat.bilibili.com/*
// @exclude      *://member.bilibili.com/*
// @exclude      *://www.bilibili.com/tensou/*
// @exclude      *://www.bilibili.com/correspond/*
// @exclude      *://live.bilibili.com/p/html/*
// @exclude      *://live.bilibili.com/live-room-play-game-together
// @exclude      *://www.bilibili.com/blackboard/comment-detail.html*
// @exclude      *://www.bilibili.com/blackboard/newplayer.html*
// @exclude      *://www.bilibili.com/appeal/*
// @exclude      *://www.bilibili.com/toy/*
// @require      https://cdn.jsdelivr.net/npm/vue@3.5.40/dist/vue.global.prod.js
// @grant        GM_addValueChangeListener
// @grant        GM_deleteValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_registerMenuCommand
// @grant        GM_removeValueChangeListener
// @grant        GM_setValue
// @grant        unsafeWindow
// @run-at       document-start
// @qute-no-proxy
// ==/UserScript==

(function () {
  const prefix =
    typeof _qute_script_id !== "undefined" ? _qute_script_id : "__gm_bili_cleaner/";

  const parse = (raw, fallback) => {
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  };

  const listeners = new Map();
  let nextListenerId = 1;
  const menuItems = [];

  const fire = (key, oldValue, newValue, remote) => {
    for (const rec of listeners.values()) {
      if (rec.key !== key) continue;
      try {
        rec.cb(key, oldValue, newValue, remote);
      } catch (_) {}
    }
  };

  GM_setValue = function (key, value) {
    const sk = prefix + key;
    const oldValue = parse(localStorage.getItem(sk), undefined);
    localStorage.setItem(sk, JSON.stringify(value));
    fire(key, oldValue, value, false);
  };

  GM_getValue = function (key, def) {
    const raw = localStorage.getItem(prefix + key);
    if (raw == null) return def;
    return parse(raw, def);
  };

  GM_deleteValue = function (key) {
    localStorage.removeItem(prefix + key);
  };

  GM_listValues = function () {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k.slice(prefix.length));
    }
    return keys;
  };

  GM_addValueChangeListener = function (key, cb) {
    const id = nextListenerId++;
    listeners.set(id, { key, cb });
    return id;
  };

  GM_removeValueChangeListener = function (id) {
    listeners.delete(id);
  };

  window.addEventListener("storage", (e) => {
    if (!e.key || !e.key.startsWith(prefix)) return;
    const key = e.key.slice(prefix.length);
    fire(key, parse(e.oldValue, undefined), parse(e.newValue, undefined), true);
  });

  GM_registerMenuCommand = function (caption, fn) {
    menuItems.push({ caption, fn });
    return menuItems.length;
  };

  const mountMenu = () => {
    if (!menuItems.length || !document.body) return;
    if (document.getElementById("qute-bili-cleaner-menu")) return;
    const wrap = document.createElement("div");
    wrap.id = "qute-bili-cleaner-menu";
    wrap.style.cssText =
      "position:fixed;left:10px;bottom:12px;z-index:2147483646;font:13px/1.3 sans-serif;";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "净化";
    btn.style.cssText =
      "padding:5px 10px;border:0;border-radius:8px;background:#00aeec;color:#fff;cursor:pointer;opacity:.9;";
    const list = document.createElement("div");
    list.style.cssText =
      "display:none;margin-bottom:6px;background:#fff;color:#111;border-radius:8px;overflow:hidden;min-width:168px;box-shadow:0 4px 16px #0003;";
    for (const item of menuItems) {
      const row = document.createElement("button");
      row.type = "button";
      row.textContent = item.caption;
      row.style.cssText =
        "display:block;width:100%;text-align:left;padding:8px 12px;border:0;background:transparent;cursor:pointer;font:inherit;";
      row.addEventListener("mouseenter", () => {
        row.style.background = "#e8f6fc";
      });
      row.addEventListener("mouseleave", () => {
        row.style.background = "transparent";
      });
      row.addEventListener("click", (ev) => {
        ev.stopPropagation();
        list.style.display = "none";
        try {
          item.fn();
        } catch (err) {
          console.error(err);
        }
      });
      list.appendChild(row);
    }
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      list.style.display = list.style.display === "none" ? "block" : "none";
    });
    document.addEventListener("click", () => {
      list.style.display = "none";
    });
    wrap.appendChild(list);
    wrap.appendChild(btn);
    document.body.appendChild(wrap);
  };

  const waitMenu = () => {
    if (menuItems.length) {
      if (document.body) mountMenu();
      else document.addEventListener("DOMContentLoaded", mountMenu);
      setTimeout(mountMenu, 400);
      setTimeout(mountMenu, 2000);
      return;
    }
    setTimeout(waitMenu, 250);
  };
  setTimeout(waitMenu, 0);

  const attachRoot = () => {
    const el = document.getElementById("bili-cleaner");
    const body = document.body;
    if (el && body && el.parentNode !== body) body.appendChild(el);
  };
  document.addEventListener("DOMContentLoaded", attachRoot);
  setTimeout(attachRoot, 500);
  setTimeout(attachRoot, 2000);
})();
