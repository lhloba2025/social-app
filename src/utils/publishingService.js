// publishingService — the single client-side gateway for everything
// related to scheduling and publishing posts. Wraps three responsibilities:
//
//   1. Talk to the backend's /api/posts CRUD for the source-of-truth
//      record (the backend cron is what actually publishes to Meta /
//      TikTok / etc., so a post HAS to land in its DB).
//
//   2. Maintain a localStorage mirror (`scheduled_posts` key) so the
//      content-calendar, posts-manager, and dashboard keep working even
//      when the backend is unreachable (Railway has been flaky — see
//      vite.config.js note).
//
//   3. Expose a single "publish now" entry point that flips the schedule
//      to the current minute, then asks the backend to act on it.
//
// All functions return promises. Failures are logged but never thrown
// past the boundary — the UI gets a normalized `{ ok, source, error }`
// envelope so it can render appropriate state (saved locally vs synced
// to backend) without try/catch noise at every call site.

import { appendScheduledPosts as appendLocal, listScheduledPosts as listLocal } from "./localScheduleStore";
import { tenantToken } from "@/api/localClient";

const API = "/api/posts";

// Auth header so scheduled-post calls are scoped to the right salon (tenant).
function authHeaders() {
  const t = tenantToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// Probe the backend once per session; reuses the result so the schedule
// flow doesn't fire a /health on every modal open. The result is cached
// in a module-scoped promise: subsequent callers await the same probe.
let backendProbe = null;
function probeBackend() {
  if (!backendProbe) {
    backendProbe = (async () => {
      try {
        const res = await fetch("/health", { method: "GET" });
        return res.ok;
      } catch {
        return false;
      }
    })();
  }
  return backendProbe;
}
// Force a re-check (call after the user fixes Railway / starts local backend).
export function resetBackendProbe() { backendProbe = null; }

// Backend reachability snapshot — useful for showing a banner. Returns
// a promise that resolves to a boolean. NEVER throws.
export async function isBackendAvailable() {
  return probeBackend();
}

// ── Create posts ────────────────────────────────────────────────────────
//
// Tries to POST every post to the backend. For each one that succeeds,
// drops it into the local mirror with the backend's authoritative id.
// For each one that fails, falls back to localStorage so the user
// doesn't lose work. The returned envelope tells the UI exactly what
// happened per-post so it can warn appropriately.
//
// Input shape (one item):
//   {
//     status, platforms[], caption,
//     scheduleDate, scheduleTime, scheduledAt,
//     media: { type, id, name, thumbnail, url } | null,
//     sourcePostId?, sourcePostItemCount?
//   }
//
// Output:
//   {
//     ok:         boolean,                 // true iff every post landed somewhere
//     persisted:  PostShape[],             // full records that were saved
//     backendCount, localCount,            // per-source counts
//     errors:     string[],                // collected error messages
//   }
export async function createScheduledPosts(posts) {
  if (!Array.isArray(posts) || posts.length === 0) {
    return { ok: false, persisted: [], backendCount: 0, localCount: 0, errors: ["empty input"] };
  }

  const backendUp = await probeBackend();
  const persisted = [];
  const errors = [];
  let backendCount = 0;
  const localPending = [];

  for (const p of posts) {
    if (!backendUp) {
      localPending.push(p);
      continue;
    }
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(p),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const saved = await res.json();
      // Backend returns snake_case columns; mirror back into camelCase so
      // the rest of the app (which speaks camelCase) doesn't care.
      const normalized = normalizeFromBackend(saved, p);
      persisted.push(normalized);
      backendCount++;
    } catch (e) {
      errors.push(`backend POST failed: ${e?.message || e}`);
      localPending.push(p);
    }
  }

  // Anything that didn't make it to the backend gets the local mirror,
  // so the rest of the app sees a uniform picture either way. The local
  // store generates ids for us.
  const localSaved = appendLocal(localPending);
  for (const row of localSaved) persisted.push(row);

  // Also mirror backend-saved rows into localStorage so offline reads work.
  // We rely on the localStore's id-aware appendScheduledPosts to dedupe.
  if (backendCount > 0) {
    const backendOnly = persisted.filter((p) => !p.isLocal && !localSaved.some((l) => l.id === p.id));
    appendLocal(backendOnly);
  }

  return {
    ok: errors.length === 0,
    persisted,
    backendCount,
    localCount: localSaved.length,
    errors,
  };
}

