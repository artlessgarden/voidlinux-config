import test from "node:test";
import assert from "node:assert/strict";
import {modeForKey, nextIndex, selectedSearchText} from "./river.js";

test("j and k navigation stops at river boundaries", () => {
  assert.equal(nextIndex(0, 3, -1), 0);
  assert.equal(nextIndex(0, 3, 1), 1);
  assert.equal(nextIndex(2, 3, 1), 2);
  assert.equal(nextIndex(4, 0, -1), -1);
});

test("normal mode maps vim keys but ignores text controls and composition", () => {
  assert.equal(modeForKey({key: "j", targetTag: "BODY"}), "next");
  assert.equal(modeForKey({key: "k", targetTag: "DIV"}), "previous");
  assert.equal(modeForKey({key: "i", targetTag: "BODY"}), "edit");
  assert.equal(modeForKey({key: "Enter", targetTag: "BODY"}), "edit");
  assert.equal(modeForKey({key: "o", targetTag: "BODY"}), "add");
  assert.equal(modeForKey({key: "/", targetTag: "BODY"}), "search");
  assert.equal(modeForKey({key: ":", targetTag: "BODY"}), "command");
  assert.equal(modeForKey({key: "j", targetTag: "TEXTAREA"}), null);
  assert.equal(modeForKey({key: "i", targetTag: "INPUT"}), null);
  assert.equal(modeForKey({key: "o", targetTag: "BODY", isComposing: true}), null);
});

test("selected search shortcut accepts control or command enter", () => {
  assert.equal(modeForKey({key: "Enter", targetTag: "BODY", ctrlKey: true}), "search-selection");
  assert.equal(modeForKey({key: "Enter", targetTag: "BODY", metaKey: true}), "search-selection");
  assert.equal(selectedSearchText("  server.example.com\n"), "server.example.com");
  assert.equal(selectedSearchText("  \n"), "");
});
