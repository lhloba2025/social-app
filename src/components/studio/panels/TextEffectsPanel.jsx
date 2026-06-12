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
      <div className="text-center py-8 text-xs" style={{ color: "var(--hv-text-faint)" }}>
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
            className={`w-full text-start px-2 py-1.5 rounded truncate transition text-[11px] border ${
              l.id === selectedId ? "" : "bg-slate-50 hover:bg-slate-100"
            }`}
            style={l.id === selectedId
              ? { fontFamily: l.fontFamily, background: "rgba(79,70,229,0.08)", borderColor: "var(--hv-primary)", color: "var(--hv-text)" }
              : { fontFamily: l.fontFamily, borderColor: "var(--hv-border)", color: "var(--hv-text-soft)" }}
          >
            {l.richHtml
              ? (() => { const d = document.createElement("div"); d.innerHTML = l.richHtml; return d.textContent || d.innerText || (isRtl ? "نص" : "Text"); })()
              : (l.text || (isRtl ? "نص" : "Text"))
            }
          </button>
        ))}
      </div>

      {/* ── GRADIENT FILL ─────────────────────────────────────────────── */}
      <div className="rounded-lg p-3 space-y-3 border" style={{ borderColor: "var(--hv-border)", background: "var(--hv-surface)" }}>
        <div className="flex items-center justify-between">
          <span className="font-semibold" style={{ color: "var(--hv-text)" }}>{isRtl ? "✨ تدرج لوني للنص" : "✨ Gradient Fill"}</span>
          <button
            onClick={() => updateGradient({ enabled: !tg.enabled })}
            className="px-3 py-0.5 rounded text-[10px] font-bold transition border"
            style={tg.enabled ? { background: "var(--hv-primary)", color: "#fff", borderColor: "var(--hv-primary)" } : { background: "var(--hv-surface-2)", color: "var(--hv-text-soft)", borderColor: "var(--hv-border)" }}
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
              className="w-8 h-8 rounded-full hover:scale-110 transition border-2"
              style={{ background: `linear-gradient(135deg, ${c1}, ${c2})`, borderColor: tg.color1 === c1 && tg.color2 === c2 ? "var(--hv-primary)" : "var(--hv-border)" }}
            />
          ))}
        </div>

        {tg.enabled && (
          <>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "لون ١" : "Color 1"}</label>
                <div className="flex gap-1 items-center">
                  <input
                    type="color"
                    value={tg.color1 || "#8b5cf6"}
                    onInput={(e) => updateGradient({ color1: e.target.value })}
                    className="w-8 h-7 rounded cursor-pointer border bg-transparent"
                    style={{ borderColor: "var(--hv-border)" }}
                  />
                  <span className="text-[10px] font-mono" style={{ color: "var(--hv-text-soft)" }}>{tg.color1 || "#8b5cf6"}</span>
                </div>
              </div>
              <div className="flex-1">
                <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "لون ٢" : "Color 2"}</label>
                <div className="flex gap-1 items-center">
                  <input
                    type="color"
                    value={tg.color2 || "#ec4899"}
                    onInput={(e) => updateGradient({ color2: e.target.value })}
                    className="w-8 h-7 rounded cursor-pointer border bg-transparent"
                    style={{ borderColor: "var(--hv-border)" }}
                  />
                  <span className="text-[10px] font-mono" style={{ color: "var(--hv-text-soft)" }}>{tg.color2 || "#ec4899"}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>
                {isRtl ? `زاوية: ${tg.angle ?? 135}°` : `Angle: ${tg.angle ?? 135}°`}
              </label>
              <input
                type="range" min="0" max="360" step="5"
                value={tg.angle ?? 135}
                onChange={(e) => updateGradient({ angle: parseInt(e.target.value) })}
                className="w-full"
                style={{ accentColor: "var(--hv-primary)" }}
              />
              <div className="flex gap-0.5 mt-1">
                {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
                  <button key={a}
                    onClick={() => updateGradient({ angle: a })}
                    className="flex-1 py-0.5 rounded text-[8px] transition border"
                    style={(tg.angle ?? 135) === a ? { background: "var(--hv-primary)", color: "#fff", borderColor: "var(--hv-primary)" } : { background: "var(--hv-surface-2)", color: "var(--hv-text-soft)", borderColor: "var(--hv-border)" }}
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
      <div className="rounded-lg p-3 space-y-3 border" style={{ borderColor: "var(--hv-border)", background: "var(--hv-surface)" }}>
        <div className="flex items-center justify-between">
          <span className="font-semibold" style={{ color: "var(--hv-text)" }}>{isRtl ? "🌑 ظل النص" : "🌑 Text Shadow"}</span>
          <button
            onClick={() => updateShadow({ enabled: !ts.enabled })}
            className="px-3 py-0.5 rounded text-[10px] font-bold transition border"
            style={ts.enabled ? { background: "var(--hv-primary)", color: "#fff", borderColor: "var(--hv-primary)" } : { background: "var(--hv-surface-2)", color: "var(--hv-text-soft)", borderColor: "var(--hv-border)" }}
          >
            {ts.enabled ? (isRtl ? "مفعّل ✓" : "ON ✓") : (isRtl ? "معطّل" : "OFF")}
          </button>
        </div>

        {/* Shadow presets */}
        <div className="flex flex-wrap gap-1">
          {SHADOW_PRESETS.map((p, i) => (
            <button key={i}
              onClick={() => updateShadow({ ...p, enabled: true })}
              className="px-2 py-1 rounded text-[10px] bg-slate-50 hover:bg-slate-100 border transition"
              style={{ borderColor: "var(--hv-border)", color: "var(--hv-text-soft)" }}
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
                <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>X: {ts.shadowX ?? 2}px</label>
                <input type="range" min="-20" max="20" step="1" value={ts.shadowX ?? 2}
                  onChange={(e) => updateShadow({ shadowX: parseInt(e.target.value) })}
                  className="w-full" style={{ accentColor: "var(--hv-primary)" }} />
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>Y: {ts.shadowY ?? 2}px</label>
                <input type="range" min="-20" max="20" step="1" value={ts.shadowY ?? 2}
                  onChange={(e) => updateShadow({ shadowY: parseInt(e.target.value) })}
                  className="w-full" style={{ accentColor: "var(--hv-primary)" }} />
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "ضبابية" : "Blur"}: {ts.shadowBlur ?? 4}px</label>
                <input type="range" min="0" max="40" step="1" value={ts.shadowBlur ?? 4}
                  onChange={(e) => updateShadow({ shadowBlur: parseInt(e.target.value) })}
                  className="w-full" style={{ accentColor: "var(--hv-primary)" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── TEXT OUTLINE ──────────────────────────────────────────────── */}
      <div className="rounded-lg p-3 space-y-3 border" style={{ borderColor: "var(--hv-border)", background: "var(--hv-surface)" }}>
        <div className="flex items-center justify-between">
          <span className="font-semibold" style={{ color: "var(--hv-text)" }}>{isRtl ? "⭕ إطار النص" : "⭕ Text Outline"}</span>
          <button
            onClick={() => update("textOutline", { ...(selected.textOutline || {}), enabled: !selected.textOutline?.enabled })}
            className="px-3 py-0.5 rounded text-[10px] font-bold transition border"
            style={selected.textOutline?.enabled ? { background: "var(--hv-primary)", color: "#fff", borderColor: "var(--hv-primary)" } : { background: "var(--hv-surface-2)", color: "var(--hv-text-soft)", borderColor: "var(--hv-border)" }}
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
              <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>
                {isRtl ? `سماكة: ${selected.textOutline?.width ?? 1}px` : `Width: ${selected.textOutline?.width ?? 1}px`}
              </label>
              <input type="range" min="1" max="8" step="0.5"
                value={selected.textOutline?.width ?? 1}
                onChange={(e) => update("textOutline", { ...selected.textOutline, width: parseFloat(e.target.value) })}
                className="w-full"
                style={{ accentColor: "var(--hv-primary)" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── GLOW ──────────────────────────────────────────────────────── */}
      <div className="rounded-lg p-3 space-y-2 border" style={{ borderColor: "var(--hv-border)", background: "var(--hv-surface)" }}>
        <span className="font-semibold block" style={{ color: "var(--hv-text)" }}>{isRtl ? "💫 توهج النص" : "💫 Glow"}</span>
        <div>
          <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>
            {isRtl ? `شدة التوهج: ${selected.glow || 0}px` : `Glow Intensity: ${selected.glow || 0}px`}
          </label>
          <input type="range" min="0" max="40" step="1"
            value={selected.glow || 0}
            onChange={(e) => update("glow", parseInt(e.target.value))}
            className="w-full"
            style={{ accentColor: "var(--hv-primary)" }}
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {[0, 5, 10, 15, 20, 30].map(v => (
            <button key={v}
              onClick={() => update("glow", v)}
              className="px-2 py-0.5 rounded text-[10px] transition border"
              style={(selected.glow || 0) === v ? { background: "var(--hv-primary)", color: "#fff", borderColor: "var(--hv-primary)" } : { background: "var(--hv-surface-2)", color: "var(--hv-text-soft)", borderColor: "var(--hv-border)" }}
            >{v}</button>
          ))}
        </div>
      </div>

    </div>
  );
}
