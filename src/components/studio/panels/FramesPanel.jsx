import React from "react";
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
              style={{ position: "absolute", top: t, bottom: bo, left: l, right: r }}
            >
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

export default function FramesPanel({ frame, onChange, language }) {
  const isRtl = language === "ar";
  const update = (key, val) => onChange({ ...frame, [key]: val });
  const selected = frame?.presetId || "none";
  const color = frame?.color || "#c9a227";

  return (
    <div className="space-y-4 text-xs">
      <h3 className="text-slate-300 font-bold text-sm">{isRtl ? "🖼️ الإطارات" : "🖼️ Frames"}</h3>

      {/* Preset grid */}
      <div className="grid grid-cols-3 gap-2">
        {FRAME_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => update("presetId", preset.id)}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition ${
              selected === preset.id
                ? "border-indigo-500 bg-indigo-900/40"
                : "border-slate-600 bg-slate-700/50 hover:border-slate-500"
            }`}
          >
            <div className="w-full aspect-[4/3] bg-slate-900 rounded overflow-hidden p-1">
              <FramePreview presetId={preset.id} color={color} />
            </div>
            <span className="text-[10px] text-slate-300 text-center leading-tight">
              {isRtl ? preset.nameAr : preset.nameEn}
            </span>
          </button>
        ))}
      </div>

      {/* Controls — only when a frame is selected */}
      {selected !== "none" && (
        <div className="space-y-3 border-t border-slate-700 pt-3">
          <StudioColorPicker
            label={isRtl ? "🎨 لون الإطار" : "🎨 Frame Color"}
            value={color}
            onChange={(v) => update("color", v)}
          />

          <div>
            <label className="text-slate-400 block mb-1">
              {isRtl ? "السُمك / الحجم" : "Thickness / Size"}: {frame?.thickness ?? 3}px
            </label>
            <input type="range" min="1" max="20" value={frame?.thickness ?? 3}
              onChange={(e) => update("thickness", parseInt(e.target.value))} className="w-full" />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">
              {isRtl ? "المسافة من الحافة" : "Padding from edge"}: {frame?.padding ?? 4}%
            </label>
            <input type="range" min="0" max="15" step="0.5" value={frame?.padding ?? 4}
              onChange={(e) => update("padding", parseFloat(e.target.value))} className="w-full" />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">
              {isRtl ? "الشفافية" : "Opacity"}: {Math.round((frame?.opacity ?? 1) * 100)}%
            </label>
            <input type="range" min="0" max="1" step="0.05" value={frame?.opacity ?? 1}
              onChange={(e) => update("opacity", parseFloat(e.target.value))} className="w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
