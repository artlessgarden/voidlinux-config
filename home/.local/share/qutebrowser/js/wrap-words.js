/* wrap text → .qute-word：英文按词；中文只按空格分（连续汉字一块） */
(function () {
  if (document.documentElement.dataset.quteWordsWrapped === "1") return "already";

  const SKIP =
    "script,style,noscript,textarea,input,select,option,code,pre,kbd,svg,math,.qute-word,.qute-live-trans";
  const LATIN_RE = /[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*/g;
  const CJK_RE = /[\u4e00-\u9fff]/;

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

  function addWord(frag, text) {
    if (!text) return;
    const span = document.createElement("span");
    span.className = "qute-word";
    span.dataset.quteWid = String(++wid);
    span.textContent = text;
    frag.appendChild(span);
  }

  function addText(frag, text) {
    if (text) frag.appendChild(document.createTextNode(text));
  }

  /** 无汉字：按英文词切；有汉字：整段（空格分开的一块）一个 hint */
  function wrapChunk(frag, chunk) {
    if (!CJK_RE.test(chunk)) {
      LATIN_RE.lastIndex = 0;
      let m;
      let last = 0;
      let any = false;
      while ((m = LATIN_RE.exec(chunk))) {
        any = true;
        addText(frag, chunk.slice(last, m.index));
        addWord(frag, m[0]);
        last = m.index + m[0].length;
      }
      if (!any) addText(frag, chunk);
      else addText(frag, chunk.slice(last));
      return;
    }
    addWord(frag, chunk);
  }

  for (const node of texts) {
    const s = node.nodeValue;
    const frag = document.createDocumentFragment();
    const parts = s.split(/(\s+)/);
    let any = false;
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        addText(frag, part);
        continue;
      }
      any = true;
      wrapChunk(frag, part);
    }
    if (!any) continue;
    node.parentNode.replaceChild(frag, node);
  }

  document.documentElement.dataset.quteWordsWrapped = "1";
  document.documentElement.dataset.quteWordsCount = String(wid);
  return wid;
})();
