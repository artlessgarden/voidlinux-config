/* 视口内可点元素 → data-qute-cid（给 f 用）。偏快：少算 style、跳过已标记子树。 */
(function () {
  document.querySelectorAll("[data-qute-cid]").forEach((el) => {
    delete el.dataset.quteCid;
  });

  const SKIP_SEL = "script,style,noscript,svg,math,.qute-live-trans";
  const BASE =
    'a[href],area[href],button,summary,label,select,textarea,' +
    'input:not([type="hidden"]),[role="button"],[role="link"],[role="tab"],' +
    '[role="checkbox"],[role="radio"],[role="switch"],[role="menuitem"],' +
    '[role="option"],[role="combobox"],[role="textbox"],[role="searchbox"],' +
    '[onclick],[onmousedown],[jsaction],[data-href],[data-url],[data-link],' +
    '[contenteditable]:not([contenteditable="false"]),[tabindex]:not([tabindex="-1"]),' +
    "[aria-haspopup]";

  let cid = 0;
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  function inView(el) {
    const r = el.getBoundingClientRect();
    return r.width >= 2 && r.height >= 2 &&
      r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw;
  }

  function mark(el) {
    if (!el || el.dataset.quteCid) return;
    if (el.closest(SKIP_SEL)) return;
    if (!inView(el)) return;
    el.dataset.quteCid = String(++cid);
  }

  try {
    document.querySelectorAll(BASE).forEach(mark);
  } catch (e) {}

  // cursor:pointer：祖先已标记则整棵跳过
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(el) {
        if (el.closest(SKIP_SEL)) return NodeFilter.FILTER_REJECT;
        if (el.parentElement && el.parentElement.closest("[data-qute-cid]")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );
  let node;
  while ((node = walker.nextNode())) {
    if (!inView(node)) continue;
    let st;
    try {
      st = window.getComputedStyle(node);
    } catch (e) {
      continue;
    }
    if (st.pointerEvents === "none" || st.visibility === "hidden" || st.display === "none") {
      continue;
    }
    if (st.cursor === "pointer") mark(node);
  }

  // 只留最内层
  document.querySelectorAll("[data-qute-cid]").forEach((el) => {
    if (el.querySelector("[data-qute-cid]")) delete el.dataset.quteCid;
  });

  return cid;
})();
