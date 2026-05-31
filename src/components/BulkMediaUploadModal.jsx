// BulkMediaUploadModal — upload up to 50 images at once, then attach a
// caption (title + body+hashtags) to each "post". Replaces the legacy
// single-file MediaUploadModal for the design library's content workflow.
//
// Mental model:
//   • A POST is the unit the user will publish to a platform.
//   • A post has ONE caption (title + text) and 1..N images.
//   • The default after picking files: each image is its OWN post.
//   • The user can promote any image into a CAROUSEL with the next one(s)
//     by clicking the "join" button between them. A carousel cover = first
//     image; the caption belongs to the whole group.
//
// Why we picked this UX:
//   • One image per post is the 95% case. Don't force grouping decisions
//     up front.
//   • Carousels are common on Instagram — supporting them keeps the
//     library aligned with how the user actually schedules content.
//
// Storage shape (per uploaded image row in `media` table):
//   { url, name, type, platform, size, caption_title, caption_text,
//     post_id, position }
//   Carousel images share `post_id` + increment `position`.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Upload, X, Loader2, Link2, Unlink, ChevronRight } from "lucide-react";
import { uploadFile, localApi } from "@/api/localClient";
import { normalizeImageFile, isHeic } from "@/utils/imageConvert";
import { addLocalMedia } from "@/utils/localMediaStore";

// Exported so the design-library filter bar can use the same labels
// (Arabic + English) without duplicating the mapping.
export const PLATFORMS = [
  { id: "instagram", label: "Instagram", labelAr: "انستقرام",   emoji: "📷" },
  { id: "tiktok",    label: "TikTok",    labelAr: "تيك توك",     emoji: "🎵" },
  { id: "snapchat",  label: "Snapchat",  labelAr: "سناب شات",    emoji: "👻" },
  { id: "facebook",  label: "Facebook",  labelAr: "فيسبوك",      emoji: "📘" },
  { id: "twitter",   label: "Twitter / X", labelAr: "تويتر / X", emoji: "✖️" },
  { id: "youtube",   label: "YouTube",   labelAr: "يوتيوب",       emoji: "▶️" },
  { id: "linkedin",  label: "LinkedIn",  labelAr: "لينكدإن",     emoji: "💼" },
];

// Helper — get the localized label for a platform id, with a friendly
// fallback if a row has an unknown platform tag (shouldn't normally
// happen but legacy data might).
export function platformLabel(id, isRtl) {
  const p = PLATFORMS.find((x) => x.id === id);
  if (!p) return id || "—";
  return isRtl ? p.labelAr : p.label;
}
export function platformEmoji(id) {
  return PLATFORMS.find((x) => x.id === id)?.emoji || "📌";
}

const MAX_FILES = 50;

// Random short ID — used both for client-side group keys and the post_id
// that we associate with the saved media row.
const newId = () => Math.random().toString(36).slice(2, 11);

// localStorage key for caption metadata. The deployed Railway backend
// rejects unknown columns (responds with 404 "Application not found"),
// so we don't try to push the new caption fields server-side. Instead
// we tuck them into localStorage keyed by media id; the library reads
// them back when grouping posts. Trade-off: captions don't sync across
// devices, but the feature works without a backend migration.
export const MEDIA_CAPTIONS_KEY = "bulk_media_captions_v1";

// Read the whole captions map. `{}` shape: `{ [mediaId]: { caption_title, caption_text, post_id, position } }`.
export function readCaptionsMap() {
  try { return JSON.parse(localStorage.getItem(MEDIA_CAPTIONS_KEY) || "{}"); }
  catch { return {}; }
}
function writeCaptionsMap(map) {
  try { localStorage.setItem(MEDIA_CAPTIONS_KEY, JSON.stringify(map)); }
  catch { /* quota exceeded — silently skip; backend still has the file */ }
}

