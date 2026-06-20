import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, Plus, Calendar,
  Clock, CheckCircle2, Timer, FileText, AlertCircle, Send,
  Cloud, CloudOff, Rocket, RotateCw, Ban
} from "lucide-react";
import { platformEmoji, platformLabel } from "@/components/BulkMediaUploadModal";
import { listAllPosts, isBackendAvailable, publishNow, deleteScheduledPost, cancelSchedule } from "@/utils/publishingService";

// Light/Tailwind class per platform for the cell pill — kept separate
// from the brand hex above because the pill needs a dimmed background,
// not the full brand colour (which would scream off the page).
const PLATFORM_PILL_CLS = {
  instagram: "bg-pink-50 text-pink-600 border-pink-200",
  facebook:  "bg-blue-50 text-blue-600 border-blue-200",
  tiktok:    "bg-slate-100 text-slate-700 border-slate-200",
  snapchat:  "bg-yellow-50 text-yellow-700 border-yellow-200",
  twitter:   "bg-sky-50 text-sky-600 border-sky-200",
  youtube:   "bg-red-50 text-red-600 border-red-200",
  linkedin:  "bg-blue-50 text-blue-700 border-blue-200",
};
function platformPillCls(id) {
  return PLATFORM_PILL_CLS[id] || "bg-slate-100 text-slate-600 border-slate-200";
}

const STATUS_DOT = {
  draft:     "bg-slate-500",
  scheduled: "bg-indigo-500",
  queued:    "bg-yellow-400",
  published: "bg-green-500",
  failed:    "bg-red-500",
};

const MONTH_NAMES_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const MONTH_NAMES_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES_AR   = ["أحد","إثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"];
const DAY_NAMES_EN   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }
function toYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

// DayCell — single cell of the compact mini-calendar widget.
// The new design treats the calendar as a date picker (~340px wide)
// rather than the page's main canvas. Each cell is just the day
// number with a tiny row of platform-coloured dots indicating what's
// scheduled. The actual post details live in the side panel beside it
// — that's where the user really wants the screen real estate.
function DayCell({ day, posts, isToday, isSelected, onClick }) {
  const hasPosts = posts.length > 0;
  // Up to 4 platform dots inline; anything beyond shows as "+N".
  const MAX_DOTS = 4;
  // Unique platforms for this day (dedup) — keeps the dot row from
  // exploding when the user schedules 5 posts on the same platform.
  const uniquePlatforms = Array.from(new Set(
    posts.flatMap((p) => p.platforms || []),
  ));
  return (
    <button
      onClick={() => onClick(day)}
      className={`aspect-square w-full p-0.5 rounded-md border text-xs transition select-none flex flex-col items-center justify-center gap-0.5 relative
        ${isSelected ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"  :
          isToday    ? "border-indigo-300 bg-indigo-50/60" :
          hasPosts   ? "border-slate-200 bg-white hover:border-slate-300" :
                       "border-transparent bg-slate-50 hover:border-slate-200"}`}
    >
      {/* Day number — slightly larger when selected/today for emphasis */}
      <span className={`text-[11px] font-bold leading-none ${
        isToday ? "text-indigo-600" : hasPosts ? "text-slate-900" : "text-slate-400"
      }`}>
        {day}
      </span>

      {/* Platform indicator row — emoji-based so the user instantly
          sees "this day has an instagram + a tiktok post" without
          opening the side panel. Empty days stay clean. */}
      {hasPosts && (
        <div className="flex items-center gap-0.5">
          {uniquePlatforms.slice(0, MAX_DOTS).map((pid) => (
            <span key={pid} className="text-[8px] leading-none">
              {platformEmoji(pid)}
            </span>
          ))}
          {uniquePlatforms.length > MAX_DOTS && (
            <span className="text-[7px] text-slate-400 font-bold">
              +{uniquePlatforms.length - MAX_DOTS}
            </span>
          )}
        </div>
      )}

      {/* Bottom-right count pill when there's more than one post */}
      {posts.length > 1 && (
        <span className="absolute top-0.5 end-0.5 text-[7px] font-bold w-3.5 h-3.5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center">
          {posts.length}
        </span>
      )}
    </button>
  );
}

