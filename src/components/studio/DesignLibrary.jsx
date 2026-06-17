import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localApi } from "@/api/localClient";
import { Plus, Trash2, Edit3, FolderOpen, Loader2, Home, X, Eye, Upload, CalendarPlus, ChevronLeft, ChevronRight, Search, CheckSquare, Square, Calendar, Ban, Check, Download, Layers } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import MediaUploadModal from "../MediaUploadModal";
import BulkMediaUploadModal, { readCaptionsMap, platformLabel, platformEmoji, PLATFORMS } from "../BulkMediaUploadModal";
import BulkScheduleModal from "../BulkScheduleModal";
import { listLocalMedia, removeLocalMedia, isLocalId, updateLocalMedia } from "@/utils/localMediaStore";
import { listAllPosts, cancelSchedule } from "@/utils/publishingService";

function parseJson(val, fallback) {
  if (!val) return fallback;
  if (typeof val === "string") { try { return JSON.parse(val); } catch { return fallback; } }
  return val;
}

// Multi-platform tags per media id, kept in localStorage because the backend
// `media` table only has a single `platform` column (sending an array there
// fails the SQL update). This side-map overlays platforms onto BOTH backend and
// local rows so a design can target several platforms.
const PLATFORMS_MAP_KEY = "media_platforms_v1";
function readPlatformsMap() {
  try { return JSON.parse(localStorage.getItem(PLATFORMS_MAP_KEY) || "{}") || {}; } catch { return {}; }
}
function writePlatformsForMedia(id, platforms) {
  try { const m = readPlatformsMap(); m[id] = platforms; localStorage.setItem(PLATFORMS_MAP_KEY, JSON.stringify(m)); } catch { /* quota */ }
}

// The TITLE (caption_title) is the topic identifier used to group a topic's
// images for scheduling. For backend rows we overlay it from the captions map
// (the media table predates these columns); local rows store it inline.
const CAPTIONS_MAP_KEY = "bulk_media_captions_v1";
function writeCaptionTitleForMedia(id, title) {
  try {
    const m = JSON.parse(localStorage.getItem(CAPTIONS_MAP_KEY) || "{}");
    m[id] = { ...(m[id] || {}), caption_title: title };
    localStorage.setItem(CAPTIONS_MAP_KEY, JSON.stringify(m));
  } catch { /* quota */ }
}

// SQLite's `datetime('now')` returns "YYYY-MM-DD HH:MM:SS" with no
// timezone marker; Chrome parses that as local time and Safari returns
// "Invalid Date". Normalize to ISO-8601 UTC ("…T…Z") so `new Date(...)`
// gives the same instant everywhere. Local-store rows already use the
// canonical ISO format from `toISOString()` so they pass through.
// Returns a finite millisecond timestamp, or `NaN` for unparseable input.
// Shuffle an array (Fisher–Yates, non-mutating).
function shuffleArr(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

// "Smart" shuffle: randomise the order but spread topics so the same topic
// (caption_title) doesn't land back-to-back. Greedy — always take the next
// item from the largest remaining topic-bucket that isn't the one just used.
function smartShuffleByTopic(posts) {
  const buckets = new Map();
  for (const p of posts) {
    const t = (p.caption_title || "").trim() || `__u_${p.post_id}`;
    if (!buckets.has(t)) buckets.set(t, []);
    buckets.get(t).push(p);
  }
  const arrs = Array.from(buckets.values()).map(shuffleArr);
  const out = [];
  let last = null;
  while (arrs.some((a) => a.length)) {
    const nonEmpty = arrs.filter((a) => a.length);
    const allowed = nonEmpty.filter((a) => a !== last);
    const pool = allowed.length ? allowed : nonEmpty;
    const maxLen = Math.max(...pool.map((a) => a.length));
    const top = pool.filter((a) => a.length === maxLen);
    const chosen = top[Math.floor(Math.random() * top.length)];
    out.push(chosen.shift());
    last = chosen;
  }
  return out;
}

function parseCreatedDate(str) {
  if (!str) return NaN;
  // SQLite "YYYY-MM-DD HH:MM:SS" → "YYYY-MM-DDTHH:MM:SSZ"
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)
    ? `${str.replace(" ", "T")}Z`
    : str;
  return new Date(iso).getTime();
}

// Calendar-aware lower bound for the date-range pills. "Today" means
// "since midnight on the user's calendar" — NOT "the last 24 hours" —
// so a post uploaded yesterday evening doesn't leak into today's filter.
// Same for week (since Sunday/Monday start), month (1st of month), year
// (1st of January). Returns `0` for the catch-all so every record passes.
function dateRangeLowerBound(range, now = new Date()) {
  switch (range) {
    case "today": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    case "week": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      // Week starts on Sunday (Saudi/MENA convention works either way
      // since the boundary just shifts by one day — kept Sunday because
      // it matches the Date.getDay() === 0 default).
      d.setDate(d.getDate() - d.getDay());
      return d.getTime();
    }
    case "month": {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return d.getTime();
    }
    case "year": {
      const d = new Date(now.getFullYear(), 0, 1);
      return d.getTime();
    }
    default: return 0; // "all" — no lower bound
  }
}