export default function BulkMediaUploadModal({ isOpen, onClose, language, onUploadSuccess }) {
  const isRtl = language === "ar";

  // ── Wizard step: 1 = pick files + platform, 2 = caption each post ──
  const [step, setStep] = useState(1);
  const [platform, setPlatform] = useState("instagram");

  // Each file becomes an "item" with a stable id, the File object, an
  // object-URL for thumbnail rendering, and a `groupId` that pairs it
  // with other items into a single post.
  //   items = [{ id, file, previewUrl, groupId }]
  const [items, setItems] = useState([]);

  // Caption per post (keyed by groupId). { [groupId]: { title, text } }
  const [captions, setCaptions] = useState({});

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState(null);

  // Lightbox state — when set, an overlay shows the picked image full-size
  // so the user can verify they're captioning the right file. Object URL,
  // not file index, so the overlay survives any reorder/split operation.
  const [previewImage, setPreviewImage] = useState(null);

  const fileInputRef = useRef(null);

  // Object URLs are revocable resources — release them when the modal
  // closes so we don't leak browser memory across many uploads.
  useEffect(() => () => items.forEach((it) => URL.revokeObjectURL(it.previewUrl)), [items]);

  // Reset all state when the modal opens fresh.
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setItems([]);
    setCaptions({});
    setProgress({ done: 0, total: 0 });
    setError(null);
  }, [isOpen]);

  // ── Group the flat items list into ordered posts ────────────────────
  // Returns: [{ groupId, files: [{ item, idx-in-flat }] }, ...]
  // Order follows the flat items list — first occurrence of each groupId
  // determines the post order.
  const posts = useMemo(() => {
    const map = new Map();
    items.forEach((it, idx) => {
      if (!map.has(it.groupId)) map.set(it.groupId, { groupId: it.groupId, files: [] });
      map.get(it.groupId).files.push({ item: it, idx });
    });
    return [...map.values()];
  }, [items]);

  const handleFilesPicked = (e) => {
    const list = Array.from(e.target.files || []);
    if (list.length === 0) return;
    // Soft cap. Hard reject anything beyond MAX_FILES so the UI stays
    // responsive (50 thumbnails is already a lot of DOM).
    const incoming = list.slice(0, MAX_FILES - items.length);
    const next = incoming
      .filter((f) => f.type.startsWith("image/") || isHeic(f))
      .map((file) => ({
        id: newId(),
        file,
        previewUrl: URL.createObjectURL(file),
        // Default: each new file gets its OWN group → standalone post.
        groupId: newId(),
      }));
    setItems((arr) => [...arr, ...next]);
    e.target.value = "";
  };

  const removeItem = (id) => {
    setItems((arr) => {
      const removed = arr.find((it) => it.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return arr.filter((it) => it.id !== id);
    });
  };

  // ── Joining / splitting carousels ───────────────────────────────────
  // "Join with next": copy the next item's groupId onto this one (and any
  // other items that already share my old groupId), folding two posts
  // into one.
  const joinWithNext = (idx) => {
    if (idx + 1 >= items.length) return;
    const myGroup = items[idx].groupId;
    const nextGroup = items[idx + 1].groupId;
    if (myGroup === nextGroup) return;
    setItems((arr) => arr.map((it) => (it.groupId === nextGroup ? { ...it, groupId: myGroup } : it)));
    // The next post's caption is discarded when we merge — promote it
    // to the merged post only if the surviving post had no caption yet.
    setCaptions((c) => {
      const merged = { ...c };
      const mine = merged[myGroup];
      const nexts = merged[nextGroup];
      if ((!mine || (!mine.title && !mine.text)) && nexts) merged[myGroup] = nexts;
      delete merged[nextGroup];
      return merged;
    });
  };

  // "Split here" — give this item a fresh groupId so it (and any items
  // after it that share the same group) become a new post.
  const splitHere = (idx) => {
    const item = items[idx];
    const newGroup = newId();
    // Move this item + all subsequent items with the SAME old groupId
    // (the rest of its carousel) to a new group, so the split is clean.
    let cascading = false;
    setItems((arr) => arr.map((it, i) => {
      if (i === idx) { cascading = true; return { ...it, groupId: newGroup }; }
      if (cascading && it.groupId === item.groupId) return { ...it, groupId: newGroup };
      cascading = false;
      return it;
    }));
  };

  const updateCaption = (groupId, patch) => {
    setCaptions((c) => ({ ...c, [groupId]: { ...(c[groupId] || { title: "", text: "" }), ...patch } }));
  };

  // ── Actual upload ────────────────────────────────────────────────────
  // Sequential per file — keeps the local backend (and the user's network)
  // from getting hammered by 50 parallel uploads. Progress UI updates
  // after each file completes.
  const handleUpload = async () => {
    if (items.length === 0) {
      setError(isRtl ? "اختر صورة واحدة على الأقل" : "Pick at least one image");
      return;
    }
    setUploading(true);
    setError(null);
    setProgress({ done: 0, total: items.length });

    // Caption updates accumulate into one localStorage write at the end so
    // we don't thrash the storage layer per file (50 sequential writes vs
    // one batch write).
    const captionUpdates = {};
    const failures = [];

    try {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        // Position within the post = index among files sharing the
        // same groupId, in flat-list order.
        const groupFiles = items.filter((x) => x.groupId === it.groupId);
        const positionInPost = groupFiles.findIndex((x) => x.id === it.id);
        const cap = captions[it.groupId] || { title: "", text: "" };

        try {
          // HEIC → JPEG conversion lives here, not on the server, so the
          // backend stays format-agnostic.
          const ready = isHeic(it.file) ? await normalizeImageFile(it.file) : it.file;
          const { file_url } = await uploadFile({ file: ready });
          // Try the backend first. The Railway deployment currently 404s
          // on POST /media ("Application not found"), so we capture that
          // failure and write the full record to localStorage instead —
          // Cloudinary already hosts the file, so the URL stays valid;
          // the library just reads metadata from a different source.
          try {
            const created = await localApi.entities.Media.create({
              name: ready.name,
              url: file_url,
              type: "image",
              platform,
              size: ready.size,
            });
            if (created?.id) {
              captionUpdates[created.id] = {
                caption_title: cap.title || "",
                caption_text:  cap.text  || "",
                post_id:       it.groupId,
                position:      positionInPost,
              };
            }
          } catch (backendErr) {
            // Fallback path — record the WHOLE entry locally so the
            // library can show it without any backend roundtrip.
            console.warn("[BulkMediaUpload] backend rejected, falling back to local store:", backendErr?.message);
            addLocalMedia({
              name: ready.name,
              url: file_url,
              type: "image",
              platform,
              size: ready.size,
              caption_title: cap.title || "",
              caption_text:  cap.text  || "",
              post_id:       it.groupId,
              position:      positionInPost,
            });
          }
        } catch (e) {
          // Cloudinary failure or HEIC conversion failure — these we
          // can't recover from, so log + report. Other items continue.
          failures.push({ name: it.file?.name || `#${i + 1}`, error: e?.message || String(e) });
          console.error("[BulkMediaUpload] failed for", it.file?.name, e);
        }
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }

      // Commit caption metadata to localStorage. We merge into the existing
      // map so previously-uploaded posts keep their captions.
      if (Object.keys(captionUpdates).length > 0) {
        const map = readCaptionsMap();
        Object.assign(map, captionUpdates);
        writeCaptionsMap(map);
      }

      if (failures.length === 0) {
        onUploadSuccess?.({ count: items.length });
        onClose();
      } else if (failures.length === items.length) {
        // Everything failed — keep the modal open so the user sees what
        // they were trying to upload.
        setError(isRtl
          ? `تعذّر الرفع: ${failures[0].error}`
          : `Upload failed: ${failures[0].error}`);
      } else {
        // Partial success — close but tell the parent how many slipped.
        onUploadSuccess?.({ count: items.length - failures.length, failed: failures.length });
        onClose();
      }
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  const platformLabel = PLATFORMS.find((p) => p.id === platform);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" dir={isRtl ? "rtl" : "ltr"}>
      <div className="bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              📤 {isRtl ? "رفع جماعي إلى المكتبة" : "Bulk upload to library"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {step === 1
                ? (isRtl ? "اختر المنصة ثم الصور (حتى 50)" : "Pick platform + images (up to 50)")
                : (isRtl ? `أضف عنواناً ومحتوى لكل منشور (${posts.length} منشور)` : `Add title + caption to each post (${posts.length} posts)`)}
            </p>
          </div>
          <button onClick={onClose} disabled={uploading} className="text-slate-400 hover:text-white disabled:opacity-30">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── STEP 1: pick platform + files ─────────────────────── */}
        {step === 1 && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="text-slate-400 block text-sm mb-2">{isRtl ? "المنصة" : "Platform"}</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white outline-none focus:border-indigo-500"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>{isRtl ? p.labelAr : p.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block text-sm mb-2">
                {isRtl ? "الصور" : "Images"}
                <span className="text-slate-500"> · {items.length}/{MAX_FILES}</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.heic,.heif"
                onChange={handleFilesPicked}
                className="hidden"
                id="bulk-file-input"
              />
              <label
                htmlFor="bulk-file-input"
                className={`flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-lg cursor-pointer transition ${
                  items.length >= MAX_FILES
                    ? "border-slate-700 opacity-50 cursor-not-allowed"
                    : "border-slate-600 hover:border-indigo-500 hover:bg-slate-800/50"
                }`}
              >
                <Upload className="w-8 h-8 text-slate-400" />
                <span className="text-slate-300 text-sm">
                  {items.length === 0
                    ? (isRtl ? "اضغط لاختيار صور (يمكن اختيار 50 صورة معاً)" : "Click to pick images (up to 50 at once)")
                    : (isRtl ? "أضف صوراً أخرى" : "Add more images")}
                </span>
                <span className="text-slate-500 text-xs">
                  {isRtl ? "JPG · PNG · WEBP · HEIC" : "JPG · PNG · WEBP · HEIC"}
                </span>
              </label>
            </div>

            {/* Thumbnail grid — also lets the user delete individual files
                before they ever upload. */}
            {items.length > 0 && (
              <div>
                <label className="text-slate-400 block text-sm mb-2">
                  {isRtl ? `الصور المختارة (${items.length})` : `Selected (${items.length})`}
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {items.map((it) => (
                    <div key={it.id} className="relative aspect-square bg-slate-800 rounded overflow-hidden group">
                      <img
                        src={it.previewUrl}
                        alt=""
                        onClick={() => setPreviewImage(it.previewUrl)}
                        className="w-full h-full object-cover cursor-zoom-in"
                        title={isRtl ? "اضغط للتكبير" : "Click to enlarge"}
                      />
                      <button
                        onClick={() => removeItem(it.id)}
                        className="absolute top-1 end-1 w-6 h-6 rounded-full bg-red-500 hover:bg-red-400 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                        title={isRtl ? "حذف" : "Remove"}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-sm">{error}</div>
            )}
          </div>
        )}

        {/* ── STEP 2: caption each post ─────────────────────────── */}
        {step === 2 && (
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div className="text-[11px] text-slate-400 bg-slate-800/60 rounded p-3 leading-relaxed">
              {isRtl
                ? "كل منشور بصورة واحدة افتراضياً. لدمج صورتين (أو أكثر) في نفس المنشور كـ carousel، اضغط زر «🔗 ضمّ مع التالي» بين الصورتين. الكابشن (العنوان + المحتوى + الهاشتاقات) يطبّق على المنشور كله."
                : "Each post starts as one image. To merge two (or more) into a single carousel post, click the 🔗 \"Join with next\" button between them. The caption (title + body + hashtags) applies to the whole post."}
            </div>

            <div className="space-y-3">
              {posts.map((post, postIdx) => {
                const cap = captions[post.groupId] || { title: "", text: "" };
                const isCarousel = post.files.length > 1;
                const lastFile = post.files[post.files.length - 1];
                const isLastPost = postIdx === posts.length - 1;
                return (
                  <React.Fragment key={post.groupId}>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
                      {/* Post header: # + carousel indicator */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] text-slate-300 font-bold">
                          {isRtl ? `منشور #${postIdx + 1}` : `Post #${postIdx + 1}`}
                          {isCarousel && (
                            <span className="ms-2 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px]">
                              {isRtl ? `🎠 ${post.files.length} صور` : `🎠 ${post.files.length} images`}
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-500">{platformLabel?.[isRtl ? "labelAr" : "label"]}</span>
                      </div>

                      {/* Image strip — single image fills the row, carousel
                          shows them inline with a "split" button on each
                          (except the first) to break the group. Tapping
                          the image (not the button) opens the lightbox. */}
                      <div className="flex gap-1.5 mb-3 overflow-x-auto">
                        {post.files.map(({ item, idx }, i) => (
                          <div key={item.id} className="relative flex-shrink-0">
                            <img
                              src={item.previewUrl}
                              alt=""
                              onClick={() => setPreviewImage(item.previewUrl)}
                              className="w-20 h-20 object-cover rounded border border-slate-700 cursor-zoom-in hover:border-indigo-500 hover:scale-105 transition"
                              title={isRtl ? "اضغط للتكبير" : "Click to enlarge"}
                            />
                            {i > 0 && (
                              <button
                                onClick={() => splitHere(idx)}
                                title={isRtl ? "افصل هذه الصورة كمنشور جديد" : "Split into its own post"}
                                className="absolute -top-1 -start-1 w-5 h-5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-900 flex items-center justify-center"
                              >
                                <Unlink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Caption inputs */}
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={cap.title}
                          onChange={(e) => updateCaption(post.groupId, { title: e.target.value })}
                          placeholder={isRtl ? "عنوان المنشور (اختياري) — مثال: تهنئة عيد 2026" : "Post title (optional) — e.g. Eid 2026 greeting"}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-white outline-none focus:border-indigo-500"
                        />
                        <textarea
                          value={cap.text}
                          onChange={(e) => updateCaption(post.groupId, { text: e.target.value })}
                          rows={3}
                          placeholder={isRtl
                            ? "محتوى الكابشن + الهاشتاقات\nمثال: كل عام وأنتم بخير 🌙\n#عيد #مبارك #2026"
                            : "Caption + hashtags\nE.g. Happy Eid! 🌙\n#eid #mubarak #2026"}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-white outline-none focus:border-indigo-500 resize-y font-mono"
                          dir="auto"
                        />
                        {/* Quick stats: char count + hashtag count to help
                            users stay under platform limits without leaving
                            the modal. */}
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>
                            {isRtl ? `${(cap.text || "").length} حرف` : `${(cap.text || "").length} chars`}
                            {" · "}
                            {(() => { const tags = (cap.text || "").match(/#[^\s#]+/g) || []; return isRtl ? `${tags.length} هاشتاق` : `${tags.length} hashtag${tags.length === 1 ? "" : "s"}`; })()}
                          </span>
                          {(cap.text || "").length > 2200 && (
                            <span className="text-amber-400">
                              {isRtl ? "⚠️ تجاوز حد إنستقرام (2200)" : "⚠️ Instagram limit (2200)"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* "Join with next" button between consecutive posts */}
                    {!isLastPost && (
                      <div className="flex justify-center">
                        <button
                          onClick={() => joinWithNext(lastFile.idx)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-cyan-500 hover:text-slate-900 text-[10px] text-slate-300 font-bold transition"
                          title={isRtl ? "ادمج هذا المنشور مع التالي كـ carousel" : "Merge this post with the next as a carousel"}
                        >
                          <Link2 className="w-3 h-3" />
                          {isRtl ? "ضمّ مع التالي (carousel)" : "Join with next (carousel)"}
                        </button>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-sm">{error}</div>
            )}

            {uploading && (
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded">
                <div className="flex items-center gap-2 text-indigo-200 text-sm mb-1.5">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isRtl ? `جارٍ الرفع... ${progress.done}/${progress.total}` : `Uploading... ${progress.done}/${progress.total}`}
                </div>
                <div className="h-1.5 bg-slate-800 rounded overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Footer (nav between steps + final upload) ──────────── */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-900">
          {step === 1 ? (
            <>
              <button
                onClick={onClose}
                disabled={uploading}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition disabled:opacity-50"
              >
                {isRtl ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={items.length === 0}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition disabled:opacity-40 flex items-center gap-2"
              >
                {isRtl ? "التالي: إضافة الكابشن" : "Next: add captions"}
                <ChevronRight className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                disabled={uploading}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition disabled:opacity-50"
              >
                {isRtl ? "← رجوع" : "← Back"}
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || items.length === 0}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition disabled:opacity-40 flex items-center gap-2"
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />{isRtl ? "جارٍ الرفع..." : "Uploading..."}</>
                ) : (
                  <><Upload className="w-4 h-4" />{isRtl ? `رفع ${items.length} صورة في ${posts.length} منشور` : `Upload ${items.length} images in ${posts.length} posts`}</>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Lightbox — click outside or the X to dismiss. Renders on top of
          the upload modal (higher z-index) so it doesn't fight with the
          editor underneath. */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-6 cursor-zoom-out"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
            className="absolute top-4 end-4 w-9 h-9 rounded-full bg-slate-800 hover:bg-red-500 text-white flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={previewImage}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain cursor-default rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
