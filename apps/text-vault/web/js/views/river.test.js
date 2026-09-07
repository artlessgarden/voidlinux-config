import test from "node:test";
import assert from "node:assert/strict";
import {selectedSearchText} from "./river.js";

test("river normalizes a browser selection before opening a query", () => {
  assert.equal(selectedSearchText("  server.example.com\n"), "server.example.com");
  assert.equal(selectedSearchText(" \n "), "");
});
