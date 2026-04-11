import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Instagram, Facebook, Youtube, Twitter, Send,
  ChevronDown, ChevronUp, Clock, Calendar, Hash,
  Sparkles, ImagePlus, CheckCircle2, ArrowRight,
  X, Plus, Loader2, BookImage, LayoutGrid, Film
} from "lucide-react";
import { localApi } from "@/api/localClient";

// ─── Platform config ────────────────────────────────────────────────────────
const PLATFORMS = [
  { id: "instagram", labelAr: "انستقرام", labelEn: "Instagram", color: "#E1306C", bg: "bg-pink-500/10 border-pink-500/30 text-pink-400" },
  { id: "facebook",  labelAr: "فيسبوك",   labelEn: "Facebook",  color: "#1877F2", bg: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
  { id: "tiktok",    labelAr: "تيك توك",  labelEn: "TikTok",    color: "#010101", bg: "bg-slate-500/10 border-slate-400/30 text-slate-300" },
  { id: "snapchat",  labelAr: "سناب شات", labelEn: "Snapchat",  color: "#FFFC00", bg: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" },
  { id: "twitter",   labelAr: "تويتر / X", labelEn: "Twitter/X", color: "#1DA1F2", bg: "bg-sky-500/10 border-sky-500/30 text-sky-400" },
  { id: "youtube",   labelAr: "يوتيوب",   labelEn: "YouTube",   color: "#FF0000", bg: "bg-red-500/10 border-red-500/30 text-red-400" },
  { id: "linkedin",  labelAr: "لينكدإن",  labelEn: "LinkedIn",  color: "#0A66C2", bg: "bg-blue-600/10 border-blue-600/30 text-blue-300" },
];

// ─── Salon hashtag suggestions ───────────────────────────────────────────────
const SALON_HASHTAGS = {
  general:    ["#صالون_تجميل", "#بيوتي", "#صالوني", "#تجميل", "#صاحبة_الصالون"],
  hair:       ["#كيراتين", "#صبغ_شعر", "#تمليس_شعر", "#قص_شعر", "#بلاش"],
  nails:      ["#جلكسي_نيلز", "#أظافر", "#نيل_ارت", "#مناكير", "#جيل"],
  skin:       ["#بشرة", "#فيشيال", "#تنظيف_البشرة", "#عناية_بالبشرة", "#جلسة_بشرة"],
  makeup:     ["#مكياج", "#ميكاب_آرتست", "#تبييض", "#باكج_عروس", "#مكياج_سموكي"],
  offers:     ["#عرض_اليوم", "#خصم", "#عروض_الصالون", "#باقة_تجميل", "#اشتراك_شهري"],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function localStoragePosts() {
  try { return JSON.parse(localStorage.getItem("scheduled_posts") || "[]"); } catch { return []; }
}
function savePost(post) {
  const posts = localStoragePosts();
  const idx = posts.findIndex(p => p.id === post.id);
  if (idx >= 0) posts[idx] = post; else posts.push(post);
  localStorage.setItem("scheduled_posts", JSON.stringify(posts));
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function PlatformBadge({ p, selected, onToggle, ar = true }) {
  return (
    <button
      onClick={() => onToggle(p.id)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition
        ${selected ? `${p.bg} ring-1 ring-offset-1 ring-offset-slate-900` : "border-slate-700 text-slate-500 hover:border-slate-500"}`}
    >
      {selected && <CheckCircle2 className="w-3 h-3" />}
      {ar ? p.labelAr : p.labelEn}
    </button>
  );
}

function HashtagPill({ tag, added, onToggle }) {
  return (
    <button
      onClick={() => onToggle(tag)}
      className={`text-[11px] px-2.5 py-1 rounded-full border transition
        ${added
          ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
          : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"}`}
    >
      {added ? <span className="mr-0.5">✓</span> : null}{tag}
    </button>
  );
}

// ─── Design picker modal ──────────────────────────────────────────────────────
function DesignPickerModal({ onSelect, onClose }) {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localApi.entities.Design.list("-created_date", 50)
      .then(d => { setDesigns(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const langStored = localStorage.getItem("appLanguage") || "ar";
  const isAr = langStored === "ar";
  const T = {
    title:     isAr ? "اختر تصميماً"                         : "Pick a Design",
    noDesigns: isAr ? "لا توجد تصاميم محفوظة"               : "No saved designs",
    hint:      isAr ? "اذهب لمنشئ التصاميم وأنشئ تصميماً أولاً" : "Go to Design Studio and create a design first",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-[680px] max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <span className="font-bold text-white">{T.title}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
          ) : designs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-500">
              <BookImage className="w-8 h-8" />
              <p className="text-sm">{T.noDesigns}</p>
              <p className="text-xs">{T.hint}</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {designs.map(d => {
                const sizeObj = (() => { try { return typeof d.size === "string" ? JSON.parse(d.size) : d.size; } catch { return null; } })();
                const sizeLabel = sizeObj?.width && sizeObj?.height ? `${sizeObj.width}×${sizeObj.height}` : null;
                return (
                  <button
                    key={d.id}
                    onClick={() => onSelect({ type: "design", id: d.id, name: d.name, thumbnail: d.thumbnail, size: sizeLabel })}
                    className="group rounded-xl overflow-hidden border border-slate-700 hover:border-indigo-500 transition"
                  >
                    <div className="aspect-square bg-slate-800 flex items-center justify-center">
                      {d.thumbnail
                        ? <img src={d.thumbnail} className="w-full h-full object-cover" alt="" />
                        : <LayoutGrid className="w-8 h-8 text-slate-600" />}
                    </div>
                    <div className="px-2 py-1.5 text-left">
                      <p className="text-[11px] text-slate-300 truncate">{d.name || (isAr ? "بدون عنوان" : "Untitled")}</p>
                      {sizeLabel && <p className="text-[10px] text-slate-600">{sizeLabel}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function PostComposer({ language }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ar = (language || localStorage.getItem("appLanguage") || "ar") === "ar";

  // ── State ──
  const [editId, setEditId] = useState(null); // id of post being edited
  const [selectedMedia, setSelectedMedia] = useState(null);   // { type, id, name, thumbnail, size }
  const [platforms, setPlatforms] = useState([]);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState([]);
  const [scheduleDate, setScheduleDate] = useState(todayISO());
  const [scheduleTime, setScheduleTime] = useState(nowTime());
  const [postNow, setPostNow] = useState(false);
  const [showHashtags, setShowHashtags] = useState(true);
  const [customHashtag, setCustomHashtag] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const uploadRef = useRef(null);

  // Load post for editing OR design passed via query param
  useEffect(() => {
    const editPostId = searchParams.get("edit");
    const designId   = searchParams.get("designId");
    const thumb      = searchParams.get("thumb");
    const name       = searchParams.get("name");

    if (editPostId) {
      // Load existing post from localStorage
      const posts = localStoragePosts();
      const post  = posts.find(p => p.id === editPostId);
      if (post) {
        setEditId(post.id);
        setPlatforms(post.platforms || []);
        // Separate caption text from hashtags
        const parts = (post.caption || "").split("\n\n");
        const rawCaption = parts[0] || "";
        const rawHashtags = parts[1] ? parts[1].split(" ").filter(t => t.startsWith("#")) : [];
        setCaption(rawCaption);
        setHashtags(rawHashtags);
        if (post.scheduledAt) {
          setScheduleDate(post.scheduleDate || todayISO());
          setScheduleTime(post.scheduleTime || nowTime());
          setPostNow(false);
        } else {
          setPostNow(true);
        }
        if (post.media) {
          setSelectedMedia(post.media);
        }
      }
    } else if (designId) {
      setSelectedMedia({ type: "design", id: designId, name: decodeURIComponent(name || ""), thumbnail: thumb ? decodeURIComponent(thumb) : null });
    }
  }, [searchParams]);

  const T = {
    title:             editId ? (ar ? "تعديل منشور" : "Edit Post") : (ar ? "إنشاء منشور" : "Create Post"),
    selectMedia:       ar ? "اختر تصميم أو وسائط"              : "Select Design or Media",
    fromLibrary:       ar ? "من مكتبة التصاميم"                 : "From Design Library",
    uploadMedia:       ar ? "رفع صورة / فيديو"                  : "Upload Image / Video",
    platforms:         ar ? "المنصات"                            : "Platforms",
    selectPlatforms:   ar ? "اختر المنصات للنشر عليها"          : "Choose platforms to publish on",
    captionLabel:      ar ? "الكابشن والنص"                      : "Caption & Text",
    captionPlaceholder:ar ? "اكتب كابشن جذاب لمنشورك..."       : "Write an engaging caption...",
    hashtagsTitle:     ar ? "اقتراحات هاشتاقات"                 : "Hashtag Suggestions",
    hashtagCustom:     ar ? "أضف هاشتاق..."                     : "Add hashtag...",
    scheduling:        ar ? "وقت النشر"                          : "Scheduling",
    publishNow:        ar ? "نشر فوري"                           : "Publish Now",
    scheduleFor:       ar ? "جدول لوقت محدد"                    : "Schedule for Later",
    date:              ar ? "التاريخ"                            : "Date",
    time:              ar ? "الوقت"                             : "Time",
    saveDraft:         editId ? (ar ? "حفظ كمسودة"  : "Save as Draft")   : (ar ? "حفظ كمسودة"  : "Save as Draft"),
    schedule:          editId ? (ar ? "حفظ التعديلات" : "Save Changes")  : (ar ? "جدولة المنشور" : "Schedule Post"),
    saved:             ar ? "تم الحفظ!"                         : "Saved!",
    selectAtLeastOne:  ar ? "اختر منصة واحدة على الأقل"        : "Select at least one platform",
    noMedia:           ar ? "لم تختر تصميم أو وسائط"           : "No design or media selected",
    preview:           ar ? "معاينة المنشور"                    : "Post Preview",
    willPublish:       ar ? `سيُنشر على ${platforms?.length || 0} منصة` : `Will publish on ${platforms?.length || 0} platform(s)`,
    choosePlatform:    ar ? "اختر منصة للنشر"                   : "Choose a platform",
    selected:          ar ? "المختارة"                          : "Selected",
    hashtagCategories: {
      general: ar ? "عام"       : "General",
      hair:    ar ? "الشعر"     : "Hair",
      nails:   ar ? "الأظافر"   : "Nails",
      skin:    ar ? "البشرة"    : "Skin",
      makeup:  ar ? "المكياج"   : "Makeup",
      offers:  ar ? "العروض"    : "Offers",
    },
  };

  // ── Handlers ──
  const togglePlatform = id => setPlatforms(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const toggleHashtag = tag => setHashtags(h => h.includes(tag) ? h.filter(x => x !== tag) : [...h, tag]);

  const addCustomHashtag = () => {
    let tag = customHashtag.trim();
    if (!tag) return;
    if (!tag.startsWith("#")) tag = "#" + tag;
    if (!hashtags.includes(tag)) setHashtags(h => [...h, tag]);
    setCustomHashtag("");
  };

  const handleUpload = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSelectedMedia({ type: file.type.startsWith("video") ? "video" : "image", name: file.name, thumbnail: url, file });
    e.target.value = "";
  };

  const fullCaption = caption + (hashtags.length ? "\n\n" + hashtags.join(" ") : "");

  const handleSave = async (isDraft) => {
    if (!isDraft && platforms.length === 0) {
      alert(T.selectAtLeastOne); return;
    }
    setSaving(true);
    const post = {
      id: editId || `post_${Date.now()}`,
      status: isDraft ? "draft" : (postNow ? "queued" : "scheduled"),
      platforms,
      caption: fullCaption,
      scheduleDate: postNow ? null : scheduleDate,
      scheduleTime: postNow ? null : scheduleTime,
      scheduledAt: postNow ? null : `${scheduleDate}T${scheduleTime}`,
      media: selectedMedia ? { type: selectedMedia.type, id: selectedMedia.id, name: selectedMedia.name, thumbnail: selectedMedia.thumbnail } : null,
      createdAt: new Date().toISOString(),
    };

    // حفظ محلي (localStorage)
    savePost(post);

    // حفظ في الخادم للنشر التلقائي
    try {
      await fetch("http://localhost:3001/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(post),
      });
    } catch {
      // الخادم غير متصل — يكفي الحفظ المحلي
    }

    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    setTimeout(() => { navigate("/PostsManager"); }, 1200);
  };

  // ── Preview ──
  const [previewPlatform, setPreviewPlatform] = useState("instagram");
  // Keep previewPlatform in sync when platforms change
  useEffect(() => {
    if (platforms.length > 0 && !platforms.includes(previewPlatform)) {
      setPreviewPlatform(platforms[0]);
    }
  }, [platforms]);

  return (
    <div dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-slate-950 text-white">
      {/* Top bar */}
      <div className="h-14 border-b border-slate-800 flex items-center px-6 gap-3 bg-slate-900">
        <button onClick={() => navigate("/")} className="text-slate-400 hover:text-white transition">
          <ArrowRight className="w-5 h-5" />
        </button>
        <span className="font-bold text-lg">{T.title}</span>
        {saved && (
          <span className="flex items-center gap-1 text-green-400 text-sm ms-3">
            <CheckCircle2 className="w-4 h-4" /> {T.saved}
          </span>
        )}
      </div>

      <div className="flex h-[calc(100vh-56px)]">
        {/* ── Left: Form ── */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 max-w-2xl">

          {/* 1. Media selection */}
          <Section title={T.selectMedia} icon={<ImagePlus className="w-4 h-4" />}>
            {selectedMedia ? (
              <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl border border-slate-700">
                {selectedMedia.thumbnail
                  ? <img src={selectedMedia.thumbnail} className="w-16 h-16 rounded-lg object-cover" alt="" />
                  : <div className="w-16 h-16 rounded-lg bg-slate-700 flex items-center justify-center">
                      <LayoutGrid className="w-6 h-6 text-slate-500" />
                    </div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{selectedMedia.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedMedia.size || selectedMedia.type}</p>
                </div>
                <button onClick={() => setSelectedMedia(null)} className="text-slate-500 hover:text-red-400 transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPicker(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-slate-600 hover:border-indigo-500 text-slate-400 hover:text-indigo-400 transition text-sm"
                >
                  <BookImage className="w-4 h-4" /> {T.fromLibrary}
                </button>
                <button
                  onClick={() => uploadRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-slate-600 hover:border-purple-500 text-slate-400 hover:text-purple-400 transition text-sm"
                >
                  <ImagePlus className="w-4 h-4" /> {T.uploadMedia}
                </button>
                <input ref={uploadRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleUpload} />
              </div>
            )}
          </Section>

          {/* 2. Platforms */}
          <Section title={T.platforms} icon={<Send className="w-4 h-4" />} subtitle={T.selectPlatforms}>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <PlatformBadge key={p.id} p={p} selected={platforms.includes(p.id)} onToggle={togglePlatform} ar={ar} />
              ))}
            </div>
          </Section>

          {/* 3. Caption */}
          <Section title={T.captionLabel} icon={<LayoutGrid className="w-4 h-4" />}>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder={T.captionPlaceholder}
              rows={4}
              dir="rtl"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 resize-none focus:outline-none focus:border-indigo-500 transition"
            />
            <p className="text-xs text-slate-600 mt-1">{caption.length} / 2200</p>
          </Section>

          {/* 4. Hashtags */}
          <Section
            title={T.hashtagsTitle}
            icon={<Hash className="w-4 h-4" />}
            collapsible
            open={showHashtags}
            onToggle={() => setShowHashtags(v => !v)}
          >
            {showHashtags && (
              <div className="space-y-3">
                {/* Custom hashtag input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customHashtag}
                    onChange={e => setCustomHashtag(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addCustomHashtag()}
                    placeholder={T.hashtagCustom}
                    dir="rtl"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                  />
                  <button
                    onClick={addCustomHashtag}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {Object.entries(SALON_HASHTAGS).map(([cat, tags]) => (
                  <div key={cat}>
                    <p className="text-[10px] text-slate-500 mb-1.5 uppercase tracking-widest">
                      {T.hashtagCategories[cat]}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map(tag => (
                        <HashtagPill key={tag} tag={tag} added={hashtags.includes(tag)} onToggle={toggleHashtag} />
                      ))}
                    </div>
                  </div>
                ))}
                {hashtags.length > 0 && (
                  <div className="pt-2 border-t border-slate-800">
                    <p className="text-[10px] text-indigo-400 mb-1">{T.selected} ({hashtags.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {hashtags.map(tag => (
                        <HashtagPill key={tag} tag={tag} added onToggle={toggleHashtag} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* 5. Schedule */}
          <Section title={T.scheduling} icon={<Clock className="w-4 h-4" />}>
            {/* Toggle */}
            <div className="flex gap-2 mb-4">
              <ToggleChip active={postNow} onClick={() => setPostNow(true)} label={T.publishNow} />
              <ToggleChip active={!postNow} onClick={() => setPostNow(false)} label={T.scheduleFor} />
            </div>
            {!postNow && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[11px] text-slate-500 mb-1.5 block">{T.date}</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    min={todayISO()}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] text-slate-500 mb-1.5 block">{T.time}</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
          </Section>

          {/* Actions */}
          <div className="flex gap-3 pb-8">
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white transition text-sm font-semibold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : T.saveDraft}
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={saving || platforms.length === 0}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2
                ${platforms.length === 0
                  ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"}`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> {T.schedule}</>}
            </button>
          </div>
        </div>

        {/* ── Right: Live preview ── */}
        <div className="w-80 flex-shrink-0 border-s border-slate-800 bg-slate-900 p-5 overflow-y-auto hidden lg:block">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">{T.preview}</p>

          {/* Platform tabs for preview */}
          {platforms.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {platforms.map(pid => {
                const p = PLATFORMS.find(x => x.id === pid);
                return p ? (
                  <button
                    key={pid}
                    onClick={() => setPreviewPlatform(pid)}
                    className={`text-[10px] px-2.5 py-1 rounded-full border transition font-semibold
                      ${previewPlatform === pid ? `${p.bg} ring-1 ring-offset-1 ring-offset-slate-900` : "border-slate-700 text-slate-500 hover:border-slate-500"}`}
                  >
                    {ar ? p.labelAr : p.labelEn}
                  </button>
                ) : null;
              })}
            </div>
          )}

          <PlatformPreview
            platform={previewPlatform}
            platformConfig={PLATFORMS.find(p => p.id === previewPlatform) || PLATFORMS[0]}
            thumbnail={selectedMedia?.thumbnail}
            caption={fullCaption}
            postNow={postNow}
            scheduleDate={scheduleDate}
            scheduleTime={scheduleTime}
            ar={ar}
          />

          {/* Schedule summary */}
          {!postNow && scheduleDate && (
            <div className="mt-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold">
                <Calendar className="w-3.5 h-3.5" />
                <span>{scheduleDate}</span>
                <Clock className="w-3.5 h-3.5 ms-2" />
                <span>{scheduleTime}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {platforms.length > 0
                  ? (ar ? `سيُنشر على ${platforms.length} منصة` : `Will publish on ${platforms.length} platform(s)`)
                  : (ar ? "اختر منصة للنشر" : "Choose a platform")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Design picker modal */}
      {showPicker && (
        <DesignPickerModal
          onSelect={m => { setSelectedMedia(m); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

// ─── Platform-accurate preview ───────────────────────────────────────────────
// Each platform has specific aspect ratio and UI style
const PLATFORM_SPECS = {
  instagram: { ratio: "4/5",   label: "Instagram",  charLimit: 2200, bg: "#000",    headerStyle: "ig",   actions: ["🤍","💬","✈️","🔖"] },
  facebook:  { ratio: "1.91/1",label: "Facebook",   charLimit: 63206,bg: "#18191a", headerStyle: "fb",   actionsAr: ["👍 إعجاب","💬 تعليق","↗️ مشاركة"], actionsEn: ["👍 Like","💬 Comment","↗️ Share"] },
  twitter:   { ratio: "16/9",  label: "Twitter / X",charLimit: 280,  bg: "#000",    headerStyle: "tw",   actions: ["💬","🔁","🤍","📊","↗️"] },
  tiktok:    { ratio: "9/16",  label: "TikTok",     charLimit: 2200, bg: "#000",    headerStyle: "tt",   actions: ["🤍","💬","↗️","♪"] },
  snapchat:  { ratio: "9/16",  label: "Snapchat",   charLimit: 250,  bg: "#fffc00", headerStyle: "snap", actions: [] },
  youtube:   { ratio: "16/9",  label: "YouTube",    charLimit: 5000, bg: "#0f0f0f", headerStyle: "yt",   actions: ["👍","👎","↗️","💾"] },
  linkedin:  { ratio: "1.91/1",label: "LinkedIn",   charLimit: 3000, bg: "#1b1f23", headerStyle: "li",   actions: ["👍","💬","↗️","✉️"] },
};

function PlatformPreview({ platform, platformConfig, thumbnail, caption, postNow, scheduleDate, scheduleTime, ar = true }) {
  const spec = PLATFORM_SPECS[platform] || PLATFORM_SPECS.instagram;
  const overLimit = caption.length > spec.charLimit;
  const isVertical = ["tiktok","snapchat"].includes(platform);
  const isHorizontal = ["twitter","youtube","linkedin","facebook"].includes(platform);

  const timeStr = postNow
    ? (ar ? "الآن" : "Now")
    : scheduleDate && scheduleTime ? `${scheduleDate} · ${scheduleTime}` : (ar ? "مجدول" : "Scheduled");

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 text-xs" style={{ background: spec.bg }}>
      {/* Platform label */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-white/10">
        <span className="font-bold text-[10px]" style={{ color: platformConfig.color }}>
          {spec.label}
        </span>
        <span className="text-slate-500 text-[10px] ms-auto">{timeStr}</span>
      </div>

      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-[11px]">{ar ? "صالونك" : "Your Salon"}</p>
          {platform === "instagram" && <p className="text-slate-500 text-[10px]">{ar ? "موقعك" : "Your Location"}</p>}
          {platform === "linkedin" && <p className="text-slate-400 text-[10px]">{ar ? "1,240 متابع · الآن" : "1,240 followers · Now"}</p>}
        </div>
        {platform === "instagram" && (
          <span className="text-[10px] text-blue-400 font-semibold">{ar ? "متابعة" : "Follow"}</span>
        )}
        {platform === "facebook" && (
          <span className="text-[10px] text-blue-400">··· </span>
        )}
      </div>

      {/* Caption above image — Twitter/LinkedIn style */}
      {(platform === "twitter" || platform === "linkedin") && caption && (
        <div className="px-3 pb-2">
          <p className="text-slate-200 text-[11px] leading-relaxed line-clamp-3 whitespace-pre-wrap" dir="auto">{caption}</p>
          {overLimit && (
            <p className="text-red-400 text-[10px] mt-1">⚠ {caption.length}/{spec.charLimit}</p>
          )}
        </div>
      )}

      {/* Media box — correct aspect ratio per platform */}
      <div className="w-full relative overflow-hidden bg-slate-900" style={{ aspectRatio: spec.ratio }}>
        {thumbnail ? (
          <img src={thumbnail} className="w-full h-full object-cover" alt="" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-700">
            <ImagePlus className="w-8 h-8" />
            <p className="text-[10px]">{typeof ar !== "undefined" && !ar ? "No design" : "لا يوجد تصميم"}</p>
          </div>
        )}

        {/* TikTok / Snapchat overlay UI */}
        {platform === "tiktok" && (
          <div className="absolute inset-0 flex">
            <div className="flex-1" />
            <div className="flex flex-col items-center justify-end gap-3 pb-6 px-2">
              {["🤍","💬","↗️","♪"].map((icon, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span className="text-lg">{icon}</span>
                  <span className="text-[9px] text-white/70">{["12K","340","88", ar ? "صالون" : "Salon"][i]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {platform === "snapchat" && caption && (
          <div className="absolute bottom-0 inset-x-0 bg-black/50 px-3 py-2">
            <p className="text-white text-[11px] text-center line-clamp-2">{caption}</p>
          </div>
        )}

        {/* Image fit warning */}
        {thumbnail && (
          <div className="absolute top-1.5 end-1.5">
            {isVertical && <span className="bg-black/70 text-yellow-300 text-[9px] px-1.5 py-0.5 rounded font-bold">9:16</span>}
            {isHorizontal && platform !== "linkedin" && <span className="bg-black/70 text-yellow-300 text-[9px] px-1.5 py-0.5 rounded font-bold">16:9</span>}
            {platform === "instagram" && <span className="bg-black/70 text-yellow-300 text-[9px] px-1.5 py-0.5 rounded font-bold">4:5</span>}
          </div>
        )}
      </div>

      {/* Actions row */}
      {platform !== "snapchat" && (
        <div className="flex items-center gap-3 px-3 py-2 border-t border-white/10">
          {(spec.actionsAr ? (ar ? spec.actionsAr : spec.actionsEn) : spec.actions || []).map((a, i) => (
            <span key={i} className="text-slate-400 text-sm">{a}</span>
          ))}
          {platform === "instagram" && <span className="ms-auto text-slate-500 text-[10px]">{ar ? "100 إعجاب" : "100 Likes"}</span>}
        </div>
      )}

      {/* Caption below image — Instagram/Facebook/YouTube style */}
      {!["twitter","linkedin","snapchat"].includes(platform) && caption && (
        <div className="px-3 py-2">
          <p className="text-slate-200 text-[11px] leading-relaxed line-clamp-3 whitespace-pre-wrap" dir="auto">
            <span className="font-semibold text-white">{ar ? "صالونك " : "Your Salon "}</span>{caption}
          </p>
          {overLimit && (
            <p className="text-red-400 text-[10px] mt-1">⚠ {caption.length}/{spec.charLimit}</p>
          )}
        </div>
      )}

      {/* Aspect ratio warning */}
      {thumbnail && (
        <div className={`px-3 py-1.5 text-[10px] flex items-center gap-1 border-t border-white/5
          ${isVertical || isHorizontal ? "text-amber-400 bg-amber-900/20" : "text-green-400 bg-green-900/10"}`}>
          {isVertical
            ? (ar ? "⚠ هذه المنصة تفضل مقاس عمودي 9:16" : "⚠ This platform prefers vertical 9:16")
            : isHorizontal
            ? (ar ? "⚠ هذه المنصة تفضل مقاس أفقي 16:9" : "⚠ This platform prefers horizontal 16:9")
            : (ar ? "✓ المقاس مناسب لهذه المنصة (4:5 أو 1:1)" : "✓ Size fits this platform (4:5 or 1:1)")}
        </div>
      )}
    </div>
  );
}

// ─── Reusable section wrapper ─────────────────────────────────────────────────
function Section({ title, icon, subtitle, children, collapsible, open, onToggle }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div
        className={`flex items-center justify-between mb-4 ${collapsible ? "cursor-pointer" : ""}`}
        onClick={collapsible ? onToggle : undefined}
      >
        <div className="flex items-center gap-2">
          <span className="text-indigo-400">{icon}</span>
          <span className="font-semibold text-sm text-white">{title}</span>
          {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
        </div>
        {collapsible && (
          open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </div>
      {children}
    </div>
  );
}

function ToggleChip({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition
        ${active ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"}`}
    >
      {label}
    </button>
  );
}