// ── List posts ──────────────────────────────────────────────────────────
//
// Merge view: pull from the backend if available, otherwise just the
// local mirror. When both have data, the backend wins on duplicate ids
// (its status is the authoritative one; local rows might still say
// "scheduled" while the backend already published it).
export async function listAllPosts() {
  const backendUp = await probeBackend();
  const local = listLocal();
  if (!backendUp) return local;
  try {
    const res = await fetch(`${API}?sort=-created_at`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const remote = await res.json();
    const remoteNorm = remote.map((r) => normalizeFromBackend(r, {}));
    // Merge — backend rows take precedence on shared ids.
    const byId = new Map(local.map((p) => [p.id, p]));
    for (const r of remoteNorm) byId.set(r.id, r);
    return Array.from(byId.values()).sort(
      (a, b) => (b.scheduledAt || "").localeCompare(a.scheduledAt || ""),
    );
  } catch {
    return local;
  }
}

// ── Publish now ─────────────────────────────────────────────────────────
//
// Marks a post for immediate publishing by setting its schedule to the
// current minute and updating the backend (the cron runs every minute,
// so this is "publish on the next cron tick"). Without a backend, this
// only updates the local mirror (no actual publish — the user gets a
// warning in the UI).
// Accepts the FULL post object (not just an id). We POST it to the backend
// (POST is an upsert: delete-by-id then insert) with the schedule set to the
// current minute — so a post that only existed in localStorage still gets
// created on the backend and the cron sends it. Sending just a PUT failed with
// 404 for local-only posts.
export async function publishNow(post) {
  const nowDate = new Date();
  const scheduleDate = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}-${String(nowDate.getDate()).padStart(2, "0")}`;
  const scheduleTime = `${String(nowDate.getHours()).padStart(2, "0")}:${String(nowDate.getMinutes()).padStart(2, "0")}`;

  if (!post || typeof post !== "object") {
    return { ok: false, error: "bad_input", message: "منشور غير صالح" };
  }

  const backendUp = await probeBackend();
  if (!backendUp) {
    return { ok: false, error: "backend_unreachable", message: "الخادم غير متصل — تعذّر إرسال أمر النشر الفوري." };
  }

  if (!post.media?.url && !post.media?.thumbnail) {
    return { ok: false, error: "no_media", message: "هذا المنشور بدون صورة محفوظة على الخادم — أنشئ منشوراً جديداً وارفع صورته ثم انشره." };
  }

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: post.id,
        status: "scheduled",
        platforms: post.platforms || [],
        postType: post.postType || post.post_type || "feed",
        caption: post.caption || "",
        scheduleDate,
        scheduleTime,
        scheduledAt: `${scheduleDate}T${scheduleTime}`,
        media: post.media || null,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "request_failed", message: e?.message || String(e) };
  }
}

// ── Cancel schedule ───────────────────────────────────────────────────────
//
// Reverts a scheduled/queued post back to "draft" so the backend cron won't
// publish it — but keeps the post (unlike delete). Updates the local mirror
// immediately and upserts the backend row (POST = delete-by-id then insert).
export async function cancelSchedule(post) {
  if (!post || !post.id) return { ok: false, error: "bad_input" };

  // Local mirror — flip status to draft right away so the UI reflects it.
  try {
    const raw = localStorage.getItem("scheduled_posts");
    const arr = raw ? JSON.parse(raw) : [];
    const next = arr.map((p) => (p.id === post.id ? { ...p, status: "draft" } : p));
    localStorage.setItem("scheduled_posts", JSON.stringify(next));
  } catch { /* localStorage failed, not fatal */ }

  const backendUp = await probeBackend();
  if (!backendUp) return { ok: true, localOnly: true };
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        id: post.id,
        status: "draft",
        platforms: post.platforms || [],
        postType: post.postType || post.post_type || "feed",
        caption: post.caption || "",
        scheduleDate: post.scheduleDate,
        scheduleTime: post.scheduleTime,
        scheduledAt: post.scheduledAt,
        media: post.media || null,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message };
  }
}

// ── Delete post ─────────────────────────────────────────────────────────
export async function deleteScheduledPost(postId) {
  // Local mirror — strip out the post regardless of backend status.
  try {
    const raw = localStorage.getItem("scheduled_posts");
    const arr = raw ? JSON.parse(raw) : [];
    const next = arr.filter((p) => p.id !== postId);
    localStorage.setItem("scheduled_posts", JSON.stringify(next));
  } catch { /* localStorage failed, not fatal */ }

  const backendUp = await probeBackend();
  if (!backendUp) return { ok: true, localOnly: true };
  try {
    await fetch(`${API}/${postId}`, { method: "DELETE", headers: authHeaders() });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────
//
// Backend speaks `schedule_date` / `media_url` snake_case; the frontend
// uses `scheduleDate` / `media.thumbnail` camelCase. This bridges between.
function normalizeFromBackend(row, original) {
  return {
    id: row.id,
    status: row.status,
    platforms: Array.isArray(row.platforms) ? row.platforms : (original.platforms || []),
    postType: row.post_type || original.postType || "feed",
    caption: row.caption,
    scheduleDate: row.schedule_date || row.scheduleDate || original.scheduleDate,
    scheduleTime: row.schedule_time || row.scheduleTime || original.scheduleTime,
    scheduledAt: (row.schedule_date && row.schedule_time)
      ? `${row.schedule_date}T${row.schedule_time}`
      : original.scheduledAt,
    media: original.media || (row.media_url ? {
      type: row.media_type || "image",
      url: row.media_url,
      thumbnail: row.media_thumbnail || row.media_url,
      name: row.media_thumbnail?.split("/").pop() || "",
    } : null),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    publishResults: row.publish_results || row.publishResults || {},
    // Carry the source-design linkage through so the library can tell which
    // media posts are already scheduled (and not re-offer them). The backend
    // doesn't echo these columns, so we lean on the original payload.
    sourcePostId: original.sourcePostId ?? row.source_post_id ?? row.sourcePostId ?? null,
    designId: original.designId ?? row.design_id ?? row.designId ?? null,
    isLocal: false, // backend-sourced
  };
}
