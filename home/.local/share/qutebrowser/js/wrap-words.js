/* wrap text → .qute-word：只按空白/标点分块（中英文连写算一块） */
(function () {
  if (document.documentElement.dataset.quteWordsWrapped === "1") return "already";

  const SKIP =
    "script,style,noscript,textarea,input,select,option,code,pre,kbd,svg,math,.qute-word,.qute-live-trans";
  // 连续非空白、非标点 → 一块（Hello世界 / 纯中文 / 纯英文都一样）
  const TOKEN_RE =
    /[^\s，。！？；：、…—·「」『』（）【】《》〈〉,.!?;:'"“”‘’()[\]{}<>\/\\|@#$%^&*+=~`]+/gu;

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

  document.documentElement.dataset.quteWordsWrapped = "1";
  document.documentElement.dataset.quteWordsCount = String(wid);
  return wid;
})();
