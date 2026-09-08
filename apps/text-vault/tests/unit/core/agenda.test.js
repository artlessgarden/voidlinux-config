import assert from "node:assert/strict";
import test from "node:test";

import {buildAgenda} from "../../../web/js/core/agenda.js";

test("agenda groups recorded days, keeps today last, and resolves reminder dates forward", () => {
  const entries = [
    entry("a", "去年记录 @1-2", "2025-12-30T12:00:00"),
    entry("b", "今天记录 @12-31 和 @1-2", "2026-09-08T10:00:00"),
  ];

  const agenda = buildAgenda(entries, new Date(2026, 8, 8, 12));

  assert.deepEqual(agenda.days.map(day => day.date), ["2025-12-30", "2026-09-08"]);
  assert.deepEqual(agenda.days.map(day => day.entries.map(item => item.id)), [["a"], ["b"]]);
  assert.deepEqual(agenda.reminders.map(item => [item.date, item.entry.id]), [
    ["2026-12-31", "b"],
    ["2027-01-02", "a"],
    ["2027-01-02", "b"],
  ]);
});

test("agenda ignores impossible and embedded date markers", () => {
  const agenda = buildAgenda([
    entry("a", "@2-30 x@10-23 @13-1", "2026-09-08T10:00:00"),
  ], new Date(2026, 8, 8, 12));

  assert.deepEqual(agenda.reminders, []);
});

function entry(id, text, createdAt) {
  return {schemaVersion: 1, id, kind: "entry", text, properties: {}, createdAt, updatedAt: createdAt, revision: 1};
}
