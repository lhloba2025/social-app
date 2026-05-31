// localScheduleStore — wrapper around the existing `scheduled_posts`
// localStorage entry so the bulk scheduler and the existing
// PostComposer / ContentCalendar / PostsManager all read and write the
// same shape. Picking a new key would split the data between the bulk
// flow and the rest of the app, so we intentionally piggyback on the
// established key.
//
// Post shape (kept identical to PostComposer.handleSave):
//   {
//     id:           "post_<timestamp>" or stable client id,
//     status:       "scheduled" | "draft" | "queued" | "published",
//     platforms:    string[],     // platform ids (instagram, tiktok, …)
//     caption:      string,        // full caption incl. hashtags
//     scheduleDate: "YYYY-MM-DD",
//     scheduleTime: "HH:MM",
//     scheduledAt:  "YYYY-MM-DDTHH:MM",
//     media:        { type, id, name, thumbnail } | null,
//     createdAt:    ISO string,
//   }

const KEY = "scheduled_posts";

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function writeAll(arr) {
  try { localStorage.setItem(KEY, JSON.stringify(arr)); return true; }
  catch { return false; }
}

// Newest-first listing — matches how the dashboard renders.
export function listScheduledPosts() {
  return readAll().sort((a, b) =>
    (b.scheduledAt || "").localeCompare(a.scheduledAt || ""),
  );
}

// Append a batch atomically. We do one write per batch (not one write
// per post) so a 30-post schedule doesn't fire 30 storage events.
// Returns the persisted posts (with ids filled in) so the caller can
// confirm exactly what landed.
export function appendScheduledPosts(posts) {
  if (!Array.isArray(posts) || posts.length === 0) return [];
  const existing = readAll();
  const stamped = posts.map((p, i) => ({
    id: p.id || `post_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: p.createdAt || new Date().toISOString(),
    status: p.status || "scheduled",
    ...p,
  }));
  writeAll([...existing, ...stamped]);
  return stamped;
}

// Helpers — used by the bulk-schedule UI to format dates consistently.
export function toISODate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
export function todayISO() { return toISODate(new Date()); }

// ── Weekly-recurring date generator ────────────────────────────────────
// Given a start date, a set of weekday indices (0=Sun … 6=Sat), and a
// count, return that many consecutive matching weekdays starting on
// or after the start date. Used by the "every Tuesday and Thursday"
// pattern to assign one slot per selected post.
//
// Example:
//   nextWeekdayDates(new Date("2026-06-01"), [2, 4], 5)
//   → [Tue 2026-06-02, Thu 2026-06-04, Tue 2026-06-09,
//      Thu 2026-06-11, Tue 2026-06-16]
export function nextWeekdayDates(start, weekdays, count) {
  if (!(start instanceof Date) || !weekdays?.length || !count) return [];
  // Normalize — strip the time component so we walk by calendar day.
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const result = [];
  // Hard cap on iterations to avoid an accidental infinite loop if
  // `weekdays` is empty or contains junk.
  const cap = count * 7 + 14;
  let i = 0;
  while (result.length < count && i < cap) {
    if (weekdays.includes(cur.getDay())) {
      result.push(new Date(cur));
    }
    cur.setDate(cur.getDate() + 1);
    i++;
  }
  return result;
}

// Build a list of {date, time} slots from a recurring rule.
// Args:
//   • startISO  — "YYYY-MM-DD" inclusive start
//   • weekdays  — number[] of getDay() indices
//   • timesByDay — { [weekday]: "HH:MM" } per-day time map. If a day
//                   isn't in the map we fall back to `defaultTime`.
//   • count     — how many slots to produce (= number of selected posts)
//   • defaultTime — "HH:MM" fallback when no per-day time is set
//
// Returns: [{ date: "YYYY-MM-DD", time: "HH:MM", weekday: 0..6 }]
export function buildRecurringSlots({ startISO, weekdays, timesByDay, count, defaultTime = "18:00" }) {
  const [y, m, d] = startISO.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const dates = nextWeekdayDates(start, weekdays, count);
  return dates.map((dt) => {
    const wd = dt.getDay();
    return {
      date: toISODate(dt),
      time: timesByDay?.[wd] || defaultTime,
      weekday: wd,
    };
  });
}

// Build sequential slots — every `everyN` days starting from `startISO`
// at a single time. The fast path for "post one a day" patterns.
export function buildSequentialSlots({ startISO, everyN, time, count }) {
  const [y, m, d] = startISO.split("-").map(Number);
  const cur = new Date(y, m - 1, d);
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push({
      date: toISODate(cur),
      time: time || "18:00",
      weekday: cur.getDay(),
    });
    cur.setDate(cur.getDate() + (everyN || 1));
  }
  return result;
}
