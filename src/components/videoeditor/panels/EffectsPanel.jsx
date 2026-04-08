import React, { useState } from "react";

const EFFECTS = [
  { id: "none", name: "None", icon: "○", css: "none" },
  { id: "blur", name: "Blur", icon: "🌫️", css: "blur(3px)" },
  { id: "grayscale", name: "B&W", icon: "⬛", css: "grayscale(1)" },
  { id: "sepia", name: "Sepia", icon: "🟤", css: "sepia(1)" },
  { id: "invert", name: "Invert", icon: "🔄", css: "invert(1)" },
  { id: "bright", name: "Bright", icon: "☀️", css: "brightness(1.6) contrast(1.1)" },
  { id: "contrast", name: "Contrast", icon: "◑", css: "contrast(2)" },
  { id: "vivid", name: "Vivid", icon: "🎨", css: "saturate(2.5) contrast(1.1)" },
  { id: "vintage", name: "Vintage", icon: "📷", css: "sepia(0.5) contrast(1.2) brightness(0.9) saturate(0.8)" },
  { id: "cold", name: "Cold", icon: "❄️", css: "hue-rotate(200deg) saturate(1.3) brightness(1.05)" },
  { id: "warm", name: "Warm", icon: "🔥", css: "hue-rotate(-20deg) saturate(1.5) brightness(1.05)" },
  { id: "dramatic", name: "Dramatic", icon: "🎭", css: "contrast(1.8) grayscale(0.4) brightness(0.9)" },
];

export default function EffectsPanel({ onApplyEffect }) {
  const [selected, setSelected] = useState("none");

  const apply = (effect) => {
    setSelected(effect.id);
    onApplyEffect({ filter: effect.css });
  };

  return (
    <div className="flex flex-col gap-3 p-3 text-white">
      <p className="text-[10px] text-[#666] font-semibold uppercase tracking-wider">Tap an effect to apply it to the video</p>
      <div className="grid grid-cols-3 gap-2">
        {EFFECTS.map(effect => (
          <button key={effect.id} onClick={() => apply(effect)}
            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition border
              ${selected === effect.id
                ? "bg-[#00d4d4]/20 border-[#00d4d4] ring-1 ring-[#00d4d4]"
                : "bg-[#252525] border-[#333] hover:bg-[#2e2e2e] hover:border-[#444]"}`}>
            <span className="text-2xl">{effect.icon}</span>
            <span className="text-[10px] text-[#bbb]">{effect.name}</span>
            {selected === effect.id && effect.id !== "none" && (
              <span className="text-[8px] text-[#00d4d4] font-bold">ACTIVE</span>
            )}
          </button>
        ))}
      </div>
      {selected !== "none" && (
        <button onClick={() => apply(EFFECTS[0])}
          className="w-full py-2 rounded-xl bg-[#2a2a2a] hover:bg-[#333] text-[#888] text-xs transition border border-[#333]">
          Remove Effect
        </button>
      )}
    </div>
  );
}