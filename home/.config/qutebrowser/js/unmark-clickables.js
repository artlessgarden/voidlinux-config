/* 清 data-qute-cid */
(function () {
  document.querySelectorAll("[data-qute-cid]").forEach((el) => {
    delete el.dataset.quteCid;
  });
  return "unmarked";
})();
