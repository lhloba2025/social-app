import React from "react";

const BLEND_MODES = [
  "normal", "multiply", "screen", "overlay", "darken", "lighten",
  "color-dodge", "color-burn", "hard-light", "soft-light", "difference"
];

export default function BlendModesPanel({ element, onChange, language }) {
  const isRtl = language === "ar";
  const update = (val) => onChange({ ...element, blendMode: val });

  return (
    <div className="space-y-3 border-t border-slate-700 pt-3">
      <h3 className="text-slate-400 font-semibold text-xs">{isRtl ? "🎭 دمج" : "🎭 Blend Mode"}</h3>
      <select
        value={element.blendMode || "normal"}
        onChange={(e) => update(e.target.value)}
        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-white text-xs"
      >
        {BLEND_MODES.map(mode => (
          <option key={mode} value={mode}>{mode}</option>
        ))}
      </select>
    </div>
  );
}