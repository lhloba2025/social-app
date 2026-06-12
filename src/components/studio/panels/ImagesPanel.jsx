import React, { useRef, useState } from "react";
import { Upload, Trash2, Eye, EyeOff, Copy, Loader2, Scissors, Maximize2, Spline } from "lucide-react";
import { uploadFile } from "@/api/localClient";
import StudioColorPicker from "../StudioColorPicker";
import { removeBgWithKey, getBrandKey } from "./BrandKitPanel";
import { normalizeImageFile, isHeic, shrinkBlobToLimit } from "@/utils/imageConvert";
import ManualCutoutModal from "../ManualCutoutModal";

export default function ImagesPanel({ images, selectedId, onSelect, onAdd, onUpdate, onDelete, onDuplicate, onZOrder, language, isLogo = false, canvasAspect = 1 }) {
  const isRtl = language === "ar";
  const fileRef = useRef();
  const [uploading, setUploading] = React.useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [bgProgress, setBgProgress] = useState("");
  const [justRemovedBg, setJustRemovedBg] = useState(false);
  const [showCutout, setShowCutout] = useState(false);

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
        <p className="text-[10px] text-slate-500 text-center">
          {isRtl ? "أول مرة تحتاج تنزيل نموذج الذكاء (~40MB) — تالياً يكون فورياً" : "First run downloads the AI model (~40MB) — instant afterwards"}
        </p>
      )}
      {justRemovedBg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-[10px] text-emerald-700 leading-relaxed">
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
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white text-xs font-semibold transition"
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
            className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition border"
            style={img.id === selectedId
              ? { borderColor: "var(--hv-primary)", background: "rgba(79,70,229,0.08)" }
              : { borderColor: "var(--hv-border)", background: "var(--hv-surface-2)" }}
          >
            <img src={img.url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0 bg-slate-100" />
            <span className="flex-1 truncate text-[10px]" style={{ color: "var(--hv-text)" }}>
              {img.url?.split("/").pop() || "image"}
            </span>
            <button onClick={(e) => { e.stopPropagation(); onUpdate(img.id, { visible: !img.visible }); }} className="text-slate-400 hover:text-slate-700">
              {img.visible !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDuplicate(img.id); }} className="text-slate-400 hover:text-slate-700">
              <Copy className="w-3 h-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(img.id); }} className="text-red-400 hover:text-red-300">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {selected && (
        <div className="space-y-3 border-t pt-3" style={{ borderColor: "var(--hv-border)" }}>
          {/* Sizing mode — fixes "image won't stretch" by giving real fit control */}
          <div className="bg-[var(--hv-surface-2)] border rounded p-2 space-y-2" style={{ borderColor: "var(--hv-border)" }}>
            <label className="text-xs font-semibold" style={{ color: "var(--hv-text)" }}>{isRtl ? "📐 ملاءمة الصورة" : "📐 Image Fit"}</label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: "fill",    ar: "تمديد",  en: "Stretch" },
                { id: "cover",   ar: "ملء",    en: "Fill" },
                { id: "contain", ar: "احتواء", en: "Contain" },
              ].map(o => (
                <button
                  key={o.id}
                  onClick={() => update("objectFit", o.id)}
                  className={`py-1.5 rounded text-[10px] font-semibold transition ${(selected.objectFit || "contain") === o.id ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                >
                  {isRtl ? o.ar : o.en}
                </button>
              ))}
            </div>
            <button
              onClick={fitBoxToImage}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-white border border-slate-200 hover:bg-indigo-600 text-slate-700 hover:text-white text-[11px] font-semibold transition"
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
              <label className="text-slate-500 block mb-1">{isRtl ? "العرض%" : "Width%"}</label>
              <input type="number" value={Math.round(selected.width)} onChange={(e) => update("width", parseFloat(e.target.value))}
                className="hv-input w-full px-2 py-1" />
            </div>
            <div>
              <label className="text-slate-500 block mb-1">{isRtl ? "الارتفاع%" : "Height%"}</label>
              <input type="number" value={Math.round(selected.height)} onChange={(e) => update("height", parseFloat(e.target.value))}
                className="hv-input w-full px-2 py-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-500 block mb-1">X%</label>
              <input type="number" value={Math.round(selected.x)} onChange={(e) => update("x", parseFloat(e.target.value))}
                className="hv-input w-full px-2 py-1" />
            </div>
            <div>
              <label className="text-slate-500 block mb-1">Y%</label>
              <input type="number" value={Math.round(selected.y)} onChange={(e) => update("y", parseFloat(e.target.value))}
                className="hv-input w-full px-2 py-1" />
            </div>
          </div>

          <div>
            <label className="text-slate-500 block mb-1">{isRtl ? "شفافية" : "Opacity"}</label>
            <input type="range" min="0" max="1" step="0.05" value={selected.opacity ?? 1}
              onChange={(e) => update("opacity", parseFloat(e.target.value))} className="w-full" />
          </div>

          <div>
            <label className="text-slate-500 block mb-1">{isRtl ? "استدارة الحواف" : "Border Radius"}</label>
            <input type="range" min="0" max="50" step="1" value={selected.borderRadius || 0}
              onChange={(e) => update("borderRadius", parseInt(e.target.value))} className="w-full" />
          </div>

          <div>
            <label className="text-slate-500 block mb-1">{isRtl ? "دوران" : "Rotation"}</label>
            <input type="number" value={selected.rotation || 0}
              onChange={(e) => update("rotation", parseInt(e.target.value))}
              className="hv-input w-full px-2 py-1" />
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
            <label className="text-slate-500 block mb-1">{isRtl ? "تمويه" : "Blur"}</label>
            <input type="range" min="0" max="20" step="0.5" value={selected.blur || 0}
              onChange={(e) => update("blur", parseFloat(e.target.value))} className="w-full" />
          </div>

          {/* Pro image filters */}
          {!isLogo && (
            <div className="bg-[var(--hv-surface-2)] border rounded p-2 space-y-2" style={{ borderColor: "var(--hv-border)" }}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold" style={{ color: "var(--hv-text)" }}>{isRtl ? "🎨 فلاتر احترافية" : "🎨 Pro Filters"}</label>
                <button
                  onClick={() => onUpdate(selected.id, {
                    brightness: 100, contrast: 100, saturate: 100, sepia: 0, grayscale: 0, hue: 0, invert: 0,
                  })}
                  className="text-[10px] text-slate-500 hover:text-indigo-600"
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
                    className="text-[10px] py-1 rounded bg-white border border-slate-200 hover:bg-indigo-600 text-slate-600 hover:text-white transition"
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block">{isRtl ? "السطوع" : "Brightness"}: {selected.brightness ?? 100}%</label>
                <input type="range" min="0" max="200" value={selected.brightness ?? 100}
                  onChange={(e) => update("brightness", parseInt(e.target.value))} className="w-full accent-indigo-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block">{isRtl ? "التباين" : "Contrast"}: {selected.contrast ?? 100}%</label>
                <input type="range" min="0" max="200" value={selected.contrast ?? 100}
                  onChange={(e) => update("contrast", parseInt(e.target.value))} className="w-full accent-indigo-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block">{isRtl ? "التشبع" : "Saturation"}: {selected.saturate ?? 100}%</label>
                <input type="range" min="0" max="200" value={selected.saturate ?? 100}
                  onChange={(e) => update("saturate", parseInt(e.target.value))} className="w-full accent-indigo-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block">{isRtl ? "تدرج اللون" : "Hue"}: {selected.hue ?? 0}°</label>
                <input type="range" min="-180" max="180" value={selected.hue ?? 0}
                  onChange={(e) => update("hue", parseInt(e.target.value))} className="w-full accent-indigo-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block">{isRtl ? "أبيض/أسود" : "Grayscale"}: {selected.grayscale ?? 0}%</label>
                <input type="range" min="0" max="100" value={selected.grayscale ?? 0}
                  onChange={(e) => update("grayscale", parseInt(e.target.value))} className="w-full accent-indigo-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block">{isRtl ? "بُني سَيپيا" : "Sepia"}: {selected.sepia ?? 0}%</label>
                <input type="range" min="0" max="100" value={selected.sepia ?? 0}
                  onChange={(e) => update("sepia", parseInt(e.target.value))} className="w-full accent-indigo-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block">{isRtl ? "عكس الألوان" : "Invert"}: {selected.invert ?? 0}%</label>
                <input type="range" min="0" max="100" value={selected.invert ?? 0}
                  onChange={(e) => update("invert", parseInt(e.target.value))} className="w-full accent-indigo-500" />
              </div>
            </div>
          )}

          {/* Crop tool - inset crop */}
          {!isLogo && (
            <div className="bg-[var(--hv-surface-2)] border rounded p-2 space-y-2" style={{ borderColor: "var(--hv-border)" }}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold" style={{ color: "var(--hv-text)" }}>{isRtl ? "✂️ قص الصورة" : "✂️ Crop"}</label>
                <button
                  onClick={() => onUpdate(selected.id, { cropTop: 0, cropRight: 0, cropBottom: 0, cropLeft: 0 })}
                  className="text-[10px] text-slate-500 hover:text-indigo-600"
                >
                  {isRtl ? "إعادة" : "Reset"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block">{isRtl ? "علوي" : "Top"}: {selected.cropTop ?? 0}%</label>
                  <input type="range" min="0" max="49" value={selected.cropTop ?? 0}
                    onChange={(e) => update("cropTop", parseInt(e.target.value))} className="w-full accent-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">{isRtl ? "سفلي" : "Bottom"}: {selected.cropBottom ?? 0}%</label>
                  <input type="range" min="0" max="49" value={selected.cropBottom ?? 0}
                    onChange={(e) => update("cropBottom", parseInt(e.target.value))} className="w-full accent-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">{isRtl ? "يسار" : "Left"}: {selected.cropLeft ?? 0}%</label>
                  <input type="range" min="0" max="49" value={selected.cropLeft ?? 0}
                    onChange={(e) => update("cropLeft", parseInt(e.target.value))} className="w-full accent-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">{isRtl ? "يمين" : "Right"}: {selected.cropRight ?? 0}%</label>
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
                    className="px-2 py-0.5 rounded text-[10px] bg-white border border-slate-200 hover:bg-indigo-600 text-slate-600 hover:text-white transition">
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
                <span className="text-slate-600">{isRtl ? "إطار جوال" : "Phone Frame"}</span>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}