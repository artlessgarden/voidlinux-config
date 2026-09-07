import test from "node:test";
import assert from "node:assert/strict";
import {nextIndex, selectedSearchText} from "./river.js";

test("j and k navigation stops at river boundaries", () => {
  assert.equal(nextIndex(0, 3, -1), 0);
  assert.equal(nextIndex(0, 3, 1), 1);
  assert.equal(nextIndex(2, 3, 1), 2);
  assert.equal(nextIndex(4, 0, -1), -1);
});

test("selected search shortcut accepts control or command enter", () => {
  assert.equal(selectedSearchText("  server.example.com\n"), "server.example.com");
  assert.equal(selectedSearchText("  \n"), "");
});