// Format the selected date into a human-readable label for the
// detail panel header. Falls back to the raw ISO string if parsing
// fails (defensive — Date constructor on bad input would NaN).
function formatDayHeader(isoDate, ar) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return isoDate;
  return dt.toLocaleDateString(ar ? "ar-SA" : "en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function DayDetail({ date, posts, onNewPost, onNavigate, ar, backendUp, onPublishNow, onDelete, onCancel }) {
  if (!date) return null;
  const STATUS_CONFIG = {
    draft:     { ar: "مسودة",        en: "Draft",     icon: FileText,     cls: "text-slate-600 bg-slate-100 border-slate-200" },
    scheduled: { ar: "مجدول",        en: "Scheduled", icon: Timer,        cls: "text-indigo-600 bg-indigo-50 border-indigo-200" },
    queued:    { ar: "قيد الإرسال",  en: "Queued",    icon: Send,         cls: "text-yellow-700 bg-yellow-50 border-yellow-200" },
    published: { ar: "منشور",        en: "Published", icon: CheckCircle2, cls: "text-green-700 bg-green-50 border-green-200" },
    failed:    { ar: "فشل",          en: "Failed",    icon: AlertCircle,  cls: "text-red-600 bg-red-50 border-red-200" },
  };

  return (
    <div className="flex-1 min-w-0 p-5 overflow-y-auto" style={{ background: 'var(--hv-surface)' }}>
      {/* Header — bigger and more prominent now that this panel
          owns most of the screen real estate. Includes the friendly
          date format ("الأحد، 31 مايو 2026") so the user doesn't have
          to translate the ISO string in their head. */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="font-bold text-xl" style={{ color: 'var(--hv-text)' }}>{formatDayHeader(date, ar)}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--hv-text-soft)' }}>
            {(() => {
              const topics = new Set(posts.map(p => `${(p.caption || "").trim()}|${p.scheduleTime || ""}`)).size;
              const variantsNote = posts.length > topics ? (ar ? ` (${posts.length} نسخة)` : ` (${posts.length} variants)`) : "";
              return ar ? `${topics} منشور${variantsNote}` : `${topics} post${topics === 1 ? "" : "s"}${variantsNote}`;
            })()}
            {posts.length > 0 && (
              <> · {ar ? "اضغط على منشور للتعديل" : "click a post to edit"}</>
            )}
          </p>
        </div>
        <button
          onClick={() => onNewPost(date)}
          className="hv-btn hv-btn-primary text-sm"
        >
          <Plus className="w-4 h-4" />
          {ar ? "إضافة منشور" : "Add post"}
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
          <Calendar className="w-12 h-12" style={{ color: 'var(--hv-text-faint)' }} />
          <p className="text-sm" style={{ color: 'var(--hv-text-soft)' }}>{ar ? "لا توجد منشورات في هذا اليوم" : "No posts scheduled for this day"}</p>
          <button
            onClick={() => onNewPost(date)}
            className="hv-btn hv-btn-soft text-sm mt-2"
          >
            + {ar ? "أنشئ منشوراً" : "Create post"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {(() => {
            // Group the variants of one topic (same caption + time) into a
            // SINGLE card — so 2 topics across many platforms/formats don't
            // look like 8 separate posts.
            const groups = []; const gmap = new Map();
            for (const p of posts) {
              const key = `${(p.caption || "").trim()}|${p.scheduleTime || ""}`;
              if (!gmap.has(key)) { const g = { key, posts: [], platforms: [], formats: [] }; gmap.set(key, g); groups.push(g); }
              const g = gmap.get(key); g.posts.push(p);
              for (const pl of (p.platforms || [])) if (!g.platforms.includes(pl)) g.platforms.push(pl);
              const ft = p.postType || "feed"; if (!g.formats.includes(ft)) g.formats.push(ft);
            }
            return groups.map(g => {
            const post = g.posts[0];
            const statuses = [...new Set(g.posts.map(p => p.status))];
            const s = STATUS_CONFIG[statuses.length === 1 ? statuses[0] : "scheduled"] || STATUS_CONFIG.draft;
            const SIcon = s.icon;
            const platforms = g.platforms;
            const pubable = g.posts.filter(p => backendUp && ["scheduled", "draft", "failed"].includes(p.status));
            const cancelable = g.posts.filter(p => ["scheduled", "queued"].includes(p.status));
            const canPublishNow = pubable.length > 0;
            const canCancel = cancelable.length > 0;
            return (
              <div
                key={g.key}
                className="hv-card hv-card-hover p-3"
              >
                {/* Platform pill row — first thing the eye sees so the
                    "where is this going?" question gets answered before
                    they read the caption. Emoji + name + brand colour. */}
                {platforms.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {platforms.map((pid) => (
                      <span
                        key={pid}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${platformPillCls(pid)}`}
                      >
                        <span>{platformEmoji(pid)}</span>
                        <span>{platformLabel(pid, ar)}</span>
                      </span>
                    ))}
                  </div>
                )}

                <div
                  className="flex items-start gap-2.5 cursor-pointer"
                  onClick={() => onNavigate(`/PostComposer?edit=${post.id}`)}
                >
                  {post.media?.thumbnail ? (
                    <img src={post.media.thumbnail} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" alt="" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] line-clamp-2 leading-snug" style={{ color: 'var(--hv-text)' }}>
                      {post.caption || (ar ? "بدون كابشن" : "No caption")}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {post.scheduleTime && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-semibold" dir="ltr">
                          <Clock className="w-2.5 h-2.5" />{post.scheduleTime}
                        </span>
                      )}
                      {/* All formats present in this topic (feed / story). */}
                      {g.formats.map((ft) => (
                        <span key={ft} className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold border ${
                          ft === "story" ? "text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200" : "text-sky-600 bg-sky-50 border-sky-200"
                        }`}>
                          {ft === "story" ? (ar ? "⭕ ستوري" : "⭕ Story") : (ar ? "📷 بوست" : "📷 Feed")}
                        </span>
                      ))}
                      <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${s.cls}`}>
                        <SIcon className="w-2.5 h-2.5" />{ar ? s.ar : s.en}
                      </span>
                      {g.posts.length > 1 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold" title={ar ? "عدد النسخ (منصات/مقاسات)" : "variants"}>
                          ×{g.posts.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action row — Publish-Now and Delete. Stop propagation
                    on both so clicking them doesn't navigate to the
                    composer. */}
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t" style={{ borderColor: 'var(--hv-border)' }}>
                  {canPublishNow && (
                    <button
                      onClick={(e) => { e.stopPropagation(); pubable.forEach(p => onPublishNow?.(p.id)); }}
                      title={ar ? "نشر كل نسخ هذا الموضوع الآن" : "Publish all variants now"}
                      className="flex-1 flex items-center justify-center gap-1 text-[10px] px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold transition"
                    >
                      <Rocket className="w-3 h-3" />
                      {ar ? "انشر الآن" : "Publish now"}
                    </button>
                  )}
                  {canCancel && (
                    <button
                      onClick={(e) => { e.stopPropagation(); cancelable.forEach(p => onCancel?.(p)); }}
                      title={ar ? "إلغاء جدولة كل النسخ" : "Cancel all variants"}
                      className="flex items-center justify-center gap-1 text-[10px] px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold transition"
                    >
                      <Ban className="w-3 h-3" />
                      {ar ? "إلغاء" : "Cancel"}
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); if (window.confirm(ar ? `حذف كل نسخ هذا الموضوع (${g.posts.length})؟` : `Delete all ${g.posts.length} variants?`)) g.posts.forEach(p => onDelete?.(p.id)); }}
                    title={ar ? "حذف كل النسخ" : "Delete all"}
                    className="flex items-center justify-center text-[10px] px-2 py-1 rounded-md bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 transition"
                  >
                    🗑
                  </button>
                </div>
              </div>
            );
            });
          })()}
        </div>
      )}
    </div>
  );
}

export default function ContentCalendar({ language }) {
  const navigate = useNavigate();
  const ar = (language || localStorage.getItem("appLanguage") || "ar") === "ar";
  const today = new Date();
  const [year, setYear]     = useState(today.getFullYear());
  const [month, setMonth]   = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [posts, setPosts]   = useState([]);
  // Backend health state — null while we're probing, then true/false.
  // Drives a banner at the top of the page and the per-post action set
  // (Publish-Now is only useful when the backend is reachable).
  const [backendUp, setBackendUp] = useState(null);
  // Merge backend + local posts on mount and after any user action
  // that mutates them (publish-now / delete). Encapsulated in a
  // callback so the action handlers can reuse it.
  const refreshPosts = React.useCallback(async () => {
    const merged = await listAllPosts();
    setPosts(merged);
  }, []);

  useEffect(() => {
    refreshPosts();
    isBackendAvailable().then(setBackendUp);
  }, [refreshPosts]);

  // Action handlers — passed down to DayDetail so the post cards can
  // expose Publish-Now / Delete buttons. Each handler re-fetches after
  // success so the calendar reflects the new state immediately.
  const handlePublishNow = async (postId) => {
    if (!window.confirm(ar
      ? "النشر الآن سيغير الجدول إلى الدقيقة الحالية ويرسل المنشور خلال 60 ثانية. متابعة؟"
      : "Publish now will set the schedule to this minute. The backend will send within 60 seconds. Continue?")) return;
    const post = posts.find((p) => p.id === postId);
    const result = await publishNow(post || { id: postId });
    if (!result.ok) {
      alert(result.message || (ar ? "تعذّر إرسال أمر النشر." : "Couldn't trigger publish."));
      return;
    }
    refreshPosts();
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm(ar
      ? "حذف هذا المنشور من الجدول؟"
      : "Delete this scheduled post?")) return;
    await deleteScheduledPost(postId);
    refreshPosts();
  };

  const handleCancelPost = async (post) => {
    if (!window.confirm(ar
      ? "إلغاء جدولة هذا المنشور؟ بينحذف من القائمة ولن يُنشر — وتصميمه يبقى في المكتبة."
      : "Cancel this post's schedule? It's removed and won't publish — the design stays in your library.")) return;
    await cancelSchedule(post);
    refreshPosts();
  };

  const MONTH_NAMES = ar ? MONTH_NAMES_AR : MONTH_NAMES_EN;
  const DAY_NAMES   = ar ? DAY_NAMES_AR   : DAY_NAMES_EN;

  // Only surface scheduled / queued / published posts on the calendar — drafts
  // and failed attempts are hidden (their design stays in the library).
  const VISIBLE_STATUSES = ["scheduled", "queued", "published"];
  const visiblePosts = posts.filter(p => VISIBLE_STATUSES.includes(p.status));

  const postMap = {};
  visiblePosts.forEach(p => {
    if (p.scheduleDate) {
      if (!postMap[p.scheduleDate]) postMap[p.scheduleDate] = [];
      postMap[p.scheduleDate].push(p);
    }
  });

  const daysInMonth    = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDayOfMonth(year, month);
  const todayStr       = toYMD(today);

  const selectedDateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(selectedDay).padStart(2,"0")}`;
  const selectedPosts   = postMap[selectedDateStr] || [];

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(1);
  };

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const statusLabels = {
    draft:     { ar: "مسودة",       en: "Draft" },
    scheduled: { ar: "مجدول",       en: "Scheduled" },
    queued:    { ar: "قيد الإرسال", en: "Queued" },
    published: { ar: "منشور",       en: "Published" },
    failed:    { ar: "فشل",         en: "Failed" },
  };

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="hv-page flex flex-col"
      style={{
        '--hv-primary': '#4f46e5', '--hv-secondary': '#fb7185',
        '--hv-text': '#1e1b3a', '--hv-text-soft': '#5d5a76', '--hv-text-faint': '#9794ad',
        '--hv-surface': '#fff', '--hv-border': '#e8e9f5',
      }}
    >
      {/* Header */}
      <div className="border-b px-6 py-4 flex-shrink-0" style={{ background: 'var(--hv-surface)', borderColor: 'var(--hv-border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="hv-page-title" style={{ fontSize: '1.25rem' }}>{ar ? "تقويم المحتوى" : "Content Calendar"}</h1>
              <p className="hv-page-sub" style={{ fontSize: '.8rem', marginTop: 0 }}>{ar ? "خطّط ونظّم منشوراتك القادمة" : "Plan and organize your upcoming posts"}</p>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-1.5 rounded-lg transition hover:bg-slate-100" style={{ color: 'var(--hv-text-soft)' }}>
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold min-w-[130px] text-center" style={{ color: 'var(--hv-text)' }}>
                {MONTH_NAMES[month]} {year}
              </span>
              <button onClick={nextMonth} className="p-1.5 rounded-lg transition hover:bg-slate-100" style={{ color: 'var(--hv-text-soft)' }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDay(today.getDate()); }}
              className="hv-btn hv-btn-ghost text-xs"
            >
              {ar ? "اليوم" : "Today"}
            </button>
          </div>

          <button
            onClick={() => navigate("/PostComposer")}
            className="hv-btn hv-btn-primary text-sm"
          >
            <Plus className="w-4 h-4" />
            {ar ? "منشور جديد" : "New Post"}
          </button>
        </div>

        <div className="flex items-center gap-4 mt-3">
          {Object.entries(STATUS_DOT).map(([key, cls]) => (
            <span key={key} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--hv-text-soft)' }}>
              <span className={`w-2 h-2 rounded-full ${cls}`} />
              {ar ? statusLabels[key].ar : statusLabels[key].en}
            </span>
          ))}
          {/* Backend status — shown at the right so the user knows
              whether scheduled posts will actually publish. */}
          {backendUp !== null && (
            <span className={`ms-auto inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-bold ${
              backendUp
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}>
              {backendUp ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
              {backendUp
                ? (ar ? "الخادم متصل" : "Backend online")
                : (ar ? "الخادم غير متصل" : "Backend offline")}
            </span>
          )}
        </div>

        {/* Banner when backend is down — tells the user what to do */}
        {backendUp === false && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[12px] text-amber-800 flex items-start gap-2">
            <CloudOff className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <strong>{ar ? "الخادم الخلفي غير متاح." : "The backend is unreachable."}</strong>{" "}
              {ar
                ? "المنشورات المجدولة لن تُنشر تلقائياً حتى يعود الخادم. شغّله محلياً عبر "
                : "Scheduled posts won't auto-publish until the backend is online. Run it locally with "}
              <code className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-[10px]" dir="ltr">
                cd backend &amp;&amp; npm install &amp;&amp; npm run dev
              </code>
              {ar
                ? " ثم حدّث الصفحة. أو راجع "
                : ", then refresh. Or see "}
              <code className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-[10px]" dir="ltr">PUBLISHING_SETUP.md</code>
              {ar ? "." : "."}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-amber-700 hover:text-amber-900 underline text-[11px] font-semibold flex-shrink-0"
            >
              {ar ? "↻ إعادة فحص" : "↻ Re-check"}
            </button>
          </div>
        )}
      </div>

      {/* Body — narrow calendar widget + wide content area.
          The calendar used to be the page's main attraction (huge
          grid, tiny side panel). User feedback was that it ate ~90%
          of the screen for 7 days of dates with no information density.
          Now it's a compact ~340px date picker, and the agenda /
          post list takes everything else. */}
      <div className="flex flex-1 overflow-hidden">
        {/* Compact calendar widget */}
        <div className="w-[340px] flex-shrink-0 border-e p-3 overflow-y-auto" style={{ borderColor: 'var(--hv-border)', background: '#fafaff' }}>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-[9px] font-semibold py-0.5" style={{ color: 'var(--hv-text-soft)' }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} className="aspect-square" />;
              const dateStr  = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const dayPosts = postMap[dateStr] || [];
              return (
                <DayCell
                  key={day}
                  day={day}
                  posts={dayPosts}
                  isToday={dateStr === todayStr}
                  isSelected={day === selectedDay}
                  onClick={setSelectedDay}
                />
              );
            })}
          </div>

          {/* Quick stats — shows the user what's coming up at a glance
              without having to scrub through dates. */}
          <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--hv-border)' }}>
            <p className="text-[10px] font-semibold mb-1.5" style={{ color: 'var(--hv-text-soft)' }}>
              {ar ? "إحصاءات الشهر" : "This month"}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-white border rounded-lg p-2" style={{ borderColor: 'var(--hv-border)' }}>
                <p className="text-[9px]" style={{ color: 'var(--hv-text-soft)' }}>{ar ? "منشورات" : "Posts"}</p>
                <p className="text-lg font-bold" style={{ color: 'var(--hv-text)' }}>{visiblePosts.filter(p => p.scheduleDate?.startsWith(`${year}-${String(month+1).padStart(2,"0")}`)).length}</p>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2">
                <p className="text-[9px] text-indigo-500">{ar ? "اليوم" : "Today"}</p>
                <p className="text-lg font-bold text-indigo-700">{postMap[todayStr]?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Day detail — now takes flex-1 so it gets the lion's share */}
        <DayDetail
          date={selectedDateStr}
          posts={selectedPosts}
          ar={ar}
          backendUp={backendUp}
          onNewPost={(d) => navigate(`/PostComposer?date=${d}`)}
          onNavigate={navigate}
          onPublishNow={handlePublishNow}
          onDelete={handleDeletePost}
          onCancel={handleCancelPost}
        />
      </div>
    </div>
  );
}
