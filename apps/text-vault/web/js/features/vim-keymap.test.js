import test from "node:test";
import assert from "node:assert/strict";
import {actionForKey} from "./vim-keymap.js";

test("normal mode translates navigation and mode keys into actions", () => {
  assert.deepEqual(key("j"), {type: "selection/move", offset: 1});
  assert.deepEqual(key("k"), {type: "selection/move", offset: -1});
  assert.deepEqual(key("i"), {type: "entry/edit-start"});
  assert.deepEqual(key("Enter"), {type: "entry/edit-start"});
  assert.deepEqual(key("o"), {type: "entry/add-start"});
  assert.deepEqual(key("/"), {type: "input/search-start"});
  assert.deepEqual(key(":"), {type: "input/command-start"});
});

test("edit and add submit with enter or escape but preserve shift-enter", () => {
  for (const mode of ["edit", "add"]) {
    assert.deepEqual(key("Enter", mode, {targetTag: "TEXTAREA"}), {type: "draft/submit"});
    assert.deepEqual(key("Escape", mode, {targetTag: "TEXTAREA"}), {type: "draft/submit"});
    assert.equal(key("Enter", mode, {targetTag: "TEXTAREA", shiftKey: true}), null);
  }
});

test("search and command retain their distinct input semantics", () => {
  assert.deepEqual(key("Enter", "search", {targetTag: "TEXTAREA"}), {type: "input/block-newline"});
  assert.deepEqual(key("Escape", "search", {targetTag: "TEXTAREA"}), {type: "input/close"});
  assert.deepEqual(key("Enter", "command", {targetTag: "TEXTAREA"}), {type: "command/execute"});
  assert.deepEqual(key("Escape", "command", {targetTag: "TEXTAREA"}), {type: "input/close"});
});

test("normal shortcuts avoid controls and IME while selection search uses a modifier", () => {
  assert.equal(key("j", "normal", {targetTag: "TEXTAREA"}), null);
  assert.equal(key("i", "normal", {targetTag: "INPUT"}), null);
  assert.equal(key("o", "normal", {isComposing: true}), null);
  assert.deepEqual(key("Enter", "normal", {ctrlKey: true}), {type: "selection/search"});
  assert.deepEqual(key("Enter", "normal", {metaKey: true}), {type: "selection/search"});
});

function key(value, mode = "normal", overrides = {}) {
  return actionForKey({key: value, targetTag: "BODY", ...overrides}, mode);
}
