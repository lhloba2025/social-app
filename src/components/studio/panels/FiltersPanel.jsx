import React from "react";

export default function FiltersPanel({ element, onChange, language }) {
  const isRtl = language === "ar";
  const update = (key, val) => onChange({ ...element, [key]: val });

  return (
    <div className="space-y-3 border-t pt-3" style={{ borderColor: "var(--hv-border)" }}>
      <h3 className="font-semibold text-xs" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "🎨 تأثيرات" : "🎨 Filters"}</h3>

      <div>
        <label className="block mb-1 text-xs" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "🔲 Blur" : "Blur"}px</label>
        <input type="range" min="0" max="20" value={element.blur || 0}
          onChange={(e) => update("blur", parseInt(e.target.value))} className="w-full" style={{ accentColor: "var(--hv-primary)" }} />
      </div>

      <div>
        <label className="block mb-1 text-xs" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "✨ Glow" : "Glow"}</label>
        <input type="range" min="0" max="20" value={element.glow || 0}
          onChange={(e) => update("glow", parseInt(e.target.value))} className="w-full" style={{ accentColor: "var(--hv-primary)" }} />
      </div>

      <div>
        <label className="block mb-1 text-xs" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "🌑 Shadow" : "Shadow"}</label>
        <input type="range" min="0" max="20" value={element.shadowBlur || 0}
          onChange={(e) => update("shadowBlur", parseInt(e.target.value))} className="w-full" style={{ accentColor: "var(--hv-primary)" }} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block mb-1 text-xs" style={{ color: "var(--hv-text-soft)" }}>Shadow X</label>
          <input type="number" value={element.shadowX || 0}
            onChange={(e) => update("shadowX", parseInt(e.target.value))}
            className="hv-input w-full rounded px-2 py-1 text-xs" />
        </div>
        <div>
          <label className="block mb-1 text-xs" style={{ color: "var(--hv-text-soft)" }}>Shadow Y</label>
          <input type="number" value={element.shadowY || 0}
            onChange={(e) => update("shadowY", parseInt(e.target.value))}
            className="hv-input w-full rounded px-2 py-1 text-xs" />
        </div>
      </div>
    </div>
  );
}
