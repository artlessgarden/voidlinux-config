/* remove .qute-word wrappers, keep text */
(function () {
  document.querySelectorAll("span.qute-word").forEach((el) => {
    el.replaceWith(document.createTextNode(el.textContent || ""));
  });
  delete document.documentElement.dataset.quteWordsWrapped;
  delete document.documentElement.dataset.quteWordsCount;
  return "unwrapped";
})();
