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
import { buildRecurringSlots, buildSequentialSlots, todayISO } from "@/utils/localScheduleStore";
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

  // Post type(s) for the whole batch — can be BOTH feed and story at once.
  const [postTypes, setPostTypes] = useState(["feed"]);
  const togglePostType = (id) =>
    setPostTypes((arr) =>
      arr.includes(id)
        ? (arr.length > 1 ? arr.filter((x) => x !== id) : arr) // keep at least one
        : [...arr, id]
    );

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

  // Daily mode
  const [everyN, setEveryN] = useState(1);
  const [dailyTime, setDailyTime] = useState("19:00");

  // Same-day mode — put SEVERAL posts on ONE day, spread out by a fixed
  // gap. This is the "I want 4 posts today" path that the recurring/daily
  // modes (one-per-day) couldn't express.
  const [sameDayDate, setSameDayDate] = useState(todayISO());
  const [sameDayStart, setSameDayStart] = useState("10:00");
  const [sameDayGap, setSameDayGap] = useState(120); // minutes between posts

  // Manual mode — initialise lazily from the posts list
  const [manualSlots, setManualSlots] = useState([]);

  // Reset manual slots when posts change (or modal opens) so we don't
  // carry stale entries across opens.
  React.useEffect(() => {
    if (!isOpen) return;
    setManualSlots(posts.map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i); // one per day starting today
      return {
        date: d.toISOString().slice(0, 10),
        time: "19:00",
      };
    }));
  }, [isOpen, posts]);

  // Manual ordering — lets the user reorder which post lands in which
  // slot BEFORE confirming ("change its place"). `order` holds
  // display-position → original-index. Reset whenever the modal opens or
  // the incoming posts change so we never carry a stale order.
  const [order, setOrder] = useState([]);
  React.useEffect(() => {
    if (!isOpen) return;
    setOrder(posts.map((_, i) => i));
  }, [isOpen, posts]);
  const orderedPosts = (order.length === posts.length)
    ? order.map((i) => posts[i]).filter(Boolean)
    : posts;
  const moveItem = (from, to) => {
    setOrder((prev) => {
      const base = prev.length === posts.length ? prev.slice() : posts.map((_, i) => i);
      if (to < 0 || to >= base.length) return base;
      const [x] = base.splice(from, 1);
      base.splice(to, 0, x);
      return base;
    });
  };

  // ── Generate the slot list from current settings ────────────────────
  const slots = useMemo(() => {
    if (!posts.length) return [];
    if (mode === "weekly") {
      if (!weekdays.length) return [];
      return buildRecurringSlots({
        startISO,
        weekdays,
        timesByDay,
        count: posts.length,
        defaultTime: DEFAULT_DAY_TIME,
      });
    }
    if (mode === "daily") {
      return buildSequentialSlots({
        startISO,
        everyN: Math.max(1, parseInt(everyN) || 1),
        time: dailyTime,
        count: posts.length,
      });
    }
    if (mode === "sameday") {
      // All posts on ONE date, at start + i*gap minutes.
      const [hh, mm] = (sameDayStart || "10:00").split(":").map(Number);
      let mins = (hh || 0) * 60 + (mm || 0);
      const gap = Math.max(1, parseInt(sameDayGap) || 1);
      const out = [];
      for (let i = 0; i < posts.length; i++) {
        const h = Math.floor(mins / 60) % 24;
        const m = mins % 60;
        out.push({
          date: sameDayDate,
          time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        });
        mins += gap;
      }
      return out;
    }
    // manual
    return manualSlots.slice(0, posts.length);
  }, [mode, posts, weekdays, timesByDay, startISO, everyN, dailyTime, manualSlots, sameDayDate, sameDayStart, sameDayGap]);

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
    if (!posts.length) return false;
    if (mode === "weekly" && weekdays.length === 0) return false;
    if (slots.length !== posts.length) return false;
    // Block any past slot — we don't want to write a "scheduled" post
    // whose time has already gone by; it would either fire immediately
    // (bad) or rot in the queue forever (also bad).
    if (pastCount > 0) return false;
    return true;
  }, [posts.length, mode, weekdays.length, slots.length, pastCount]);

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSaving(true);
    setResultDetail(null);

    // One scheduled-post entry per source post. We use the post's cover
    // image as the media thumbnail, the caption (title + text) as the
    // post body, and the platform from the source post.
    //
    // Important: `media.url` is what the BACKEND scheduler hands to
    // Meta/TikTok APIs as the public image URL — those APIs need a URL
    // they can fetch from the public internet (Cloudinary URLs work,
    // localhost blob URLs DON'T). So we use `cover.url` for both
    // `url` (publish target) and `thumbnail` (UI preview).
    // One entry per (source post × selected post type). If the user picked
    // both feed + story, each post yields TWO scheduled entries.
    const payload = orderedPosts.flatMap((p, i) => {
      const slot = slots[i];
      const cover = p.items?.[0];
      const captionParts = [];
      if (p.caption_title) captionParts.push(p.caption_title);
      if (p.caption_text)  captionParts.push(p.caption_text);
      const caption = captionParts.join("\n\n");
      const base = {
        status: "scheduled",
        platforms: pubPlatforms.length ? pubPlatforms : (p.platform ? [p.platform] : []),
        caption,
        scheduleDate: slot.date,
        scheduleTime: slot.time,
        scheduledAt:  `${slot.date}T${slot.time}`,
        media: cover ? {
          type: cover.type || "image",
          id: cover.id,
          name: cover.name,
          url: cover.url,          // ← what the backend hands to platform APIs
          thumbnail: cover.url,    // ← UI preview
        } : null,
        designId: p.post_id,        // backend column is `design_id`
        sourcePostId: p.post_id,
        sourcePostItemCount: p.items?.length || 1,
      };
      return postTypes.map((pt) => ({ ...base, postType: pt }));
    });

    // Goes through publishingService: tries backend first, falls back
    // to localStorage per-post. The envelope tells us which path each
    // post took so we can show a useful summary.
    const result = await createScheduledPosts(payload);
    setSuccess(result.persisted.length);
    setResultDetail({
      backendCount: result.backendCount,
      localCount:   result.localCount,
      hasErrors:    result.errors.length > 0,
    });
    setSaving(false);
    if (onSuccess) onSuccess(result.persisted);
    // Hold the success view a bit longer when there's a mixed result
    // so the user can read the "saved locally, backend down" warning.
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
        className="bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-700"
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
                ? `${posts.length} منشور جاهز للجدولة`
                : `${posts.length} post${posts.length === 1 ? "" : "s"} ready to schedule`}
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
              <p className="text-[10px] text-slate-500 mt-1">
                {isRtl ? "اختر منصة أو أكثر — نفس المحتوى يُنشر على كل اللي تختاره." : "Pick one or more — the same content posts to all selected."}
              </p>
            </div>

            {/* Post type: feed and/or story (multi-select) */}
            <div>
              <label className="text-slate-300 text-[12px] font-bold block mb-1.5">
                {isRtl ? "نوع المنشور (تقدر تختار الاثنين):" : "Post type (pick both if you like):"}
              </label>
              <div className="grid grid-cols-2 gap-1 bg-slate-800/60 rounded-lg p-1">
                {[
                  { id: "feed",  ar: "📷 بوست", en: "📷 Feed" },
                  { id: "story", ar: "⭕ ستوري (الحالة)", en: "⭕ Story" },
                ].map((t) => {
                  const active = postTypes.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => togglePostType(t.id)}
                      className={`py-2 rounded text-[12px] font-bold transition inline-flex items-center justify-center gap-1 ${
                        active ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {isRtl ? t.ar : t.en}{active && " ✓"}
                    </button>
                  );
                })}
              </div>
              {postTypes.includes("story") && (
                <p className="text-[10px] text-amber-300/90 mt-1 leading-relaxed">
                  {isRtl
                    ? "لو اخترت الاثنين، يُنشر بوست وستوري معاً. الستوري لانستقرام وفيسبوك فقط (تيك توك/سناب لا يدعمانه)."
                    : "If both are picked, it posts a feed post AND a story. Stories are Instagram & Facebook only."}
                </p>
              )}
            </div>

            {/* Mode tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-slate-800/60 rounded-lg p-1">
              {[
                { id: "sameday", icon: Clock, ar: "نفس اليوم", en: "Same day" },
                { id: "weekly", icon: Repeat, ar: "أيام الأسبوع", en: "Weekly" },
                { id: "daily",  icon: Clock,  ar: "يومي",          en: "Daily" },
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

            {/* ── Same-day mode ─────────────────────────────────────── */}
            {mode === "sameday" && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1.5 font-semibold">
                    {isRtl ? "اليوم" : "Day"}
                  </label>
                  <input
                    type="date"
                    value={sameDayDate}
                    min={todayISO()}
                    onChange={(e) => setSameDayDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1.5 font-semibold">
                      {isRtl ? "وقت أول منشور" : "First post time"}
                    </label>
                    <input
                      type="time"
                      value={sameDayStart}
                      onChange={(e) => setSameDayStart(e.target.value)}
                      dir="ltr"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1.5 font-semibold">
                      {isRtl ? "الفاصل (دقائق)" : "Gap (minutes)"}
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="720"
                      step="5"
                      value={sameDayGap}
                      onChange={(e) => setSameDayGap(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  {isRtl
                    ? `💡 كل الـ ${posts.length} منشور في نفس اليوم، يبدأ ${sameDayStart} وبينهم ${sameDayGap} دقيقة. غيّر الفاصل لتباعد أوسع أو أضيق.`
                    : `💡 All ${posts.length} posts on the same day, starting ${sameDayStart}, ${sameDayGap} min apart. Adjust the gap to spread them.`}
                </p>
              </div>
            )}

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
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1.5 font-semibold">
                      {isRtl ? "كل كم يوم" : "Every N days"}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={everyN}
                      onChange={(e) => setEveryN(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1.5 font-semibold">
                      {isRtl ? "وقت النشر" : "Time"}
                    </label>
                    <input
                      type="time"
                      value={dailyTime}
                      onChange={(e) => setDailyTime(e.target.value)}
                      dir="ltr"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  {isRtl
                    ? `💡 سيتم نشر منشور كل ${everyN} ${everyN == 1 ? "يوم" : "أيام"} في الساعة ${dailyTime}.`
                    : `💡 One post every ${everyN} day${everyN == 1 ? "" : "s"} at ${dailyTime}.`}
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
                  {orderedPosts.map((p, i) => {
                    const slot = manualSlots[i] || { date: todayISO(), time: "19:00" };
                    const cover = p.items?.[0];
                    return (
                      <div key={p.post_id} className="bg-slate-800/60 rounded-lg p-2 flex items-center gap-2">
                        {/* Reorder controls — change which post lands in
                            which slot before scheduling. */}
                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => moveItem(i, i - 1)}
                            disabled={i === 0}
                            className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] leading-none disabled:opacity-30 flex items-center justify-center"
                            title={isRtl ? "أعلى" : "Up"}
                          >▲</button>
                          <button
                            onClick={() => moveItem(i, i + 1)}
                            disabled={i === orderedPosts.length - 1}
                            className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] leading-none disabled:opacity-30 flex items-center justify-center"
                            title={isRtl ? "أسفل" : "Down"}
                          >▼</button>
                        </div>
                        {cover && (
                          <img src={cover.url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] text-white truncate font-semibold">
                            {p.caption_title || cover?.name || `#${i + 1}`}
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
                {orderedPosts.map((p, i) => {
                  const slot = slots[i];
                  const cover = p.items?.[0];
                  if (!slot) return null;
                  const isPast = pastFlags[i];
                  return (
                    <div
                      key={p.post_id}
                      className={`rounded-lg p-2 flex items-center gap-2 border ${
                        isPast
                          ? "bg-red-900/20 border-red-500/40"
                          : "bg-slate-800/60 border-transparent"
                      }`}
                    >
                      {/* Order index + reorder arrows — drag-free way to
                          change which post takes which date/time slot. */}
                      <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => moveItem(i, i - 1)}
                          disabled={i === 0}
                          className="w-4 h-4 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[9px] leading-none disabled:opacity-30 flex items-center justify-center"
                          title={isRtl ? "أعلى" : "Up"}
                        >▲</button>
                        <span className="text-[10px] text-slate-500 font-bold">{i + 1}</span>
                        <button
                          onClick={() => moveItem(i, i + 1)}
                          disabled={i === orderedPosts.length - 1}
                          className="w-4 h-4 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[9px] leading-none disabled:opacity-30 flex items-center justify-center"
                          title={isRtl ? "أسفل" : "Down"}
                        >▼</button>
                      </div>
                      {cover && (
                        <img src={cover.url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-white truncate font-semibold">
                          {p.caption_title || cover?.name || `#${i + 1}`}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className={`text-[10px] font-semibold ${
                            isPast ? "text-red-300 line-through" : "text-indigo-300"
                          }`}>
                            📅 {formatDateLabel(slot.date, isRtl)}
                          </span>
                          <span className={`text-[10px] font-semibold ${
                            isPast ? "text-red-300 line-through" : "text-emerald-300"
                          }`} dir="ltr">
                            🕐 {slot.time}
                          </span>
                          {isPast && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/30 text-red-200 font-bold">
                              {isRtl ? "⚠️ تاريخ ماضي" : "⚠️ Past"}
                            </span>
                          )}
                        </div>
                      </div>
                      {p.platform && (
                        <span
                          className="text-[10px] inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-700/60 text-slate-200"
                          title={platformLabel(p.platform, isRtl)}
                        >
                          {platformEmoji(p.platform)}
                        </span>
                      )}
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
              ? (saving ? "جارٍ الحفظ…" : success > 0 ? "تم!" : `جدولة ${posts.length} منشور`)
              : (saving ? "Saving…" : success > 0 ? "Done!" : `Schedule ${posts.length}`)}
          </button>
        </div>
      </div>
    </div>
  );
}

// Unused but kept exported so future "remove from schedule" UIs can lean
// on the same icon set without re-importing lucide separately.
export const _icons = { ChevronLeft, ChevronRight, Trash2 };
