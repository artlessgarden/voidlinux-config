/* wrap text → .qute-word：按空白/标点分块；合并被 DOM 拆开的相邻字 */
(function () {
  if (document.documentElement.dataset.quteWordsWrapped === "1") return "already";

  const SKIP =
    "script,style,noscript,textarea,input,select,option,code,pre,kbd,svg,math,.qute-word,.qute-live-trans";
  const TOKEN_RE =
    /[^\s，。！？；：、…—·「」『』（）【】《》〈〉,.!?;:'"“”‘’()[\]{}<>\/\\|@#$%^&*+=~`]+/gu;
  // 中间只有这些 → 不算「粘在一起」，不合并
  const HAS_SEP = /[\s，。！？；：、…—·「」『』（）【】《》〈〉,.!?;:'"“”‘’()[\]{}<>\/\\|@#$%^&*+=~`]/u;

  let wid = 0;
  const texts = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !/\S/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
      const p = node.parentElement;
      if (!p || p.closest(SKIP)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  while (walker.nextNode()) texts.push(walker.currentNode);

  for (const node of texts) {
    const s = node.nodeValue;
    TOKEN_RE.lastIndex = 0;
    let m;
    let last = 0;
    const frag = document.createDocumentFragment();
    let any = false;
    while ((m = TOKEN_RE.exec(s))) {
      any = true;
      if (m.index > last) {
        frag.appendChild(document.createTextNode(s.slice(last, m.index)));
      }
      const span = document.createElement("span");
      span.className = "qute-word";
      span.dataset.quteWid = String(++wid);
      span.textContent = m[0];
      frag.appendChild(span);
      last = m.index + m[0].length;
    }
    if (!any) continue;
    if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
    node.parentNode.replaceChild(frag, node);
  }

  // 很多站每个汉字一个节点，必须按文档顺序把「中间没有空白/标点」的块粘回去
  function textBetween(a, b) {
    try {
      const r = document.createRange();
      r.setStartAfter(a);
      r.setEndBefore(b);
      return r.toString();
    } catch (e) {
      return null;
    }
  }

  const words = Array.from(document.querySelectorAll("span.qute-word"));
  let i = 0;
  while (i < words.length) {
    const cur = words[i];
    if (!cur.isConnected) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < words.length) {
      const nxt = words[j];
      if (!nxt.isConnected) {
        j++;
        continue;
      }
      const mid = textBetween(cur, nxt);
      if (mid === null || HAS_SEP.test(mid)) break;
      cur.textContent += nxt.textContent;
      nxt.remove();
      j++;
    }
    i = j > i ? j : i + 1;
  }

  wid = 0;
  document.querySelectorAll("span.qute-word").forEach((el) => {
    el.dataset.quteWid = String(++wid);
  });

  document.documentElement.dataset.quteWordsWrapped = "1";
  document.documentElement.dataset.quteWordsCount = String(wid);
  return wid;
})();
