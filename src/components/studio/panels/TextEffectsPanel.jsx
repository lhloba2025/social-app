// @ts-nocheck
import React from "react";
import StudioColorPicker from "../StudioColorPicker";

const GRADIENT_PRESETS = [
  ["#8b5cf6","#ec4899"],
  ["#3b82f6","#06b6d4"],
  ["#f97316","#eab308"],
  ["#10b981","#3b82f6"],
  ["#f43f5e","#f97316"],
  ["#a855f7","#6366f1"],
  ["#ffffff","#94a3b8"],
  ["#fbbf24","#f87171"],
  ["#e11d48","#7c3aed"],
  ["#0ea5e9","#6366f1"],
  ["#84cc16","#06b6d4"],
  ["#f59e0b","#ef4444"],
];

const SHADOW_PRESETS = [
  { label: "بسيط", shadowColor: "#000000", shadowX: 2, shadowY: 2, shadowBlur: 4 },
  { label: "قوي",  shadowColor: "#000000", shadowX: 4, shadowY: 4, shadowBlur: 8 },
  { label: "توهج", shadowColor: "#8b5cf6", shadowX: 0, shadowY: 0, shadowBlur: 12 },
  { label: "أبيض", shadowColor: "#ffffff", shadowX: 0, shadowY: 0, shadowBlur: 8 },
  { label: "ورديّ", shadowColor: "#ec4899", shadowX: 0, shadowY: 0, shadowBlur: 10 },
  { label: "سفلي", shadowColor: "#000000", shadowX: 0, shadowY: 6, shadowBlur: 6 },
];

