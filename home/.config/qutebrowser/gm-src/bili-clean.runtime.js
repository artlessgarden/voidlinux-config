(function () {
  if (window.__biliQute) return;
  window.__biliQute = true;

  const KEY = "bili-clean-qute";
  const DARK_KEY = "bili-clean-dark";
  const TRACK = [
    "from_source", "spm_id_from", "search_source", "vd_source", "unique_k",
    "is_story_h5", "from_spmid", "share_plat", "share_medium", "share_from",
    "share_source", "share_tag", "timestamp", "launch_id", "session_id",
    "share_session_id", "broadcast_type", "spmid", "plat_id", "trackid",
    "track_id", "visit_id", "buvid",
  ];

  const load = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch (_) {
      return {};
    }
  };
  const save = (st) => localStorage.setItem(KEY, JSON.stringify(st));
  const st = load();
  const isOn = (r) => (r.id in st ? !!st[r.id] : !!r.def);

  const apply = () => {
    for (const r of RULES) {
      if (r.noStyle) continue;
      if (isOn(r)) document.documentElement.setAttribute(r.id, "");
      else document.documentElement.removeAttribute(r.id);
    }
  };

  const style = document.createElement("style");
  style.id = "bili-qute-css";
  style.textContent = CSS;
  (document.head || document.documentElement).appendChild(style);
  apply();

  if (localStorage.getItem(DARK_KEY) === "1") {
    document.documentElement.setAttribute("lab-style", "dark");
  }

  const cleanUrl = () => {
    const r = RULES.find((x) => x.id === "url-cleaner");
    if (!r || !isOn(r)) return;
    try {
      const u = new URL(location.href);
      let n = 0;
      for (const k of TRACK) if (u.searchParams.has(k)) {
        u.searchParams.delete(k);
        n++;
      }
      if (n) history.replaceState(history.state, "", u.pathname + u.search + u.hash);
    } catch (_) {}
  };
  cleanUrl();

  const toggleDark = () => {
    const on = document.documentElement.getAttribute("lab-style") === "dark";
    if (on) {
      document.documentElement.removeAttribute("lab-style");
      localStorage.setItem(DARK_KEY, "0");
    } else {
      document.documentElement.setAttribute("lab-style", "dark");
      localStorage.setItem(DARK_KEY, "1");
    }
  };

  let box;
  const renderList = (q) => {
    const host = box.querySelector("[data-list]");
    host.textContent = "";
    const qq = (q || "").trim().toLowerCase();
    for (const r of RULES) {
      if (qq && !(`${r.name} ${r.id}`).toLowerCase().includes(qq)) continue;
      const row = document.createElement("label");
      row.style.cssText =
        "display:flex;gap:8px;align-items:flex-start;padding:5px 8px;cursor:pointer;font:13px/1.35 sans-serif;";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = isOn(r);
      cb.addEventListener("change", () => {
        st[r.id] = cb.checked;
        save(st);
        apply();
        if (r.id === "url-cleaner") cleanUrl();
      });
      const span = document.createElement("span");
      span.textContent = r.name;
      row.append(cb, span);
      host.appendChild(row);
    }
  };

  const mount = () => {
    if (!document.body || box) return;
    const wrap = document.createElement("div");
    wrap.id = "bili-qute-wrap";
    wrap.style.cssText =
      "position:fixed;left:10px;bottom:12px;z-index:2147483646;font:13px sans-serif;";
    const btn = document.createElement("button");
    btn.id = "bili-qute-btn";
    btn.type = "button";
    btn.textContent = "净化";
    btn.style.cssText =
      "padding:5px 10px;border:0;border-radius:8px;background:#00aeec;color:#fff;cursor:pointer;";
    box = document.createElement("div");
    box.style.cssText =
      "display:none;margin-bottom:8px;width:min(360px,calc(100vw - 24px));max-height:min(70vh,560px);overflow:auto;background:#fff;color:#111;border-radius:10px;box-shadow:0 8px 24px #0003;";
    box.innerHTML =
      '<div style="position:sticky;top:0;background:#fff;padding:8px;border-bottom:1px solid #eee;display:flex;gap:6px;flex-wrap:wrap">' +
      '<input data-q placeholder="搜索功能" style="flex:1;min-width:120px;padding:4px 8px">' +
      '<button type="button" data-dark>夜间</button>' +
      '<button type="button" data-reset>恢复默认</button></div>' +
      '<div data-list></div>';
    box.querySelector("[data-q]").addEventListener("input", (e) => renderList(e.target.value));
    box.querySelector("[data-dark]").addEventListener("click", toggleDark);
    box.querySelector("[data-reset]").addEventListener("click", () => {
      localStorage.removeItem(KEY);
      for (const k of Object.keys(st)) delete st[k];
      apply();
      renderList(box.querySelector("[data-q]").value);
    });
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const show = box.style.display === "none";
      box.style.display = show ? "block" : "none";
      if (show) renderList(box.querySelector("[data-q]").value);
    });
    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) box.style.display = "none";
    });
    wrap.append(box, btn);
    document.body.appendChild(wrap);
    renderList("");
  };

  window.__biliQuteToggle = () => {
    const b = document.getElementById("bili-qute-btn");
    if (b) b.click();
    else {
      mount();
      const n = document.getElementById("bili-qute-btn");
      if (n) n.click();
    }
  };

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
  setTimeout(mount, 800);
})();
