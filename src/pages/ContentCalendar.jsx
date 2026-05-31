import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, Plus, Calendar,
  Clock, CheckCircle2, Timer, FileText, AlertCircle, Send,
  Cloud, CloudOff, Rocket, RotateCw
} from "lucide-react";
import { platformEmoji, platformLabel } from "@/components/BulkMediaUploadModal";
import { listAllPosts, isBackendAvailable, publishNow, deleteScheduledPost } from "@/utils/publishingService";

// Light/Tailwind class per platform for the cell pill — kept separate
// from the brand hex above because the pill needs a dimmed background,
// not the full brand colour (which would scream off the page).
const PLATFORM_PILL_CLS = {
  instagram: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  facebook:  "bg-blue-500/20 text-blue-300 border-blue-500/30",
  tiktok:    "bg-slate-500/20 text-slate-200 border-slate-500/30",
  snapchat:  "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  twitter:   "bg-sky-500/20 text-sky-300 border-sky-500/30",
  youtube:   "bg-red-500/20 text-red-300 border-red-500/30",
  linkedin:  "bg-blue-700/30 text-blue-200 border-blue-600/30",
};
function platformPillCls(id) {
  return PLATFORM_PILL_CLS[id] || "bg-slate-700/40 text-slate-300 border-slate-600/30";
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
        ${isSelected ? "border-indigo-500 bg-indigo-500/15 ring-1 ring-indigo-500"  :
          isToday    ? "border-indigo-400/60 bg-indigo-500/5" :
          hasPosts   ? "border-slate-700 bg-slate-900 hover:border-slate-500" :
                       "border-transparent bg-slate-900/30 hover:border-slate-700"}`}
    >
      {/* Day number — slightly larger when selected/today for emphasis */}
      <span className={`text-[11px] font-bold leading-none ${
        isToday ? "text-indigo-300" : hasPosts ? "text-white" : "text-slate-500"
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
            <span className="text-[7px] text-slate-500 font-bold">
              +{uniquePlatforms.length - MAX_DOTS}
            </span>
          )}
        </div>
      )}

      {/* Bottom-right count pill when there's more than one post */}
      {posts.length > 1 && (
        <span className="absolute top-0.5 end-0.5 text-[7px] font-bold w-3.5 h-3.5 rounded-full bg-indigo-500/40 text-indigo-200 flex items-center justify-center">
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

function DayDetail({ date, posts, onNewPost, onNavigate, ar, backendUp, onPublishNow, onDelete }) {
  if (!date) return null;
  const STATUS_CONFIG = {
    draft:     { ar: "مسودة",        en: "Draft",     icon: FileText,     cls: "text-slate-400 bg-slate-800 border-slate-700" },
    scheduled: { ar: "مجدول",        en: "Scheduled", icon: Timer,        cls: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30" },
    queued:    { ar: "قيد الإرسال",  en: "Queued",    icon: Send,         cls: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
    published: { ar: "منشور",        en: "Published", icon: CheckCircle2, cls: "text-green-400 bg-green-500/10 border-green-500/30" },
    failed:    { ar: "فشل",          en: "Failed",    icon: AlertCircle,  cls: "text-red-400 bg-red-500/10 border-red-500/30" },
  };

  return (
    <div className="flex-1 min-w-0 bg-slate-900 p-5 overflow-y-auto">
      {/* Header — bigger and more prominent now that this panel
          owns most of the screen real estate. Includes the friendly
          date format ("الأحد، 31 مايو 2026") so the user doesn't have
          to translate the ISO string in their head. */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="font-bold text-white text-xl">{formatDayHeader(date, ar)}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {posts.length} {ar ? "منشور مجدول" : "scheduled post" + (posts.length === 1 ? "" : "s")}
            {posts.length > 0 && (
              <> · {ar ? "اضغط على منشور للتعديل" : "click a post to edit"}</>
            )}
          </p>
        </div>
        <button
          onClick={() => onNewPost(date)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition"
        >
          <Plus className="w-4 h-4" />
          {ar ? "إضافة منشور" : "Add post"}
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
          <Calendar className="w-12 h-12 text-slate-700" />
          <p className="text-slate-500 text-sm">{ar ? "لا توجد منشورات في هذا اليوم" : "No posts scheduled for this day"}</p>
          <button
            onClick={() => onNewPost(date)}
            className="text-indigo-400 text-sm hover:text-indigo-300 transition mt-2 px-3 py-1.5 rounded border border-indigo-500/30 hover:border-indigo-500"
          >
            + {ar ? "أنشئ منشوراً" : "Create post"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {posts.map(post => {
            const s = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;
            const SIcon = s.icon;
            const platforms = post.platforms || [];
            // Only published-eligible statuses get the Publish-Now
            // button. A "published" or "queued" post should NOT be
            // re-triggered (would duplicate); "failed" can be retried
            // by flipping it back to scheduled-now.
            const canPublishNow = backendUp && ["scheduled", "draft", "failed"].includes(post.status);
            return (
              <div
                key={post.id}
                className="p-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-indigo-500/50 transition"
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
                    <div className="w-12 h-12 rounded-lg bg-slate-700 flex-shrink-0 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-slate-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-slate-200 line-clamp-2 leading-snug">
                      {post.caption || (ar ? "بدون كابشن" : "No caption")}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {post.scheduleTime && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-300 bg-slate-900/60 px-1.5 py-0.5 rounded font-semibold" dir="ltr">
                          <Clock className="w-2.5 h-2.5" />{post.scheduleTime}
                        </span>
                      )}
                      <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${s.cls}`}>
                        <SIcon className="w-2.5 h-2.5" />{ar ? s.ar : s.en}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action row — Publish-Now and Delete. Stop propagation
                    on both so clicking them doesn't navigate to the
                    composer. */}
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-700">
                  {canPublishNow && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onPublishNow?.(post.id); }}
                      title={ar ? "إرسال هذا المنشور الآن" : "Publish this post now"}
                      className="flex-1 flex items-center justify-center gap-1 text-[10px] px-2 py-1 rounded-md bg-emerald-700/40 hover:bg-emerald-600/60 text-emerald-200 font-bold transition"
                    >
                      <Rocket className="w-3 h-3" />
                      {ar ? "انشر الآن" : "Publish now"}
                    </button>
                  )}
                  {post.status === "failed" && backendUp && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onPublishNow?.(post.id); }}
                      title={ar ? "إعادة المحاولة" : "Retry publishing"}
                      className="flex-1 flex items-center justify-center gap-1 text-[10px] px-2 py-1 rounded-md bg-amber-700/40 hover:bg-amber-600/60 text-amber-200 font-bold transition"
                    >
                      <RotateCw className="w-3 h-3" />
                      {ar ? "إعادة" : "Retry"}
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete?.(post.id); }}
                    title={ar ? "حذف" : "Delete"}
                    className="flex items-center justify-center text-[10px] px-2 py-1 rounded-md bg-slate-700/60 hover:bg-red-700/40 text-slate-300 hover:text-red-200 transition"
                  >
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
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

  const MONTH_NAMES = ar ? MONTH_NAMES_AR : MONTH_NAMES_EN;
  const DAY_NAMES   = ar ? DAY_NAMES_AR   : DAY_NAMES_EN;

  const postMap = {};
  posts.forEach(p => {
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
    <div dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white">{ar ? "تقويم المحتوى" : "Content Calendar"}</h1>

            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-white min-w-[130px] text-center">
                {MONTH_NAMES[month]} {year}
              </span>
              <button onClick={nextMonth} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDay(today.getDate()); }}
              className="px-3 py-1 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-xs transition"
            >
              {ar ? "اليوم" : "Today"}
            </button>
          </div>

          <button
            onClick={() => navigate("/PostComposer")}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition"
          >
            <Plus className="w-4 h-4" />
            {ar ? "منشور جديد" : "New Post"}
          </button>
        </div>

        <div className="flex items-center gap-4 mt-3">
          {Object.entries(STATUS_DOT).map(([key, cls]) => (
            <span key={key} className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className={`w-2 h-2 rounded-full ${cls}`} />
              {ar ? statusLabels[key].ar : statusLabels[key].en}
            </span>
          ))}
          {/* Backend status — shown at the right so the user knows
              whether scheduled posts will actually publish. */}
          {backendUp !== null && (
            <span className={`ms-auto inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-bold ${
              backendUp
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : "bg-amber-500/15 text-amber-300 border-amber-500/30"
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
          <div className="mt-3 bg-amber-900/30 border border-amber-500/30 rounded-lg px-3 py-2 text-[12px] text-amber-200 flex items-start gap-2">
            <CloudOff className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <strong>{ar ? "الخادم الخلفي غير متاح." : "The backend is unreachable."}</strong>{" "}
              {ar
                ? "المنشورات المجدولة لن تُنشر تلقائياً حتى يعود الخادم. شغّله محلياً عبر "
                : "Scheduled posts won't auto-publish until the backend is online. Run it locally with "}
              <code className="bg-slate-900/60 px-1.5 py-0.5 rounded text-[10px]" dir="ltr">
                cd backend &amp;&amp; npm install &amp;&amp; npm run dev
              </code>
              {ar
                ? " ثم حدّث الصفحة. أو راجع "
                : ", then refresh. Or see "}
              <code className="bg-slate-900/60 px-1.5 py-0.5 rounded text-[10px]" dir="ltr">PUBLISHING_SETUP.md</code>
              {ar ? "." : "."}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-amber-200 hover:text-amber-100 underline text-[11px] font-semibold flex-shrink-0"
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
        <div className="w-[340px] flex-shrink-0 border-e border-slate-800 bg-slate-900/50 p-3 overflow-y-auto">
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-[9px] text-slate-500 font-semibold py-0.5">{d}</div>
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
          <div className="mt-4 pt-3 border-t border-slate-800">
            <p className="text-[10px] text-slate-500 font-semibold mb-1.5">
              {ar ? "إحصاءات الشهر" : "This month"}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-slate-800/60 rounded-lg p-2">
                <p className="text-[9px] text-slate-400">{ar ? "منشورات" : "Posts"}</p>
                <p className="text-lg font-bold text-white">{posts.filter(p => p.scheduleDate?.startsWith(`${year}-${String(month+1).padStart(2,"0")}`)).length}</p>
              </div>
              <div className="bg-indigo-900/30 rounded-lg p-2">
                <p className="text-[9px] text-indigo-300">{ar ? "اليوم" : "Today"}</p>
                <p className="text-lg font-bold text-indigo-200">{postMap[todayStr]?.length || 0}</p>
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
        />
      </div>
    </div>
  );
}
