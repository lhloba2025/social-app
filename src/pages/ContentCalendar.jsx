import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, Plus, Calendar,
  Clock, CheckCircle2, Timer, FileText, AlertCircle, Send
} from "lucide-react";

const PLATFORMS_COLOR = {
  instagram: "#E1306C", facebook: "#1877F2", tiktok: "#aaa",
  snapchat:  "#FFFC00", twitter:  "#1DA1F2", youtube: "#FF0000", linkedin: "#0A66C2",
};

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

function loadPosts() {
  try { return JSON.parse(localStorage.getItem("scheduled_posts") || "[]"); } catch { return []; }
}
function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }
function toYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function DayCell({ day, posts, isToday, isSelected, onClick }) {
  const hasPosts = posts.length > 0;
  return (
    <div
      onClick={() => onClick(day)}
      className={`min-h-[80px] p-2 rounded-xl border cursor-pointer transition select-none
        ${isSelected ? "border-indigo-500 bg-indigo-500/10" :
          isToday    ? "border-indigo-500/40 bg-indigo-500/5" :
          hasPosts   ? "border-slate-700 bg-slate-900 hover:border-slate-600" :
                       "border-slate-800/50 bg-slate-900/30 hover:border-slate-700"}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
          ${isToday ? "bg-indigo-600 text-white" : "text-slate-400"}`}>
          {day}
        </span>
        {hasPosts && <span className="text-[10px] text-slate-600">{posts.length}</span>}
      </div>
      <div className="space-y-1">
        {posts.slice(0, 2).map(post => (
          <div key={post.id} className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[post.status] || "bg-slate-500"}`} />
            <span className="text-[9px] text-slate-500 truncate leading-tight">
              {post.scheduleTime || ""} {post.caption?.slice(0, 18) || "منشور"}
            </span>
          </div>
        ))}
        {posts.length > 2 && (
          <p className="text-[9px] text-slate-600">+{posts.length - 2}</p>
        )}
      </div>
    </div>
  );
}

function DayDetail({ date, posts, onNewPost, onNavigate, ar }) {
  if (!date) return null;
  const STATUS_CONFIG = {
    draft:     { ar: "مسودة",        en: "Draft",     icon: FileText,     cls: "text-slate-400 bg-slate-800 border-slate-700" },
    scheduled: { ar: "مجدول",        en: "Scheduled", icon: Timer,        cls: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30" },
    queued:    { ar: "قيد الإرسال",  en: "Queued",    icon: Send,         cls: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
    published: { ar: "منشور",        en: "Published", icon: CheckCircle2, cls: "text-green-400 bg-green-500/10 border-green-500/30" },
    failed:    { ar: "فشل",          en: "Failed",    icon: AlertCircle,  cls: "text-red-400 bg-red-500/10 border-red-500/30" },
  };

  return (
    <div className="w-72 flex-shrink-0 border-s border-slate-800 bg-slate-900 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-bold text-white text-sm">{date}</p>
          <p className="text-xs text-slate-500">{posts.length} {ar ? "منشور" : "posts"}</p>
        </div>
        <button
          onClick={() => onNewPost(date)}
          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition"
        >
          <Plus className="w-3 h-3" />
          {ar ? "إضافة" : "Add"}
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
          <Calendar className="w-8 h-8 text-slate-700" />
          <p className="text-slate-600 text-sm">{ar ? "لا توجد منشورات" : "No posts"}</p>
          <button
            onClick={() => onNewPost(date)}
            className="text-indigo-400 text-xs hover:text-indigo-300 transition mt-1"
          >
            + {ar ? "أنشئ منشوراً" : "Create post"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => {
            const s = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;
            const SIcon = s.icon;
            return (
              <div
                key={post.id}
                onClick={() => onNavigate(`/PostComposer?edit=${post.id}`)}
                className="p-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 cursor-pointer transition"
              >
                <div className="flex items-start gap-2.5">
                  {post.media?.thumbnail ? (
                    <img src={post.media.thumbnail} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-700 flex-shrink-0 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-slate-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                      {post.caption || (ar ? "بدون كابشن" : "No caption")}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {post.scheduleTime && (
                        <span className="flex items-center gap-0.5 text-[10px] text-slate-500">
                          <Clock className="w-2.5 h-2.5" />{post.scheduleTime}
                        </span>
                      )}
                      <span className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border ${s.cls}`}>
                        <SIcon className="w-2.5 h-2.5" />{ar ? s.ar : s.en}
                      </span>
                    </div>
                    <div className="flex gap-1 mt-1.5">
                      {(post.platforms || []).map(pid => (
                        <span key={pid} className="w-2 h-2 rounded-full" style={{ background: PLATFORMS_COLOR[pid] || "#666" }} />
                      ))}
                    </div>
                  </div>
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

  useEffect(() => { setPosts(loadPosts()); }, []);

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
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-[11px] text-slate-500 font-semibold py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {cells.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} />;
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
        </div>

        <DayDetail
          date={selectedDateStr}
          posts={selectedPosts}
          ar={ar}
          onNewPost={(d) => navigate(`/PostComposer?date=${d}`)}
          onNavigate={navigate}
        />
      </div>
    </div>
  );
}
