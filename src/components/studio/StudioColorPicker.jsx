import React, { useState, useRef, useEffect, useCallback } from "react";

const PRESET_COLORS = [
  "#ef4444","#ec4899","#f97316","#eab308","#22c55e","#14b8a6","#3b82f6","#8b5cf6","#6366f1","#000000",
  "#fca5a5","#f9a8d4","#fdba74","#fde047","#86efac","#5eead4","#93c5fd","#c4b5fd","#a5b4fc","#ffffff",
  "#dc2626","#db2777","#ea580c","#ca8a04","#16a34a","#0d9488","#2563eb","#7c3aed","#4f46e5","#334155",
  "#fef08a","#bbf7d0","#bfdbfe","#e9d5ff","#fed7aa","#fecaca","#ccfbf1","#dbeafe","#ede9fe","#64748b",
];

function hexToHsv(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: max ? d / max : 0, v: max };
}

function hsvToHex(h, s, v) {
  h /= 360;
  const i = Math.floor(h * 6);
  const f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  let r, g, b;
  [r, g, b] = [[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]][i % 6];
  return "#" + [r, g, b].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
}

function AdvancedColorPicker({ value, onChange }) {
  const svCanvasRef = useRef(null);
  const [hsv, setHsv] = useState(() => { try { return hexToHsv(value || "#ff0000"); } catch { return { h: 0, s: 1, v: 1 }; } });
  const dragging = useRef(null); // "sv" | "hue" | "alpha"
  const [alpha, setAlpha] = useState(1);

  useEffect(() => {
    try { setHsv(hexToHsv(value || "#ff0000")); } catch {}
  }, [value]);

  // Draw SV gradient on canvas
  useEffect(() => {
    const canvas = svCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { width: w, height: h } = canvas;
    // Hue base
    const hGrad = ctx.createLinearGradient(0, 0, w, 0);
    hGrad.addColorStop(0, "#fff");
    hGrad.addColorStop(1, `hsl(${hsv.h},100%,50%)`);
    ctx.fillStyle = hGrad;
    ctx.fillRect(0, 0, w, h);
    // Black overlay
    const bGrad = ctx.createLinearGradient(0, 0, 0, h);
    bGrad.addColorStop(0, "transparent");
    bGrad.addColorStop(1, "#000");
    ctx.fillStyle = bGrad;
    ctx.fillRect(0, 0, w, h);
  }, [hsv.h]);

  const getXY = (e, el) => {
    const rect = el.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(0, Math.min(1, (cx - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (cy - rect.top) / rect.height)),
    };
  };

  useEffect(() => {
    const move = (e) => {
      if (!dragging.current) return;
      if (dragging.current === "sv") {
        const { x, y } = getXY(e, svCanvasRef.current);
        const newHsv = { ...hsv, s: x, v: 1 - y };
        setHsv(newHsv);
        onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
      }
    };
    const up = () => { dragging.current = null; };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
  }, [hsv, onChange]);

  const svX = hsv.s * 100;
  const svY = (1 - hsv.v) * 100;
  const currentColor = hsvToHex(hsv.h, hsv.s, hsv.v);

  return (
    <div className="space-y-2">
      {/* SV Gradient Box */}
      <div className="relative rounded overflow-hidden cursor-crosshair" style={{ height: 140 }}
        onMouseDown={(e) => { dragging.current = "sv"; const { x, y } = getXY(e, svCanvasRef.current); const n = { ...hsv, s: x, v: 1 - y }; setHsv(n); onChange(hsvToHex(n.h, n.s, n.v)); }}
        onTouchStart={(e) => { dragging.current = "sv"; const { x, y } = getXY(e, svCanvasRef.current); const n = { ...hsv, s: x, v: 1 - y }; setHsv(n); onChange(hsvToHex(n.h, n.s, n.v)); }}
      >
        <canvas ref={svCanvasRef} width={220} height={140} style={{ width: "100%", height: "100%", display: "block" }} />
        {/* Picker dot */}
        <div style={{
          position: "absolute",
          left: `${svX}%`, top: `${svY}%`,
          transform: "translate(-50%,-50%)",
          width: 14, height: 14,
          borderRadius: "50%",
          border: "2px solid #fff",
          boxShadow: "0 0 4px rgba(0,0,0,0.8)",
          pointerEvents: "none",
          backgroundColor: currentColor,
        }} />
      </div>

      {/* Hue slider */}
      <div>
        <input
          type="range" min="0" max="360" step="1"
          value={Math.round(hsv.h)}
          onChange={(e) => {
            const h = parseFloat(e.target.value);
            const n = { ...hsv, h };
            setHsv(n);
            onChange(hsvToHex(n.h, n.s, n.v));
          }}
          style={{
            width: "100%", height: 14, borderRadius: 7, cursor: "pointer",
            appearance: "none", outline: "none", border: "none",
            background: "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
          }}
        />
      </div>

      {/* Preview + hex */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded border border-slate-600 flex-shrink-0" style={{ backgroundColor: value }} title="الحالي" />
        <div className="text-[9px] text-slate-500">←</div>
        <div className="w-9 h-9 rounded border border-slate-600 flex-shrink-0" style={{ backgroundColor: currentColor }} title="الجديد" />
        <input
          type="text"
          value={currentColor}
          dir="ltr"
          readOnly
          className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white font-mono"
        />
      </div>
    </div>
  );
}

export default function StudioColorPicker({ value, onChange, label }) {
  const [showWheel, setShowWheel] = useState(false);

  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs text-slate-400 block">{label}</label>}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white font-mono"
          placeholder="#ffffff"
          dir="ltr"
        />
        {/* Color swatch — opens advanced picker */}
        <div
          onClick={() => setShowWheel(p => !p)}
          className="w-8 h-8 rounded border flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
          style={{ backgroundColor: value || "#ffffff", borderColor: showWheel ? "#818cf8" : "#64748b" }}
          title="اختر لوناً"
        />
      </div>

      {/* Advanced picker */}
      {showWheel && (
        <div className="bg-slate-800 border border-slate-600 rounded-xl p-3">
          <AdvancedColorPicker value={value || "#ff0000"} onChange={onChange} />
        </div>
      )}

      {/* Preset swatches */}
      <div className="grid grid-cols-10 gap-1">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            title={c}
            className="w-full aspect-square rounded-full hover:scale-110 transition-transform"
            style={{
              backgroundColor: c,
              outline: value === c ? "2px solid #818cf8" : "1px solid rgba(255,255,255,0.1)",
              outlineOffset: "1px",
            }}
          />
        ))}
      </div>
    </div>
  );
}