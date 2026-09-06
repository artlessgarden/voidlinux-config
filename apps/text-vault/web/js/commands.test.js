import test from "node:test";
import assert from "node:assert/strict";
import {createCommands} from "./commands.js";

test("slash input searches only the two registered commands", () => {
  const commands = createCommands({save: async () => {}, changePassword: async () => {}});
  assert.equal(commands.search("domain"), null);
  assert.deepEqual(commands.search("/s").map(item => item.name), ["/s"]);
  assert.deepEqual(commands.search("/change").map(item => item.name), ["/changepwd"]);
  assert.deepEqual(commands.search("/").map(item => item.name), ["/s", "/changepwd"]);
});

test("save command uses the supplied global save action", async () => {
  let saves = 0;
  const commands = createCommands({save: async () => { saves += 1; }, changePassword: async () => {}});
  await commands.execute("/s");
  assert.equal(saves, 1);
  assert.equal(commands.state().stage, "idle");
});

test("password command repeats and confirms the new password", async () => {
  const changed = [];
  const commands = createCommands({save: async () => {}, changePassword: async value => changed.push(value)});
  await commands.execute("/changepwd");
  assert.deepEqual(commands.state(), {stage: "new-password", inputType: "password", prompt: "新密码"});
  assert.equal((await commands.submit("a sufficiently long password")).ok, true);
  assert.equal(commands.state().stage, "repeat-password");
  assert.equal((await commands.submit("different sufficiently long")).ok, false);
  assert.equal(commands.state().stage, "new-password");
  await commands.submit("a sufficiently long password");
  await commands.submit("a sufficiently long password");
  assert.deepEqual(commands.state(), {stage: "confirm", inputType: "text", prompt: "确认修改？y/N"});
  await commands.submit("y");
  assert.deepEqual(changed, ["a sufficiently long password"]);
  assert.equal(commands.state().stage, "idle");
});

test("password command cancels without changing anything", async () => {
  let changed = false;
  const commands = createCommands({save: async () => {}, changePassword: async () => { changed = true; }});
  await commands.execute("/changepwd");
  await commands.submit("a sufficiently long password");
  await commands.submit("a sufficiently long password");
  await commands.submit("n");
  assert.equal(changed, false);
  assert.equal(commands.state().stage, "idle");
});
