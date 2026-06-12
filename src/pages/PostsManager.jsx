import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Calendar, Clock, Trash2, Edit3,
  LayoutGrid, List, CheckCircle2,
  AlertCircle, Timer, FileText, Send,
  ImagePlus, RefreshCw, Ban
} from "lucide-react";
import { listAllPosts, deleteScheduledPost, cancelSchedule } from "@/utils/publishingService";

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

// Which statuses appear in the Posts Manager / Calendar. Scheduled = upcoming,
// queued = sending now, published = done — all kept. Drafts and failed attempts
// are hidden (the source design always stays in the library).
const VISIBLE_STATUSES = ["scheduled", "queued", "published"];

const STATUS_CONFIG = {
  draft:      { ar: "مسودة",       en: "Draft",     icon: FileText,     cls: "text-slate-600 bg-slate-100 border-slate-200" },
  scheduled:  { ar: "مجدول",      en: "Scheduled", icon: Timer,        cls: "text-indigo-700 bg-indigo-100 border-indigo-200" },
  queued:     { ar: "قيد الإرسال",en: "Queued",    icon: Send,         cls: "text-amber-700 bg-amber-100 border-amber-200" },
  published:  { ar: "منشور",      en: "Published", icon: CheckCircle2, cls: "text-green-700 bg-green-100 border-green-200" },
  failed:     { ar: "فشل",        en: "Failed",    icon: AlertCircle,  cls: "text-red-700 bg-red-100 border-red-200" },
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
// `post` is a topic REPRESENTATIVE (cover image + union of platforms). `count`
// is how many scheduled placements the topic holds (post + story, IG + FB…).
// onDelete/onCancel/onEdit act on the whole topic and take no args.
function PostCard({ post, count = 1, onDelete, onEdit, onCancel, view, ar = true }) {
  const [menu, setMenu] = useState(false);
  const status = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;
  const StatusIcon = status.icon;
  const statusLabel = ar ? status.ar : status.en;
  // Only a post that's still waiting to go out can be "unscheduled".
  const canCancel = ["scheduled", "queued"].includes(post.status);

  if (view === "list") {
    return (
      <div className="hv-card hv-card-hover flex items-center gap-4 p-4 group">
        {/* Thumbnail */}
        <div className="w-12 h-12 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden">
          {post.media?.thumbnail
            ? <img src={post.media.thumbnail} className="w-full h-full object-cover" alt="" />
            : <div className="w-full h-full flex items-center justify-center"><ImagePlus className="w-4 h-4 text-slate-400" /></div>}
        </div>

        {/* Caption */}
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate" style={{ color: 'var(--hv-text)' }}>{post.caption || (ar ? "بدون كابشن" : "No caption")}</p>
          <div className="flex items-center gap-3 mt-1">
            {/* Platforms */}
            <div className="flex gap-1">
              {(post.platforms || []).slice(0, 4).map(pid => (
                <span key={pid} className="w-2 h-2 rounded-full" style={{ background: PLATFORMS[pid]?.color || "#666" }} />
              ))}
            </div>
            {count > 1 && (
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded-full">
                {count} {ar ? "نشرات" : "posts"}
              </span>
            )}
            {post.scheduledAt && (
              <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--hv-text-soft)' }}>
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
          {canCancel && (
            <button
              onClick={() => onCancel()}
              title={ar ? "إلغاء الجدولة" : "Cancel schedule"}
              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-100 transition"
            >
              <Ban className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => onEdit()} className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete()} className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-100 transition">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Grid card
  return (
    <div className="hv-card hv-card-hover overflow-hidden group">
      {/* Media */}
      <div className="aspect-square bg-slate-100 relative">
        {post.media?.thumbnail
          ? <img src={post.media.thumbnail} className="w-full h-full object-cover" alt="" />
          : <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400">
              <ImagePlus className="w-8 h-8" />
              <p className="text-xs">{ar ? "لا توجد صورة" : "No image"}</p>
            </div>}

        {/* Status badge */}
        <div className="absolute top-2 start-2 flex items-center gap-1">
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold backdrop-blur-sm ${status.cls}`}>
            <StatusIcon className="w-2.5 h-2.5" />
            {statusLabel}
          </span>
          {count > 1 && (
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold backdrop-blur-sm">
              {count} {ar ? "نشرات" : "posts"}
            </span>
          )}
        </div>

        {/* Actions overlay */}
        <div className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition flex gap-1">
          {canCancel && (
            <button
              onClick={() => onCancel()}
              title={ar ? (count > 1 ? "إلغاء جدولة الموضوع كامل" : "إلغاء الجدولة") : "Cancel schedule"}
              className="w-7 h-7 rounded-lg bg-white/90 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-amber-600 transition backdrop-blur-sm"
            >
              <Ban className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => onEdit()} className="w-7 h-7 rounded-lg bg-white/90 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-indigo-600 transition backdrop-blur-sm">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete()} title={ar ? (count > 1 ? "حذف الموضوع كامل" : "حذف") : "Delete"} className="w-7 h-7 rounded-lg bg-white/90 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-red-600 transition backdrop-blur-sm">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="px-3 py-3">
        <p className="text-xs line-clamp-2 leading-relaxed min-h-[32px]" style={{ color: 'var(--hv-text)' }}>
          {post.caption || <span style={{ color: 'var(--hv-text-faint)' }}>{ar ? "بدون كابشن" : "No caption"}</span>}
        </p>

        <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t" style={{ borderColor: 'var(--hv-border)' }}>
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
            <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--hv-text-soft)' }}>
              <Clock className="w-3 h-3" />
              {post.scheduleDate} {post.scheduleTime}
            </span>
          ) : (
            <span className="text-[10px]" style={{ color: 'var(--hv-text-faint)' }}>{ar ? "غير مجدول" : "Not scheduled"}</span>
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

  // Read the MERGED view (backend + local). The backend is the source of
  // truth for status: its cron publishes due posts and flips them to
  // "published"/"failed". Reading localStorage alone (the old behaviour)
  // left everything stuck on "scheduled" forever. We also poll every 20s
  // so a post the backend just published updates without a manual refresh.
  const load = React.useCallback(async () => {
    try {
      const merged = await listAllPosts();
      setPosts((merged || []).filter((p) => VISIBLE_STATUSES.includes(p.status)));
    } catch {
      setPosts(loadPosts().filter((p) => VISIBLE_STATUSES.includes(p.status))); // local fallback
    }
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const filtered = filter === "all" ? posts : posts.filter(p => p.status === filter);

  // ── Group scheduled posts into TOPICS by title ───────────────────────────
  // A topic's placements (IG post, IG story, FB post, FB story, multiple
  // sizes…) were scheduled together and share the same caption. We collapse
  // them into ONE card so the view isn't flooded with near-identical images.
  // The title = the first line of the caption (which is the topic title).
  // Posts with no caption each stay their own card.
  const STATUS_PRIORITY = { queued: 0, scheduled: 1, published: 2 };
  const topics = React.useMemo(() => {
    const map = new Map();
    for (const p of filtered) {
      const title = (p.caption || "").split(/\r?\n/)[0].trim();
      const key = title || `__${p.id}`;
      if (!map.has(key)) map.set(key, { key, title, posts: [], platforms: [] });
      const t = map.get(key);
      t.posts.push(p);
      for (const pl of (p.platforms || [])) if (!t.platforms.includes(pl)) t.platforms.push(pl);
    }
    // Derive a representative cover + status + earliest date per topic.
    return Array.from(map.values()).map((t) => {
      const cover = t.posts.find((p) => p.media?.thumbnail) || t.posts[0];
      // Most-pending status wins (queued > scheduled > published) so the badge
      // reflects whether anything still needs to go out.
      const repStatus = t.posts
        .map((p) => p.status)
        .sort((a, b) => (STATUS_PRIORITY[a] ?? 9) - (STATUS_PRIORITY[b] ?? 9))[0] || cover.status;
      // Earliest schedule across the topic.
      const earliest = [...t.posts].sort((a, b) => (a.scheduledAt || "").localeCompare(b.scheduledAt || ""))[0];
      return {
        ...t,
        rep: {
          ...cover,
          platforms: t.platforms,
          status: repStatus,
          scheduleDate: earliest?.scheduleDate,
          scheduleTime: earliest?.scheduleTime,
          scheduledAt: earliest?.scheduledAt,
        },
      };
    });
  }, [filtered]);

  const handleDeleteTopic = async (topic) => {
    const n = topic.posts.length;
    if (!window.confirm(ar
      ? (n > 1 ? `حذف الموضوع «${topic.title || ""}» وكل نشراته (${n})؟` : T.deleteConfirm)
      : (n > 1 ? `Delete topic and all its ${n} posts?` : T.deleteConfirm))) return;
    for (const p of topic.posts) { try { await deleteScheduledPost(p.id); } catch { /* keep going */ } }
    load();
  };

  const handleCancelTopic = async (topic) => {
    const cancelable = topic.posts.filter((p) => ["scheduled", "queued"].includes(p.status));
    const n = cancelable.length;
    if (!window.confirm(ar
      ? `إلغاء جدولة الموضوع «${topic.title || ""}»${n > 1 ? ` (${n} نشرات)` : ""}؟ بينحذف من القائمة ولن يُنشر — وتصميمه يبقى في المكتبة تقدر تعيد جدولته.`
      : `Cancel this topic's schedule${n > 1 ? ` (${n} posts)` : ""}? It's removed and won't publish — designs stay in your library.`)) return;
    for (const p of cancelable) { try { await cancelSchedule(p); } catch { /* keep going */ } }
    load();
  };

  const handleEdit = (post) => {
    // Navigate to composer with post data for editing
    navigate(`/PostComposer?edit=${post.id}`);
  };

  const FILTERS = [
    { key: "all", label: T.all },
    { key: "scheduled", label: T.scheduled },
    { key: "published", label: T.published },
  ];

  // Counts
  const counts = posts.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {});

  return (
    <div dir={ar ? "rtl" : "ltr"} className="hv-page" style={{
      '--hv-primary': '#4f46e5', '--hv-secondary': '#fb7185', '--hv-primary-700': '#3730a3',
      '--hv-text': '#1e1b3a', '--hv-text-soft': '#5d5a76', '--hv-text-faint': '#9794ad',
      '--hv-surface': '#ffffff', '--hv-border': '#e8e9f5',
    }}>
      <div className="hv-page-inner">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="hv-page-title">{T.title}</h1>
            <p className="hv-page-sub">
              {ar ? `${topics.length} موضوع` : `${topics.length} topics`} · {posts.length} {T.posts}
              {counts.scheduled ? ` • ${counts.scheduled} ${T.scheduled_lbl}` : ""}
            </p>
          </div>
          <button
            onClick={() => navigate("/PostComposer")}
            className="hv-btn hv-btn-primary"
          >
            <Plus className="w-4 h-4" />
            {T.newPost}
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          {[
            { key: "scheduled", color: "indigo" },
            { key: "published", color: "green" },
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
      <div className="flex items-center justify-between py-3 mb-4 border-b" style={{ borderColor: 'var(--hv-border)' }}>
        <div className="flex gap-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition
                ${filter === f.key ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-indigo-600 hover:bg-slate-100"}`}
            >
              {f.label}
              {f.key !== "all" && counts[f.key] ? (
                <span className={`ms-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${filter === f.key ? "bg-white/20" : "bg-slate-200 text-slate-600"}`}>{counts[f.key]}</span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button onClick={() => setView("grid")} className={`p-2 rounded-lg transition ${view === "grid" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-indigo-600 hover:bg-slate-100"}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setView("list")} className={`p-2 rounded-lg transition ${view === "list" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-indigo-600 hover:bg-slate-100"}`}>
            <List className="w-4 h-4" />
          </button>
          <button onClick={load} className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition" title="تحديث">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div>
        {topics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <p className="font-semibold" style={{ color: 'var(--hv-text)' }}>{T.empty}</p>
            <p className="text-sm" style={{ color: 'var(--hv-text-soft)' }}>{T.emptyHint}</p>
            <button
              onClick={() => navigate("/PostComposer")}
              className="hv-btn hv-btn-primary mt-2"
            >
              <Plus className="w-4 h-4" />
              {T.newPost}
            </button>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {topics.map(topic => (
              <PostCard key={topic.key} post={topic.rep} count={topic.posts.length} view="grid" ar={ar}
                onDelete={() => handleDeleteTopic(topic)} onEdit={() => handleEdit(topic.rep)} onCancel={() => handleCancelTopic(topic)} />
            ))}
          </div>
        ) : (
          <div className="space-y-2 max-w-3xl">
            {topics.map(topic => (
              <PostCard key={topic.key} post={topic.rep} count={topic.posts.length} view="list" ar={ar}
                onDelete={() => handleDeleteTopic(topic)} onEdit={() => handleEdit(topic.rep)} onCancel={() => handleCancelTopic(topic)} />
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
