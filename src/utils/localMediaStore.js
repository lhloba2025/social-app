// localMediaStore — survivable client-side media store.
//
// The deployed Railway backend currently rejects POST /media with
// `404 Application not found`. Cloudinary uploads still succeed (the
// files exist), but we can't record the metadata server-side. Rather
// than block the user every time, we keep a FULL local record (url,
// name, platform, caption, post grouping, …) in localStorage and merge
// it back when the design library lists media.
//
// When the backend recovers we keep working: backend records show up
// alongside local records. A "local" marker lets the UI hint at which
// rows live only on this device.
//
// API mirrors the relevant subset of `localApi.entities.Media`:
//   listLocal()  → all local records, newest-first
//   addLocal(r)  → push a record (id auto-generated if missing)
//   removeLocal(id) → delete one record
//   clearLocal() → wipe everything (developer use)
//
// Records carry the same shape we send to the backend, plus:
//   { id, isLocal: true, created_date }

const KEY = "local_media_records_v1";

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function writeAll(records) {
  try { localStorage.setItem(KEY, JSON.stringify(records)); return true; }
  catch { return false; /* quota exceeded — caller should warn the user */ }
}

const newId = () => `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export function listLocalMedia() {
  // Newest-first to match the backend's `-created_date` ordering.
  return readAll().sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""));
}

export function addLocalMedia(record) {
  const list = readAll();
  const enriched = {
    id: record.id || newId(),
    isLocal: true,
    created_date: record.created_date || new Date().toISOString(),
    ...record,
  };
  list.push(enriched);
  return writeAll(list) ? enriched : null;
}

export function removeLocalMedia(id) {
  const list = readAll();
  const next = list.filter((r) => r.id !== id);
  // Only write if something actually changed — avoids spurious storage
  // events for callers that broadcast-delete.
  if (next.length !== list.length) writeAll(next);
}

// `true` if the given id belongs to the local store — handy for routing
// delete operations to the right destination.
export function isLocalId(id) {
  return typeof id === "string" && id.startsWith("local_");
}
