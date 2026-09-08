import test from "node:test";
import assert from "node:assert/strict";
import {createModes} from "../../web/js/modes.js";

test("edit escape emits only changed text and returns to normal", () => {
  const modes = createModes();
  modes.enterEdit("268t00000", "before");
  assert.equal(modes.state().name, "edit");
  modes.setDraft("after");

  assert.deepEqual(modes.escape(), {type: "edit", id: "268t00000", text: "after"});
  assert.equal(modes.state().name, "normal");

  modes.enterEdit("268t00000", "after");
  assert.deepEqual(modes.escape(), {type: "none"});
});

test("add escape preserves text but discards a whitespace-only entry", () => {
  const modes = createModes();
  modes.enterAdd();
  modes.setDraft("  line one\nline two  ");
  assert.deepEqual(modes.escape(), {type: "add", text: "  line one\nline two  "});

  modes.enterAdd();
  modes.setDraft(" \n ");
  assert.deepEqual(modes.escape(), {type: "cancel"});
});

test("search strips its marker and escape preserves the current query", () => {
  const modes = createModes();
  modes.enterSearch("old query");
  assert.equal(modes.state().draft, "/old query");
  modes.setDraft("/new query");

  assert.deepEqual(modes.escape(), {type: "search", query: "new query"});
  assert.deepEqual(modes.state(), {name: "normal", id: "", original: "", draft: "", query: "new query"});
});

test("command mode recognizes password change without handling passwords", () => {
  const modes = createModes();
  modes.enterCommand();
  assert.equal(modes.state().draft, ":");
  assert.deepEqual(modes.executeCommand(":changepwd"), {type: "change-password"});
  assert.equal(modes.state().name, "normal");

  modes.enterCommand();
  assert.deepEqual(modes.executeCommand(":unknown"), {type: "error", message: "未知命令"});
  assert.equal(modes.state().name, "command");
  assert.deepEqual(modes.escape(), {type: "cancel"});
});
