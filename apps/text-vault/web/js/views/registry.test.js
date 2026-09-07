import test from "node:test";
import assert from "node:assert/strict";
import {createViewRegistry} from "./registry.js";

test("registry mounts a renderer and cleans it before replacement", () => {
  const events = [];
  const registry = createViewRegistry({
    river: context => { events.push(["mount", context.value]); return () => events.push(["clean", context.value]); },
  });

  registry.mount({type: "river"}, {value: 1});
  registry.mount({type: "river"}, {value: 2});
  registry.destroy();

  assert.deepEqual(events, [["mount", 1], ["clean", 1], ["mount", 2], ["clean", 2]]);
});

test("registry rejects an unknown renderer explicitly", () => {
  const registry = createViewRegistry({river: () => () => {}});
  assert.throws(() => registry.mount({type: "map"}, {}), /unknown view renderer: map/);
});
