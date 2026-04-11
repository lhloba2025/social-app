import React, { useRef, useState } from "react";
import { Upload, Trash2, Loader2 } from "lucide-react";
import { uploadFile } from "@/api/localClient";
import StudioColorPicker from "../StudioColorPicker";

function loadSavedLogos() {
  try { return JSON.parse(localStorage.getItem("saved_logos") || "[]"); } catch { return []; }
}
function saveSavedLogos(logos) {
  localStorage.setItem("saved_logos", JSON.stringify(logos));
}

export default function LogoLibraryPanel({ logos, selectedId, onSelect, onAdd, onUpdate, onDelete, language }) {
  const isRtl = language === "ar";
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [logoName, setLogoName] = useState("");
  const [savedLogos, setSavedLogos] = useState(loadSavedLogos);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile({ file });
      const isSvg = file.type === "image/svg+xml";
      let svgContent = null;
      if (isSvg) svgContent = await file.text();
      const name = logoName.trim() || file.name.replace(/\.[^.]+$/, "");
      const newLogo = { id: `logo_${Date.now()}`, name, url: file_url, isSvg, svgContent };
      const updated = [newLogo, ...loadSavedLogos()];
      saveSavedLogos(updated);
      setSavedLogos(updated);
      setLogoName("");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const deleteSavedLogo = (id) => {
    const updated = loadSavedLogos().filter(l => l.id !== id);
    saveSavedLogos(updated);
    setSavedLogos(updated);
  };

  const addToCanvas = (savedLogo) => {
    onAdd({ url: savedLogo.url, isSvg: savedLogo.isSvg, svgContent: savedLogo.svgContent });
  };

  const selected = logos.find((l) => l.id === selectedId);
  const update = (key, val) => { if (selected) onUpdate(selected.id, { [key]: val }); };

  return (
    <div className="space-y-3 text-xs">
      <h3 className="text-slate-400 font-semibold">{isRtl ? "📁 مكتبة اللوقوهات" : "📁 Logo Library"}</h3>

      {/* Upload new logo */}
      <div className="space-y-1.5">
        <input
          type="text"
          value={logoName}
          onChange={(e) => setLogoName(e.target.value)}
          placeholder={isRtl ? "اسم اللوقو (اختياري)..." : "Logo name (optional)..."}
          className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-white placeholder-slate-500"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? (isRtl ? "جاري الرفع..." : "Uploading...") : (isRtl ? "رفع لوقو جديد" : "Upload New Logo")}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>

      {/* Saved logos library */}
      <div className="border-t border-slate-700 pt-2">
        <p className="text-slate-500 mb-2">{isRtl ? "اضغط لإضافة للكانفاس:" : "Click to add to canvas:"}</p>
        {savedLogos.length === 0 ? (
          <p className="text-slate-500 text-center py-4">{isRtl ? "لا توجد لوقوهات محفوظة" : "No logos saved yet"}</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {savedLogos.map((logo) => (
              <div key={logo.id} className="relative group">
                <button
                  onClick={() => addToCanvas(logo)}
                  className="w-full aspect-square bg-slate-700 rounded-lg border border-slate-600 hover:border-indigo-500 transition flex flex-col items-center justify-center p-1 gap-1"
                  title={logo.name}
                >
                  {logo.isSvg && logo.svgContent ? (
                    <div className="w-10 h-10 flex items-center justify-center" dangerouslySetInnerHTML={{ __html: logo.svgContent }} />
                  ) : (
                    <img src={logo.url} alt={logo.name} className="w-10 h-10 object-contain" />
                  )}
                  <span className="text-[9px] text-slate-400 truncate w-full text-center">{logo.name}</span>
                </button>
                <button
                  onClick={() => deleteSavedLogo(logo.id)}
                  className="absolute top-0.5 right-0.5 bg-red-600 rounded p-0.5 text-white opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Canvas logos list */}
      {logos.length > 0 && (
        <div className="border-t border-slate-700 pt-2 space-y-1">
          <p className="text-slate-500">{isRtl ? "على الكانفاس:" : "On canvas:"}</p>
          {logos.map((logo) => (
            <div
              key={logo.id}
              onClick={() => onSelect(logo.id)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition ${
                logo.id === selectedId ? "bg-indigo-600/30 border border-indigo-500/50" : "bg-slate-700 hover:bg-slate-600"
              }`}
            >
              {logo.isSvg && logo.svgContent ? (
                <div className="w-7 h-7 flex-shrink-0" dangerouslySetInnerHTML={{ __html: logo.svgContent }} />
              ) : (
                <img src={logo.url} alt="" className="w-7 h-7 object-contain flex-shrink-0" />
              )}
              <span className="flex-1 text-slate-300 text-[10px] truncate">{isRtl ? "لوقو" : "Logo"}</span>
              <button onClick={(e) => { e.stopPropagation(); onDelete(logo.id); }} className="text-red-400 hover:text-red-300">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Selected logo controls */}
      {selected && (
        <div className="space-y-3 border-t border-slate-700 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">{isRtl ? "العرض%" : "Width%"}</label>
              <input type="number" value={Math.round(selected.width || 20)} onChange={(e) => update("width", parseFloat(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">{isRtl ? "الارتفاع%" : "Height%"}</label>
              <input type="number" value={Math.round(selected.height || 20)} onChange={(e) => update("height", parseFloat(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">X%</label>
              <input type="number" value={Math.round(selected.x || 10)} onChange={(e) => update("x", parseFloat(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Y%</label>
              <input type="number" value={Math.round(selected.y || 10)} onChange={(e) => update("y", parseFloat(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
            </div>
          </div>
          <div>
            <label className="text-slate-400 block mb-1">{isRtl ? "شفافية" : "Opacity"}</label>
            <input type="range" min="0" max="1" step="0.05" value={selected.opacity ?? 1}
              onChange={(e) => update("opacity", parseFloat(e.target.value))} className="w-full" />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">{isRtl ? "دوران" : "Rotation"}</label>
            <input type="number" value={selected.rotation || 0}
              onChange={(e) => update("rotation", parseInt(e.target.value))}
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
          </div>
          <StudioColorPicker
            label={isRtl ? "🎨 لون اللوقو" : "🎨 Logo Color"}
            value={selected.logoColor || ""}
            onChange={(v) => update("logoColor", v)}
          />
          {selected.logoColor && (
            <button onClick={() => update("logoColor", "")} className="text-xs text-slate-400 hover:text-red-400 transition">
              × {isRtl ? "إزالة اللون" : "Remove Color"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}