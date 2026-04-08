import React, { useState } from "react";

const TRANSITIONS = [
  { id: "fade", name: "تلاشي", icon: "🌫️", type: "fade", description: "تلاشي سلس بين المقاطع" },
  { id: "slide-left", name: "انزلاق يسار", icon: "➡️", type: "slide", direction: "left" },
  { id: "slide-right", name: "انزلاق يمين", icon: "⬅️", type: "slide", direction: "right" },
  { id: "slide-up", name: "انزلاق أعلى", icon: "⬇️", type: "slide", direction: "up" },
  { id: "slide-down", name: "انزلاق أسفل", icon: "⬆️", type: "slide", direction: "down" },
  { id: "zoom-in", name: "تكبير", icon: "🔍", type: "zoom", direction: "in" },
  { id: "zoom-out", name: "تصغير", icon: "🔍", type: "zoom", direction: "out" },
  { id: "rotate", name: "دوران", icon: "🔄", type: "rotate" },
  { id: "blur", name: "ضبابي", icon: "💨", type: "blur" },
  { id: "flip", name: "انقلاب", icon: "🔀", type: "flip" },
];

export default function TransitionLibraryPanel({ onAddTransition }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTransition, setSelectedTransition] = useState(null);
  const [duration, setDuration] = useState(0.5);

  const filtered = TRANSITIONS.filter(t => 
    t.name.includes(searchTerm) || t.description?.includes(searchTerm)
  );

  const handleAdd = (transition) => {
    onAddTransition?.({
      id: Date.now(),
      ...transition,
      duration: duration,
      type: transition.type
    });
    setSelectedTransition(null);
  };

  return (
    <div className="flex flex-col gap-3 p-3 text-sm text-white">
      {/* Search */}
      <input
        type="text"
        placeholder="ابحث عن انتقال..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="w-full bg-[#252525] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#00d4d4] text-white placeholder-[#555]"
      />

      {/* Duration Control */}
      <div className="bg-[#252525] rounded-lg p-2.5 border border-[#333]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-[#888] font-semibold">مدة الانتقال</span>
          <span className="text-[10px] text-[#00d4d4] font-semibold">{duration.toFixed(2)}s</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="3"
          step="0.1"
          value={duration}
          onChange={e => setDuration(parseFloat(e.target.value))}
          className="w-full h-1 accent-[#00d4d4] cursor-pointer"
        />
      </div>

      {/* Transitions Grid */}
      <div className="grid grid-cols-2 gap-2">
        {filtered.map(trans => (
          <button
            key={trans.id}
            onClick={() => setSelectedTransition(trans.id)}
            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border-2 transition ${
              selectedTransition === trans.id
                ? "border-[#00d4d4] bg-[#00d4d4]/10"
                : "border-[#333] bg-[#252525] hover:border-[#444]"
            }`}
          >
            <span className="text-2xl">{trans.icon}</span>
            <span className="text-[10px] font-medium text-center leading-tight">{trans.name}</span>
          </button>
        ))}
      </div>

      {/* Add Button */}
      {selectedTransition && (
        <button
          onClick={() => handleAdd(TRANSITIONS.find(t => t.id === selectedTransition))}
          className="w-full py-2 rounded-lg bg-[#00d4d4] hover:bg-[#00bfbf] text-black font-bold text-sm transition"
        >
          إضافة انتقال
        </button>
      )}
    </div>
  );
}