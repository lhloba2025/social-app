import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Calendar, Clock, Trash2, Edit3,
  Filter, LayoutGrid, List, CheckCircle2,
  AlertCircle, Timer, FileText, Send,
  Instagram, Facebook, Youtube, Twitter,
  ImagePlus, MoreVertical, RefreshCw
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PLATFORMS = {
  instagram: { labelAr: "انستقرام", labelEn: "Instagram", color: "#E1306C" },
  facebook:  { labelAr: "فيسبوك",   labelEn: "Facebook",  color: "#1877F2" },
  tiktok:    { labelAr: "تيك توك",  labelEn: "TikTok",    color: "#aaa" },
  snapchat:  { labelAr: "سناب",     labelEn: "Snapchat",  color: "#FFFC00" },
  twitter:   { labelAr: "تويتر",    labelEn: "Twitter/X", color: "#1DA1F2" },
  youtube:   { labelAr: "يوتيوب",   labelEn: "YouTube",   color: "#FF0000" },
  linkedin:  { labelAr: "لينكدإن",  labelEn: "LinkedIn",  color: "#0A66C2" },
};

const STATUS_CONFIG = {
  draft:      { ar: "مسودة",       en: "Draft",     icon: FileText,     cls: "text-slate-400 bg-slate-800 border-slate-700" },
  scheduled:  { ar: "مجدول",      en: "Scheduled", icon: Timer,        cls: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30" },
  queued:     { ar: "قيد الإرسال",en: "Queued",    icon: Send,         cls: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
  published:  { ar: "منشور",      en: "Published", icon: CheckCircle2, cls: "text-green-400 bg-green-500/10 border-green-500/30" },
  failed:     { ar: "فشل",        en: "Failed",    icon: AlertCircle,  cls: "text-red-400 bg-red-500/10 border-red-500/30" },
};

function loadPosts() {
  try { return JSON.parse(localStorage.getItem("scheduled_posts") || "[]"); } catch { return []; }
}
function deleteSavedPost(id) {
  const posts = loadPosts().filter(p => p.id !== id);
  localStorage.setItem("scheduled_posts", JSON.stringify(posts));
}
function formatDate(iso, ar = true) {
  if (!iso) return ar ? "غير محدد" : "Not set";
  try {
    return new Date(iso).toLocaleDateString(ar ? "ar-SA" : "en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch { return iso; }
}
function formatTime(t) {
  if (!t) return "";
  try {
    const [h, m] = t.split(":");
    const hr = parseInt(h);
    return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? "م" : "ص"}`;
  } catch { return t; }
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function PostCard({ post, onDelete, onEdit, view, ar = true }) {
  const [menu, setMenu] = useState(false);
  const status = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;
  const StatusIcon = status.icon;
  const statusLabel = ar ? status.ar : status.en;

  if (view === "list") {
    return (
      <div className="flex items-center gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition group">
        {/* Thumbnail */}
        <div className="w-12 h-12 rounded-lg bg-slate-800 flex-shrink-0 overflow-hidden">
          {post.media?.thumbnail
            ? <img src={post.media.thumbnail} className="w-full h-full object-cover" alt="" />
            : <div className="w-full h-full flex items-center justify-center"><ImagePlus className="w-4 h-4 text-slate-600" /></div>}
        </div>

        {/* Caption */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-200 truncate">{post.caption || (ar ? "بدون كابشن" : "No caption")}</p>
          <div className="flex items-center gap-3 mt-1">
            {/* Platforms */}
            <div className="flex gap-1">
              {(post.platforms || []).slice(0, 4).map(pid => (
                <span key={pid} className="w-2 h-2 rounded-full" style={{ background: PLATFORMS[pid]?.color || "#666" }} />
              ))}
            </div>
            {post.scheduledAt && (
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(post.scheduleDate, ar)} {formatTime(post.scheduleTime)}
              </span>
            )}
          </div>
        </div>

        {/* Status */}
        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold flex-shrink-0 ${status.cls}`}>
          <StatusIcon className="w-3 h-3" />
          {statusLabel}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <button onClick={() => onEdit(post)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(post.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Grid card
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition group">
      {/* Media */}
      <div className="aspect-square bg-slate-950 relative">
        {post.media?.thumbnail
          ? <img src={post.media.thumbnail} className="w-full h-full object-cover" alt="" />
          : <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-700">
              <ImagePlus className="w-8 h-8" />
              <p className="text-xs">{ar ? "لا توجد صورة" : "No image"}</p>
            </div>}

        {/* Status badge */}
        <div className="absolute top-2 start-2">
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold backdrop-blur-sm ${status.cls}`}>
            <StatusIcon className="w-2.5 h-2.5" />
            {statusLabel}
          </span>
        </div>

        {/* Actions overlay */}
        <div className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition flex gap-1">
          <button onClick={() => onEdit(post)} className="w-7 h-7 rounded-lg bg-slate-900/80 flex items-center justify-center text-slate-300 hover:text-white transition backdrop-blur-sm">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(post.id)} className="w-7 h-7 rounded-lg bg-slate-900/80 flex items-center justify-center text-slate-300 hover:text-red-400 transition backdrop-blur-sm">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="px-3 py-3">
        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed min-h-[32px]">
          {post.caption || <span className="text-slate-600">{ar ? "بدون كابشن" : "No caption"}</span>}
        </p>

        <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-slate-800">
          {/* Platforms dots */}
          <div className="flex gap-1.5 items-center">
            {(post.platforms || []).map(pid => (
              <span
                key={pid}
                title={PLATFORMS[pid]?.labelAr}
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: PLATFORMS[pid]?.color || "#666" }}
              />
            ))}
          </div>

          {/* Date */}
          {post.scheduledAt ? (
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {post.scheduleDate} {post.scheduleTime}
            </span>
          ) : (
            <span className="text-[10px] text-slate-600">{ar ? "غير مجدول" : "Not scheduled"}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function PostsManager({ language }) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("grid");
  const ar = (language || localStorage.getItem("appLanguage") || "ar") === "ar";

  const T = {
    title:         ar ? "إدارة المنشورات"              : "Posts Manager",
    newPost:       ar ? "منشور جديد"                   : "New Post",
    all:           ar ? "الكل"                          : "All",
    draft:         ar ? "المسودات"                      : "Drafts",
    scheduled:     ar ? "المجدولة"                      : "Scheduled",
    published:     ar ? "المنشورة"                      : "Published",
    failed:        ar ? "الفاشلة"                       : "Failed",
    queued:        ar ? "قيد الإرسال"                   : "Queued",
    empty:         ar ? "لا توجد منشورات"               : "No posts yet",
    emptyHint:     ar ? "أنشئ منشوراً جديداً للبدء"    : "Create a new post to get started",
    deleteConfirm: ar ? "هل تريد حذف هذا المنشور؟"     : "Delete this post?",
    posts:         ar ? "منشور"                         : "posts",
    scheduled_lbl: ar ? "مجدول"                         : "scheduled",
    draft_lbl:     ar ? "مسودة"                         : "draft",
  };

  const load = () => setPosts(loadPosts());
  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? posts : posts.filter(p => p.status === filter);

  const handleDelete = (id) => {
    if (!window.confirm(T.deleteConfirm)) return;
    deleteSavedPost(id);
    load();
  };

  const handleEdit = (post) => {
    // Navigate to composer with post data for editing
    navigate(`/PostComposer?edit=${post.id}`);
  };

  const FILTERS = [
    { key: "all", label: T.all },
    { key: "draft", label: T.draft },
    { key: "scheduled", label: T.scheduled },
    { key: "queued", label: T.queued },
    { key: "published", label: T.published },
    { key: "failed", label: T.failed },
  ];

  // Counts
  const counts = posts.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {});

  return (
    <div dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{T.title}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {posts.length} {T.posts} •
              {counts.scheduled ? ` ${counts.scheduled} ${T.scheduled_lbl}` : ""}
              {counts.draft ? ` • ${counts.draft} ${T.draft_lbl}` : ""}
            </p>
          </div>
          <button
            onClick={() => navigate("/PostComposer")}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition"
          >
            <Plus className="w-4 h-4" />
            {T.newPost}
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { key: "scheduled", color: "indigo" },
            { key: "published", color: "green" },
            { key: "draft",     color: "slate" },
            { key: "failed",    color: "red" },
          ].map(({ key, color }) => {
            const s = STATUS_CONFIG[key];
            const Icon = s.icon;
            return (
              <div key={key} className={`p-3 rounded-xl border ${s.cls} flex items-center gap-2`}>
                <Icon className="w-4 h-4" />
                <div>
                  <p className="text-lg font-bold leading-none">{counts[key] || 0}</p>
                  <p className="text-[10px] opacity-70 mt-0.5">{ar ? s.ar : s.en}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters + View toggle */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/50">
        <div className="flex gap-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition
                ${filter === f.key ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
            >
              {f.label}
              {f.key !== "all" && counts[f.key] ? (
                <span className="ms-1.5 bg-white/10 px-1.5 py-0.5 rounded-full text-[10px]">{counts[f.key]}</span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button onClick={() => setView("grid")} className={`p-2 rounded-lg transition ${view === "grid" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-white"}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setView("list")} className={`p-2 rounded-lg transition ${view === "list" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-white"}`}>
            <List className="w-4 h-4" />
          </button>
          <button onClick={load} className="p-2 rounded-lg text-slate-500 hover:text-white transition" title="تحديث">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center">
              <FileText className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-400 font-semibold">{T.empty}</p>
            <p className="text-slate-600 text-sm">{T.emptyHint}</p>
            <button
              onClick={() => navigate("/PostComposer")}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition mt-2"
            >
              <Plus className="w-4 h-4" />
              {T.newPost}
            </button>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map(post => (
              <PostCard key={post.id} post={post} view="grid" ar={ar} onDelete={handleDelete} onEdit={handleEdit} />
            ))}
          </div>
        ) : (
          <div className="space-y-2 max-w-3xl">
            {filtered.map(post => (
              <PostCard key={post.id} post={post} view="list" ar={ar} onDelete={handleDelete} onEdit={handleEdit} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