export default function TextEffectsPanel({ layers, selectedId, onSelect, onUpdate, language }) {
  const isRtl = language === "ar";
  const selected = layers.find((l) => l.id === selectedId);

  const update = (key, val) => {
    if (!selected) return;
    onUpdate(selected.id, { [key]: val });
  };

  const updateGradient = (patch) => {
    if (!selected) return;
    onUpdate(selected.id, { textGradient: { ...(selected.textGradient || {}), ...patch } });
  };

  const updateShadow = (patch) => {
    if (!selected) return;
    onUpdate(selected.id, { textShadowEffect: { ...(selected.textShadowEffect || {}), ...patch } });
  };

  if (!selected) {
    return (
      <div className="text-center py-8 text-slate-500 text-xs">
        {isRtl ? "اختر طبقة نص من الكانفاس لتطبيق التأثيرات" : "Select a text layer to apply effects"}
      </div>
    );
  }

  const tg = selected.textGradient || {};
  const ts = selected.textShadowEffect || {};

  return (
    <div className="space-y-4 text-xs">

      {/* Layer selector */}
      <div className="space-y-1 max-h-28 overflow-y-auto">
        {layers.map((l) => (
          <button
            key={l.id}
            onClick={() => onSelect(l.id)}
            className={`w-full text-start px-2 py-1.5 rounded truncate transition text-[11px] ${
              l.id === selectedId ? "bg-indigo-600/30 border border-indigo-500/50 text-white" : "bg-slate-700 hover:bg-slate-600 text-slate-300"
            }`}
            style={{ fontFamily: l.fontFamily }}
          >
            {l.richHtml
              ? (() => { const d = document.createElement("div"); d.innerHTML = l.richHtml; return d.textContent || d.innerText || (isRtl ? "نص" : "Text"); })()
              : (l.text || (isRtl ? "نص" : "Text"))
            }
          </button>
        ))}
      </div>

      {/* ── GRADIENT FILL ─────────────────────────────────────────────── */}
      <div className="border border-slate-600 rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-200 font-semibold">{isRtl ? "✨ تدرج لوني للنص" : "✨ Gradient Fill"}</span>
          <button
            onClick={() => updateGradient({ enabled: !tg.enabled })}
            className={`px-3 py-0.5 rounded text-[10px] font-bold transition ${
              tg.enabled ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"
            }`}
          >
            {tg.enabled ? (isRtl ? "مفعّل ✓" : "ON ✓") : (isRtl ? "معطّل" : "OFF")}
          </button>
        </div>

        {/* Preset gradient circles */}
        <div className="flex flex-wrap gap-1.5">
          {GRADIENT_PRESETS.map(([c1, c2], i) => (
            <button
              key={i}
              onClick={() => updateGradient({ color1: c1, color2: c2, enabled: true })}
              style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
              className={`w-8 h-8 rounded-full hover:scale-110 transition border-2 ${
                tg.color1 === c1 && tg.color2 === c2 ? "border-white" : "border-slate-600"
              }`}
            />
          ))}
        </div>

        {tg.enabled && (
          <>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-slate-400 text-[10px] block mb-1">{isRtl ? "لون ١" : "Color 1"}</label>
                <div className="flex gap-1 items-center">
                  <input
                    type="color"
                    value={tg.color1 || "#8b5cf6"}
                    onInput={(e) => updateGradient({ color1: e.target.value })}
                    className="w-8 h-7 rounded cursor-pointer border border-slate-600 bg-transparent"
                  />
                  <span className="text-[10px] text-slate-400 font-mono">{tg.color1 || "#8b5cf6"}</span>
                </div>
              </div>
              <div className="flex-1">
                <label className="text-slate-400 text-[10px] block mb-1">{isRtl ? "لون ٢" : "Color 2"}</label>
                <div className="flex gap-1 items-center">
                  <input
                    type="color"
                    value={tg.color2 || "#ec4899"}
                    onInput={(e) => updateGradient({ color2: e.target.value })}
                    className="w-8 h-7 rounded cursor-pointer border border-slate-600 bg-transparent"
                  />
                  <span className="text-[10px] text-slate-400 font-mono">{tg.color2 || "#ec4899"}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-slate-400 text-[10px] block mb-1">
                {isRtl ? `زاوية: ${tg.angle ?? 135}°` : `Angle: ${tg.angle ?? 135}°`}
              </label>
              <input
                type="range" min="0" max="360" step="5"
                value={tg.angle ?? 135}
                onChange={(e) => updateGradient({ angle: parseInt(e.target.value) })}
                className="w-full accent-indigo-500"
              />
              <div className="flex gap-0.5 mt-1">
                {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
                  <button key={a}
                    onClick={() => updateGradient({ angle: a })}
                    className={`flex-1 py-0.5 rounded text-[8px] transition ${(tg.angle ?? 135) === a ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"}`}
                  >{a}°</button>
                ))}
              </div>
            </div>

            {/* Live preview */}
            <div
              className="w-full h-8 rounded-lg"
              style={{ background: `linear-gradient(${tg.angle ?? 135}deg, ${tg.color1 || "#8b5cf6"}, ${tg.color2 || "#ec4899"})` }}
            />
          </>
        )}
      </div>

      {/* ── CUSTOM SHADOW ─────────────────────────────────────────────── */}
      <div className="border border-slate-600 rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-200 font-semibold">{isRtl ? "🌑 ظل النص" : "🌑 Text Shadow"}</span>
          <button
            onClick={() => updateShadow({ enabled: !ts.enabled })}
            className={`px-3 py-0.5 rounded text-[10px] font-bold transition ${
              ts.enabled ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"
            }`}
          >
            {ts.enabled ? (isRtl ? "مفعّل ✓" : "ON ✓") : (isRtl ? "معطّل" : "OFF")}
          </button>
        </div>

        {/* Shadow presets */}
        <div className="flex flex-wrap gap-1">
          {SHADOW_PRESETS.map((p, i) => (
            <button key={i}
              onClick={() => updateShadow({ ...p, enabled: true })}
              className="px-2 py-1 rounded text-[10px] bg-slate-700 hover:bg-indigo-600 text-slate-300 hover:text-white transition"
            >{p.label}</button>
          ))}
        </div>

        {ts.enabled && (
          <div className="space-y-2">
            <StudioColorPicker
              label={isRtl ? "لون الظل" : "Shadow Color"}
              value={ts.shadowColor || "#000000"}
              onChange={(v) => updateShadow({ shadowColor: v })}
            />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-slate-400 text-[10px] block mb-1">X: {ts.shadowX ?? 2}px</label>
                <input type="range" min="-20" max="20" step="1" value={ts.shadowX ?? 2}
                  onChange={(e) => updateShadow({ shadowX: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500" />
              </div>
              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Y: {ts.shadowY ?? 2}px</label>
                <input type="range" min="-20" max="20" step="1" value={ts.shadowY ?? 2}
                  onChange={(e) => updateShadow({ shadowY: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500" />
              </div>
              <div>
                <label className="text-slate-400 text-[10px] block mb-1">{isRtl ? "ضبابية" : "Blur"}: {ts.shadowBlur ?? 4}px</label>
                <input type="range" min="0" max="40" step="1" value={ts.shadowBlur ?? 4}
                  onChange={(e) => updateShadow({ shadowBlur: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── TEXT OUTLINE ──────────────────────────────────────────────── */}
      <div className="border border-slate-600 rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-200 font-semibold">{isRtl ? "⭕ إطار النص" : "⭕ Text Outline"}</span>
          <button
            onClick={() => update("textOutline", { ...(selected.textOutline || {}), enabled: !selected.textOutline?.enabled })}
            className={`px-3 py-0.5 rounded text-[10px] font-bold transition ${
              selected.textOutline?.enabled ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"
            }`}
          >
            {selected.textOutline?.enabled ? (isRtl ? "مفعّل ✓" : "ON ✓") : (isRtl ? "معطّل" : "OFF")}
          </button>
        </div>
        {selected.textOutline?.enabled && (
          <div className="space-y-2">
            <StudioColorPicker
              label={isRtl ? "لون الإطار" : "Outline Color"}
              value={selected.textOutline?.color || "#000000"}
              onChange={(v) => update("textOutline", { ...selected.textOutline, color: v })}
            />
            <div>
              <label className="text-slate-400 text-[10px] block mb-1">
                {isRtl ? `سماكة: ${selected.textOutline?.width ?? 1}px` : `Width: ${selected.textOutline?.width ?? 1}px`}
              </label>
              <input type="range" min="1" max="8" step="0.5"
                value={selected.textOutline?.width ?? 1}
                onChange={(e) => update("textOutline", { ...selected.textOutline, width: parseFloat(e.target.value) })}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── GLOW ──────────────────────────────────────────────────────── */}
      <div className="border border-slate-600 rounded-lg p-3 space-y-2">
        <span className="text-slate-200 font-semibold block">{isRtl ? "💫 توهج النص" : "💫 Glow"}</span>
        <div>
          <label className="text-slate-400 text-[10px] block mb-1">
            {isRtl ? `شدة التوهج: ${selected.glow || 0}px` : `Glow Intensity: ${selected.glow || 0}px`}
          </label>
          <input type="range" min="0" max="40" step="1"
            value={selected.glow || 0}
            onChange={(e) => update("glow", parseInt(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {[0, 5, 10, 15, 20, 30].map(v => (
            <button key={v}
              onClick={() => update("glow", v)}
              className={`px-2 py-0.5 rounded text-[10px] transition ${(selected.glow || 0) === v ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"}`}
            >{v}</button>
          ))}
        </div>
      </div>

    </div>
  );
}
