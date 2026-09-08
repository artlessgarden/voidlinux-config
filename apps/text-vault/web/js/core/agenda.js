// Agenda is a pure projection of entries. Dates remain plain local YYYY-MM-DD
// strings so the view can render them without introducing another data type.
export function buildAgenda(entries, now = new Date()) {
  const today = startOfDay(now);
  const todayKey = dateKey(today);
  const days = new Map();
  const reminders = [];
  const seenReminders = new Set();

  for (const entry of entries) {
    const created = new Date(entry.createdAt);
    const createdKey = dateKey(created);
    if (!Number.isNaN(created.getTime()) && createdKey <= todayKey) {
      if (!days.has(createdKey)) days.set(createdKey, []);
      days.get(createdKey).push(entry);
    }

    for (const target of reminderDates(entry.text, today)) {
      const key = `${target}:${entry.id}`;
      if (seenReminders.has(key)) continue;
      seenReminders.add(key);
      reminders.push({date: target, entry});
    }
  }

  if (!days.has(todayKey)) days.set(todayKey, []);
  return {
    days: [...days].toSorted(([left], [right]) => left.localeCompare(right)).map(([date, dayEntries]) => ({date, entries: dayEntries})),
    reminders: reminders.toSorted((left, right) =>
      left.date.localeCompare(right.date) ||
      left.entry.createdAt.localeCompare(right.entry.createdAt) ||
      left.entry.id.localeCompare(right.entry.id)),
  };
}

function reminderDates(text, today) {
  const result = [];
  const pattern = /(?:^|[^\p{L}\p{N}_])@(\d{1,2})-(\d{1,2})(?!\d)/gu;
  for (const match of String(text).matchAll(pattern)) {
    const month = Number(match[1]);
    const day = Number(match[2]);
    let year = today.getFullYear();
    let candidate = validDate(year, month, day);
    if (!candidate) continue;
    if (candidate < today) candidate = validDate(year + 1, month, day);
    if (candidate) result.push(dateKey(candidate));
  }
  return result;
}

function validDate(year, month, day) {
  const value = new Date(year, month - 1, day);
  return value.getFullYear() === year && value.getMonth() === month - 1 && value.getDate() === day ? value : null;
}

function startOfDay(value) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function dateKey(value) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
