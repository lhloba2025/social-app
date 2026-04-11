import React, { useRef, useState } from "react";
import { Upload, Trash2, Eye, EyeOff, Copy, Loader2, Scissors } from "lucide-react";
import { uploadFile } from "@/api/localClient";
import StudioColorPicker from "../StudioColorPicker";
import { removeBgWithKey, getBrandKey } from "./BrandKitPanel";

export default function ImagesPanel({ images, selectedId, onSelect, onAdd, onUpdate, onDelete, onDuplicate, language, isLogo = false }) {
  const isRtl = language === "ar";
  const fileRef = useRef();
  const [uploading, setUploading] = React.useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const selected = images.find((i) => i.id === selectedId && !i.isLucideIcon && !i.isSocialIcon && !i.isHandDrawn && !i.isSymbol);
  const update = (key, val) => { if (selected) onUpdate(selected.id, { [key]: val }); };
  const canvasImages = images.filter((i) => !i.isLucideIcon && !i.isSocialIcon && !i.isHandDrawn && !i.isSymbol);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile({ file });
      const isSvg = file.type === "image/svg+xml";
      let svgContent = null;
      if (isSvg) {
        svgContent = await file.text();
      }
      onAdd({ url: file_url, isSvg, svgContent });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveBg = async () => {
    if (!selected) return;
    const apiKey = getBrandKey();
    if (!apiKey) {
      alert("أضف مفتاح remove.bg في تبويب البراند أولاً");
      return;
    }
    setRemovingBg(true);
    try {
      const newUrl = await removeBgWithKey(selected.url, apiKey);
      onUpdate(selected.id, { url: newUrl });
    } catch (e) {
      alert("فشل إزالة الخلفية: " + e.message);
    } finally {
      setRemovingBg(false);
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
        {selected && (
          <button
            onClick={handleRemoveBg}
            disabled={removingBg}
            title="إزالة الخلفية بالذكاء الاصطناعي (remove.bg)"
            className="flex items-center gap-1 px-2 py-2 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-semibold transition disabled:opacity-50"
          >
            {removingBg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />}
            {!removingBg && <span>{isRtl ? "إزالة BG" : "Remove BG"}</span>}
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

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