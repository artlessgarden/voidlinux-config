import test from "node:test";
import assert from "node:assert/strict";
import {createQueryLocation} from "./query-location.js";

test("query location reads and writes only the q fragment", () => {
  const browser = fakeBrowser("https://vault.test/path?keep=yes#q=Example%20COM");
  const query = createQueryLocation(browser);

  assert.equal(query.read(), "Example COM");
  assert.equal(query.url("new tab"), "https://vault.test/path?keep=yes#q=new+tab");
  query.write("客户 A");
  assert.equal(browser.replaced.href, "https://vault.test/path?keep=yes#q=%E5%AE%A2%E6%88%B7+A");
  assert.deepEqual(browser.replaced.state, {pane: "keep"});

  query.write("");
  assert.equal(browser.replaced.href, "https://vault.test/path?keep=yes");
});

test("query location publishes hash changes and removes its listener", () => {
  const browser = fakeBrowser("https://vault.test/#q=first");
  const query = createQueryLocation(browser);
  const values = [];
  query.subscribe(value => values.push(value));

  browser.location.hash = "#q=second";
  browser.emit();
  assert.deepEqual(values, ["second"]);

  query.destroy();
  browser.location.hash = "#q=third";
  browser.emit();
  assert.deepEqual(values, ["second"]);
});

function fakeBrowser(href) {
  let listener = null;
  const location = {href, hash: new URL(href).hash};
  const browser = {
    location,
    history: {
      state: {pane: "keep"},
      replaceState(state, _unused, next) { browser.replaced = {state, href: String(next)}; },
    },
    addEventListener(_name, callback) { listener = callback; },
    removeEventListener(_name, callback) { if (listener === callback) listener = null; },
    emit() { listener?.(); },
    replaced: null,
  };
  return browser;
}
