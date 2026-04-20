import React, { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import StudioColorPicker from "../StudioColorPicker";

export const FRAME_PRESETS = [
  { id: "none",          nameAr: "بدون إطار",       nameEn: "None" },
  { id: "single",        nameAr: "خط واحد",          nameEn: "Single Line" },
  { id: "double",        nameAr: "مزدوج",             nameEn: "Double Line" },
  { id: "triple",        nameAr: "ثلاثي",             nameEn: "Triple" },
  { id: "classic",       nameAr: "كلاسيكي",           nameEn: "Classic" },
  { id: "glow",          nameAr: "توهج",              nameEn: "Glow" },
  { id: "thick_glow",    nameAr: "سميك متوهج",        nameEn: "Thick Glow" },
  { id: "corners",       nameAr: "أركان زخرفية",      nameEn: "Ornate Corners" },
  { id: "corners_only",  nameAr: "أركان فقط",         nameEn: "Corners Only" },
  { id: "rounded",       nameAr: "مستدير",            nameEn: "Rounded" },
  { id: "dashed",        nameAr: "منقط",              nameEn: "Dashed" },
  { id: "film",          nameAr: "فيلم سينمائي",      nameEn: "Cinematic" },
];

function genId() { return `frame_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

function FramePreview({ presetId, color }) {
  const c = color || "#c9a227";
  const s = { width: "100%", height: "100%", position: "relative" };
  if (presetId === "none") return <div style={s} className="flex items-center justify-center text-slate-500 text-[10px]">—</div>;
  if (presetId === "single") return <div style={{ ...s, border: `2px solid ${c}`, boxSizing: "border-box" }} />;
  if (presetId === "double") return (
    <div style={{ ...s, border: `1px solid ${c}`, boxSizing: "border-box", padding: "3px" }}>
      <div style={{ width: "100%", height: "100%", border: `2px solid ${c}` }} />
    </div>
  );
  if (presetId === "triple") return (
    <div style={{ ...s, border: `1px solid ${c}`, boxSizing: "border-box", padding: "2px" }}>
      <div style={{ width: "100%", height: "100%", border: `3px solid ${c}`, padding: "2px" }}>
        <div style={{ width: "100%", height: "100%", border: `1px solid ${c}` }} />
      </div>
    </div>
  );
  if (presetId === "classic") return (
    <div style={{ ...s, border: `4px solid ${c}`, boxSizing: "border-box", padding: "3px" }}>
      <div style={{ width: "100%", height: "100%", border: `1px solid ${c}` }} />
    </div>
  );
  if (presetId === "glow") return <div style={{ ...s, border: `1px solid ${c}`, boxShadow: `0 0 6px ${c}`, boxSizing: "border-box" }} />;
  if (presetId === "thick_glow") return <div style={{ ...s, border: `3px solid ${c}`, boxShadow: `0 0 8px ${c}, inset 0 0 6px rgba(0,0,0,0.3)`, boxSizing: "border-box" }} />;
  if (presetId === "corners" || presetId === "corners_only") {
    return (
      <div style={s}>
        {["tl","tr","bl","br"].map(p => {
          const t = p.includes("t") ? 0 : "auto", bo = p.includes("b") ? 0 : "auto";
          const l = p.includes("l") ? 0 : "auto", r = p.includes("r") ? 0 : "auto";
          const rot = p === "tl" ? 0 : p === "tr" ? 90 : p === "bl" ? 270 : 180;
          return (
            <svg key={p} width="14" height="14" viewBox="0 0 30 30"
              style={{ position: "absolute", top: t, bottom: bo, left: l, right: r }}>
              <path d={`M 28 2 L 2 2 L 2 28`} stroke={c} strokeWidth="2.5" fill="none"
                transform={`rotate(${rot} 15 15)`} />
              <circle cx="2" cy="2" r="2" fill={c} transform={`rotate(${rot} 15 15)`} />
            </svg>
          );
        })}
        {presetId === "corners" && <div style={{ position: "absolute", inset: "10%", border: `0.5px solid ${c}40` }} />}
      </div>
    );
  }
  if (presetId === "rounded") return <div style={{ ...s, border: `2px solid ${c}`, borderRadius: "8px", boxSizing: "border-box" }} />;
  if (presetId === "dashed") return <div style={{ ...s, border: `2px dashed ${c}`, boxSizing: "border-box" }} />;
  if (presetId === "film") return (
    <div style={{ ...s, borderTop: `8px solid ${c}`, borderBottom: `8px solid ${c}`, boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ display: "flex", gap: "3px", padding: "1px 2px" }}>
        {[...Array(6)].map((_, i) => <div key={i} style={{ flex: 1, height: "3px", background: "#000" }} />)}
      </div>
      <div style={{ display: "flex", gap: "3px", padding: "1px 2px" }}>
        {[...Array(6)].map((_, i) => <div key={i} style={{ flex: 1, height: "3px", background: "#000" }} />)}
      </div>
    </div>
  );
  return null;
}

export default function FramesPanel({ frames, onChange, language }) {
  const isRtl = language === "ar";
  const [selectedId, setSelectedId] = useState(null);

  const selected = frames.find(f => f.id === selectedId) || null;

  const addFrame = () => {
    const newFrame = { id: genId(), presetId: "single", color: "#c9a227", opacity: 1, padding: 4, thickness: 3 };
    const updated = [...frames, newFrame];
    onChange(updated);
    setSelectedId(newFrame.id);
  };

  const deleteFrame = (id) => {
    onChange(frames.filter(f => f.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const updateSelected = (key, val) => {
    onChange(frames.map(f => f.id === selectedId ? { ...f, [key]: val } : f));
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-slate-300 font-bold text-sm">{isRtl ? "🖼️ الإطارات" : "🖼️ Frames"}</h3>
        <button
          onClick={addFrame}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition"
        >
          <Plus className="w-3 h-3" />
          {isRtl ? "إضافة إطار" : "Add Frame"}
        </button>
      </div>

      {/* Frames list */}
      {frames.length === 0 ? (
        <p className="text-slate-500 text-center py-4">
          {isRtl ? "لا توجد إطارات — اضغط إضافة إطار" : "No frames — click Add Frame"}
        </p>
      ) : (
        <div className="space-y-1">
          {frames.map((f, idx) => {
            const preset = FRAME_PRESETS.find(p => p.id === f.presetId);
            return (
              <div
                key={f.id}
                onClick={() => setSelectedId(f.id === selectedId ? null : f.id)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition ${
                  f.id === selectedId ? "bg-indigo-600/30 border border-indigo-500/50" : "bg-slate-700 hover:bg-slate-600"
                }`}
              >
                <div className="w-8 h-6 bg-slate-900 rounded overflow-hidden p-0.5 flex-shrink-0">
                  <FramePreview presetId={f.presetId} color={f.color} />
                </div>
                <span className="flex-1 text-slate-300 truncate">
                  {isRtl
                    ? (preset?.nameAr || f.presetId)
                    : (preset?.nameEn || f.presetId)
                  } #{idx + 1}
                </span>
                <div className="w-3 h-3 rounded-full flex-shrink-0 border border-slate-500" style={{ background: f.color }} />
                <button
                  onClick={(e) => { e.stopPropagation(); deleteFrame(f.id); }}
                  className="text-red-400 hover:text-red-300 flex-shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Controls for selected frame */}
      {selected && (
        <div className="space-y-3 border-t border-slate-700 pt-3">
          <p className="text-slate-400 font-semibold">{isRtl ? "تعديل الإطار المحدد:" : "Edit Selected Frame:"}</p>

          {/* Preset grid */}
          <div className="grid grid-cols-3 gap-2">
            {FRAME_PRESETS.filter(p => p.id !== "none").map((preset) => (
              <button
                key={preset.id}
                onClick={() => updateSelected("presetId", preset.id)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition ${
                  selected.presetId === preset.id
                    ? "border-indigo-500 bg-indigo-900/40"
                    : "border-slate-600 bg-slate-700/50 hover:border-slate-500"
                }`}
              >
                <div className="w-full aspect-[4/3] bg-slate-900 rounded overflow-hidden p-1">
                  <FramePreview presetId={preset.id} color={selected.color} />
                </div>
                <span className="text-[10px] text-slate-300 text-center leading-tight">
                  {isRtl ? preset.nameAr : preset.nameEn}
                </span>
              </button>
            ))}
          </div>

          <StudioColorPicker
            label={isRtl ? "🎨 لون الإطار" : "🎨 Frame Color"}
            value={selected.color}
            onChange={(v) => updateSelected("color", v)}
          />

          <div>
            <label className="text-slate-400 block mb-1">
              {isRtl ? "السُمك / الحجم" : "Thickness / Size"}: {selected.thickness ?? 3}px
            </label>
            <input type="range" min="1" max="20" value={selected.thickness ?? 3}
              onChange={(e) => updateSelected("thickness", parseInt(e.target.value))} className="w-full" />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">
              {isRtl ? "المسافة من الحافة" : "Padding from edge"}: {selected.padding ?? 4}%
            </label>
            <input type="range" min="0" max="15" step="0.5" value={selected.padding ?? 4}
              onChange={(e) => updateSelected("padding", parseFloat(e.target.value))} className="w-full" />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">
              {isRtl ? "الشفافية" : "Opacity"}: {Math.round((selected.opacity ?? 1) * 100)}%
            </label>
            <input type="range" min="0" max="1" step="0.05" value={selected.opacity ?? 1}
              onChange={(e) => updateSelected("opacity", parseFloat(e.target.value))} className="w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
