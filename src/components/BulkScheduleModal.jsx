// BulkScheduleModal — multi-post scheduler driven from the design
// library. Lets the user assign multiple media posts to a calendar
// using one of three patterns:
//
//   1. Weekly recurring — "every Tuesday at 7pm + every Thursday at
//      5pm starting June 1". Per-day times so each weekday can run on
//      its own clock (matches social-media-manager habits where the
//      weekend posts go out at different hours from the weekday ones).
//
//   2. Daily / sequential — one post every N days at a fixed time,
//      starting from a given date. Quick path for "post one a day".
//
//   3. Manual — pick a date+time per post individually. The escape
//      hatch when neither recurring pattern fits.
//
// Output writes straight into `scheduled_posts` localStorage via
// `appendScheduledPosts`, so the existing ContentCalendar /
// PostsManager / Dashboard all pick the new posts up automatically.
// No backend dependency — the Railway server is unreliable per the
// notes elsewhere in this app, and the existing schedule flow is
// already localStorage-only.
//
// Props:
//   • isOpen     — boolean to mount/unmount
//   • posts      — array of post objects from DesignLibrary (each carries
//                  items[], post_id, platform, caption_title, caption_text)
//   • language   — "ar" | "en"
//   • onClose    — invoked on cancel + after successful schedule
//   • onSuccess  — optional callback (passed the persisted posts)
//

import React, { useMemo, useState, useEffect } from "react";
import { X, Calendar, Clock, Repeat, ChevronLeft, ChevronRight, CheckCircle2, Trash2, Cloud, CloudOff } from "lucide-react";
import { buildRecurringSlots, todayISO, toISODate } from "@/utils/localScheduleStore";
import { createScheduledPosts, isBackendAvailable } from "@/utils/publishingService";
import { platformLabel, platformEmoji, PLATFORMS } from "./BulkMediaUploadModal";

// Weekday metadata — index matches Date.getDay() (Sun=0).
// `shortAr` is the conventional single-letter abbreviation used in
// Arabic calendars (ح ن ث ر خ ج س). Earlier we tried `ar.slice(0,3)`
// which produced duplicates ("الأ" for both Sunday and Wednesday)
// and made the picker unreadable — see screenshot from 2026-05-31.
const WEEKDAYS = [
  { id: 0, ar: "الأحد",     shortAr: "ح", en: "Sun" },
  { id: 1, ar: "الإثنين",   shortAr: "ن", en: "Mon" },
  { id: 2, ar: "الثلاثاء", shortAr: "ث", en: "Tue" },
  { id: 3, ar: "الأربعاء",  shortAr: "ر", en: "Wed" },
  { id: 4, ar: "الخميس",    shortAr: "خ", en: "Thu" },
  { id: 5, ar: "الجمعة",    shortAr: "ج", en: "Fri" },
  { id: 6, ar: "السبت",     shortAr: "س", en: "Sat" },
];

// Sensible default per-day times — evening slots when people scroll.
const DEFAULT_DAY_TIME = "19:00";

// Default times used when the user bumps "posts per day" in daily mode —
// spread across the day, all editable afterwards.
const DEFAULT_DAILY_TIMES = ["19:00", "13:00", "16:00", "21:00", "10:00", "12:00", "15:00", "18:00", "20:00", "22:00"];

// Is the given (date, time) pair already in the past relative to now?
// Used to flag slots that can't actually be scheduled — the HTML5
// `min` attribute on <input type="date"> only blocks the picker UI;
// it doesn't stop a typed-in past date, and it can't see the time.
// So we validate again here before letting the user hit Confirm.
function isSlotInPast(dateISO, timeHHMM) {
  if (!dateISO) return true;
  const [y, m, d] = dateISO.split("-").map(Number);
  const [hh, mm] = (timeHHMM || "00:00").split(":").map(Number);
  const slot = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
  return slot.getTime() < Date.now();
}

// Convert a YYYY-MM-DD string to a localized human-readable label
// ("الثلاثاء، 3 يونيو" / "Tue, Jun 3").
function formatDateLabel(isoDate, isRtl) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (isRtl) {
    return dt.toLocaleDateString("ar-SA", {
      weekday: "long", month: "long", day: "numeric",
    });
  }
  return dt.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

