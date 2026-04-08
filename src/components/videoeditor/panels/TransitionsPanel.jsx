import React, { useState } from "react";

const TRANSITIONS = [
  { id: "fade", name: "Fade", icon: "◼→◻" },
  { id: "slide-left", name: "Slide Left", icon: "→" },
  { id: "slide-right", name: "Slide Right", icon: "←" },
  { id: "slide-up", name: "Slide Up", icon: "↑" },
  { id: "slide-down", name: "Slide Down", icon: "↓" },
  { id: "zoom-in", name: "Zoom In", icon: "⊕" },
  { id: "zoom-out", name: "Zoom Out", icon: "⊖" },
  { id: "rotate", name: "Rotate", icon: "↻" },
  { id: "flip", name: "Flip", icon: "⇄" },
  { id: "blur", name: "Blur", icon: "≈" },
  { id: "dissolve", name: "Dissolve", icon: "∴" },
  { id: "wipe", name: "Wipe", icon: "▶" },
];

export default function TransitionsPanel({ onApplyTransition }) {
  const [selected, setSelected] = useState(null);
  const [duration, setDuration] = useState(0.5);

  const apply = (t) => {
    setSelected(t.id);
    onApplyTransition?.({ type: t.id, duration });
  };

  return (
    <div className="flex flex-col gap-3 p-3 text-sm text-white">
      <p className="text-[11px] text-[#888] font-semibold uppercase tracking-wider">Transitions</p>
      <p className="text-[11px] text-[#666]">Applied between clips on the timeline</p>

      {selected && (
        <div className="bg-[#252525] rounded-xl p-3 flex flex-col gap-2 border border-[#00d4d4]/30">
          <div className="flex justify-between">
            <span className="text-xs font-semibold text-[#00d4d4]">
              {TRANSITIONS.find(t => t.id === selected)?.name} Applied ✓
            </span>
            <button onClick={() => { setSelected(null); onApplyTransition?.(null); }}
              className="text-[#666] hover:text-red-400 text-xs">Remove</button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#888]">Duration</span>
            <input type="range" min="0.1" max="2" step="0.1" value={duration}
              onChange={e => { setDuration(+e.target.value); onApplyTransition?.({ type: selected, duration: +e.target.value }); }}
              className="flex-1 h-1 accent-[#00d4d4] cursor-pointer" />
            <span className="text-[10px] text-[#888] w-10">{duration}s</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {TRANSITIONS.map(t => (
          <button key={t.id} onClick={() => apply(t)}
            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition border
              ${selected === t.id ? "bg-[#00d4d4]/20 border-[#00d4d4]" : "bg-[#252525] border-[#333] hover:bg-[#2e2e2e]"}`}>
            <span className="text-lg font-mono text-[#00d4d4]">{t.icon}</span>
            <span className="text-[10px] text-[#aaa]">{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}