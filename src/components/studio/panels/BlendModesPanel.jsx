import React from "react";

const BLEND_MODES = [
  "normal", "multiply", "screen", "overlay", "darken", "lighten",
  "color-dodge", "color-burn", "hard-light", "soft-light", "difference"
];

export default function BlendModesPanel({ element, onChange, language }) {
  const isRtl = language === "ar";
  const update = (val) => onChange({ ...element, blendMode: val });

  return (
    <div className="space-y-3 border-t pt-3" style={{ borderColor: "var(--hv-border)" }}>
      <h3 className="font-semibold text-xs" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "🎭 دمج" : "🎭 Blend Mode"}</h3>
      <select
        value={element.blendMode || "normal"}
        onChange={(e) => update(e.target.value)}
        className="hv-input w-full rounded px-2 py-1.5 text-xs"
      >
        {BLEND_MODES.map(mode => (
          <option key={mode} value={mode}>{mode}</option>
        ))}
      </select>
    </div>
  );
}
