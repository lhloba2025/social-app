import React, { useState } from "react";

const SHAPES = [
  { id: "rect", name: "Rectangle", svg: <rect x="4" y="4" width="16" height="16" rx="1" fill="currentColor"/> },
  { id: "circle", name: "Circle", svg: <circle cx="12" cy="12" r="9" fill="currentColor"/> },
  { id: "triangle", name: "Triangle", svg: <polygon points="12 3 22 21 2 21" fill="currentColor"/> },
  { id: "star", name: "Star", svg: <polygon points="12 2 15 9 22 9 16 14 18 21 12 17 6 21 8 14 2 9 9 9" fill="currentColor"/> },
  { id: "heart", name: "Heart", svg: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="currentColor"/> },
  { id: "arrow", name: "Arrow", svg: <><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2"/><polyline points="12 5 19 12 12 19" stroke="currentColor" strokeWidth="2" fill="none"/></> },
  { id: "diamond", name: "Diamond", svg: <polygon points="12 2 22 12 12 22 2 12" fill="currentColor"/> },
  { id: "line", name: "Line", svg: <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="3"/> },
];

const STICKERS = ["🎉", "🔥", "⭐", "💯", "👍", "❤️", "😂", "😍", "🎬", "🎵", "💥", "✨", "🌟", "🏆", "🎯", "💡"];

export default function ElementsPanel({ onAddElement }) {
  const [color, setColor] = useState("#00d4d4");
  const [tab, setTab] = useState("shapes");

  return (
    <div className="flex flex-col gap-3 p-3 text-sm text-white">
      <div className="flex gap-1">
        {["shapes", "stickers"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition
              ${tab === t ? "bg-[#00d4d4] text-black" : "bg-[#2a2a2a] text-[#888] hover:bg-[#333]"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "shapes" && (
        <>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-[#888]">Color</label>
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              className="w-8 h-7 rounded cursor-pointer bg-transparent border-none" />
            <div className="flex gap-1 flex-wrap">
              {["#ffffff","#00d4d4","#f59e0b","#ef4444","#8b5cf6","#10b981"].map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className="w-5 h-5 rounded-full border-2 transition"
                  style={{ background: c, borderColor: color === c ? "#fff" : "transparent" }} />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {SHAPES.map(s => (
              <button key={s.id} onClick={() => onAddElement?.({ type: "shape", shape: s.id, color })}
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[#252525] hover:bg-[#2e2e2e] border border-[#333] hover:border-[#00d4d4]/50 transition">
                <svg width="24" height="24" viewBox="0 0 24 24" style={{ color }}>
                  {s.svg}
                </svg>
                <span className="text-[9px] text-[#888]">{s.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {tab === "stickers" && (
        <div className="grid grid-cols-4 gap-2">
          {STICKERS.map(s => (
            <button key={s} onClick={() => onAddElement?.({ type: "sticker", emoji: s })}
              className="w-full aspect-square text-2xl rounded-xl bg-[#252525] hover:bg-[#2e2e2e] border border-[#333] hover:border-[#00d4d4]/50 transition flex items-center justify-center">
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}