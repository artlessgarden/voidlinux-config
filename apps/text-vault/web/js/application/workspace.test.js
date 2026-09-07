import test from "node:test";
import assert from "node:assert/strict";
import {createRepository} from "../repository.js";
import {createWorkspace} from "./workspace.js";

const first = entry("268t00000", "客户A", "2026-08-29T00:00:00.000Z");
const second = entry("268t00001", "客户B example.com", "2026-08-29T01:00:00.000Z");

test("workspace derives query results and owns bounded selection", async () => {
  const {workspace} = setup([second, first]);
  assert.deepEqual(workspace.snapshot().entries.map(value => value.id), [first.id, second.id]);
  assert.equal(workspace.snapshot().selectedId, first.id);

  await workspace.dispatch({type: "selection/move", offset: 1});
  await workspace.dispatch({type: "selection/move", offset: 1});
  assert.equal(workspace.snapshot().selectedId, second.id);

  await workspace.dispatch({type: "query/change", text: "客户A"});
  assert.deepEqual(workspace.snapshot().entries.map(value => value.id), [first.id]);
  assert.equal(workspace.snapshot().selectedId, first.id);
});

test("edit draft changes data only when submitted and invokes one save", async () => {
  const {workspace, repository, saver} = setup([first]);
  await workspace.dispatch({type: "entry/edit-start"});
  await workspace.dispatch({type: "draft/change", text: "尚未提交"});

  assert.equal(workspace.snapshot().mode, "edit");
  assert.equal(workspace.snapshot().draft, "尚未提交");
  assert.equal(workspace.snapshot().status, "editing");
  assert.equal(workspace.snapshot().unsaved, true);
  assert.equal(repository.get(first.id).text, "客户A");

  await workspace.dispatch({type: "draft/submit"});
  assert.equal(repository.get(first.id).text, "尚未提交");
  assert.equal(saver.saves, 1);
  assert.equal(workspace.snapshot().mode, "normal");
});

test("add preserves meaningful whitespace and empty add is cancelled", async () => {
  const {workspace, repository, saver} = setup([]);
  await workspace.dispatch({type: "entry/add-start"});
  await workspace.dispatch({type: "draft/change", text: "  第一行\n第二行  "});
  await workspace.dispatch({type: "draft/submit"});

  const created = repository.values()[0];
  assert.equal(created.text, "  第一行\n第二行  ");
  assert.equal(created.id, "269700000");
  assert.equal(saver.saves, 1);

  await workspace.dispatch({type: "entry/add-start"});
  await workspace.dispatch({type: "draft/change", text: " \n "});
  await workspace.dispatch({type: "draft/submit"});
  assert.equal(repository.values().length, 1);
  assert.equal(saver.saves, 1);
});

test("an active draft survives remote repository updates", async () => {
  const {workspace, repository} = setup([first]);
  await workspace.dispatch({type: "entry/edit-start"});
  await workspace.dispatch({type: "draft/change", text: "本地草稿"});

  repository.applyRemote([{...first, revision: 2, text: "远端正文"}]);

  assert.equal(repository.get(first.id).text, "远端正文");
  assert.equal(workspace.snapshot().draft, "本地草稿");
  assert.equal(workspace.snapshot().mode, "edit");
});

test("workspace derives failure state and isolates password capability", async () => {
  let passwordOpens = 0;
  const {workspace, saver} = setup([first], {openPassword: () => { passwordOpens += 1; }});
  saver.setStatus("failed");
  assert.equal(workspace.snapshot().status, "failed");

  await workspace.dispatch({type: "password/open"});
  assert.equal(passwordOpens, 1);
});

test("destroy releases repository and service subscriptions", () => {
  const {workspace, repository, saver, sync} = setup([first]);
  let notifications = 0;
  workspace.subscribe(() => { notifications += 1; });
  workspace.destroy();

  repository.updateEntryText(first.id, "after destroy");
  saver.setStatus("saving");
  sync.setStatus("syncing");
  assert.equal(notifications, 0);
});

function setup(objects, {openPassword = () => {}} = {}) {
  const repository = createRepository(objects);
  const saver = service("clean", async () => ({generation: 1}));
  const sync = service("idle", async () => ({}));
  const workspace = createWorkspace({
    repository,
    saver,
    sync,
    initialQuery: "",
    openPassword,
    now: () => new Date(2026, 8, 7, 0, 0),
  });
  return {workspace, repository, saver, sync};
}

function service(initialStatus, operation) {
  let status = initialStatus;
  let saves = 0;
  const subscribers = new Set();
  return {
    status: () => status,
    subscribe(callback) { subscribers.add(callback); return () => subscribers.delete(callback); },
    setStatus(value) { status = value; for (const callback of subscribers) callback(value); },
    async save() { saves += 1; return operation(); },
    async pull() { return operation(); },
    get saves() { return saves; },
  };
}

function entry(id, text, createdAt) {
  return {schemaVersion: 1, id, kind: "entry", text, properties: {}, createdAt, updatedAt: createdAt, revision: 1};
}
