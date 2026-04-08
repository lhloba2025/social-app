import React, { useState, useEffect } from "react";

const FONTS = [
  "Arial",
  "Playfair Display",
  "Poppins",
  "Quicksand",
  "Montserrat",
  "Raleway",
  "DM Serif Display",
  "Cabin Sketch",
  "Georgia",
  "Verdana",
  "Impact",
];
const PRESETS = [
  { label: "Elegant Title", fontSize: 64, bold: true, color: "#ffffff", font: "Playfair Display" },
  { label: "Modern Bold", fontSize: 52, bold: true, color: "#00d4d4", font: "Montserrat" },
  { label: "Soft Subtitle", fontSize: 28, bold: false, color: "#e0e0e0", font: "Quicksand" },
  { label: "Minimalist", fontSize: 32, bold: true, color: "#ffffff", font: "Raleway" },
  { label: "Stylish", fontSize: 40, bold: true, color: "#ffcc00", font: "Cabin Sketch" },
  { label: "Serif Accent", fontSize: 36, bold: false, color: "#ffffff", font: "DM Serif Display" },
];

export default function TextPanel({ onAddText }) {
  const [text, setText] = useState("Your text here");
  const [font, setFont] = useState("Arial");
  const [fontSize, setFontSize] = useState(32);
  const [color, setColor] = useState("#ffffff");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [align, setAlign] = useState("center");
  const [bg, setBg] = useState("transparent");

  // Load Google Fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Poppins:wght@400;600;700&family=Quicksand:wght@500;700&family=Montserrat:wght@600;700&family=Raleway:wght@600;700&family=DM+Serif+Display&family=Cabin+Sketch:wght@700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  const add = (overrides = {}) => {
    const layer = { text, font, fontSize, color, bold, italic, align, bg, ...overrides };
    onAddText(layer);
  };

  return (
    <div className="flex flex-col gap-3 p-3 text-white">
      <p className="text-[10px] text-[#666] font-semibold uppercase tracking-wider">Quick Presets</p>
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map(p => (
          <button key={p.label} onClick={() => add({ ...p, text: p.label })}
            className="py-2.5 px-2 rounded-xl bg-[#252525] hover:bg-[#2e2e2e] border border-[#333] hover:border-[#00d4d4]/50 transition text-center"
            style={{ color: p.color, fontWeight: p.bold ? "bold" : "normal", fontSize: 13 }}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="w-full h-px bg-[#2a2a2a]" />
      <p className="text-[10px] text-[#666] font-semibold uppercase tracking-wider">Custom Text</p>

      <textarea value={text} onChange={e => setText(e.target.value)} rows={2}
        className="w-full bg-[#252525] border border-[#333] rounded-xl px-3 py-2 text-white text-sm resize-none outline-none focus:border-[#00d4d4] transition"
        placeholder="Type your text..." />

      <div className="flex gap-2">
        <select value={font} onChange={e => setFont(e.target.value)}
          className="flex-1 bg-[#252525] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-[#00d4d4]">
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <input type="number" value={fontSize} min={8} max={200}
          onChange={e => setFontSize(+e.target.value)}
          className="w-16 bg-[#252525] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs text-center outline-none" />
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setBold(b => !b)}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition border ${bold ? "bg-[#00d4d4] text-black border-[#00d4d4]" : "bg-[#252525] text-white border-[#333] hover:bg-[#2e2e2e]"}`}>
          B
        </button>
        <button onClick={() => setItalic(i => !i)}
          className={`flex-1 py-1.5 rounded-lg text-xs italic transition border ${italic ? "bg-[#00d4d4] text-black border-[#00d4d4]" : "bg-[#252525] text-white border-[#333] hover:bg-[#2e2e2e]"}`}>
          I
        </button>
        {["left", "center", "right"].map(a => (
          <button key={a} onClick={() => setAlign(a)}
            className={`flex-1 py-1.5 rounded-lg text-xs transition border ${align === a ? "bg-[#00d4d4] text-black border-[#00d4d4]" : "bg-[#252525] text-white border-[#333] hover:bg-[#2e2e2e]"}`}>
            {a === "left" ? "⬅" : a === "center" ? "☰" : "➡"}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#888]">Text</span>
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            className="w-8 h-7 rounded cursor-pointer border-none bg-transparent" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#888]">BG</span>
          <input type="color" value={bg === "transparent" ? "#000000" : bg}
            onChange={e => setBg(e.target.value)}
            className="w-8 h-7 rounded cursor-pointer border-none bg-transparent" />
          <button onClick={() => setBg("transparent")} className="text-[10px] text-[#666] hover:text-[#aaa]">✕</button>
        </div>
      </div>

      <button onClick={() => add()}
        className="w-full py-2.5 rounded-xl bg-[#00d4d4] hover:bg-[#00bfbf] text-black font-bold text-sm transition">
        + Add Text to Video
      </button>
    </div>
  );
}