export default function BulkScheduleModal({ isOpen, posts = [], language, onClose, onSuccess }) {
  const isRtl = language === "ar";

  // Which platforms to publish ALL these posts to. Defaults to whatever the
  // uploaded media were tagged with, but the user can tick more (cross-post).
  const [pubPlatforms, setPubPlatforms] = useState([]);
  React.useEffect(() => {
    if (!isOpen) return;
    const tagged = Array.from(new Set(posts.map((p) => p.platform).filter(Boolean)));
    setPubPlatforms(tagged.length ? tagged : ["instagram"]);
  }, [isOpen, posts]);
  const togglePub = (id) =>
    setPubPlatforms((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));

  // Real aspect ratio per image (post_id → aspect id), measured from the cover
  // image when the modal opens. Drives which platform each image is sent to.
  const ASPECT_RATIO = { "1:1": 1, "4:5": 0.8, "9:16": 0.5625, "16:9": 1.7778, "3:4": 0.75, "4:3": 1.3333 };
  const nearestAspectId = (wOverH) => {
    let best = "1:1", diff = Infinity;
    for (const id of Object.keys(ASPECT_RATIO)) { const d = Math.abs(ASPECT_RATIO[id] - wOverH); if (d < diff) { diff = d; best = id; } }
    return best;
  };
  const [aspectByPost, setAspectByPost] = useState({});
  React.useEffect(() => {
    if (!isOpen || !posts.length) { setAspectByPost({}); return; }
    let cancelled = false;
    const next = {};
    let pending = posts.length;
    const done = () => { if (--pending === 0 && !cancelled) setAspectByPost({ ...next }); };
    posts.forEach((p) => {
      const url = p.items?.[0]?.url;
      if (!url) { next[p.post_id] = "4:5"; done(); return; }
      const img = new Image();
      img.onload = () => { next[p.post_id] = nearestAspectId((img.naturalWidth || 1) / (img.naturalHeight || 1)); done(); };
      img.onerror = () => { next[p.post_id] = "4:5"; done(); };
      img.src = url;
    });
    return () => { cancelled = true; };
  }, [isOpen, posts]);

  // GLOBAL placement mode for Instagram/Facebook (which support both a feed
  // post and a story). Chosen ONCE at the top — no per-image clicking. The
  // user picked "both" as their default. Single-slot platforms (TikTok=story,
  // Twitter/LinkedIn/YouTube=feed) ignore this and just get their one slot.
  const [igFbMode, setIgFbMode] = useState("both"); // "both" | "feed" | "story"
  React.useEffect(() => { if (isOpen) setIgFbMode("both"); }, [isOpen]);

  // Per-topic EXCLUSIONS — the exception path. A key is `${unitKey}|${platform}|${slot}`.
  // The global mode decides the default placements; the user drops a single
  // line (e.g. "this topic's IG story") with the ✕ button in the preview.
  const [excluded, setExcluded] = useState(() => new Set());
  React.useEffect(() => { if (isOpen) setExcluded(new Set()); }, [isOpen, posts]);
  const toggleExcluded = (key) =>
    setExcluded((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  // Single-slot platforms — their only placement. IG/FB are handled by the
  // global igFbMode instead (they support both feed + story).
  const PLATFORM_DEF = {
    tiktok: ["story"], snapchat: ["story"],
    twitter: ["feed"], linkedin: ["feed"], youtube: ["feed"],
  };
  // Which slots a platform publishes to. IG/FB follow the global mode.
  const slotsForPlatform = (platform) => {
    if (platform === "instagram" || platform === "facebook") {
      return igFbMode === "both" ? ["feed", "story"] : [igFbMode];
    }
    return PLATFORM_DEF[platform] || [];
  };
  const pickClosest = (postsArr, idealAspect) => {
    const target = ASPECT_RATIO[idealAspect] || 0.8;
    let best = null, diff = Infinity;
    for (const p of postsArr) {
      const a = ASPECT_RATIO[aspectByPost[p.post_id] || "4:5"];
      const d = Math.abs(a - target);
      if (d < diff) { diff = d; best = p; }
    }
    return best;
  };

  // Pick the image(s) for a slot inside a topic, by size. Story → prefer 9:16;
  // feed → prefer non-9:16 (1:1/4:5/16:9). If the topic has no matching size we
  // substitute the closest one (flagged so we can confirm before scheduling).
  const imagesForSlot = (u, slot) => {
    const isStory = slot === "story";
    const preferred = u.posts.filter((p) => {
      const a = aspectByPost[p.post_id] || "4:5";
      return isStory ? a === "9:16" : a !== "9:16";
    });
    if (preferred.length) return { posts: preferred, substituted: false };
    if (!u.posts.length) return null;
    const ideal = isStory ? "9:16" : "4:5";
    const closest = pickClosest(u.posts, ideal);
    return closest ? { posts: [closest], substituted: true, ideal, got: aspectByPost[closest.post_id] } : null;
  };

  // Distribute a topic's images across the SELECTED platforms by the global
  // mode. Returns ALL candidate entries (including ones the user excluded via ✕,
  // flagged with `excluded`) so the preview can show them struck-through with an
  // undo. buildPayload drops the excluded ones. Each entry:
  //   { platform, type, posts[], substituted, ideal, got, key, excluded }
  const distributionForUnit = (u) => {
    const entries = [];
    for (const platform of pubPlatforms) {
      for (const slot of slotsForPlatform(platform)) {
        const res = imagesForSlot(u, slot);
        if (!res) continue;
        const carousel = (platform === "instagram" || platform === "facebook") && slot === "feed" && res.posts.length > 1;
        const key = `${u.key}|${platform}|${slot}`;
        entries.push({
          platform, type: slot,
          posts: carousel ? res.posts : [res.posts[0]],
          substituted: !!res.substituted, ideal: res.ideal, got: res.got,
          key, excluded: excluded.has(key),
        });
      }
    }
    return entries;
  };

  // ── Group same-topic images into ONE scheduling unit ─────────────────
  // A topic's feed post and its story are separate library rows but share the
  // same hook/caption (they came from the same Excel row / idea). Grouping them
  // guarantees the post and its story go out on the SAME day — so "today's post"
  // and "today's story" are about the same subject.
  const [groupTopics, setGroupTopics] = useState(true);
  const topicKey = (p) => ((p.caption_title || p.caption_text || p.items?.[0]?.name || "").trim());
  const units = useMemo(() => {
    if (!groupTopics) return posts.map((p) => ({ key: p.post_id, posts: [p] }));
    const map = new Map();
    for (const p of posts) {
      const k = topicKey(p) || p.post_id; // no shared title → its own unit
      if (!map.has(k)) map.set(k, { key: k, posts: [] });
      map.get(k).posts.push(p);
    }
    return Array.from(map.values());
  }, [posts, groupTopics]);
  const unitCover = (u) => u.posts[0]?.items?.[0];
  const unitTitle = (u) => u.posts[0]?.caption_title || unitCover(u)?.name || "";

  // ── Mode + form state ───────────────────────────────────────────────
  // weekly: pick days + per-day times + start date
  // daily:  one slot every N days at a single time
  // manual: per-post date/time pickers
  const [mode, setMode] = useState("weekly");

  // Weekly mode
  const [weekdays, setWeekdays] = useState([2, 4]); // Tue + Thu by default
  const [timesByDay, setTimesByDay] = useState(() => ({
    // pre-seed sensible defaults for Tue + Thu so the user can hit
    // confirm without touching anything for the common case
    2: "19:00",
    4: "17:00",
  }));
  const [startISO, setStartISO] = useState(todayISO());

  // Daily mode — post N times PER DAY at fixed times, across consecutive
  // days, until all selected posts are scheduled. (`perDay` replaced the
  // old "every N days" — the user wanted "how many posts per day".)
  const [perDay, setPerDay] = useState(1);
  const [dailyTimes, setDailyTimes] = useState(["19:00"]); // one time per daily slot
  // Resize the per-day time list when the count changes, keeping any times
  // the user already set.
  React.useEffect(() => {
    const pd = Math.max(1, Math.min(10, parseInt(perDay) || 1));
    setDailyTimes((prev) =>
      Array.from({ length: pd }, (_, j) => prev[j] || DEFAULT_DAILY_TIMES[j] || "19:00")
    );
  }, [perDay]);

  // Manual mode — initialise lazily from the posts list
  const [manualSlots, setManualSlots] = useState([]);

  // Reset manual slots when posts change (or modal opens) so we don't
  // carry stale entries across opens.
  React.useEffect(() => {
    if (!isOpen) return;
    setManualSlots(units.map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i); // one per day starting today
      return {
        date: d.toISOString().slice(0, 10),
        time: "19:00",
      };
    }));
  }, [isOpen, units]);

  // Manual ordering — reorders the UNITS (topic groups) so a topic's whole set
  // moves together. `order` holds display-position → original-unit-index.
  const [order, setOrder] = useState([]);
  React.useEffect(() => {
    if (!isOpen) return;
    setOrder(units.map((_, i) => i));
  }, [isOpen, units]);
  const orderedUnits = (order.length === units.length)
    ? order.map((i) => units[i]).filter(Boolean)
    : units;
  const moveItem = (from, to) => {
    setOrder((prev) => {
      const base = prev.length === units.length ? prev.slice() : units.map((_, i) => i);
      if (to < 0 || to >= base.length) return base;
      const [x] = base.splice(from, 1);
      base.splice(to, 0, x);
      return base;
    });
  };

  // ── Generate the slot list from current settings ────────────────────
  const slots = useMemo(() => {
    if (!units.length) return [];
    if (mode === "weekly") {
      if (!weekdays.length) return [];
      return buildRecurringSlots({
        startISO,
        weekdays,
        timesByDay,
        count: units.length,
        defaultTime: DEFAULT_DAY_TIME,
      });
    }
    if (mode === "daily") {
      // `perDay` units each day at `dailyTimes`, rolling onto the next day
      // once the day's slots are filled. perDay = total → all on day one.
      const pd = Math.max(1, Math.min(10, parseInt(perDay) || 1));
      const [y, m, d] = startISO.split("-").map(Number);
      return units.map((_, i) => {
        const dt = new Date(y, m - 1, d + Math.floor(i / pd));
        return { date: toISODate(dt), time: dailyTimes[i % pd] || "19:00" };
      });
    }
    // manual
    return manualSlots.slice(0, units.length);
  }, [mode, units, weekdays, timesByDay, startISO, perDay, dailyTimes, manualSlots]);

  // ── Backend availability ─────────────────────────────────────────────
  // We probe once when the modal opens. If down, the user sees a banner
  // telling them the schedule will save locally but the backend won't
  // actually publish anything — they need to fix Railway / start the
  // local server. The probe is reused module-wide so reopening the
  // modal doesn't re-hammer the /health endpoint.
  const [backendUp, setBackendUp] = useState(null); // null = unknown, bool = checked
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    isBackendAvailable().then((ok) => {
      if (!cancelled) setBackendUp(ok);
    });
    return () => { cancelled = true; };
  }, [isOpen]);

  // ── Confirm / persist ────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(0);
  const [resultDetail, setResultDetail] = useState(null); // { backendCount, localCount, errors }

  // Flag every slot that lies in the past — Confirm is only allowed
  // when zero slots are stale. We re-derive this from `slots` on every
  // render rather than baking it into the slot objects so it stays in
  // sync with the wall clock (the user could leave the modal open
  // long enough for a "today 17:00" slot to slip into the past).
  const pastFlags = useMemo(
    () => slots.map((s) => isSlotInPast(s.date, s.time)),
    [slots],
  );
  const pastCount = pastFlags.filter(Boolean).length;

  const canConfirm = useMemo(() => {
    if (!units.length) return false;
    if (!pubPlatforms.length) return false;
    if (mode === "weekly" && weekdays.length === 0) return false;
    if (slots.length !== units.length) return false;
    // Block any past slot — we don't want to write a "scheduled" post
    // whose time has already gone by; it would either fire immediately
    // (bad) or rot in the queue forever (also bad).
    if (pastCount > 0) return false;
    return true;
  }, [units.length, pubPlatforms.length, mode, weekdays.length, slots.length, pastCount]);

  // Build the schedule payload by distributing each topic's images to the
  // selected platforms by size. Each entry → one scheduled post (carousel when
  // a slot has 2+ same-size images on IG/FB). Also returns the substitutions
  // (a platform got a non-ideal size) so we can confirm them first.
  const buildPayload = () => {
    const subs = [];
    const payload = orderedUnits.flatMap((u, i) => {
      const slot = slots[i];
      const dist = distributionForUnit(u).filter((e) => !e.excluded);
      return dist.map((e) => {
        const lead = e.posts[0];
        const cover = lead.items?.[0];
        const caption = [lead.caption_title, lead.caption_text].filter(Boolean).join("\n\n");
        const urls = e.posts.map((p) => p.items?.[0]?.url).filter(Boolean);
        if (e.substituted) subs.push({ title: unitTitle(u), platform: e.platform, ideal: e.ideal, got: e.got, type: e.type });
        return {
          status: "scheduled",
          platforms: [e.platform],
          postType: e.type,
          caption,
          scheduleDate: slot.date,
          scheduleTime: slot.time,
          scheduledAt: `${slot.date}T${slot.time}`,
          media: cover ? {
            type: cover.type || "image", id: cover.id, name: cover.name,
            url: cover.url, thumbnail: cover.url,
            ...(urls.length > 1 ? { items: urls } : {}), // carousel
          } : null,
          designId: lead.post_id,
          sourcePostId: lead.post_id,
          sourcePostItemCount: e.posts.length,
        };
      });
    });
    return { payload, subs };
  };

  // Pending confirmation when there are size substitutions to acknowledge.
  const [confirmSubs, setConfirmSubs] = useState(null);

  const handleConfirm = async () => {
    if (!canConfirm) return;
    const built = buildPayload();
    if (!built.payload.length) return;
    // If a platform got a non-ideal size, ask before proceeding.
    if (built.subs.length && !confirmSubs) { setConfirmSubs(built); return; }
    await doSchedule((confirmSubs || built).payload);
  };

  const doSchedule = async (payload) => {
    setConfirmSubs(null);
    setSaving(true);
    setResultDetail(null);
    const result = await createScheduledPosts(payload);
    setSuccess(result.persisted.length);
    setResultDetail({
      backendCount: result.backendCount,
      localCount:   result.localCount,
      hasErrors:    result.errors.length > 0,
    });
    setSaving(false);
    if (onSuccess) onSuccess(result.persisted);
    const closeDelay = result.backendCount < result.persisted.length ? 2400 : 1200;
    setTimeout(() => {
      setSuccess(0);
      setResultDetail(null);
      onClose?.();
    }, closeDelay);
  };

  if (!isOpen) return null;

  // ── Helpers for child controls ──────────────────────────────────────
  const toggleWeekday = (id) => {
    setWeekdays((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].sort(),
    );
    setTimesByDay((prev) => prev[id] ? prev : { ...prev, [id]: DEFAULT_DAY_TIME });
  };

  const updateDayTime = (id, time) =>
    setTimesByDay((prev) => ({ ...prev, [id]: time }));

  const updateManualSlot = (i, patch) =>
    setManualSlots((prev) => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4"
      onClick={onClose}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div
        className="relative bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-gradient-to-r from-indigo-900/40 to-purple-900/40">
          <div className="flex-1">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              {isRtl ? "جدولة جماعية" : "Bulk schedule"}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isRtl
                ? `${posts.length} صورة · ${units.length} ${units.length === 1 ? "موضوع" : "مواضيع"} جاهزة للجدولة`
                : `${posts.length} image${posts.length === 1 ? "" : "s"} · ${units.length} topic${units.length === 1 ? "" : "s"} ready`}
            </p>
          </div>
          {/* Backend status pill — green when reachable, amber otherwise.
              Communicates the difference between "saved + will publish"
              and "saved locally but won't publish until backend is up". */}
          {backendUp !== null && (
            <span
              className={`text-[10px] font-bold px-2 py-1 rounded-full inline-flex items-center gap-1 me-2 ${
                backendUp
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              }`}
              title={backendUp
                ? (isRtl ? "الخادم متصل — سيتم النشر تلقائياً" : "Backend online — will auto-publish")
                : (isRtl ? "الخادم غير متصل — سيُحفظ محلياً فقط" : "Backend offline — local save only")}
            >
              {backendUp
                ? <Cloud className="w-3 h-3" />
                : <CloudOff className="w-3 h-3" />}
              <span>{backendUp
                ? (isRtl ? "متصل" : "Online")
                : (isRtl ? "غير متصل" : "Offline")}</span>
            </span>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition"
            disabled={saving}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Backend-down warning banner — louder than the pill, only when
            we've confirmed it's off. Tells the user exactly what they
            need to do to make publishing actually happen. */}
        {backendUp === false && (
          <div className="bg-amber-900/30 border-y border-amber-500/30 px-4 py-2.5 text-[11px] text-amber-200 flex items-start gap-2">
            <CloudOff className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <strong>{isRtl ? "تنبيه: الخادم الخلفي غير متاح." : "Heads up: the backend is unreachable."}</strong>{" "}
              {isRtl
                ? "ستُحفظ الجدولة على جهازك فقط ولن يتم النشر التلقائي على المنصات. شغّل الخادم محلياً: "
                : "Schedule will save locally only — no auto-publish until the backend is back. Start it locally with: "}
              <code className="bg-slate-900/60 px-1.5 py-0.5 rounded text-[10px]" dir="ltr">
                cd backend &amp;&amp; npm run dev
              </code>
            </div>
          </div>
        )}

        {/* Body — two columns: form (left) + live preview (right) */}
        <div className="flex-1 overflow-y-auto md:overflow-hidden grid md:grid-cols-[1fr_1fr] gap-0">
          {/* ── Left: pattern picker + form ──────────────────────────── */}
          <div className="p-5 space-y-4 md:overflow-y-auto border-b md:border-b-0 md:border-e border-slate-800">
            {/* Publish-to platforms (multi-select cross-post) */}
            <div>
              <label className="text-slate-300 text-[12px] font-bold block mb-1.5">
                {isRtl ? "ينشر على:" : "Publish to:"}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.map((p) => {
                  const active = pubPlatforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePub(p.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition inline-flex items-center gap-1 ${
                        active ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      <span>{p.emoji}</span>
                      <span>{isRtl ? p.labelAr : p.label}</span>
                      {active && <span>✓</span>}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-emerald-300/90 mt-1 leading-relaxed">
                {isRtl
                  ? "اختر المنصات اللي تنشر عليها. النظام يوزّع صور كل موضوع تلقائياً حسب المقاس."
                  : "Pick the platforms. Each topic's images are auto-distributed by size."}
              </p>
            </div>

            {/* GLOBAL placement mode for IG/FB — chosen once, applies to ALL
                topics. Only shown when IG or FB is selected (others have a
                single placement). The ✕ in the preview is the per-topic
                exception. */}
            {(pubPlatforms.includes("instagram") || pubPlatforms.includes("facebook")) && (
              <div>
                <label className="text-slate-300 text-[12px] font-bold block mb-1.5">
                  {isRtl ? "على انستقرام/فيسبوك، انشر كل موضوع كـ:" : "On Instagram/Facebook, publish each topic as:"}
                </label>
                <div className="grid grid-cols-3 gap-1 bg-slate-800/60 rounded-lg p-1">
                  {[
                    { id: "both",  ar: "بوست + ستوري", en: "Post + Story" },
                    { id: "feed",  ar: "بوست فقط",     en: "Post only" },
                    { id: "story", ar: "ستوري فقط",    en: "Story only" },
                  ].map((m) => {
                    const isActive = igFbMode === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setIgFbMode(m.id)}
                        className={`py-2 rounded text-[11px] font-bold transition ${
                          isActive ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {isRtl ? m.ar : m.en}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  {isRtl
                    ? "💡 يطبّق على كل المواضيع. لإلغاء ستوري (أو بوست) لموضوع واحد فقط، اضغط ✕ بجنب سطره في المعاينة."
                    : "💡 Applies to all topics. To drop a story (or post) for just one topic, click the ✕ next to its line in the preview."}
                </p>
              </div>
            )}

            {/* Group same topic together (post + its story on the SAME day) */}
            <label className="flex items-start gap-2 bg-fuchsia-900/15 border border-fuchsia-500/30 rounded-lg p-2.5 cursor-pointer">
              <input type="checkbox" checked={groupTopics} onChange={(e) => setGroupTopics(e.target.checked)} className="mt-0.5" />
              <span className="text-[11px] text-slate-100 leading-relaxed">
                {isRtl ? "اجمع صور نفس الموضوع في يوم واحد" : "Group same-topic images on the same day"}
                <span className="block text-[10px] text-slate-400">
                  {isRtl
                    ? "البوست والستوري لنفس الفكرة (نفس الهوك/الكابشن) يُنشران بنفس اليوم والوقت — فموضوع بوست اليوم = موضوع ستوري اليوم."
                    : "A topic's feed post and its story go out together — today's post matches today's story."}
                </span>
              </span>
            </label>

            {/* Mode tabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-800/60 rounded-lg p-1">
              {[
                { id: "daily",  icon: Clock,  ar: "يومي",          en: "Daily" },
                { id: "weekly", icon: Repeat, ar: "أيام الأسبوع", en: "Weekly" },
                { id: "manual", icon: Calendar, ar: "يدوي",        en: "Manual" },
              ].map((m) => {
                const Icon = m.icon;
                const isActive = mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`py-2 rounded text-[12px] font-bold transition flex items-center justify-center gap-1.5 ${
                      isActive
                        ? "bg-indigo-600 text-white"
                        : "text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {isRtl ? m.ar : m.en}
                  </button>
                );
              })}
            </div>

            {/* ── Weekly mode ───────────────────────────────────────── */}
            {mode === "weekly" && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1.5 font-semibold">
                    {isRtl ? "تاريخ البداية" : "Start date"}
                  </label>
                  <input
                    type="date"
                    value={startISO}
                    min={todayISO()}
                    onChange={(e) => setStartISO(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 block mb-1.5 font-semibold">
                    {isRtl ? "أيام النشر" : "Posting days"}
                  </label>
                  <div className="grid grid-cols-7 gap-1">
                    {WEEKDAYS.map((wd) => {
                      const active = weekdays.includes(wd.id);
                      // Arabic shows the short name without the "ال"
                      // prefix ("ثلاثاء" not "الثلاثاء") so all seven
                      // fit cleanly across the row. English uses the
                      // 3-letter abbreviation which is already short.
                      const label = isRtl ? wd.ar.replace(/^ال/, "") : wd.en;
                      return (
                        <button
                          key={wd.id}
                          onClick={() => toggleWeekday(wd.id)}
                          title={isRtl ? wd.ar : wd.en}
                          className={`py-2 rounded-lg text-[11px] font-bold transition ${
                            active
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {weekdays.length === 0 && (
                    <p className="text-[10px] text-amber-300/80 mt-1.5">
                      {isRtl ? "⚠️ اختر يوماً واحداً على الأقل." : "⚠️ Pick at least one day."}
                    </p>
                  )}
                </div>

                {/* Per-day time inputs — one row per selected weekday */}
                {weekdays.length > 0 && (
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1.5 font-semibold">
                      {isRtl ? "وقت النشر لكل يوم" : "Time per day"}
                    </label>
                    <div className="space-y-1.5 bg-slate-800/40 rounded-lg p-2">
                      {weekdays.map((wid) => {
                        const wd = WEEKDAYS.find((x) => x.id === wid);
                        return (
                          <div key={wid} className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-200 font-semibold w-20 flex-shrink-0">
                              {isRtl ? wd.ar : wd.en}
                            </span>
                            <input
                              type="time"
                              value={timesByDay[wid] || DEFAULT_DAY_TIME}
                              onChange={(e) => updateDayTime(wid, e.target.value)}
                              dir="ltr"
                              className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[12px] text-white outline-none focus:border-indigo-500"
                            />
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                      {isRtl
                        ? "💡 مثال: الثلاثاء 7 مساءً والخميس 5 مساءً — استخدم وقت مختلف لكل يوم."
                        : "💡 Example: Tue 7pm, Thu 5pm — set a different time per day if you want."}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Daily mode ────────────────────────────────────────── */}
            {mode === "daily" && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1.5 font-semibold">
                    {isRtl ? "تاريخ البداية" : "Start date"}
                  </label>
                  <input
                    type="date"
                    value={startISO}
                    min={todayISO()}
                    onChange={(e) => setStartISO(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1.5 font-semibold">
                    {isRtl ? "كم بوست في اليوم؟" : "How many posts per day?"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={perDay}
                    onChange={(e) => setPerDay(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                  />
                </div>
                {/* One time picker per daily slot — these times repeat every
                    day until all selected posts are scheduled. */}
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1.5 font-semibold">
                    {isRtl ? "أوقات النشر في اليوم" : "Posting times each day"}
                  </label>
                  <div className="space-y-1.5 bg-slate-800/40 rounded-lg p-2">
                    {dailyTimes.map((t, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-200 font-semibold w-20 flex-shrink-0">
                          {isRtl ? `بوست ${j + 1}` : `Post ${j + 1}`}
                        </span>
                        <input
                          type="time"
                          value={t}
                          dir="ltr"
                          onChange={(e) =>
                            setDailyTimes((prev) => {
                              const next = prev.slice();
                              next[j] = e.target.value;
                              return next;
                            })
                          }
                          className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[12px] text-white outline-none focus:border-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  {isRtl
                    ? `💡 ${perDay} موضوع كل يوم في الأوقات أعلاه، بدءاً من ${startISO}، حتى تنتهي الـ ${units.length} موضوع.`
                    : `💡 ${perDay} topic(s) per day at the times above, starting ${startISO}, until all ${units.length} are scheduled.`}
                </p>
              </div>
            )}

            {/* ── Manual mode ───────────────────────────────────────── */}
            {mode === "manual" && (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400">
                  {isRtl ? "اختر تاريخاً ووقتاً لكل منشور:" : "Pick a date and time for each post:"}
                </p>
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {orderedUnits.map((u, i) => {
                    const slot = manualSlots[i] || { date: todayISO(), time: "19:00" };
                    const cover = unitCover(u);
                    return (
                      <div key={u.key} className="bg-slate-800/60 rounded-lg p-2 flex items-center gap-2">
                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => moveItem(i, i - 1)}
                            disabled={i === 0}
                            className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] leading-none disabled:opacity-30 flex items-center justify-center"
                            title={isRtl ? "أعلى" : "Up"}
                          >▲</button>
                          <button
                            onClick={() => moveItem(i, i + 1)}
                            disabled={i === orderedUnits.length - 1}
                            className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] leading-none disabled:opacity-30 flex items-center justify-center"
                            title={isRtl ? "أسفل" : "Down"}
                          >▼</button>
                        </div>
                        {/* Show every image in this topic group. */}
                        <div className="flex -space-s-2 flex-shrink-0">
                          {u.posts.slice(0, 3).map((pp, k) => (
                            <img key={k} src={pp.items?.[0]?.url} alt="" className="w-9 h-9 rounded object-cover border border-slate-900" />
                          ))}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] text-white truncate font-semibold">
                            {unitTitle(u) || `#${i + 1}`}
                            {u.posts.length > 1 && <span className="text-[9px] text-slate-400 font-normal"> ({u.posts.length} {isRtl ? "صور" : "imgs"})</span>}
                          </p>
                          <div className="flex gap-1 mt-1">
                            <input
                              type="date"
                              value={slot.date}
                              min={todayISO()}
                              onChange={(e) => updateManualSlot(i, { date: e.target.value })}
                              className="flex-1 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-white outline-none focus:border-indigo-500"
                            />
                            <input
                              type="time"
                              value={slot.time}
                              onChange={(e) => updateManualSlot(i, { time: e.target.value })}
                              dir="ltr"
                              className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-white outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: live schedule preview ─────────────────────────── */}
          <div className="p-5 md:overflow-y-auto bg-slate-950/50">
            <h3 className="text-[12px] font-bold text-slate-300 mb-2 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              {isRtl ? `جدول النشر (${slots.length})` : `Preview (${slots.length})`}
            </h3>
            {slots.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-[12px]">
                {isRtl ? "اختر إعدادات أعلاه لعرض الجدول." : "Pick settings to see the schedule."}
              </div>
            ) : (
              <div className="space-y-1.5">
                {orderedUnits.map((u, i) => {
                  const slot = slots[i];
                  if (!slot) return null;
                  const isPast = pastFlags[i];
                  return (
                    <div
                      key={u.key}
                      className={`rounded-lg p-2 border ${
                        isPast ? "bg-red-900/20 border-red-500/40" : "bg-slate-800/60 border-slate-700/40"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                          <button onClick={() => moveItem(i, i - 1)} disabled={i === 0}
                            className="w-4 h-4 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[9px] leading-none disabled:opacity-30 flex items-center justify-center" title={isRtl ? "أعلى" : "Up"}>▲</button>
                          <span className="text-[10px] text-slate-500 font-bold">{i + 1}</span>
                          <button onClick={() => moveItem(i, i + 1)} disabled={i === orderedUnits.length - 1}
                            className="w-4 h-4 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[9px] leading-none disabled:opacity-30 flex items-center justify-center" title={isRtl ? "أسفل" : "Down"}>▼</button>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] text-white truncate font-semibold">{unitTitle(u) || `#${i + 1}`}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className={`text-[10px] font-semibold ${isPast ? "text-red-300 line-through" : "text-indigo-300"}`}>📅 {formatDateLabel(slot.date, isRtl)}</span>
                            <span className={`text-[10px] font-semibold ${isPast ? "text-red-300 line-through" : "text-emerald-300"}`} dir="ltr">🕐 {slot.time}</span>
                            {isPast && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/30 text-red-200 font-bold">{isRtl ? "⚠️ ماضي" : "⚠️ Past"}</span>}
                          </div>
                        </div>
                      </div>
                      {/* This topic's images — read-only thumbnails + size. */}
                      <div className="mt-1.5 ms-6 flex flex-wrap gap-1.5">
                        {u.posts.map((p, k) => {
                          const cover = p.items?.[0];
                          return (
                            <span key={k} className="inline-flex items-center gap-1 bg-slate-900/60 rounded px-1 py-0.5">
                              {cover && <img src={cover.url} alt="" className="w-6 h-6 rounded object-cover" />}
                              <span className="text-[9px] font-bold text-slate-400">{aspectByPost[p.post_id] || ""}</span>
                            </span>
                          );
                        })}
                      </div>
                      {/* Where each image lands — platform → type. The ✕ drops
                          that single line for THIS topic (the exception path);
                          excluded lines show struck-through with an undo (↩). */}
                      <div className="mt-1.5 ms-6 space-y-0.5">
                        {distributionForUnit(u).map((e, k) => {
                          const isStory = e.type === "story";
                          const off = e.excluded;
                          return (
                            <div key={k} className="flex items-center gap-1.5 text-[10px]">
                              <button
                                type="button"
                                onClick={() => toggleExcluded(e.key)}
                                title={off ? (isRtl ? "إرجاع" : "Restore") : (isRtl ? "إلغاء لهذا الموضوع" : "Drop for this topic")}
                                className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold transition ${
                                  off ? "bg-emerald-700/60 hover:bg-emerald-600 text-white" : "bg-slate-700 hover:bg-red-600 text-slate-200"
                                }`}
                              >
                                {off ? "↩" : "✕"}
                              </button>
                              <span className={off ? "text-slate-600 line-through" : "text-slate-200"}>{platformEmoji(e.platform)} {platformLabel(e.platform, isRtl)}</span>
                              <span className={off ? "text-slate-600 line-through" : isStory ? "text-fuchsia-300" : "text-indigo-300"}>← {isStory ? (isRtl ? "ستوري" : "story") : (isRtl ? "بوست" : "feed")}</span>
                              {e.posts.length > 1 && !off && <span className="text-amber-300">{isRtl ? `ألبوم ${e.posts.length}` : `album ${e.posts.length}`}</span>}
                              {e.substituted && !off && <span className="text-amber-300" title={isRtl ? `لا يوجد ${e.ideal}؛ استخدمنا ${e.got}` : ""}>⚠️ {e.got}→{e.ideal}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 p-3 flex items-center justify-between gap-2 bg-slate-900">
          <p className={`text-[11px] flex-1 ${
            pastCount > 0 ? "text-red-300 font-semibold"
              : success > 0 && resultDetail?.backendCount < success ? "text-amber-300 font-semibold"
              : "text-slate-400"
          }`}>
            {success > 0 ? (
              // Mixed-result summary tells the user exactly what landed
              // on the backend (will auto-publish) vs only on disk
              // (won't publish until backend is back).
              resultDetail?.backendCount === success ? (
                isRtl
                  ? `✓ تمت جدولة ${success} منشور وسيتم نشرها تلقائياً!`
                  : `✓ Scheduled ${success} post${success === 1 ? "" : "s"} — auto-publish armed!`
              ) : resultDetail?.backendCount > 0 ? (
                isRtl
                  ? `⚠️ ${resultDetail.backendCount} للنشر التلقائي + ${resultDetail.localCount} محلياً فقط (شغّل الخادم).`
                  : `⚠️ ${resultDetail.backendCount} auto-publish ready + ${resultDetail.localCount} local-only (start the backend).`
              ) : (
                isRtl
                  ? `📁 ${success} محفوظ محلياً فقط — لن يُنشر تلقائياً حتى يعود الخادم.`
                  : `📁 ${success} saved locally only — won't auto-publish until the backend is online.`
              )
            ) : pastCount > 0 ? (
              isRtl
                ? `⚠️ ${pastCount} موعد في الماضي — لا يمكن الجدولة. عدّل التاريخ أو الوقت.`
                : `⚠️ ${pastCount} slot${pastCount === 1 ? " is" : "s are"} in the past — can't schedule. Adjust the date or time.`
            ) : backendUp === false ? (
              isRtl
                ? "📁 سيُحفظ محلياً — لن يُنشر حتى يعود الخادم."
                : "📁 Will save locally — no publishing until backend is back."
            ) : (
              isRtl
                ? "🚀 سيتم الحفظ والنشر التلقائي في الوقت المحدد."
                : "🚀 Will save and auto-publish at the scheduled time."
            )}
          </p>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm transition disabled:opacity-50"
          >
            {isRtl ? "إلغاء" : "Cancel"}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || saving}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition disabled:opacity-50 flex items-center gap-2"
          >
            {success > 0
              ? <CheckCircle2 className="w-4 h-4" />
              : <Calendar className="w-4 h-4" />}
            {isRtl
              ? (saving ? "جارٍ الحفظ…" : success > 0 ? "تم!" : `جدولة ${posts.length} صورة`)
              : (saving ? "Saving…" : success > 0 ? "Done!" : `Schedule ${posts.length}`)}
          </button>
        </div>

        {/* Substitution confirmation — a platform got a non-ideal size. */}
        {confirmSubs && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4" onClick={() => setConfirmSubs(null)}>
            <div className="bg-slate-900 rounded-xl border border-amber-500/40 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b border-slate-800">
                <p className="font-bold text-amber-300 text-sm">⚠️ {isRtl ? "تنبيه مقاسات" : "Size notice"}</p>
                <p className="text-[11px] text-slate-400 mt-1">{isRtl ? "بعض المنصات ما لها مقاس مناسب في موضوعها، فاخترنا أقرب مقاس متوفّر:" : "Some platforms had no ideal size; closest was used:"}</p>
              </div>
              <div className="p-4 space-y-1.5">
                {confirmSubs.subs.map((s, k) => (
                  <div key={k} className="text-[12px] text-slate-200 flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold">{s.title || "—"}</span>
                    <span className="text-slate-400">←</span>
                    <span>{platformEmoji(s.platform)} {platformLabel(s.platform, isRtl)}</span>
                    <span className="text-amber-300">{isRtl ? `استخدمنا ${s.got} بدل ${s.ideal}` : `used ${s.got} instead of ${s.ideal}`}</span>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-slate-800 flex gap-2">
                <button onClick={() => setConfirmSubs(null)} className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold">{isRtl ? "رجوع" : "Back"}</button>
                <button onClick={() => doSchedule(confirmSubs.payload)} className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold">{isRtl ? "نعم، أكمل الجدولة" : "Yes, continue"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Unused but kept exported so future "remove from schedule" UIs can lean
// on the same icon set without re-importing lucide separately.
export const _icons = { ChevronLeft, ChevronRight, Trash2 };
