import React, { useRef, useState } from "react";
import { Upload, Trash2, Eye, EyeOff, Copy, Loader2, Scissors, Maximize2, Spline } from "lucide-react";
import { uploadFile, fetchImageByUrl } from "@/api/localClient";
import StudioColorPicker from "../StudioColorPicker";
import { removeBgWithKey, getBrandKey } from "./BrandKitPanel";
import { normalizeImageFile, isHeic, shrinkBlobToLimit } from "@/utils/imageConvert";
import ManualCutoutModal from "../ManualCutoutModal";
import { REAL_IMAGE_CATEGORIES, googleImagesUrl } from "../data/stockIllustrations.jsx";

export default function ImagesPanel({ images, selectedId, onSelect, onAdd, onUpdate, onDelete, onDuplicate, onZOrder, language, isLogo = false, canvasAspect = 1 }) {
  const isRtl = language === "ar";
  const fileRef = useRef();
  const [uploading, setUploading] = React.useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [bgProgress, setBgProgress] = useState("");
  const [justRemovedBg, setJustRemovedBg] = useState(false);
  const [showCutout, setShowCutout] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [addingUrl, setAddingUrl] = useState(false);
  const [showFinder, setShowFinder] = useState(false);

  // Smart add — paste an image (Ctrl+V) or an image URL straight onto the canvas.
  const addByUrl = async (rawUrl) => {
    const url = (rawUrl || "").trim();
    if (!/^https?:\/\//i.test(url)) throw new Error(isRtl ? "رابط غير صالح" : "Invalid URL");
    const dataUrl = await fetchImageByUrl(url);
    onAdd({ url: dataUrl });
  };
  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    setAddingUrl(true);
    try { await addByUrl(urlInput); setUrlInput(""); }
    catch (err) { alert((isRtl ? "تعذّر جلب الصورة: " : "Couldn't fetch image: ") + (err?.message || err)); }
    finally { setAddingUrl(false); }
  };
  React.useEffect(() => {
    if (isLogo) return;
    const onPaste = async (e) => {
      const t = e.target;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      const items = e.clipboardData?.items || [];
      for (const it of items) {
        if (it.type && it.type.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) {
            e.preventDefault();
            try {
              const norm = isHeic(f) ? await normalizeImageFile(f) : f;
              const { file_url } = await uploadFile({ file: norm });
              onAdd({ url: file_url });
            } catch (err) { alert((isRtl ? "تعذّر لصق الصورة: " : "Paste failed: ") + (err?.message || err)); }
            return;
          }
        }
      }
      if (typing) return;
      const text = e.clipboardData?.getData("text")?.trim();
      if (text && /^https?:\/\//i.test(text)) {
        e.preventDefault();
        setAddingUrl(true);
        try { await addByUrl(text); }
        catch (err) { alert((isRtl ? "تعذّر جلب الصورة: " : "Couldn't fetch image: ") + (err?.message || err)); }
        finally { setAddingUrl(false); }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [isLogo, isRtl, onAdd]);

  // Apply manual point-cutout result: upload the new image, swap the URL,
  // then optionally reorder the layer (front/back).
  const handleCutoutApply = async ({ blob, zOrder }) => {
    if (!selected) return;
    const ext = blob.type === "image/jpeg" ? "jpg" : "png";
    const file = new File([blob], `cutout.${ext}`, { type: blob.type || "image/png" });
    const { file_url } = await uploadFile({ file });
    onUpdate(selected.id, { url: file_url });
    if (zOrder && zOrder !== "keep" && onZOrder) onZOrder(selected.id, zOrder);
    setShowCutout(false);
  };
  const selected = images.find((i) => i.id === selectedId && !i.isLucideIcon && !i.isSocialIcon && !i.isHandDrawn && !i.isSymbol);
  const update = (key, val) => { if (selected) onUpdate(selected.id, { [key]: val }); };
  const canvasImages = images.filter((i) => !i.isLucideIcon && !i.isSocialIcon && !i.isHandDrawn && !i.isSymbol);

  // Snap the bounding box to the image's natural aspect ratio so the dashed
  // box hugs the photo — then resizing the box scales the image 1:1.
  const fitBoxToImage = () => {
    if (!selected?.url) return;
    const probe = new Image();
    probe.crossOrigin = "anonymous";
    probe.onload = () => {
      if (!probe.naturalWidth || !probe.naturalHeight) return;
      const naturalAspect = probe.naturalWidth / probe.naturalHeight;
      // height% is stored relative to canvas height; normalise so the photo is not distorted
      const correctedH = (selected.width * canvasAspect) / naturalAspect;
      onUpdate(selected.id, { height: correctedH, objectFit: "fill" });
    };
    probe.src = selected.url;
  };

  const handleUpload = async (e) => {
    let file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const isSvg = file.type === "image/svg+xml";
      let svgContent = null;
      if (isSvg) {
        svgContent = await file.text();
      } else if (isHeic(file)) {
        // iPhone HEIC photos can't render in the browser — convert to JPEG first
        file = await normalizeImageFile(file);
      }
      const { file_url } = await uploadFile({ file });
      onAdd({ url: file_url, isSvg, svgContent });
    } catch (err) {
      alert((isRtl ? "تعذّر رفع الصورة: " : "Image upload failed: ") + (err?.message || err));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // High-quality background removal.
  // Default: local AI model (@imgly/background-removal) — runs in-browser, no API key,
  // Photoshop-grade edges. Falls back to remove.bg API if a key is configured.
  const handleRemoveBg = async () => {
    if (!selected) return;
    setRemovingBg(true);
    setBgProgress(isRtl ? "تحميل نموذج الذكاء..." : "Loading AI model...");
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const resultBlob = await removeBackground(selected.url, {
        // model "isnet" = highest quality; progress callback for UX
        output: { format: "image/png", quality: 1 },
        progress: (key, current, total) => {
          if (total > 0) {
            const pct = Math.round((current / total) * 100);
            setBgProgress(isRtl ? `معالجة ${pct}%` : `Processing ${pct}%`);
          }
        },
      });
      // Transparent PNG of a full-res photo can exceed the 10MB upload limit — shrink first
      const safeBlob = await shrinkBlobToLimit(resultBlob);
      const file = new File([safeBlob], "no-bg.png", { type: "image/png" });
      const { file_url } = await uploadFile({ file });
      onUpdate(selected.id, { url: file_url, _bgRemoved: true });
      setBgProgress("");
      setJustRemovedBg(true);
      setTimeout(() => setJustRemovedBg(false), 12000);
    } catch (e) {
      // Fallback to remove.bg if a key exists
      const apiKey = getBrandKey();
      if (apiKey) {
        try {
          setBgProgress(isRtl ? "استخدام remove.bg..." : "Using remove.bg...");
          const newUrl = await removeBgWithKey(selected.url, apiKey);
          onUpdate(selected.id, { url: newUrl });
          setBgProgress("");
          return;
        } catch (e2) {
          alert((isRtl ? "فشل إزالة الخلفية: " : "Background removal failed: ") + e2.message);
        }
      } else {
        alert((isRtl ? "فشل إزالة الخلفية: " : "Background removal failed: ") + (e?.message || e));
      }
    } finally {
      setRemovingBg(false);
      setBgProgress("");
    }
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="flex gap-1">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? "جاري..." : (isRtl ? "رفع صورة" : "Upload")}
        </button>
      </div>

      {/* ── Decorations: smart add (paste / URL) + PNG search — same as Greeting Cards ── */}
      {!isLogo && (
        <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-lg p-2.5 space-y-2">
          <p className="text-[11px] text-emerald-200 font-bold flex items-center gap-1">
            ⚡ {isRtl ? "زخارف وصور PNG — إضافة ذكية" : "Decorations & PNGs — smart add"}
          </p>
          <p className="text-[10px] text-emerald-200/90 leading-relaxed">
            {isRtl
              ? "انسخ صورة من Google (كليك يمين → نسخ الصورة) والصقها هنا بـ Ctrl+V، أو الصق رابطها في الخانة، أو ابحث عن صور PNG شفافة بالأزرار تحت."
              : "Copy an image (right-click → Copy image) and press Ctrl+V, or paste its link below, or search transparent PNGs with the buttons."}
          </p>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddUrl(); } }}
              placeholder={isRtl ? "الصق رابط الصورة هنا…" : "Paste image URL…"}
              dir="ltr"
              className="flex-1 bg-slate-800 border border-emerald-500/40 rounded px-2 py-1.5 text-[11px] text-white placeholder-slate-500 outline-none focus:border-emerald-400"
            />
            <button
              onClick={handleAddUrl}
              disabled={addingUrl || !urlInput.trim()}
              className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-[11px] font-bold transition disabled:opacity-50 whitespace-nowrap"
            >
              {addingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : (isRtl ? "إضافة" : "Add")}
            </button>
          </div>
          <button
            onClick={() => setShowFinder((v) => !v)}
            className="w-full py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-emerald-300 font-semibold transition"
          >
            🔍 {showFinder ? (isRtl ? "إخفاء البحث" : "Hide search") : (isRtl ? "ابحث عن صور PNG (٨٠+ موضوع)" : "Find PNGs (80+ topics)")}
          </button>
          {showFinder && (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pe-1">
              {REAL_IMAGE_CATEGORIES.map((cat) => (
                <div key={cat.en} className="space-y-1.5">
                  <h4 className="text-[10px] font-bold text-emerald-300/90 sticky top-0 bg-slate-900 py-0.5">
                    {isRtl ? cat.ar : cat.en}
                  </h4>
                  <div className="grid grid-cols-4 gap-1.5">
                    {cat.items.map((s) => (
                      <a
                        key={s.query}
                        href={googleImagesUrl(s.query)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-slate-900 border border-slate-700 hover:border-emerald-300 transition"
                        title={isRtl ? s.ar : s.en}
                      >
                        <span className="text-lg leading-none">{s.emoji}</span>
                        <span className="text-[8.5px] font-semibold truncate w-full text-center">{isRtl ? s.ar : s.en}</span>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-[9px] text-slate-500 pt-1 border-t border-slate-800 leading-relaxed">
                {isRtl ? "افتح الموضوع → كليك يمين على الصورة → «نسخ الصورة» → ارجع والصقها بـ Ctrl+V." : "Open a topic → right-click image → Copy image → come back and Ctrl+V."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* AI background removal — prominent, no API key needed */}
      {selected && (
        <button
          onClick={handleRemoveBg}
          disabled={removingBg}
          title={isRtl ? "إزالة خلفية الصورة بالذكاء الاصطناعي — جودة احترافية" : "AI background removal — pro quality"}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold transition disabled:opacity-60"
        >
          {removingBg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
          <span>{removingBg ? (bgProgress || (isRtl ? "جاري..." : "Working...")) : (isRtl ? "✂️ إزالة الخلفية بالذكاء" : "✂️ Remove Background (AI)")}</span>
        </button>
      )}
      {removingBg && (
        <p className="text-[10px] text-slate-400 text-center">
          {isRtl ? "أول مرة تحتاج تنزيل نموذج الذكاء (~40MB) — تالياً يكون فورياً" : "First run downloads the AI model (~40MB) — instant afterwards"}
        </p>
      )}
      {justRemovedBg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 text-[10px] text-emerald-300 leading-relaxed">
          {isRtl
            ? "✅ تمت إزالة الخلفية! لوضع خلفية جديدة: افتح تبويب «خلفية» واختر لون/تدرج/صورة — أو ارفع صورة خلفية واجعلها خلف هذه الصورة من تبويب «طبقات»."
            : "✅ Background removed! To add a new background: open the \"BG\" tab and pick a color/gradient/image — or upload a background image and send it behind this one via the \"Layers\" tab."}
        </div>
      )}

      {/* Manual point-based cutout — Photoshop-style polygon selection */}
      {selected && (
        <button
          onClick={() => setShowCutout(true)}
          title={isRtl ? "حدّد نقاطاً حول منطقة لقصها أو تلوينها" : "Mark points around an area to cut or colorize"}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-700 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-semibold transition"
        >
          <Spline className="w-4 h-4" />
          {isRtl ? "✂️ قص يدوي بالنقاط" : "✂️ Manual Point Cutout"}
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={handleUpload} />

      {showCutout && selected && (
        <ManualCutoutModal
          imageUrl={selected.url}
          language={language}
          onApply={handleCutoutApply}
          onClose={() => setShowCutout(false)}
        />
      )}

      <div className="space-y-1 max-h-32 overflow-y-auto">
        {canvasImages.length === 0 && (
          <p className="text-slate-500 text-center py-4 text-[10px]">{isRtl ? "لا توجد صور محملة" : "No images uploaded"}</p>
        )}
        {canvasImages.map((img) => (
          <div
            key={img.id}
            onClick={() => onSelect(img.id)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition ${
              img.id === selectedId ? "bg-indigo-600/30 border border-indigo-500/50" : "bg-slate-700 hover:bg-slate-600"
            }`}
          >
            <img src={img.url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0 bg-slate-600" />
            <span className="flex-1 text-slate-200 truncate text-[10px]">
              {img.url?.split("/").pop() || "image"}
            </span>
            <button onClick={(e) => { e.stopPropagation(); onUpdate(img.id, { visible: !img.visible }); }} className="text-slate-400 hover:text-white">
              {img.visible !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDuplicate(img.id); }} className="text-slate-400 hover:text-white">
              <Copy className="w-3 h-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(img.id); }} className="text-red-400 hover:text-red-300">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {selected && (
        <div className="space-y-3 border-t border-slate-700 pt-3">
          {/* Sizing mode — fixes "image won't stretch" by giving real fit control */}
          <div className="bg-slate-900/40 border border-slate-700 rounded p-2 space-y-2">
            <label className="text-xs font-semibold text-slate-300">{isRtl ? "📐 ملاءمة الصورة" : "📐 Image Fit"}</label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: "fill",    ar: "تمديد",  en: "Stretch" },
                { id: "cover",   ar: "ملء",    en: "Fill" },
                { id: "contain", ar: "احتواء", en: "Contain" },
              ].map(o => (
                <button
                  key={o.id}
                  onClick={() => update("objectFit", o.id)}
                  className={`py-1.5 rounded text-[10px] font-semibold transition ${(selected.objectFit || "contain") === o.id ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
                >
                  {isRtl ? o.ar : o.en}
                </button>
              ))}
            </div>
            <button
              onClick={fitBoxToImage}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-slate-700 hover:bg-indigo-600 text-slate-200 text-[11px] font-semibold transition"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              {isRtl ? "ضبط الإطار على أبعاد الصورة" : "Fit frame to image"}
            </button>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              {isRtl
                ? "💡 لو الصورة ما تكبر عند السحب: اضغط «ضبط الإطار» — يلصق الإطار على أبعاد الصورة الحقيقية فيكبر معك."
                : "💡 If the image won't grow when dragging: click \"Fit frame\" — it snaps the frame to the real image size."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">{isRtl ? "العرض%" : "Width%"}</label>
              <input type="number" value={Math.round(selected.width)} onChange={(e) => update("width", parseFloat(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">{isRtl ? "الارتفاع%" : "Height%"}</label>
              <input type="number" value={Math.round(selected.height)} onChange={(e) => update("height", parseFloat(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">X%</label>
              <input type="number" value={Math.round(selected.x)} onChange={(e) => update("x", parseFloat(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Y%</label>
              <input type="number" value={Math.round(selected.y)} onChange={(e) => update("y", parseFloat(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">{isRtl ? "شفافية" : "Opacity"}</label>
            <input type="range" min="0" max="1" step="0.05" value={selected.opacity ?? 1}
              onChange={(e) => update("opacity", parseFloat(e.target.value))} className="w-full" />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">{isRtl ? "استدارة الحواف" : "Border Radius"}</label>
            <input type="range" min="0" max="50" step="1" value={selected.borderRadius || 0}
              onChange={(e) => update("borderRadius", parseInt(e.target.value))} className="w-full" />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">{isRtl ? "دوران" : "Rotation"}</label>
            <input type="number" value={selected.rotation || 0}
              onChange={(e) => update("rotation", parseInt(e.target.value))}
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
          </div>

          {/* Logo color - works on ALL image types including PNG/JPG */}
          {isLogo && (
            <div>
              <StudioColorPicker
                label={isRtl ? "🎨 لون اللوقو — تغيير اللون المباشر" : "🎨 Logo Color — direct recolor"}
                value={selected.logoColor || ""}
                onChange={(v) => update("logoColor", v)}
              />
              {selected.logoColor && (
                <button
                  onClick={() => update("logoColor", "")}
                  className="mt-1 text-xs text-slate-400 hover:text-red-400 transition"
                >
                  × {isRtl ? "إزالة اللون" : "Remove Color"}
                </button>
              )}
            </div>
          )}

          {selected.isSvg && !isLogo && (
            <StudioColorPicker
              label={isRtl ? "تلوين SVG" : "SVG Color"}
              value={selected.svgColor || ""}
              onChange={(v) => update("svgColor", v)}
            />
          )}



          <div>
            <label className="text-slate-400 block mb-1">{isRtl ? "تمويه" : "Blur"}</label>
            <input type="range" min="0" max="20" step="0.5" value={selected.blur || 0}
              onChange={(e) => update("blur", parseFloat(e.target.value))} className="w-full" />
          </div>

          {/* Pro image filters */}
          {!isLogo && (
            <div className="bg-slate-900/40 border border-slate-700 rounded p-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">{isRtl ? "🎨 فلاتر احترافية" : "🎨 Pro Filters"}</label>
                <button
                  onClick={() => onUpdate(selected.id, {
                    brightness: 100, contrast: 100, saturate: 100, sepia: 0, grayscale: 0, hue: 0, invert: 0,
                  })}
                  className="text-[10px] text-slate-400 hover:text-white"
                >
                  {isRtl ? "إعادة" : "Reset"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1 mb-1">
                {[
                  { name: isRtl ? "أصلي" : "Original", v: { brightness: 100, contrast: 100, saturate: 100, sepia: 0, grayscale: 0, hue: 0 } },
                  { name: isRtl ? "أبيض وأسود" : "B&W", v: { brightness: 105, contrast: 110, saturate: 0, sepia: 0, grayscale: 100, hue: 0 } },
                  { name: isRtl ? "كلاسيك" : "Classic", v: { brightness: 105, contrast: 110, saturate: 90, sepia: 25, grayscale: 0, hue: 0 } },
                  { name: isRtl ? "ڤينتاج" : "Vintage", v: { brightness: 95, contrast: 95, saturate: 85, sepia: 50, grayscale: 0, hue: 0 } },
                  { name: isRtl ? "دافئ" : "Warm", v: { brightness: 105, contrast: 105, saturate: 120, sepia: 15, grayscale: 0, hue: -10 } },
                  { name: isRtl ? "بارد" : "Cool", v: { brightness: 100, contrast: 105, saturate: 95, sepia: 0, grayscale: 0, hue: 15 } },
                  { name: isRtl ? "حيوي" : "Vivid", v: { brightness: 105, contrast: 120, saturate: 150, sepia: 0, grayscale: 0, hue: 0 } },
                  { name: isRtl ? "هادئ" : "Soft", v: { brightness: 110, contrast: 90, saturate: 80, sepia: 10, grayscale: 0, hue: 0 } },
                ].map((p) => (
                  <button
                    key={p.name}
                    onClick={() => onUpdate(selected.id, p.v)}
                    className="text-[10px] py-1 rounded bg-slate-700 hover:bg-indigo-600 text-slate-300 hover:text-white transition"
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block">{isRtl ? "السطوع" : "Brightness"}: {selected.brightness ?? 100}%</label>
                <input type="range" min="0" max="200" value={selected.brightness ?? 100}
                  onChange={(e) => update("brightness", parseInt(e.target.value))} className="w-full accent-indigo-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">{isRtl ? "التباين" : "Contrast"}: {selected.contrast ?? 100}%</label>
                <input type="range" min="0" max="200" value={selected.contrast ?? 100}
                  onChange={(e) => update("contrast", parseInt(e.target.value))} className="w-full accent-indigo-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">{isRtl ? "التشبع" : "Saturation"}: {selected.saturate ?? 100}%</label>
                <input type="range" min="0" max="200" value={selected.saturate ?? 100}
                  onChange={(e) => update("saturate", parseInt(e.target.value))} className="w-full accent-indigo-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">{isRtl ? "تدرج اللون" : "Hue"}: {selected.hue ?? 0}°</label>
                <input type="range" min="-180" max="180" value={selected.hue ?? 0}
                  onChange={(e) => update("hue", parseInt(e.target.value))} className="w-full accent-indigo-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">{isRtl ? "أبيض/أسود" : "Grayscale"}: {selected.grayscale ?? 0}%</label>
                <input type="range" min="0" max="100" value={selected.grayscale ?? 0}
                  onChange={(e) => update("grayscale", parseInt(e.target.value))} className="w-full accent-indigo-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">{isRtl ? "بُني سَيپيا" : "Sepia"}: {selected.sepia ?? 0}%</label>
                <input type="range" min="0" max="100" value={selected.sepia ?? 0}
                  onChange={(e) => update("sepia", parseInt(e.target.value))} className="w-full accent-indigo-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">{isRtl ? "عكس الألوان" : "Invert"}: {selected.invert ?? 0}%</label>
                <input type="range" min="0" max="100" value={selected.invert ?? 0}
                  onChange={(e) => update("invert", parseInt(e.target.value))} className="w-full accent-indigo-500" />
              </div>
            </div>
          )}

          {/* Crop tool - inset crop */}
          {!isLogo && (
            <div className="bg-slate-900/40 border border-slate-700 rounded p-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">{isRtl ? "✂️ قص الصورة" : "✂️ Crop"}</label>
                <button
                  onClick={() => onUpdate(selected.id, { cropTop: 0, cropRight: 0, cropBottom: 0, cropLeft: 0 })}
                  className="text-[10px] text-slate-400 hover:text-white"
                >
                  {isRtl ? "إعادة" : "Reset"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block">{isRtl ? "علوي" : "Top"}: {selected.cropTop ?? 0}%</label>
                  <input type="range" min="0" max="49" value={selected.cropTop ?? 0}
                    onChange={(e) => update("cropTop", parseInt(e.target.value))} className="w-full accent-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">{isRtl ? "سفلي" : "Bottom"}: {selected.cropBottom ?? 0}%</label>
                  <input type="range" min="0" max="49" value={selected.cropBottom ?? 0}
                    onChange={(e) => update("cropBottom", parseInt(e.target.value))} className="w-full accent-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">{isRtl ? "يسار" : "Left"}: {selected.cropLeft ?? 0}%</label>
                  <input type="range" min="0" max="49" value={selected.cropLeft ?? 0}
                    onChange={(e) => update("cropLeft", parseInt(e.target.value))} className="w-full accent-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">{isRtl ? "يمين" : "Right"}: {selected.cropRight ?? 0}%</label>
                  <input type="range" min="0" max="49" value={selected.cropRight ?? 0}
                    onChange={(e) => update("cropRight", parseInt(e.target.value))} className="w-full accent-indigo-500" />
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  { l: "1:1", v: { cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0, _ratio: "square" } },
                  { l: "16:9", v: { cropTop: 22, cropBottom: 22, cropLeft: 0, cropRight: 0 } },
                  { l: "9:16", v: { cropTop: 0, cropBottom: 0, cropLeft: 22, cropRight: 22 } },
                  { l: "4:5", v: { cropTop: 0, cropBottom: 0, cropLeft: 10, cropRight: 10 } },
                  { l: "3:4", v: { cropTop: 0, cropBottom: 0, cropLeft: 12, cropRight: 12 } },
                  { l: "21:9", v: { cropTop: 30, cropBottom: 30, cropLeft: 0, cropRight: 0 } },
                ].map(p => (
                  <button key={p.l} onClick={() => onUpdate(selected.id, { cropTop: p.v.cropTop, cropBottom: p.v.cropBottom, cropLeft: p.v.cropLeft, cropRight: p.v.cropRight })}
                    className="px-2 py-0.5 rounded text-[10px] bg-slate-700 hover:bg-indigo-600 text-slate-300 hover:text-white transition">
                    {p.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isLogo && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!selected.phoneFrame}
                  onChange={(e) => update("phoneFrame", e.target.checked)}
                  className="rounded"
                />
                <span className="text-slate-300">{isRtl ? "إطار جوال" : "Phone Frame"}</span>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}