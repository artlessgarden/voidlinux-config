// ==UserScript==
// @name         bilibili-ip (qute)
// @namespace    qute-local
// @version      0.2.0
// @description  B 站评论显示 IP 属地（钩 unsafeWindow，适配 qute greasemonkey）
// @match        https://www.bilibili.com/video/*
// @match        https://www.bilibili.com/list/*
// @match        https://www.bilibili.com/bangumi/play/*
// @match        https://www.bilibili.com/cheese/play/*
// @match        https://www.bilibili.com/festival/*
// @match        https://www.bilibili.com/opus/*
// @match        https://www.bilibili.com/read/*
// @match        https://t.bilibili.com/*
// @match        https://space.bilibili.com/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(() => {
  "use strict";
  // qute 把脚本包在 Proxy 里：必须改 unsafeWindow，改 window 无效
  const uw = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  const locMap = new Map();

  const locOf = (item) => {
    if (!item || typeof item !== "object") return "";
    return item.reply_control?.location || item.location || "";
  };

  const takeLoc = (item) => {
    if (!item || typeof item !== "object") return;
    const rpid = item.rpid ?? item.rp_id;
    const loc = locOf(item);
    if (rpid != null && loc) locMap.set(String(rpid), loc);
    (item.replies || item.reply_reply || []).forEach(takeLoc);
  };

  const harvest = (data) => {
    try {
      if (!data || typeof data !== "object") return;
      const root = data.data ?? data;
      (root.replies || []).forEach(takeLoc);
      (root.top_replies || []).forEach(takeLoc);
      if (root.upper?.top) takeLoc(root.upper.top);
      if (Array.isArray(root)) root.forEach(takeLoc);
      if (locMap.size) schedulePaint();
    } catch (_) {}
  };

  const isReplyUrl = (url) => /\/x\/v2\/reply/.test(String(url || ""));

  // —— fetch / XHR（页面真实对象）——
  try {
    const rawFetch = uw.fetch.bind(uw);
    uw.fetch = function (input, init) {
      const url = typeof input === "string" ? input : input && input.url;
      const p = rawFetch(input, init);
      if (url && isReplyUrl(url)) {
        p.then((res) => {
          res.clone().json().then(harvest).catch(() => {});
        }).catch(() => {});
      }
      return p;
    };
  } catch (_) {}

  try {
    const XO = uw.XMLHttpRequest.prototype.open;
    const XS = uw.XMLHttpRequest.prototype.send;
    uw.XMLHttpRequest.prototype.open = function (method, url) {
      this.__bili_ip_url = url;
      return XO.apply(this, arguments);
    };
    uw.XMLHttpRequest.prototype.send = function () {
      this.addEventListener("load", function () {
        try {
          if (!isReplyUrl(this.__bili_ip_url)) return;
          harvest(JSON.parse(this.responseText));
        } catch (_) {}
      });
      return XS.apply(this, arguments);
    };
  } catch (_) {}

  // —— 新版 Lit 评论：补丁 action-buttons 的 update ——
  const injectLit = (host) => {
    try {
      const root = host.shadowRoot;
      if (!root) return;
      const pub = root.querySelector("#pubdate");
      if (!pub) return;
      const loc = locOf(host.data) || locMap.get(String(host.data?.rpid || ""));
      let el = root.querySelector("#location, .bili-ip-qute");
      if (!loc) {
        if (el) el.remove();
        return;
      }
      if (el) {
        el.textContent = loc;
        return;
      }
      el = document.createElement("div");
      el.id = "location";
      el.className = "bili-ip-qute";
      el.textContent = loc;
      el.style.cssText = "opacity:.75;font-size:12px;margin-top:2px;";
      pub.insertAdjacentElement("afterend", el);
    } catch (_) {}
  };

  const patchActionButtons = (Ctor) => {
    if (!Ctor?.prototype || Ctor.__bili_ip_patched) return Ctor;
    const raw = Ctor.prototype.update;
    if (typeof raw !== "function") return Ctor;
    Ctor.prototype.update = function () {
      const ret = raw.apply(this, arguments);
      try {
        injectLit(this);
      } catch (_) {}
      return ret;
    };
    Ctor.__bili_ip_patched = true;
    return Ctor;
  };

  try {
    const ce = uw.customElements;
    const rawDefine = ce.define.bind(ce);
    ce.define = function (name, ctor, options) {
      if (name === "bili-comment-action-buttons-renderer") {
        ctor = patchActionButtons(ctor);
      }
      return rawDefine(name, ctor, options);
    };
  } catch (_) {}

  // 若组件已经 define 过，再补一刀
  const tryPatchExisting = () => {
    try {
      const ctor = uw.customElements.get("bili-comment-action-buttons-renderer");
      if (ctor) patchActionButtons(ctor);
    } catch (_) {}
  };

  // —— 旧版 DOM / 通用扫影 DOM ——
  const paintShadow = (root) => {
    if (!root) return;
    root.querySelectorAll("*").forEach((el) => {
      if (el.shadowRoot) {
        // 已挂载的 action-buttons
        if (el.localName === "bili-comment-action-buttons-renderer") {
          injectLit(el);
        }
        paintShadow(el.shadowRoot);
      }
    });
  };

  const paintLegacy = () => {
    document.querySelectorAll(".reply-item, .sub-reply-item").forEach((el) => {
      try {
        const props =
          el.__vueParentComponent?.props ||
          el.__vue__?.vnode?.props ||
          el.__vue__?.props;
        const reply = props?.reply || props?.subReply;
        const loc = locOf(reply) || locMap.get(String(reply?.rpid || ""));
        if (!loc) return;
        const info =
          el.querySelector(".reply-info, .sub-reply-info") || el;
        if ((info.textContent || "").includes("IP属地")) return;
        if (info.querySelector(".bili-ip-qute")) return;
        const span = document.createElement("span");
        span.className = "bili-ip-qute";
        span.style.cssText = "margin-left:.5em;opacity:.75;font-size:12px;";
        span.textContent = loc;
        (info.children[0] || info).appendChild(span);
      } catch (_) {}
    });
  };

  let timer = 0;
  const schedulePaint = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      tryPatchExisting();
      paintLegacy();
      paintShadow(document);
    }, 300);
  };

  const boot = () => {
    tryPatchExisting();
    schedulePaint();
    new MutationObserver(schedulePaint).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
