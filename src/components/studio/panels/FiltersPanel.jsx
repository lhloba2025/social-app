import React from "react";
import { Trash2 } from "lucide-react";

export default function FiltersPanel({ element, onChange, language }) {
  const isRtl = language === "ar";
  const update = (key, val) => onChange({ ...element, [key]: val });

  return (
    <div className="space-y-3 border-t border-slate-700 pt-3">
      <h3 className="text-slate-400 font-semibold text-xs">{isRtl ? "🎨 تأثيرات" : "🎨 Filters"}</h3>
      
      <div>
        <label className="text-slate-400 block mb-1 text-xs">{isRtl ? "🔲 Blur" : "Blur"}px</label>
        <input type="range" min="0" max="20" value={element.blur || 0}
          onChange={(e) => update("blur", parseInt(e.target.value))} className="w-full" />
      </div>

      <div>
        <label className="text-slate-400 block mb-1 text-xs">{isRtl ? "✨ Glow" : "Glow"}</label>
        <input type="range" min="0" max="20" value={element.glow || 0}
          onChange={(e) => update("glow", parseInt(e.target.value))} className="w-full" />
      </div>

      <div>
        <label className="text-slate-400 block mb-1 text-xs">{isRtl ? "🌑 Shadow" : "Shadow"}</label>
        <input type="range" min="0" max="20" value={element.shadowBlur || 0}
          onChange={(e) => update("shadowBlur", parseInt(e.target.value))} className="w-full" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-slate-400 block mb-1 text-xs">Shadow X</label>
          <input type="number" value={element.shadowX || 0}
            onChange={(e) => update("shadowX", parseInt(e.target.value))}
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
        </div>
        <div>
          <label className="text-slate-400 block mb-1 text-xs">Shadow Y</label>
          <input type="number" value={element.shadowY || 0}
            onChange={(e) => update("shadowY", parseInt(e.target.value))}
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
        </div>
      </div>
    </div>
  );
}