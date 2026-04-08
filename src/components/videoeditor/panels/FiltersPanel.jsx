import React, { useState } from "react";

const PRESETS = [
  { id: "none", name: "None" },
  { id: "chrome", name: "Chrome", filter: "contrast(1.4) saturate(1.8) brightness(1.05)" },
  { id: "fade", name: "Fade", filter: "brightness(1.15) saturate(0.6) contrast(0.85)" },
  { id: "cold", name: "Cold", filter: "hue-rotate(200deg) saturate(1.4) brightness(1.05)" },
  { id: "warm", name: "Warm", filter: "hue-rotate(-20deg) saturate(1.6) brightness(1.05)" },
  { id: "noir", name: "Noir", filter: "grayscale(1) contrast(1.5) brightness(0.9)" },
  { id: "vintage", name: "Vintage", filter: "sepia(0.6) contrast(1.2) brightness(0.95) saturate(0.8)" },
  { id: "punch", name: "Punch", filter: "contrast(1.9) saturate(1.6) brightness(1.05)" },
];

const ADJ = [
  { key: "brightness", label: "Brightness", min: 50, max: 200, def: 100, unit: "%" },
  { key: "contrast", label: "Contrast", min: 50, max: 200, def: 100, unit: "%" },
  { key: "saturate", label: "Saturation", min: 0, max: 300, def: 100, unit: "%" },
  { key: "hue-rotate", label: "Hue", min: 0, max: 360, def: 0, unit: "deg" },
  { key: "opacity", label: "Opacity", min: 10, max: 100, def: 100, unit: "%" },
];

export default function FiltersPanel({ onApplyFilter }) {
  const [preset, setPreset] = useState("none");
  const [adj, setAdj] = useState({ brightness: 100, contrast: 100, saturate: 100, "hue-rotate": 0, opacity: 100 });

  const buildFilter = (a) =>
    `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturate}%) hue-rotate(${a["hue-rotate"]}deg)`;

  const applyPreset = (p) => {
    setPreset(p.id);
    if (p.id === "none") {
      onApplyFilter({ filter: "none", opacity: 1 });
    } else {
      onApplyFilter({ filter: p.filter, opacity: 1 });
    }
  };

  const handleAdj = (key, val) => {
    const next = { ...adj, [key]: val };
    setAdj(next);
    setPreset("none");
    onApplyFilter({ filter: buildFilter(next), opacity: next.opacity / 100 });
  };

  return (
    <div className="flex flex-col gap-3 p-3 text-white">
      <p className="text-[10px] text-[#666] font-semibold uppercase tracking-wider">Presets</p>
      <div className="grid grid-cols-4 gap-1.5">
        {PRESETS.map(p => (
          <button key={p.id} onClick={() => applyPreset(p)}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition border
              ${preset === p.id ? "border-[#00d4d4] bg-[#00d4d4]/10" : "border-[#333] bg-[#252525] hover:bg-[#2e2e2e]"}`}>
            <div className="w-full h-8 rounded overflow-hidden"
              style={{ background: "linear-gradient(135deg,#4a90d9,#7b4ea8)", filter: p.filter || undefined }} />
            <span className="text-[9px] text-[#aaa]">{p.name}</span>
          </button>
        ))}
      </div>

      <div className="w-full h-px bg-[#2a2a2a]" />
      <p className="text-[10px] text-[#666] font-semibold uppercase tracking-wider">Adjustments</p>
      {ADJ.map(a => (
        <div key={a.key} className="flex flex-col gap-1">
          <div className="flex justify-between">
            <span className="text-[11px] text-[#aaa]">{a.label}</span>
            <span className="text-[11px] text-[#00d4d4] font-mono">{adj[a.key]}{a.unit}</span>
          </div>
          <input type="range" min={a.min} max={a.max} value={adj[a.key]}
            onChange={e => handleAdj(a.key, +e.target.value)}
            className="w-full h-1 accent-[#00d4d4] cursor-pointer" />
        </div>
      ))}

      <button onClick={() => { setAdj({ brightness: 100, contrast: 100, saturate: 100, "hue-rotate": 0, opacity: 100 }); setPreset("none"); onApplyFilter({ filter: "none", opacity: 1 }); }}
        className="w-full py-2 rounded-xl bg-[#2a2a2a] hover:bg-[#333] text-[#888] text-xs transition border border-[#333]">
        Reset All
      </button>
    </div>
  );
}