// Force-download a remote image. The `download` attribute is ignored for
// cross-origin URLs (Railway serves on a different origin), so we fetch the
// bytes into a blob and download that. Falls back to opening in a new tab.
async function downloadImage(url, name) {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    const obj = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = obj;
    a.download = name || "image.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(obj), 1500);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}

// One image inside the topic-detail modal. Shows the image, its real pixel
// size (read on load), and per-image actions: download, open, info, delete.
function LibImageTile({ image, isRtl, onInfo, onDelete, busy }) {
  const [dim, setDim] = useState(null);
  return (
    <div className="hv-card rounded-xl overflow-hidden">
      <div className="aspect-square flex items-center justify-center overflow-hidden relative" style={{ background: "var(--hv-surface-2)" }}>
        <img
          src={image.url}
          alt={image.name}
          className="w-full h-full object-contain"
          onLoad={(e) => setDim({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
        />
        {dim && (
          <span className="absolute top-1.5 start-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold">
            {dim.w}×{dim.h}
          </span>
        )}
      </div>
      <div className="p-2 flex items-center justify-center gap-1.5">
        <button
          onClick={() => downloadImage(image.url, image.name)}
          className="hv-btn hv-btn-soft p-2"
          title={isRtl ? "تحميل على الكمبيوتر" : "Download"}
        >
          <Download className="w-4 h-4" />
        </button>
        <a
          href={image.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hv-btn hv-btn-ghost p-2"
          title={isRtl ? "فتح في نافذة جديدة" : "Open"}
        >
          <Eye className="w-4 h-4" />
        </a>
        <button
          onClick={onInfo}
          className="hv-btn hv-btn-ghost p-2"
          title={isRtl ? "معلومات (العنوان/المنصات)" : "Info"}
        >
          <Upload className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          disabled={busy}
          className="hv-btn hv-btn-danger p-2 disabled:opacity-50"
          title={isRtl ? "حذف هذه الصورة" : "Delete this image"}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function DesignPreviewModal({ design, isRtl, onEdit, onClose }) {
  const [pageIdx, setPageIdx] = useState(0);
  const size = parseJson(design.size, {});

  // Extract pages from dedicated `pages` column (new format), fallback to bg.__pages (old format)
  const pagesFromCol = parseJson(design.pages, null);
  const bgData = parseJson(design.bg, {});
  const pages = (Array.isArray(pagesFromCol) && pagesFromCol.length > 0) ? pagesFromCol : bgData.__pages;
  const totalPages = pages && Array.isArray(pages) && pages.length > 1 ? pages.length : 1;
  const hasMultiplePages = totalPages > 1;

  // Get background color of current page for non-thumbnail pages
  const currentPageBg = pages?.[pageIdx]?.bg?.color || "#1e293b";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="hv-card rounded-2xl overflow-hidden max-w-xl w-full" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--hv-border)" }}>
          <div className="flex items-center gap-2">
            <h3 className="font-bold" style={{ color: "var(--hv-text)" }}>{design.name}</h3>
            {hasMultiplePages && (
              <span className="hv-chip text-xs">
                {totalPages} {isRtl ? "صفحات" : "pages"}
              </span>
            )}
          </div>
          <button onClick={onClose} className="transition" style={{ color: "var(--hv-text-soft)" }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview */}
        <div className="p-4">
          <div className="relative">
            <div style={{ width: "100%", borderRadius: 8, overflow: "hidden", margin: "0 auto" }}>
              {/* Show per-page thumbnail if available, otherwise fallback */}
              {(() => {
                const pageThumbnail = pages?.[pageIdx]?.thumbnail || (pageIdx === 0 ? design.thumbnail : null);
                const aspectPct = size.width && size.height ? `${(size.height / size.width) * 100}%` : "100%";
                if (pageThumbnail) {
                  return (
                    <div style={{ width: "100%", paddingBottom: aspectPct, position: "relative", borderRadius: 8, overflow: "hidden" }}>
                      <img src={pageThumbnail} alt={design.name}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </div>
                  );
                }
                return (
                  <div style={{
                    width: "100%", paddingBottom: aspectPct,
                    backgroundColor: currentPageBg,
                    borderRadius: 8, position: "relative",
                  }}>
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <span className="text-5xl font-black text-white/30">{pageIdx + 1}</span>
                      <span className="text-white/80 text-sm text-center px-4">
                        {isRtl ? `الصفحة ${pageIdx + 1} — افتح التصميم وتنقل للصفحات لتظهر معاينتها` : `Page ${pageIdx + 1} — open & visit each page to generate previews`}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Page navigation arrows */}
            {hasMultiplePages && (
              <>
                <button
                  onClick={() => setPageIdx(i => Math.max(0, i - 1))}
                  disabled={pageIdx === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center disabled:opacity-30 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPageIdx(i => Math.min(totalPages - 1, i + 1))}
                  disabled={pageIdx === totalPages - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center disabled:opacity-30 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Page dots */}
          {hasMultiplePages && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPageIdx(i)}
                  className={`w-2 h-2 rounded-full transition ${i === pageIdx ? "bg-indigo-500 w-4" : "bg-slate-300 hover:bg-slate-400"}`}
                />
              ))}
            </div>
          )}

          {size.width && (
            <p className="text-xs text-center mt-2" style={{ color: "var(--hv-text-soft)" }}>{size.width}×{size.height}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 pb-4">
          <button onClick={onClose} className="hv-btn hv-btn-ghost flex-1 text-sm">
            {isRtl ? "إغلاق" : "Close"}
          </button>
          <button onClick={onEdit} className="hv-btn hv-btn-primary flex-1 text-sm">
            <Edit3 className="w-4 h-4" />
            {isRtl ? "تعديل التصميم" : "Edit Design"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DesignLibrary({ language, onOpen, onNew }) {
  const isRtl = language === "ar";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleting, setDeleting] = useState(null);
  const [previewDesign, setPreviewDesign] = useState(null);
  const [selectedSize, setSelectedSize] = useState("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  // Bulk uploader is the primary upload entry point — handles 1..50 files
  // and the per-post caption workflow. The legacy single-file modal is
  // kept around but no longer wired into the main UI.
  const [showBulkModal, setShowBulkModal] = useState(false);
  // Counter that bumps whenever local media changes (upload or delete).
  // Forces React to re-render the grid after writes that don't go
  // through React Query (the local store lives in localStorage, not in
  // any query cache).
  const [localMediaVersion, setLocalMediaVersion] = useState(0);

  // ── Media search & filtering ────────────────────────────────────────
  // Free-text query searches across title, caption body, hashtags, and
  // platform name. The filter pills + sort dropdown narrow further.
  // Default sort = newest so users see what they just uploaded first.
  const [mediaSearch, setMediaSearch] = useState("");
  const [mediaPlatform, setMediaPlatform] = useState("all");
  const [mediaDateRange, setMediaDateRange] = useState("all"); // all|today|week|month|year
  const [mediaSort, setMediaSort] = useState("newest");        // newest|oldest|title

  // Full-post preview — clicking a media card opens this modal showing
  // every image in the post, the full untruncated caption, and quick
  // actions (copy caption, delete). `null` when closed.
  const [previewingPost, setPreviewingPost] = useState(null);
  // Topic-detail modal — set to a topic object (all images sharing a title)
  // when the user clicks a topic card. `null` when closed.
  const [viewingTopic, setViewingTopic] = useState(null);
  // Page index within a carousel preview (resets on each open).
  const [previewPage, setPreviewPage] = useState(0);
  // Lightweight feedback for the "copy caption" button.
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  // Inline caption editor — opened by the pencil button. We update both
  // local and backend rows: backend rows write to the localStorage
  // captions map (the Railway backend rejects caption columns), local
  // rows update in-place in the local-media store.
  const [editingCaption, setEditingCaption] = useState(null); // { post, title, text }
  // Delete confirmation — track the post being asked about. Prevents
  // accidental data loss from a stray click on a 🎠 carousel.
  const [confirmDeletePost, setConfirmDeletePost] = useState(null);
  const [activeTab, setActiveTab] = useState("designs"); // designs or media
  const [editingMedia, setEditingMedia] = useState(null);
  const [editingData, setEditingData] = useState({ name: "", platforms: [] });
  const [editingMediaContent, setEditingMediaContent] = useState(null);
  // Bulk selection mode for the media tab. When `true`, clicking a card
  // toggles selection instead of opening the preview. `selectedPostIds`
  // is a Set so multi-select stays O(1). When the user exits select
  // mode (Cancel button) we clear the selection back to empty.
  const [selectMode, setSelectMode] = useState(false);
  // When true, the active selection is for CANCELLING schedules (not creating
  // them): only already-scheduled posts are selectable, and the action bar
  // cancels their schedules in bulk.
  const [cancelMode, setCancelMode] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState(new Set());
  const [bulkCancelling, setBulkCancelling] = useState(false);
  // Bulk-scheduler modal — `null` when closed, otherwise an array of
  // the post objects the user wants to schedule.
  const [bulkScheduleQueue, setBulkScheduleQueue] = useState(null);
  // True when the queue was built by "smart shuffle" — keeps grouping OFF in
  // the schedule modal so the shuffled order is preserved.
  const [shuffleScheduling, setShuffleScheduling] = useState(false);
  // "منشور" tab — recycle already-published content. `unpublishMode` is the
  // select variant; `recsByPost` maps post_id → its schedule records so we can
  // delete them and return the post to the library as re-schedulable.
  const [unpublishMode, setUnpublishMode] = useState(false);
  const [bulkUnpublishing, setBulkUnpublishing] = useState(false);
  const [recsByPost, setRecsByPost] = useState(() => new Map());
  // Custom display order produced by the "smart shuffle" button (post_id → rank).
  const [shuffleRank, setShuffleRank] = useState(() => new Map());
  // Bump to force a re-read of scheduled posts after a bulk cancel.
  const [scheduleVersion, setScheduleVersion] = useState(0);
  // `scheduledIds`: post_ids with ANY non-draft entry (used to lock cards in
  // SCHEDULE select mode so the same post isn't scheduled twice).
  // `cancelableMap`: post_id → [scheduled/queued records] (used in CANCEL
  // select mode to know what can be unscheduled and which entries to cancel).
  const [scheduledIds, setScheduledIds] = useState(() => new Set());
  // `publishedIds`: post_ids that already went live (status === "published"),
  // so the card shows "منشور" instead of "مجدول".
  const [publishedIds, setPublishedIds] = useState(() => new Set());
  const [cancelableMap, setCancelableMap] = useState(() => new Map());
  // `publishAtMap`: post_id → publish/scheduled time (ms) — used to order the
  // library by date & time of publishing.
  const [publishAtMap, setPublishAtMap] = useState(() => new Map());
  React.useEffect(() => {
    let cancelled = false;
    listAllPosts().then((rows) => {
      if (cancelled) return;
      const ids = new Set();
      const pubIds = new Set();
      const cmap = new Map();
      const pubAt = new Map();
      const recsMap = new Map();
      for (const r of rows || []) {
        if (r.status === "draft") continue; // a draft isn't really scheduled yet
        const key = r.sourcePostId || r.designId;
        if (r.sourcePostId) ids.add(r.sourcePostId);
        if (r.designId) ids.add(r.designId);
        // Keep every non-draft record per post id so "unpublish" can delete them.
        for (const k of [r.sourcePostId, r.designId]) {
          if (!k) continue;
          if (!recsMap.has(k)) recsMap.set(k, []);
          recsMap.get(k).push(r);
        }
        // Track already-published entries separately.
        if (r.status === "published") {
          if (r.sourcePostId) pubIds.add(r.sourcePostId);
          if (r.designId) pubIds.add(r.designId);
        }
        // Record the latest publish/scheduled time per post for ordering.
        const ts = parseCreatedDate(r.scheduledAt);
        if (Number.isFinite(ts)) {
          for (const k of [r.sourcePostId, r.designId]) {
            if (k && (!pubAt.has(k) || ts > pubAt.get(k))) pubAt.set(k, ts);
          }
        }
        // Only not-yet-published entries can be cancelled.
        if (key && ["scheduled", "queued"].includes(r.status)) {
          if (!cmap.has(key)) cmap.set(key, []);
          cmap.get(key).push(r);
        }
      }
      setScheduledIds(ids);
      setPublishedIds(pubIds);
      setCancelableMap(cmap);
      setPublishAtMap(pubAt);
      setRecsByPost(recsMap);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [localMediaVersion, bulkScheduleQueue, scheduleVersion]);

  const togglePostSelected = (postId) => {
    setSelectedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId); else next.add(postId);
      return next;
    });
  };
  const clearSelection = () => setSelectedPostIds(new Set());
  const exitSelectMode = () => {
    setSelectMode(false);
    setCancelMode(false);
    setUnpublishMode(false);
    clearSelection();
  };

  // "Unpublish" the selected posts: delete their schedule records (the actual
  // designs/media stay) so they leave the published/scheduled sets and become
  // available to schedule again from the library.
  const handleBulkUnpublish = async () => {
    const records = Array.from(selectedPostIds).flatMap((id) => recsByPost.get(id) || []);
    if (records.length === 0) { exitSelectMode(); return; }
    setBulkUnpublishing(true);
    for (const rec of records) {
      try { await cancelSchedule(rec); } catch { /* keep going */ }
    }
    setBulkUnpublishing(false);
    setScheduleVersion((v) => v + 1);
    exitSelectMode();
  };

  // Bulk-cancel: unschedule every scheduled/queued entry tied to the selected
  // media posts, then refresh and leave select mode.
  const handleBulkCancel = async () => {
    const records = Array.from(selectedPostIds).flatMap((id) => cancelableMap.get(id) || []);
    if (records.length === 0) { exitSelectMode(); return; }
    setBulkCancelling(true);
    for (const rec of records) {
      try { await cancelSchedule(rec); } catch { /* keep going */ }
    }
    setBulkCancelling(false);
    setScheduleVersion((v) => v + 1);
    exitSelectMode();
  };

  const getSize = (design) => {
    const s = parseJson(design.size, null);
    if (s?.width) return `${s.width}×${s.height}`;
    return null;
  };

  const { data: designs = [], isLoading: designsLoading } = useQuery({
    queryKey: ["designs"],
    queryFn: () => localApi.entities.Design.list("-updated_date"),
  });

  const { data: mediaList = [], isLoading: mediaLoading } = useQuery({
    queryKey: ["media"],
    queryFn: () => localApi.entities.Media.list("-created_date"),
  });

  // Real media count = unique posts across backend + local store (the tab used
  // to show only backend rows, undercounting AI/local images).
  const mediaTabCount = React.useMemo(() => {
    const keys = new Set();
    for (const m of [...mediaList, ...listLocalMedia()]) keys.add(m.post_id || `legacy_${m.id}`);
    return keys.size;
  }, [mediaList, localMediaVersion]);

  // Distinct already-published posts (for the "منشور" tab badge count).
  const publishedTabCount = React.useMemo(() => {
    const keys = new Set();
    for (const m of [...mediaList, ...listLocalMedia()]) {
      const k = m.post_id || `legacy_${m.id}`;
      if (publishedIds.has(k)) keys.add(k);
    }
    return keys.size;
  }, [mediaList, localMediaVersion, publishedIds]);

  // Get unique sizes
  const uniqueSizes = Array.from(new Set(designs.map(d => {
    const s = parseJson(d.size, null);
    return s?.width ? `${s.width}×${s.height}` : null;
  }).filter(Boolean))).sort();

  // Filter designs by size
  const filteredDesigns = selectedSize === "all" 
    ? designs 
    : designs.filter(d => getSize(d) === selectedSize);

  const deleteMutation = useMutation({
    mutationFn: (id) => localApi.entities.Design.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["designs"] }),
  });

  const deleteMediaMutation = useMutation({
    mutationFn: (id) => localApi.entities.Media.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["media"] }),
  });

  const updateMediaMutation = useMutation({
    // Only existing columns go to the backend (the media table has no
    // `platforms` column). Multi-platform tags live in the side-map.
    mutationFn: ({ id, name, platform }) =>
      localApi.entities.Media.update(id, { name, platform }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media"] });
      setEditingMedia(null);
    },
  });

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    setDeleting(id);
    await deleteMutation.mutateAsync(id);
    setDeleting(null);
  };

  const handleDeleteMedia = async (e, id) => {
    e.stopPropagation();
    setDeleting(id);
    // Route to the right store: local-only records (prefix "local_")
    // never went to the backend, so deleting them on the server would
    // 404. The local store handles them; backend rows go via the
    // regular mutation.
    if (isLocalId(id)) {
      removeLocalMedia(id);
      // Bump our local-change counter so the merged grid re-renders.
      setLocalMediaVersion((v) => v + 1);
    } else {
      await deleteMediaMutation.mutateAsync(id);
      // Drop any orphaned caption entry from localStorage. Wrapped in
      // try in case the storage layer is unavailable.
      try {
        const map = readCaptionsMap();
        if (map[id]) {
          delete map[id];
          localStorage.setItem("bulk_media_captions_v1", JSON.stringify(map));
        }
      } catch { /* ignore — quota / SecurityError, not fatal */ }
    }
    setDeleting(null);
  };

  const handleEditMedia = (media) => {
    setEditingMedia(media);
    // Seed from the side-map first, then the platforms array, then the legacy
    // single field.
    const map = readPlatformsMap();
    const initial = (Array.isArray(map[media.id]) && map[media.id].length)
      ? map[media.id]
      : (Array.isArray(media.platforms) && media.platforms.length)
        ? media.platforms
        : (media.platform ? [media.platform] : []);
    setEditingData({ name: media.name, title: media.caption_title || "", platforms: initial });
  };

  const handleSaveEdit = async () => {
    if (!editingMedia) return;
    const title = (editingData.title || "").trim();
    if (!title) return; // title is the mandatory topic identifier
    const id = editingMedia.id;
    const platforms = editingData.platforms || [];
    const name = (editingData.name || title).trim();
    const platform = platforms[0] || ""; // back-compat single field

    // Persist multi-platform tags + the topic title (group key) locally.
    writePlatformsForMedia(id, platforms);
    writeCaptionTitleForMedia(id, title);

    if (isLocalId(id)) {
      updateLocalMedia(id, { name, platform, platforms, caption_title: title });
      setLocalMediaVersion((v) => v + 1);
      setEditingMedia(null);
      return;
    }
    // Backend row: update the existing columns. ALWAYS close, even if the
    // backend update fails — the platforms/title are already saved locally.
    try {
      await updateMediaMutation.mutateAsync({ id, name, platform });
    } catch {
      qc.invalidateQueries({ queryKey: ["media"] });
    } finally {
      setLocalMediaVersion((v) => v + 1);
      setEditingMedia(null);
    }
  };

  // Edit-button entry point — opens the inline caption editor instead
  // of bouncing to DesignStudio (which was the legacy behaviour and
  // wasn't useful for editing post metadata).
  const handleEditMediaContent = (postOrMedia) => {
    // Caller passes either a post object (with caption_title/text) or
    // a single media row (legacy). Normalise.
    setEditingCaption({
      post: postOrMedia,
      title: postOrMedia.caption_title || "",
      text:  postOrMedia.caption_text  || "",
    });
  };

  // Persist the caption edits. For backend rows the captions map lives
  // in localStorage (the backend rejects the caption columns). For
  // local-only rows we rewrite the record in the local-media store.
  const handleSaveCaption = () => {
    const { post, title, text } = editingCaption || {};
    if (!post) return;
    // Decide where to write based on whether this is a local row.
    const allLocal = post.items.every((m) => isLocalId(m.id));
    if (allLocal) {
      // Rewrite every image in the local store with the new caption.
      const localList = listLocalMedia();
      const updated = localList.map((row) =>
        post.items.some((m) => m.id === row.id)
          ? { ...row, caption_title: title.trim(), caption_text: text }
          : row
      );
      try { localStorage.setItem("local_media_records_v1", JSON.stringify(updated)); }
      catch { /* quota — silently ignore */ }
    } else {
      // Backend rows — update the captions map keyed by media id.
      try {
        const map = readCaptionsMap();
        for (const m of post.items) {
          map[m.id] = {
            ...(map[m.id] || {}),
            caption_title: title.trim(),
            caption_text:  text,
            post_id:       post.post_id,
            position:      m.position || 0,
          };
        }
        localStorage.setItem("bulk_media_captions_v1", JSON.stringify(map));
      } catch { /* quota — silently ignore */ }
    }
    setEditingCaption(null);
    setLocalMediaVersion((v) => v + 1);
    // Also refresh any open preview so the new caption shows immediately.
    if (previewingPost?.post_id === post.post_id) {
      setPreviewingPost({ ...previewingPost, caption_title: title.trim(), caption_text: text });
    }
  };

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="hv-page">
      <div className="hv-page-inner pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link to="/" className="hv-btn hv-btn-ghost text-sm">
              <Home className="w-4 h-4" />
              <span>{isRtl ? "الرئيسية" : "Home"}</span>
            </Link>
            <div>
              <h1 className="hv-page-title">{isRtl ? "مكتبة التصاميم" : "Design Library"}</h1>
              <p className="hv-page-sub">{isRtl ? "احفظ تصاميمك وارجع اعدل عليها" : "Save and edit your designs"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBulkModal(true)}
              className="hv-btn hv-btn-soft text-sm"
            >
              <Upload className="w-4 h-4" />
              {isRtl ? "📤 رفع محتوى" : "📤 Upload"}
            </button>
            <button
              onClick={onNew}
              className="hv-btn hv-btn-primary text-sm"
            >
              <Plus className="w-4 h-4" />
              {isRtl ? "تصميم جديد" : "New Design"}
            </button>
          </div>
        </div>

        {/* Size Filter */}
        {designs.length > 0 && uniqueSizes.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSize("all")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                selectedSize === "all"
                  ? "hv-btn hv-btn-primary"
                  : "hv-btn hv-btn-ghost"
              }`}
            >
              {isRtl ? "الكل" : "All"}
            </button>
            {uniqueSizes.map(size => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  selectedSize === size
                    ? "hv-btn hv-btn-primary"
                    : "hv-btn hv-btn-ghost"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b" style={{ borderColor: "var(--hv-border)" }}>
          <button
            onClick={() => { exitSelectMode(); setActiveTab("designs"); }}
            className="px-4 py-2 font-semibold text-sm transition border-b-2"
            style={activeTab === "designs"
              ? { borderColor: "var(--hv-primary)", color: "var(--hv-text)" }
              : { borderColor: "transparent", color: "var(--hv-text-soft)" }}
          >
            {isRtl ? "التصاميم" : "Designs"} ({designs.length})
          </button>
          <button
            onClick={() => { exitSelectMode(); setActiveTab("media"); }}
            className="px-4 py-2 font-semibold text-sm transition border-b-2"
            style={activeTab === "media"
              ? { borderColor: "var(--hv-primary)", color: "var(--hv-text)" }
              : { borderColor: "transparent", color: "var(--hv-text-soft)" }}
          >
            {isRtl ? "المكتبة" : "Media"} ({mediaTabCount})
          </button>
          <button
            onClick={() => { exitSelectMode(); setActiveTab("published"); }}
            className="px-4 py-2 font-semibold text-sm transition border-b-2"
            style={activeTab === "published"
              ? { borderColor: "var(--hv-primary)", color: "var(--hv-text)" }
              : { borderColor: "transparent", color: "var(--hv-text-soft)" }}
          >
            {isRtl ? "منشور" : "Published"} ({publishedTabCount})
          </button>
        </div>

        {/* Designs Tab */}
        {activeTab === "designs" && (
          <>
        {designsLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--hv-primary)" }} />
          </div>
        ) : designs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64" style={{ color: "var(--hv-text-faint)" }}>
            <FolderOpen className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg">{isRtl ? "لا يوجد تصاميم محفوظة" : "No saved designs"}</p>
            <button onClick={onNew} className="hv-btn hv-btn-primary mt-4 text-sm">
              {isRtl ? "ابدأ تصميمك الأول" : "Start your first design"}
            </button>
          </div>
        ) : filteredDesigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64" style={{ color: "var(--hv-text-faint)" }}>
            <FolderOpen className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg">{isRtl ? "لا توجد تصاميم بهذا المقاس" : "No designs with this size"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredDesigns.map((design) => {
              const sizeStr = getSize(design);
              const designPagesCol = parseJson(design.pages, null);
              const designBg = parseJson(design.bg, {});
              const designPages = (Array.isArray(designPagesCol) && designPagesCol.length > 0) ? designPagesCol : designBg.__pages;
              const pagesCount = designPages && Array.isArray(designPages) ? designPages.length : 1;
              return (
                <div
                  key={design.id}
                  onClick={() => setPreviewDesign(design)}
                  className="hv-card hv-card-hover group relative rounded-xl overflow-hidden cursor-pointer transition"
                >
                  {/* Thumbnail */}
                  <div className="aspect-square flex items-center justify-center overflow-hidden" style={{ background: "var(--hv-surface-2)" }}>
                    {design.thumbnail ? (
                      <img src={design.thumbnail} alt={design.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-4xl font-bold" style={{ color: "var(--hv-text-faint)" }}>{design.name?.[0]?.toUpperCase()}</div>
                    )}
                    {/* Pages count badge */}
                    {pagesCount > 1 && (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold">
                        {pagesCount}p
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="font-semibold text-sm truncate" style={{ color: "var(--hv-text)" }}>{design.name}</p>
                    {sizeStr && <p className="text-xs mt-0.5" style={{ color: "var(--hv-text-soft)" }}>{sizeStr}</p>}
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setPreviewDesign(design); }}
                      className="p-2 rounded-lg bg-white/90 hover:bg-white text-slate-800 hover:text-indigo-600 transition"
                      title={isRtl ? "معاينة" : "Preview"}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpen(design); }}
                      className="p-2 rounded-lg bg-white/90 hover:bg-white text-slate-800 hover:text-indigo-600 transition"
                      title={isRtl ? "تعديل" : "Edit"}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const params = new URLSearchParams({
                          designId: design.id,
                          name: encodeURIComponent(design.name || ""),
                          thumb: encodeURIComponent(design.thumbnail_url || ""),
                        });
                        navigate(`/PostComposer?${params}`);
                      }}
                      className="p-2 rounded-lg bg-white/90 hover:bg-emerald-600 text-slate-800 hover:text-white transition"
                      title={isRtl ? "جدولة المنشور" : "Schedule Post"}
                    >
                      <CalendarPlus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, design.id)}
                      disabled={deleting === design.id}
                      className="p-2 rounded-lg bg-white/90 hover:bg-red-600 text-slate-800 hover:text-white transition disabled:opacity-50"
                      title={isRtl ? "حذف" : "Delete"}
                    >
                      {deleting === design.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </>
        )}

        {/* Media Tab */}
        {(activeTab === "media" || activeTab === "published") && (
          <>
        {mediaLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--hv-primary)" }} />
          </div>
        ) : (() => {
          // Read caption metadata from localStorage (saved during bulk
          // upload because the backend doesn't accept the new columns)
          // and merge it back onto the media rows before grouping. Media
          // rows whose ids aren't in the map keep whatever backend
          // values they had (likely null) so legacy rows still work.
          const captions = readCaptionsMap();
          // Merge backend media with local-only records (uploads that
          // happened while the backend was rejecting). Local records
          // carry their captions inline, so the captions-map lookup
          // only runs on backend rows.
          const localRows = listLocalMedia();
          const platMap = readPlatformsMap();
          const withPlatforms = (m) => { const pf = platMap[m.id]; return (Array.isArray(pf) && pf.length) ? { ...m, platforms: pf } : m; };
          const merged = [
            ...mediaList.map((m) => {
              const cap = captions[m.id];
              return withPlatforms(cap ? { ...m, ...cap } : m);
            }),
            ...localRows.map(withPlatforms),
          ];
          const enriched = merged;
          if (merged.length === 0) {
            // Empty-state UI lives in the same branch now so the local
            // list can pull the user out of empty even if backend is dry.
            return (
              <div className="flex flex-col items-center justify-center h-64" style={{ color: "var(--hv-text-faint)" }}>
                <FolderOpen className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg">{isRtl ? "لم تحمل أي محتوى بعد" : "No media uploaded yet"}</p>
                <button onClick={() => setShowBulkModal(true)} className="hv-btn hv-btn-primary mt-4 text-sm">
                  {isRtl ? "📤 ابدأ الآن" : "📤 Start Uploading"}
                </button>
              </div>
            );
          }

          // ── Count posts per platform so each filter pill can carry a
          //    badge ("Instagram (4)") and the user can see at a glance
          //    where their content lives. We count by post_id (not by
          //    individual media row) so a 5-image carousel = 1 post.
          //    Includes ALL platforms from the PLATFORMS list — even
          //    ones with zero posts — so the filter row works like a
          //    fixed tab system (Instagram always sits in the same
          //    place whether you have 0 or 50 posts there).
          // A post can target SEVERAL platforms (one image, multiple tags) —
          // count it under each of its platforms.
          const postPlatforms = (m) =>
            (Array.isArray(m.platforms) && m.platforms.length) ? m.platforms : [m.platform || "unknown"];
          const platformCounts = (() => {
            const counts = {};
            const seenPosts = new Set();
            for (const m of enriched) {
              const postKey = m.post_id || `legacy_${m.id}`;
              if (seenPosts.has(postKey)) continue;
              seenPosts.add(postKey);
              for (const pl of postPlatforms(m)) counts[pl] = (counts[pl] || 0) + 1;
            }
            return counts;
          })();
          const totalPosts = new Set(enriched.map((m) => m.post_id || `legacy_${m.id}`)).size;

          // Group rows by post_id so carousels render as a single card.
          // Rows without a post_id (legacy or single-file uploads) get
          // their own group keyed by their media id.
          // `let` (not const) — we reassign this with .filter() below
          // when search / platform / date filters narrow the view.
          let posts = [];
          const byPostId = new Map();
          for (const m of enriched) {
            const key = m.post_id || `legacy_${m.id}`;
            if (!byPostId.has(key)) {
              const post = { post_id: key, items: [], platform: m.platform, platforms: postPlatforms(m).filter((p) => p !== "unknown"), caption_title: m.caption_title, caption_text: m.caption_text };
              byPostId.set(key, post);
              posts.push(post);
            }
            byPostId.get(key).items.push(m);
          }
          // Sort each carousel's items by position so they read in order.
          posts.forEach((p) => p.items.sort((a, b) => (a.position || 0) - (b.position || 0)));

          // ── Apply search + filters + sort ────────────────────────────
          const totalCount = posts.length;
          // 1) Free-text search across title, caption text, hashtags
          //    (treated like any other word), platform id, and the file
          //    names of every image in the carousel.
          if (mediaSearch.trim()) {
            const q = mediaSearch.trim().toLowerCase();
            posts = posts.filter((p) => {
              const title = (p.caption_title || "").toLowerCase();
              const text  = (p.caption_text  || "").toLowerCase();
              const platform = (p.platform || "").toLowerCase();
              const names = p.items.map((i) => (i.name || "").toLowerCase()).join(" ");
              return title.includes(q) || text.includes(q) || platform.includes(q) || names.includes(q);
            });
          }
          // 2) Platform filter — "unknown" catches rows with no platform
          //    set or an empty string (legacy / malformed records) so
          //    they don't disappear from the library entirely.
          if (mediaPlatform !== "all") {
            if (mediaPlatform === "unknown") {
              posts = posts.filter((p) => !(p.platforms && p.platforms.length));
            } else {
              posts = posts.filter((p) => (p.platforms && p.platforms.length ? p.platforms : [p.platform]).includes(mediaPlatform));
            }
          }
          // Snapshot the post list *after* search + platform but
          // *before* date filtering. This is the pool the date-pill
          // counters render against, so the counts stay stable as the
          // user clicks between Today / Week / Month — otherwise each
          // pill would only show its own count and the bar would look
          // like every button does the same thing.
          const dateFilterPool = posts.slice();

          // 3) Date range — calendar-aware filter against the NEWEST
          //    item in each carousel (so a multi-image post takes the
          //    creation date of its most recent upload, not its first).
          //    Uses `parseCreatedDate` to normalize SQLite's
          //    "YYYY-MM-DD HH:MM:SS" output to a UTC timestamp before
          //    comparing — without that, Chrome treats SQLite dates as
          //    local-time and Safari fails to parse at all, which is
          //    why the date filter looked broken on the last screenshot.
          if (mediaDateRange !== "all") {
            const lowerBound = dateRangeLowerBound(mediaDateRange);
            posts = posts.filter((p) => {
              // Find the newest creation date across all items in the
              // post (carousels keep multiple).
              let newestTs = -Infinity;
              for (const i of p.items) {
                const ts = parseCreatedDate(i.created_date);
                if (Number.isFinite(ts) && ts > newestTs) newestTs = ts;
              }
              if (!Number.isFinite(newestTs)) return false;
              return newestTs >= lowerBound;
            });
          }
          // "منشور" tab: keep only posts that already went live.
          const isPublishedTab = activeTab === "published";
          if (isPublishedTab) posts = posts.filter((p) => publishedIds.has(p.post_id));
          // 4) Sort — newest-first (default), oldest-first, or alphabetical by title.
          //    Uses normalized timestamps (not localeCompare) so mixing
          //    SQLite "YYYY-MM-DD HH:MM:SS" with ISO "YYYY-MM-DDTHH:MM:SSZ"
          //    rows doesn't put one format always ahead of the other.
          if (mediaSort === "shuffle" && shuffleRank.size) {
            // Custom order from the "smart shuffle" button. Unranked posts
            // (e.g. added after shuffling) fall to the end.
            posts.sort((a, b) => {
              const ra = shuffleRank.has(a.post_id) ? shuffleRank.get(a.post_id) : Infinity;
              const rb = shuffleRank.has(b.post_id) ? shuffleRank.get(b.post_id) : Infinity;
              return ra - rb;
            });
          } else if (mediaSort === "newest" || mediaSort === "oldest") {
            const dir = mediaSort === "newest" ? -1 : 1;
            // Order by publish/scheduled date-time when the post has one;
            // fall back to the design's creation date for never-scheduled items.
            const tsOf = (p) => {
              const pub = publishAtMap.get(p.post_id);
              if (Number.isFinite(pub)) return pub;
              const c = parseCreatedDate(p.items[0]?.created_date);
              return Number.isFinite(c) ? c : 0;
            };
            posts.sort((a, b) => (tsOf(a) - tsOf(b)) * dir);
          } else if (mediaSort === "title") {
            posts.sort((a, b) => (a.caption_title || "").localeCompare(b.caption_title || "", "ar"));
          }
          const visibleCount = posts.length;

          // ── Group posts into TOPICS by title ─────────────────────────
          // The library shows ONE card per topic (caption_title). Clicking
          // a topic opens ALL its images (every size) for editing. Posts
          // with no title each stay their own card (we can't group what
          // has no identifier), so nothing disappears.
          const topicMap = new Map();
          for (const p of posts) {
            const t = (p.caption_title || "").trim();
            const key = t || `__untitled__${p.post_id}`;
            if (!topicMap.has(key)) {
              topicMap.set(key, { key, title: t, isUntitled: !t, posts: [], items: [], platforms: [] });
            }
            const topic = topicMap.get(key);
            topic.posts.push(p);
            for (const it of p.items) topic.items.push(it);
            for (const pl of (p.platforms && p.platforms.length ? p.platforms : [p.platform]).filter(Boolean)) {
              if (!topic.platforms.includes(pl)) topic.platforms.push(pl);
            }
          }
          const topics = Array.from(topicMap.values());
          const visibleTopics = topics.length;

          // Toggle a whole topic's selection (all its post_ids at once) in
          // select mode. Respects the per-mode lock (already-scheduled in
          // schedule mode, not-cancelable in cancel mode).
          const toggleTopicSelected = (topic) => {
            const ids = topic.posts.map((p) => p.post_id);
            const selectable = cancelMode
              ? ids.filter((id) => cancelableMap.has(id))
              : ids.filter((id) => !scheduledIds.has(id));
            if (selectable.length === 0) return;
            const allOn = selectable.every((id) => selectedPostIds.has(id));
            setSelectedPostIds((prev) => {
              const next = new Set(prev);
              if (allOn) selectable.forEach((id) => next.delete(id));
              else selectable.forEach((id) => next.add(id));
              return next;
            });
          };

          return (
            <div key={`media-grid-${localMediaVersion}`}>
              {/* ── Filter bar ──────────────────────────────────────────
                  Search input + platform pills + date-range pills +
                  sort dropdown + a count of visible-vs-total posts.
                  Pills wrap on small screens so the bar stays usable
                  at any width. */}
              <div className="hv-card rounded-xl p-3 mb-4 space-y-2.5">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 pointer-events-none" style={{ color: "var(--hv-text-faint)" }} />
                  <input
                    type="text"
                    value={mediaSearch}
                    onChange={(e) => setMediaSearch(e.target.value)}
                    placeholder={isRtl ? "🔍 ابحث في العنوان، الكابشن، الهاشتاقات..." : "🔍 Search title, caption, hashtags..."}
                    className="hv-input ps-9 pe-3 text-sm"
                  />
                  {mediaSearch && (
                    <button
                      onClick={() => setMediaSearch("")}
                      className="absolute top-1/2 -translate-y-1/2 end-2"
                      style={{ color: "var(--hv-text-faint)" }}
                      title={isRtl ? "مسح" : "Clear"}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Platform pills — always rendered (so the filter is
                    discoverable even when the user has uploads in just
                    one platform). Every major platform appears with a
                    post-count badge; empties are dimmed but still
                    clickable so the user knows the bucket exists. */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="hv-overline me-1">{isRtl ? "المنصة:" : "Platform:"}</span>
                  <button
                    onClick={() => setMediaPlatform("all")}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition inline-flex items-center gap-1"
                    style={mediaPlatform === "all"
                      ? { background: "var(--hv-primary)", color: "#fff" }
                      : { background: "rgba(79,70,229,0.08)", color: "var(--hv-primary-700)" }}
                  >
                    <span>{isRtl ? "الكل" : "All"}</span>
                    <span className="text-[10px] px-1.5 rounded-full" style={{ background: mediaPlatform === "all" ? "rgba(255,255,255,0.25)" : "rgba(79,70,229,0.12)" }}>{totalPosts}</span>
                  </button>
                  {PLATFORMS.map((p) => {
                    const count = platformCounts[p.id] || 0;
                    const isEmpty = count === 0;
                    const isActive = mediaPlatform === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setMediaPlatform(p.id)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition inline-flex items-center gap-1 ${isEmpty && !isActive ? "opacity-50" : ""}`}
                        style={isActive
                          ? { background: "var(--hv-primary)", color: "#fff" }
                          : { background: "rgba(79,70,229,0.08)", color: "var(--hv-primary-700)" }}
                        title={isEmpty ? (isRtl ? "لا توجد منشورات بعد" : "No posts yet") : undefined}
                      >
                        <span>{p.emoji}</span>
                        <span>{isRtl ? p.labelAr : p.label}</span>
                        <span className="text-[10px] px-1.5 rounded-full" style={{ background: isActive ? "rgba(255,255,255,0.25)" : "rgba(79,70,229,0.12)" }}>{count}</span>
                      </button>
                    );
                  })}
                  {/* Surface any "unknown" platform bucket — legacy or
                      malformed rows — so the user can find and fix them. */}
                  {platformCounts.unknown > 0 && (
                    <button
                      onClick={() => setMediaPlatform("unknown")}
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition inline-flex items-center gap-1"
                      style={mediaPlatform === "unknown"
                        ? { background: "var(--hv-primary)", color: "#fff" }
                        : { background: "rgba(244,63,94,0.10)", color: "var(--hv-secondary-600)" }}
                    >
                      <span>❓</span>
                      <span>{isRtl ? "بدون منصة" : "Unknown"}</span>
                      <span className="text-[10px] px-1.5 rounded-full" style={{ background: "rgba(244,63,94,0.15)" }}>
                        {platformCounts.unknown}
                      </span>
                    </button>
                  )}
                </div>

                {/* Date range + sort — share a row.
                    Each pill carries a count of how many posts fall in
                    that range — proves the filter is alive even when
                    all pills happen to match the same posts. */}
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="hv-overline me-1">{isRtl ? "التاريخ:" : "Date:"}</span>
                    {[
                      { id: "all",   ar: "الكل",         en: "All time" },
                      { id: "today", ar: "اليوم",        en: "Today" },
                      { id: "week",  ar: "هذا الأسبوع", en: "This week" },
                      { id: "month", ar: "هذا الشهر",   en: "This month" },
                      { id: "year",  ar: "هذه السنة",   en: "This year" },
                    ].map((opt) => {
                      // Compute how many of the CURRENTLY-platform-filtered
                      // posts fall in this date range, ignoring the active
                      // date filter (so the pill counts don't depend on
                      // which pill is selected). Lets the user see at a
                      // glance "Today has 4, but This Month has 12" —
                      // proving the filter is alive.
                      const lb = dateRangeLowerBound(opt.id);
                      const count = dateFilterPool.filter((p) => {
                        let newestTs = -Infinity;
                        for (const i of p.items) {
                          const ts = parseCreatedDate(i.created_date);
                          if (Number.isFinite(ts) && ts > newestTs) newestTs = ts;
                        }
                        if (!Number.isFinite(newestTs)) return opt.id === "all";
                        return newestTs >= lb;
                      }).length;
                      const isActive = mediaDateRange === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setMediaDateRange(opt.id)}
                          className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition inline-flex items-center gap-1"
                          style={isActive
                            ? { background: "var(--hv-primary)", color: "#fff" }
                            : { background: "rgba(79,70,229,0.08)", color: "var(--hv-primary-700)" }}
                        >
                          <span>{isRtl ? opt.ar : opt.en}</span>
                          <span className="text-[10px] px-1.5 rounded-full" style={{ background: isActive ? "rgba(255,255,255,0.25)" : "rgba(79,70,229,0.12)" }}>{count}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Sort dropdown — kept on the same line as date range
                      since both narrow the view rather than reshape it. */}
                  <select
                    value={mediaSort}
                    onChange={(e) => setMediaSort(e.target.value)}
                    className="hv-input w-auto px-2 py-1 text-[11px]"
                  >
                    <option value="newest">{isRtl ? "🔽 الأحدث أولاً" : "🔽 Newest first"}</option>
                    <option value="oldest">{isRtl ? "🔼 الأقدم أولاً" : "🔼 Oldest first"}</option>
                    <option value="title">{isRtl ? "🔤 حسب العنوان" : "🔤 By title"}</option>
                    {mediaSort === "shuffle" && <option value="shuffle">{isRtl ? "🎲 خلط ذكي" : "🎲 Shuffled"}</option>}
                  </select>
                </div>

                {/* Result count + reset + bulk-select toggle.
                    The select-mode toggle lives here (next to filters)
                    because turning it on is a discovery thing — the
                    user comes from the same toolbar context. */}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t" style={{ color: "var(--hv-text-soft)", borderColor: "var(--hv-border)" }}>
                  <span>
                    {isRtl
                      ? `عرض ${visibleTopics} موضوع (${visibleCount} منشور)`
                      : `Showing ${visibleTopics} topics (${visibleCount} posts)`}
                  </span>
                  <div className="flex items-center gap-2">
                    {(mediaSearch || mediaPlatform !== "all" || mediaDateRange !== "all" || mediaSort !== "newest") && (
                      <button
                        onClick={() => {
                          setMediaSearch("");
                          setMediaPlatform("all");
                          setMediaDateRange("all");
                          setMediaSort("newest");
                        }}
                        className="underline"
                        style={{ color: "var(--hv-primary)" }}
                      >
                        {isRtl ? "↺ إعادة تعيين" : "↺ Reset filters"}
                      </button>
                    )}
                    {selectMode ? (
                      <button
                        onClick={exitSelectMode}
                        className="px-2.5 py-1 rounded-lg font-semibold transition inline-flex items-center gap-1.5"
                        style={{ background: "var(--hv-primary)", color: "#fff" }}
                      >
                        <CheckSquare className="w-3 h-3" />
                        {isRtl ? "إنهاء التحديد" : "Exit select"}
                      </button>
                    ) : isPublishedTab ? (
                      <button
                        onClick={() => { setUnpublishMode(true); setSelectMode(true); }}
                        className="px-2.5 py-1 rounded-lg font-semibold transition inline-flex items-center gap-1.5"
                        style={{ background: "rgba(16,185,129,0.12)", color: "#047857" }}
                      >
                        <CheckSquare className="w-3 h-3" />
                        {isRtl ? "تحديد للإرجاع لغير منشور" : "Select to unpublish"}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => { setCancelMode(false); setSelectMode(true); }}
                          className="px-2.5 py-1 rounded-lg font-semibold transition inline-flex items-center gap-1.5"
                          style={{ background: "rgba(79,70,229,0.08)", color: "var(--hv-primary-700)" }}
                        >
                          <CheckSquare className="w-3 h-3" />
                          {isRtl ? "تحديد للجدولة" : "Select to schedule"}
                        </button>
                        <button
                          onClick={() => { setCancelMode(true); setSelectMode(true); }}
                          className="px-2.5 py-1 rounded-lg font-semibold transition inline-flex items-center gap-1.5"
                          style={{ background: "rgba(244,63,94,0.10)", color: "var(--hv-secondary-600)" }}
                        >
                          <Ban className="w-3 h-3" />
                          {isRtl ? "إلغاء جدولة" : "Cancel schedules"}
                        </button>
                        <button
                          onClick={() => {
                            if (!posts.length) return;
                            // Reorder the LIBRARY only (no scheduling): build a smart
                            // shuffled rank and switch the sort to use it.
                            const order = smartShuffleByTopic(posts);
                            setShuffleRank(new Map(order.map((p, i) => [p.post_id, i])));
                            setMediaSort("shuffle");
                          }}
                          disabled={!posts.length}
                          title={isRtl ? "يخلط ترتيب المكتبة بذكاء (يوزّع المواضيع فلا يتكرّر موضوع ورا بعض) — بدون جدولة" : "Smart-shuffle the library order (spreads topics) — no scheduling"}
                          className="px-2.5 py-1 rounded-lg font-semibold transition inline-flex items-center gap-1.5 disabled:opacity-40"
                          style={{ background: "rgba(16,185,129,0.12)", color: "#047857" }}
                        >
                          🎲 {isRtl ? "خلط ذكي" : "Smart shuffle"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Select-mode quick actions — only visible while in
                    select mode so the toolbar stays calm normally. */}
                {selectMode && (
                  <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t" style={{ borderColor: "var(--hv-border)" }}>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedPostIds(new Set(
                          (unpublishMode
                            ? posts.filter((p) => publishedIds.has(p.post_id))
                            : cancelMode
                              ? posts.filter((p) => cancelableMap.has(p.post_id))
                              : posts.filter((p) => !scheduledIds.has(p.post_id))
                          ).map((p) => p.post_id)
                        ))}
                        className="text-[11px] px-2 py-0.5 rounded"
                        style={{ background: "rgba(79,70,229,0.08)", color: "var(--hv-primary-700)" }}
                      >
                        {unpublishMode
                          ? (isRtl ? "تحديد الكل" : "Select all")
                          : cancelMode
                            ? (isRtl ? "تحديد كل المجدول" : "Select all scheduled")
                            : (isRtl ? "تحديد غير المجدول" : "Select unscheduled")}
                      </button>
                      <button
                        onClick={clearSelection}
                        disabled={selectedPostIds.size === 0}
                        className="text-[11px] px-2 py-0.5 rounded disabled:opacity-40"
                        style={{ background: "rgba(79,70,229,0.08)", color: "var(--hv-primary-700)" }}
                      >
                        {isRtl ? "إلغاء التحديد" : "Clear"}
                      </button>
                    </div>
                    <span className="text-[11px] font-semibold" style={{ color: "var(--hv-primary)" }}>
                      {isRtl
                        ? `${selectedPostIds.size} محدد`
                        : `${selectedPostIds.size} selected`}
                    </span>
                  </div>
                )}
              </div>

              {/* Empty-after-filter state — distinct from empty library
                  so the user knows their filters are the cause. */}
              {visibleTopics === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed" style={{ color: "var(--hv-text-faint)", borderColor: "var(--hv-border)", background: "var(--hv-surface-2)" }}>
                  <p className="text-base mb-1">{isRtl ? "لا توجد نتائج مطابقة" : "No matching posts"}</p>
                  <p className="text-[12px]">{isRtl ? "جرّب تعديل البحث أو الفلاتر." : "Try changing the search or filters."}</p>
                </div>
              ) : (
            <div
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
            >
              {topics.map((topic) => {
                const cover = topic.items[0];
                if (!cover) return null;
                const imageCount = topic.items.length;
                const postIds = topic.posts.map((p) => p.post_id);
                // Selection is per TOPIC: a topic is "selected" when ALL its
                // selectable post_ids are picked. Locking mirrors the per-post
                // rules — schedule mode locks fully-scheduled topics, cancel
                // mode only allows topics with cancelable entries.
                const selectableIds = unpublishMode
                  ? postIds.filter((id) => publishedIds.has(id))
                  : cancelMode
                    ? postIds.filter((id) => cancelableMap.has(id))
                    : postIds.filter((id) => !scheduledIds.has(id));
                const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedPostIds.has(id));
                const someSelected = postIds.some((id) => selectedPostIds.has(id));
                const someScheduled = postIds.some((id) => scheduledIds.has(id));
                const somePublished = postIds.some((id) => publishedIds.has(id));
                const lockedForSelect = selectMode && selectableIds.length === 0;
                return (
                  <div
                    key={topic.key}
                    onClick={() => {
                      // Select mode → toggle the whole topic. Otherwise open
                      // the topic-detail view (all its sizes).
                      if (selectMode) {
                        if (lockedForSelect) return;
                        toggleTopicSelected(topic);
                      } else {
                        setViewingTopic(topic);
                      }
                    }}
                    className={`hv-card group relative rounded-xl overflow-hidden transition ${
                      lockedForSelect ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                    } ${
                      allSelected
                        ? "ring-4 ring-indigo-500"
                        : someSelected
                          ? "ring-2 ring-indigo-400"
                          : lockedForSelect
                            ? ""
                            : selectMode
                              ? "hover:ring-2 hover:ring-indigo-400 opacity-90"
                              : "hv-card-hover hover:ring-2 hover:ring-indigo-500"
                    }`}
                  >
                    {/* Status badge — "منشور" once any post in the topic has gone
                        live, otherwise "مجدول" if it still has a pending entry. */}
                    {somePublished ? (
                      <div className={`absolute z-10 ${isRtl ? "right-2" : "left-2"} bottom-2 px-2 py-0.5 rounded-full bg-indigo-600/90 text-white text-[10px] font-bold inline-flex items-center gap-1 shadow`}>
                        <Check className="w-3 h-3" />
                        {isRtl ? "منشور" : "Published"}
                      </div>
                    ) : someScheduled && (
                      <div className={`absolute z-10 ${isRtl ? "right-2" : "left-2"} bottom-2 px-2 py-0.5 rounded-full bg-emerald-600/90 text-white text-[10px] font-bold inline-flex items-center gap-1 shadow`}>
                        <Calendar className="w-3 h-3" />
                        {isRtl ? "مجدول" : "Scheduled"}
                      </div>
                    )}
                    {/* Selection checkbox overlay. Full check when the whole
                        topic is selected, half-state otherwise. */}
                    {selectMode && (
                      <div
                        className={`absolute top-2 ${isRtl ? "left-2" : "right-2"} z-10 w-7 h-7 rounded-full flex items-center justify-center transition ${
                          allSelected
                            ? "bg-indigo-500 text-white"
                            : someSelected
                              ? "bg-indigo-500/50 text-white"
                              : "bg-white/90 text-slate-500 border border-white"
                        }`}
                      >
                        {allSelected || someSelected
                          ? <CheckSquare className="w-4 h-4" />
                          : <Square className="w-4 h-4" />}
                      </div>
                    )}
                    {/* Cover thumbnail + sizes badge (top-end) + platform
                        badges (top-start). The sizes badge tells the user
                        this card is a TOPIC holding several images. */}
                    <div className="aspect-square flex items-center justify-center overflow-hidden relative" style={{ background: "var(--hv-surface-2)" }}>
                      <img src={cover.url} alt={cover.name} className="w-full h-full object-cover" />
                      <div className="absolute top-2 start-2 flex flex-wrap gap-1 max-w-[85%]">
                        {topic.platforms.filter(Boolean).slice(0, 5).map((pl) => (
                          <span key={pl} title={platformLabel(pl, isRtl)}
                            className="px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur text-white text-[10px] font-bold inline-flex items-center">
                            {platformEmoji(pl)}
                          </span>
                        ))}
                      </div>
                      {imageCount > 1 && (
                        <span className="absolute top-2 end-2 px-2 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-bold inline-flex items-center gap-1 shadow">
                          <Layers className="w-3 h-3" />
                          {imageCount} {isRtl ? "مقاس" : "sizes"}
                        </span>
                      )}
                    </div>

                    {/* Info — topic title first, platform pills, caption. */}
                    <div className="p-3 min-h-[3rem]">
                      <p className="font-semibold text-sm truncate" style={{ color: "var(--hv-text)" }}>
                        {topic.title || cover.name}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {topic.platforms.filter(Boolean).map((pl) => (
                          <span key={pl} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: "rgba(79,70,229,0.08)", color: "var(--hv-primary-700)" }}>
                            <span>{platformEmoji(pl)}</span>
                            <span>{platformLabel(pl, isRtl)}</span>
                          </span>
                        ))}
                      </div>
                      {topic.posts[0]?.caption_text && (
                        <p className="text-[11px] mt-1.5 line-clamp-2" style={{ color: "var(--hv-text-soft)" }} dir="auto">
                          {topic.posts[0].caption_text}
                        </p>
                      )}
                    </div>

                    {/* Hover overlay — open all sizes, edit topic title/caption,
                        delete the whole topic. Hidden in select mode. */}
                    <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 transition flex items-center justify-center gap-2 ${
                      selectMode ? "" : "group-hover:opacity-100"
                    }`}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setViewingTopic(topic); }}
                        className="p-2 rounded-lg bg-white/90 hover:bg-white text-slate-800 hover:text-indigo-600 transition"
                        title={isRtl ? "فتح المقاسات" : "Open sizes"}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditMediaContent({ post_id: topic.key, items: topic.items, caption_title: topic.title, caption_text: topic.posts[0]?.caption_text || "" });
                        }}
                        className="p-2 rounded-lg bg-white/90 hover:bg-white text-slate-800 hover:text-indigo-600 transition"
                        title={isRtl ? "تحرير العنوان/الكابشن" : "Edit title/caption"}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {/* Delete the WHOLE topic — confirmation gate first. */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeletePost({ post_id: topic.key, items: topic.items, caption_title: topic.title, caption_text: topic.posts[0]?.caption_text || "" });
                        }}
                        disabled={topic.items.some((m) => deleting === m.id)}
                        className="p-2 rounded-lg bg-white/90 hover:bg-red-600 text-slate-800 hover:text-white transition disabled:opacity-50"
                        title={isRtl ? "حذف الموضوع" : "Delete topic"}
                      >
                        {topic.items.some((m) => deleting === m.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
              )}
            </div>
          );
        })()}
          </>
        )}
      </div>

      {/* Preview Modal */}
      {previewDesign && (
        <DesignPreviewModal
          design={previewDesign}
          isRtl={isRtl}
          onClose={() => setPreviewDesign(null)}
          onEdit={() => { onOpen(previewDesign); setPreviewDesign(null); }}
        />
      )}

      {/* Upload Modal — legacy single-file path. Kept for any callers that
          still use it elsewhere; the main "Upload" button now opens the
          bulk modal below. */}
      <MediaUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        language={language}
        onUploadSuccess={() => {
          setShowUploadModal(false);
          qc.invalidateQueries({ queryKey: ["media"] });
        }}
      />

      {/* Bulk upload modal — primary entry for adding content. Multi-file
          + caption-per-post workflow. */}
      <BulkMediaUploadModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        language={language}
        onUploadSuccess={() => {
          setShowBulkModal(false);
          // Switch to the media tab so the user immediately sees their
          // freshly uploaded posts (otherwise they'd land back on the
          // empty designs view and wonder if anything happened).
          setActiveTab("media");
          // Refresh both sources — backend (in case some rows did make
          // it through) and the local-only counter (which captures
          // anything that fell back to localStorage during upload).
          qc.invalidateQueries({ queryKey: ["media"] });
          setLocalMediaVersion((v) => v + 1);
        }}
      />

      {/* ── Full-post preview modal ─────────────────────────────────────
          Opens when the user clicks a card. Shows every image in the
          carousel (with arrow navigation), the full untruncated caption,
          a copy-to-clipboard button so the user can paste straight into
          a social app, and the standard delete action. Closes on outside
          click + Escape doesn't (kept simple). */}
      {previewingPost && (() => {
        const post = previewingPost;
        const itemsCount = post.items.length;
        const safePage = Math.min(previewPage, itemsCount - 1);
        const currentImage = post.items[safePage];
        const isCarousel = itemsCount > 1;
        const fullCaption = [post.caption_title, post.caption_text].filter(Boolean).join("\n\n");
        const hashtagCount = (post.caption_text || "").match(/#[^\s#]+/g)?.length || 0;
        const charCount = (post.caption_text || "").length;

        return (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setPreviewingPost(null); setCopiedFeedback(false); }}
            dir={isRtl ? "rtl" : "ltr"}
          >
            <div
              className="hv-card rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header — platform badge + carousel count + close */}
              <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--hv-border)" }}>
                <div className="flex items-center gap-2">
                  <span className="hv-chip text-xs">
                    <span>{platformEmoji(post.platform)}</span>
                    <span>{platformLabel(post.platform, isRtl)}</span>
                  </span>
                  {isCarousel && (
                    <span className="hv-chip-accent inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold">
                      🎠 {itemsCount} {isRtl ? "صور" : "images"}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { setPreviewingPost(null); setCopiedFeedback(false); }}
                  className="p-1 rounded transition"
                  style={{ color: "var(--hv-text-soft)" }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body — split into image (left) + caption (right) on
                  desktop, stacked on mobile. */}
              <div className="flex-1 overflow-y-auto md:overflow-hidden grid md:grid-cols-2 gap-0">
                {/* Image area */}
                <div className="bg-slate-950 relative flex items-center justify-center min-h-[300px] md:min-h-0">
                  <img
                    src={currentImage.url}
                    alt={currentImage.name}
                    className="max-w-full max-h-[60vh] md:max-h-[80vh] object-contain"
                  />
                  {/* Carousel arrows — only when more than one image */}
                  {isCarousel && (
                    <>
                      <button
                        onClick={() => setPreviewPage((p) => (p - 1 + itemsCount) % itemsCount)}
                        className="absolute start-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition"
                        title={isRtl ? "السابقة" : "Previous"}
                      >
                        <ChevronLeft className={`w-5 h-5 ${isRtl ? "rotate-180" : ""}`} />
                      </button>
                      <button
                        onClick={() => setPreviewPage((p) => (p + 1) % itemsCount)}
                        className="absolute end-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition"
                        title={isRtl ? "التالية" : "Next"}
                      >
                        <ChevronRight className={`w-5 h-5 ${isRtl ? "rotate-180" : ""}`} />
                      </button>
                      {/* Page indicator + thumbnail strip */}
                      <div className="absolute bottom-2 inset-x-2 flex flex-col items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-black/70 text-white text-[11px] font-semibold">
                          {safePage + 1} / {itemsCount}
                        </span>
                        <div className="flex gap-1 max-w-full overflow-x-auto py-1">
                          {post.items.map((it, i) => (
                            <button
                              key={it.id}
                              onClick={() => setPreviewPage(i)}
                              className={`w-10 h-10 rounded overflow-hidden border-2 flex-shrink-0 transition ${
                                i === safePage ? "border-cyan-400" : "border-transparent opacity-60 hover:opacity-100"
                              }`}
                            >
                              <img src={it.url} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Caption area */}
                <div className="p-5 flex flex-col gap-3 overflow-y-auto">
                  {/* Title */}
                  {post.caption_title && (
                    <div>
                      <p className="hv-overline mb-1">{isRtl ? "العنوان" : "Title"}</p>
                      <p className="text-base font-bold leading-snug" style={{ color: "var(--hv-text)" }}>{post.caption_title}</p>
                    </div>
                  )}

                  {/* Full caption text */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="hv-overline">{isRtl ? "الكابشن + الهاشتاقات" : "Caption + hashtags"}</p>
                      <p className="text-[10px]" style={{ color: "var(--hv-text-faint)" }}>
                        {isRtl ? `${charCount} حرف · ${hashtagCount} هاشتاق` : `${charCount} chars · ${hashtagCount} hashtags`}
                      </p>
                    </div>
                    {post.caption_text ? (
                      <div
                        className="rounded-lg p-3 text-sm whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto"
                        style={{ background: "var(--hv-surface-2)", border: "1px solid var(--hv-border)", color: "var(--hv-text)" }}
                        dir="auto"
                      >
                        {post.caption_text}
                      </div>
                    ) : (
                      <p className="italic text-sm" style={{ color: "var(--hv-text-faint)" }}>
                        {isRtl ? "لا يوجد كابشن لهذا المنشور." : "No caption for this post."}
                      </p>
                    )}
                  </div>

                  {/* Image metadata footer */}
                  <div className="text-[10px] leading-relaxed pt-2 border-t" style={{ color: "var(--hv-text-faint)", borderColor: "var(--hv-border)" }}>
                    <div>{isRtl ? "اسم الصورة:" : "Filename:"} <span className="font-mono" style={{ color: "var(--hv-text-soft)" }}>{currentImage.name}</span></div>
                    {currentImage.created_date && (
                      <div className="mt-0.5">
                        {isRtl ? "تاريخ الرفع:" : "Uploaded:"}{" "}
                        <span style={{ color: "var(--hv-text-soft)" }}>
                          {new Date(currentImage.created_date).toLocaleString(isRtl ? "ar-SA" : "en-US")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {/* Copy caption — main action since the whole point
                        of the library is to grab content for posting. */}
                    {fullCaption && (
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(fullCaption);
                            setCopiedFeedback(true);
                            setTimeout(() => setCopiedFeedback(false), 2000);
                          } catch { /* clipboard blocked — silently ignore */ }
                        }}
                        className={`hv-btn flex-1 text-sm ${copiedFeedback ? "hv-btn-accent" : "hv-btn-primary"}`}
                        style={copiedFeedback ? { background: "#10b981" } : undefined}
                      >
                        {copiedFeedback
                          ? (isRtl ? "✓ تم النسخ!" : "✓ Copied!")
                          : (isRtl ? "📋 نسخ الكابشن" : "📋 Copy caption")}
                      </button>
                    )}

                    {/* Open image — useful if user wants to right-click
                        save or share. */}
                    <a
                      href={currentImage.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hv-btn hv-btn-ghost text-sm"
                      title={isRtl ? "افتح الصورة في نافذة جديدة" : "Open image in new tab"}
                    >
                      <Eye className="w-4 h-4" />
                      {isRtl ? "فتح" : "Open"}
                    </a>

                    {/* Edit caption — opens the inline caption editor.
                        Closes this preview so the editor isn't fighting
                        for screen space. */}
                    <button
                      onClick={() => { handleEditMediaContent(post); setPreviewingPost(null); }}
                      className="hv-btn hv-btn-soft text-sm"
                    >
                      <Edit3 className="w-4 h-4" />
                      {isRtl ? "تحرير" : "Edit"}
                    </button>

                    {/* Delete (whole carousel) — opens a confirmation
                        dialog. The dialog handles the actual deletion
                        and closes both the preview and itself on done. */}
                    <button
                      onClick={() => setConfirmDeletePost(post)}
                      disabled={post.items.some((m) => deleting === m.id)}
                      className="hv-btn hv-btn-danger text-sm disabled:opacity-50"
                    >
                      {post.items.some((m) => deleting === m.id)
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                      {isRtl ? "حذف" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Topic-detail modal ────────────────────────────────────────
          Opens when the user clicks a topic card. Shows EVERY image in
          the topic (all sizes), each with its own actions: download,
          open, info (title/platforms), delete. A header action edits the
          whole topic's title/caption at once. This is the "one card per
          topic, click to see all sizes & edit any" behaviour. */}
      {viewingTopic && (() => {
        const topic = viewingTopic;
        const syntheticPost = {
          post_id: topic.key,
          items: topic.items,
          caption_title: topic.title,
          caption_text: topic.posts[0]?.caption_text || "",
        };
        return (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewingTopic(null)}
            dir={isRtl ? "rtl" : "ltr"}
          >
            <div
              className="hv-card rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2 p-4 border-b" style={{ borderColor: "var(--hv-border)" }}>
                <div className="min-w-0">
                  <p className="hv-overline">{isRtl ? "الموضوع" : "Topic"}</p>
                  <h3 className="font-bold truncate" style={{ color: "var(--hv-text)" }}>
                    {topic.title || (isRtl ? "بدون عنوان" : "Untitled")}
                  </h3>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--hv-text-soft)" }}>
                    {topic.items.length} {isRtl ? "صورة/مقاس" : "images"}
                    {topic.platforms.length > 0 && <> · {topic.platforms.map((pl) => platformEmoji(pl)).join(" ")}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => { handleEditMediaContent(syntheticPost); setViewingTopic(null); }}
                    className="hv-btn hv-btn-soft text-sm"
                    title={isRtl ? "تعديل العنوان والكابشن لكل صور الموضوع" : "Edit title & caption for the whole topic"}
                  >
                    <Edit3 className="w-4 h-4" />
                    <span className="hidden sm:inline">{isRtl ? "تعديل العنوان/الكابشن" : "Edit title/caption"}</span>
                  </button>
                  <button
                    onClick={() => setViewingTopic(null)}
                    className="p-1 rounded transition"
                    style={{ color: "var(--hv-text-soft)" }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body — grid of all images in this topic */}
              <div className="p-4 overflow-y-auto">
                <p className="text-[11px] mb-3" style={{ color: "var(--hv-text-soft)" }}>
                  {isRtl
                    ? "كل المقاسات تحت هذا العنوان. حمّل أو احذف أو عدّل بيانات أي صورة."
                    : "All sizes under this topic. Download, delete, or edit info for any image."}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {topic.items.map((img) => (
                    <LibImageTile
                      key={img.id}
                      image={img}
                      isRtl={isRtl}
                      busy={deleting === img.id}
                      onInfo={() => handleEditMedia(img)}
                      onDelete={async () => {
                        await handleDeleteMedia({ stopPropagation() {} }, img.id);
                        // Drop the deleted image from the open topic view; if
                        // it was the last one, close the modal.
                        setViewingTopic((t) => {
                          if (!t) return t;
                          const items = t.items.filter((x) => x.id !== img.id);
                          return items.length ? { ...t, items } : null;
                        });
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-2 p-4 border-t" style={{ borderColor: "var(--hv-border)" }}>
                <button
                  onClick={() => setConfirmDeletePost(syntheticPost)}
                  className="hv-btn hv-btn-danger text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  {isRtl ? "حذف الموضوع كامل" : "Delete whole topic"}
                </button>
                <button
                  onClick={() => setViewingTopic(null)}
                  className="hv-btn hv-btn-ghost flex-1 text-sm"
                >
                  {isRtl ? "إغلاق" : "Close"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Caption editor modal ──────────────────────────────────────
          Opens from the pencil button on any post. Edits the post's
          title + caption text + hashtags. Saves to localStorage (the
          Railway backend rejects these columns, so we keep captions
          client-side until the backend is fixed). */}
      {editingCaption && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] flex items-center justify-center p-4"
          onClick={() => setEditingCaption(null)}
          dir={isRtl ? "rtl" : "ltr"}
        >
          <div
            className="hv-card rounded-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--hv-border)" }}>
              <h3 className="font-bold flex items-center gap-2" style={{ color: "var(--hv-text)" }}>
                <Edit3 className="w-4 h-4" style={{ color: "var(--hv-primary)" }} />
                {isRtl ? "تعديل الكابشن" : "Edit caption"}
              </h3>
              <button
                onClick={() => setEditingCaption(null)}
                style={{ color: "var(--hv-text-soft)" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="hv-overline block mb-1">
                  {isRtl ? "العنوان" : "Title"}
                </label>
                <input
                  type="text"
                  value={editingCaption.title}
                  onChange={(e) =>
                    setEditingCaption((c) => ({ ...c, title: e.target.value }))
                  }
                  placeholder={isRtl ? "عنوان المنشور" : "Post title"}
                  className="hv-input text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="hv-overline">
                    {isRtl ? "الكابشن + الهاشتاقات" : "Caption + hashtags"}
                  </label>
                  <span className="text-[10px]" style={{ color: "var(--hv-text-faint)" }}>
                    {(() => {
                      const txt = editingCaption.text || "";
                      const tags = txt.match(/#[^\s#]+/g)?.length || 0;
                      return isRtl
                        ? `${txt.length} حرف · ${tags} هاشتاق`
                        : `${txt.length} chars · ${tags} hashtags`;
                    })()}
                  </span>
                </div>
                <textarea
                  value={editingCaption.text}
                  onChange={(e) =>
                    setEditingCaption((c) => ({ ...c, text: e.target.value }))
                  }
                  rows={8}
                  placeholder={isRtl
                    ? "اكتب نص الكابشن مع الهاشتاقات هنا..."
                    : "Write your caption with hashtags here..."}
                  dir="auto"
                  className="hv-input text-sm resize-y font-mono"
                />
              </div>

              <p className="text-[10px] leading-relaxed" style={{ color: "var(--hv-text-faint)" }}>
                {isRtl
                  ? "💡 التعديلات تُحفظ على جهازك (الـ backend لا يدعم تعديل الكابشن حالياً)."
                  : "💡 Edits save to this device (the backend doesn't support caption edits yet)."}
              </p>
            </div>

            <div className="flex gap-2 p-4 border-t" style={{ borderColor: "var(--hv-border)" }}>
              <button
                onClick={() => setEditingCaption(null)}
                className="hv-btn hv-btn-ghost flex-1 text-sm"
              >
                {isRtl ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleSaveCaption}
                className="hv-btn hv-btn-primary flex-1 text-sm"
              >
                {isRtl ? "💾 حفظ التعديلات" : "💾 Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ─────────────────────────────────
          A small "are you sure?" gate in front of the destructive
          delete-post action. Required because the grid can have 50+
          carousels and a misclick on a 🗑️ button would otherwise
          silently nuke a whole post. */}
      {confirmDeletePost && (() => {
        const post = confirmDeletePost;
        const isBusy = post.items.some((m) => deleting === m.id);
        return (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => !isBusy && setConfirmDeletePost(null)}
            dir={isRtl ? "rtl" : "ltr"}
          >
            <div
              className="hv-card rounded-2xl w-full max-w-md overflow-hidden"
              style={{ borderColor: "rgba(220,38,38,0.3)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#fee2e2" }}>
                    <Trash2 className="w-6 h-6" style={{ color: "#dc2626" }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base" style={{ color: "var(--hv-text)" }}>
                      {isRtl ? "تأكيد الحذف" : "Confirm deletion"}
                    </h3>
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--hv-text-soft)" }}>
                      {isRtl
                        ? `هل أنت متأكد من حذف هذا المنشور${post.items.length > 1 ? ` (${post.items.length} صور)` : ""}؟`
                        : `Are you sure you want to delete this post${post.items.length > 1 ? ` (${post.items.length} images)` : ""}?`}
                    </p>
                  </div>
                </div>

                {/* Show what we're about to lose so the user sees the
                    actual content, not just an abstract "this post". */}
                <div className="rounded-lg p-3 flex gap-3 items-start" style={{ background: "var(--hv-surface-2)" }}>
                  <img
                    src={post.items[0].url}
                    alt=""
                    className="w-16 h-16 object-cover rounded flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--hv-text)" }}>
                      {post.caption_title || post.items[0].name}
                    </p>
                    {post.caption_text && (
                      <p className="text-[11px] line-clamp-2 mt-0.5" style={{ color: "var(--hv-text-soft)" }} dir="auto">
                        {post.caption_text}
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-[10px] leading-relaxed" style={{ color: "#d97706" }}>
                  {isRtl
                    ? "⚠️ لا يمكن التراجع عن هذه العملية."
                    : "⚠️ This action cannot be undone."}
                </p>
              </div>

              <div className="flex gap-2 p-4 border-t" style={{ borderColor: "var(--hv-border)" }}>
                <button
                  onClick={() => setConfirmDeletePost(null)}
                  disabled={isBusy}
                  className="hv-btn hv-btn-ghost flex-1 text-sm disabled:opacity-50"
                >
                  {isRtl ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={async () => {
                    const fakeEvent = { stopPropagation: () => {} };
                    for (const m of post.items) {
                      try { await handleDeleteMedia(fakeEvent, m.id); }
                      catch { /* keep going through the rest */ }
                    }
                    setConfirmDeletePost(null);
                    // If the preview modal was showing this same post,
                    // close it too so the user isn't staring at deleted
                    // content.
                    if (previewingPost?.post_id === post.post_id) {
                      setPreviewingPost(null);
                    }
                    // Same for the topic-detail modal.
                    if (viewingTopic?.key === post.post_id) {
                      setViewingTopic(null);
                    }
                  }}
                  disabled={isBusy}
                  className="hv-btn flex-1 text-sm disabled:opacity-50"
                  style={{ background: "#dc2626", color: "#fff" }}
                >
                  {isBusy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {isRtl ? "نعم، احذف" : "Yes, delete"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit Media Properties Modal */}
      {editingMedia && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="hv-card rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-lg mb-4" style={{ color: "var(--hv-text)" }}>
              {isRtl ? "معلومات المحتوى" : "Media Info"}
            </h3>

            <div className="space-y-4">
              {/* Title = the topic identifier. Images that share a title are
                  treated as the SAME topic and scheduled together. Required. */}
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: "var(--hv-text)" }}>
                  {isRtl ? "العنوان (مُعرّف الموضوع) *" : "Title (topic id) *"}
                </label>
                <input
                  type="text"
                  value={editingData.title || ""}
                  onChange={(e) => setEditingData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder={isRtl ? "مثال: إجازة الصيف" : "e.g. Summer sale"}
                  className="hv-input"
                />
                <p className="text-[10px] mt-1" style={{ color: "var(--hv-text-soft)" }}>
                  {isRtl ? "الصور بنفس العنوان = موضوع واحد، تتجدول مع بعض (البوست والستوري سوا)." : "Same title = one topic, scheduled together."}
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "var(--hv-text)" }}>
                  {isRtl ? "اسم الملف (اختياري)" : "File Name (optional)"}
                </label>
                <input
                  type="text"
                  value={editingData.name || ""}
                  onChange={(e) =>
                    setEditingData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="hv-input"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "var(--hv-text)" }}>
                  {isRtl ? "المنصات (اختر واحدة أو أكثر)" : "Platforms (one or more)"}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PLATFORMS.map((p) => {
                    const on = (editingData.platforms || []).includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setEditingData((prev) => {
                          const cur = prev.platforms || [];
                          return { ...prev, platforms: on ? cur.filter((x) => x !== p.id) : [...cur, p.id] };
                        })}
                        className="flex items-center gap-1.5 px-2 py-2 rounded-lg text-[12px] font-semibold border transition"
                        style={on
                          ? { background: "var(--hv-primary)", borderColor: "var(--hv-primary)", color: "#fff" }
                          : { background: "var(--hv-surface)", borderColor: "var(--hv-border)", color: "var(--hv-text-soft)" }}
                      >
                        <span>{p.emoji}</span>
                        <span className="truncate">{isRtl ? p.labelAr : p.label}</span>
                        {on && <Check className="w-3.5 h-3.5 ms-auto flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setEditingMedia(null)}
                className="hv-btn hv-btn-ghost flex-1"
              >
                {isRtl ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updateMediaMutation.isPending || !(editingData.title || "").trim()}
                title={!(editingData.title || "").trim() ? (isRtl ? "اكتب عنواناً أولاً" : "Enter a title first") : ""}
                className="hv-btn hv-btn-primary flex-1 disabled:opacity-50"
              >
                {updateMediaMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {isRtl ? "حفظ" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating action bar ────────────────────────────────────────
          Appears when one or more posts are selected. Sticky bottom
          docked to the viewport so the user can scroll the grid and
          still see it. Mirrors the way Gmail / iOS Photos surface
          batch actions — the bar is the visible commitment that
          "you're selecting something to do with it later". */}
      {(activeTab === "media" || activeTab === "published") && selectedPostIds.size > 0 && (
        <div className="fixed bottom-4 inset-x-4 z-40 flex justify-center pointer-events-none" dir={isRtl ? "rtl" : "ltr"}>
          <div className="pointer-events-auto hv-card backdrop-blur rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 max-w-2xl w-full" style={{ borderColor: "rgba(79,70,229,0.4)" }}>
            <div className="flex items-center gap-2 flex-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(79,70,229,0.12)" }}>
                <CheckSquare className="w-4 h-4" style={{ color: "var(--hv-primary)" }} />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-bold" style={{ color: "var(--hv-text)" }}>
                  {isRtl
                    ? `${selectedPostIds.size} منشور محدد`
                    : `${selectedPostIds.size} post${selectedPostIds.size === 1 ? "" : "s"} selected`}
                </p>
                <p className="text-[10px]" style={{ color: "var(--hv-text-soft)" }}>
                  {unpublishMode
                    ? (isRtl ? "إرجاعها لغير منشور لتجدولها من جديد" : "Return them to unpublished so they can be re-scheduled")
                    : cancelMode
                      ? (isRtl ? "إلغاء جدولة المحدد دفعة واحدة" : "Cancel the selected schedules in one go")
                      : (isRtl ? "اختر طريقة الجدولة لكل منشور دفعة واحدة" : "Schedule them all in one go")}
                </p>
              </div>
            </div>
            <button
              onClick={exitSelectMode}
              className="hv-btn hv-btn-ghost text-sm"
            >
              {isRtl ? "إلغاء" : "Cancel"}
            </button>
            {unpublishMode ? (
              <button
                onClick={handleBulkUnpublish}
                disabled={bulkUnpublishing}
                className="hv-btn text-sm disabled:opacity-50"
                style={{ background: "#047857", color: "#fff" }}
              >
                <Ban className="w-4 h-4" />
                {bulkUnpublishing
                  ? (isRtl ? "جارٍ الإرجاع…" : "Returning…")
                  : (isRtl ? "↩️ إرجاع لغير منشور" : "Return to unpublished")}
              </button>
            ) : cancelMode ? (
              <button
                onClick={handleBulkCancel}
                disabled={bulkCancelling}
                className="hv-btn text-sm disabled:opacity-50"
                style={{ background: "#d97706", color: "#fff" }}
              >
                <Ban className="w-4 h-4" />
                {bulkCancelling
                  ? (isRtl ? "جارٍ الإلغاء…" : "Cancelling…")
                  : (isRtl ? "إلغاء الجدولة" : "Cancel schedules")}
              </button>
            ) : (
            <button
              onClick={() => {
                // Recompute the actual post objects from current state
                // — the selection set only stores IDs, so we pull live
                // post snapshots. Reads the merged enriched list the
                // grid is currently rendering.
                const captions = readCaptionsMap();
                const localRows = listLocalMedia();
                const enriched = [
                  ...mediaList.map((m) => {
                    const cap = captions[m.id];
                    return cap ? { ...m, ...cap } : m;
                  }),
                  ...localRows,
                ];
                const byPostId = new Map();
                for (const m of enriched) {
                  const key = m.post_id || `legacy_${m.id}`;
                  if (!byPostId.has(key)) {
                    byPostId.set(key, {
                      post_id: key,
                      items: [],
                      platform: m.platform,
                      caption_title: m.caption_title,
                      caption_text: m.caption_text,
                    });
                  }
                  byPostId.get(key).items.push(m);
                }
                for (const post of byPostId.values()) {
                  post.items.sort((a, b) => (a.position || 0) - (b.position || 0));
                }
                const queue = Array.from(selectedPostIds)
                  .map((id) => byPostId.get(id))
                  .filter(Boolean);
                if (queue.length > 0) setBulkScheduleQueue(queue);
              }}
              className="hv-btn hv-btn-primary text-sm"
            >
              <Calendar className="w-4 h-4" />
              {isRtl ? "جدولة" : "Schedule"}
            </button>
            )}
          </div>
        </div>
      )}

      {/* Bulk schedule modal — opens with the prepared queue of posts.
          Closes back to the library and clears selection on success. */}
      <BulkScheduleModal
        isOpen={!!bulkScheduleQueue}
        posts={bulkScheduleQueue || []}
        language={language}
        initialGroupTopics={!shuffleScheduling}
        onClose={() => { setBulkScheduleQueue(null); setShuffleScheduling(false); }}
        onSuccess={() => {
          setBulkScheduleQueue(null);
          setShuffleScheduling(false);
          exitSelectMode();
        }}
      />

    </div>
  );
}