import React, { useRef, useState } from "react";
import { Upload, Trash2, Loader2, Wand2, Plus } from "lucide-react";
import { normalizeImageFile, isHeic } from "@/utils/imageConvert";
import { uploadFile } from "@/api/localClient";
import StudioColorPicker from "../StudioColorPicker";
import { SVG_TYPES, SVG_TYPE_DEFAULTS, generateSvgBackground } from "../svgBackgrounds";

function genLayerId() { return `svgl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function makeDefaultLayer(svgType = "swoosh") {
  const d = SVG_TYPE_DEFAULTS[svgType] || SVG_TYPE_DEFAULTS.swoosh;
  return { id: genLayerId(), svgType, ...d, offsetX: 0, offsetY: 0, layerOpacity: 1, blur: 0 };
}

// ── Soft luxe tones — elegant smooth gradients (no noise) ────────────────────
// "Soft marble" = a gentle cloudy blend made from layered radial gradients, so
// it reads as soft veined stone without the harsh SVG-noise look.
function softMarble(light, mid, deep) {
  return [
    `radial-gradient(120% 90% at 18% 20%, ${light} 0%, transparent 55%)`,
    `radial-gradient(110% 80% at 82% 28%, ${deep} 0%, transparent 52%)`,
    `radial-gradient(120% 90% at 55% 88%, ${light} 0%, transparent 55%)`,
    `linear-gradient(135deg, ${mid} 0%, ${deep} 100%)`,
  ].join(", ");
}
const g = (a, b) => `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;

const TEXTURE_PRESETS = [
  // Creams & ivory
  { name: "Cream",          value: g("#f9f5ee", "#efe7da") },
  { name: "Warm Cream",     value: g("#f6efe2", "#e7d9c4") },
  { name: "Ivory",          value: g("#fbf8f2", "#f1ebdf") },
  { name: "Off White",      value: g("#fbfaf7", "#eceae3") },
  // Beige family
  { name: "Light Beige",    value: g("#f3ecdf", "#e3d4bd") },
  { name: "Sand Beige",     value: g("#efe3d3", "#d9c4a8") },
  { name: "Nude",           value: g("#f1e2d3", "#dcc3aa") },
  { name: "Taupe",          value: g("#e6dccd", "#bdae9a") },
  { name: "Toffee",         value: g("#e9d8c2", "#c8a982") },
  // Soft "wavy" marble (smooth, not noisy)
  { name: "Beige Marble",   value: softMarble("#faf5ec", "#efe5d4", "#dccab0") },
  { name: "Cream Marble",   value: softMarble("#fdfbf6", "#f3ece0", "#e4d8c6") },
  { name: "Grey Marble",    value: softMarble("#f4f5f6", "#e3e6e9", "#c7ccd2") },
  { name: "Rose Marble",    value: softMarble("#fdf1f0", "#f6dfe0", "#e3bcc0") },
  // Rose / blush
  { name: "Blush",          value: g("#fdeef0", "#f6dfe4") },
  { name: "Soft Rose",      value: g("#f7dfe0", "#e3b7bd") },
  { name: "Peach",          value: g("#fce7da", "#f4c9af") },
  { name: "Powder Pink",    value: g("#fbe9ee", "#f1cdd8") },
  { name: "Rose Gold",      value: "linear-gradient(135deg,#e8c2c0 0%,#f7e1d7 38%,#dca4a0 64%,#b76e79 100%)" },
  // Greys & cool neutrals
  { name: "Light Grey",     value: g("#f4f5f7", "#dfe2e7") },
  { name: "Warm Grey",      value: g("#ecebe7", "#cfccc4") },
  { name: "Sage",           value: g("#e9eee5", "#c4cfbc") },
  { name: "Soft Lavender",  value: g("#f1edf8", "#dcd2ee") },
  // Gold / champagne
  { name: "Champagne",      value: g("#f7eccf", "#e2c88f") },
  { name: "Gold Foil",      value: "linear-gradient(135deg,#bf953f 0%,#fcf6ba 22%,#b38728 45%,#fbf5b7 68%,#aa771c 100%)" },
];

const PRESET_CATEGORIES = [
  {
    label: { ar: "🤎 درجات ناعمة فاخرة (كريمي/بيج/روز/مموج)", en: "🤎 Soft Luxe Tones" },
    presets: TEXTURE_PRESETS,
  },
  {
    label: { ar: "💜 نيفي × بنفسجي (ستايل لهلوبه)", en: "💜 Navy × Purple (Brand Style)" },
    presets: [
      { name: "Lhloba Signature",  value: "linear-gradient(135deg, #06041a 0%, #1a0a3d 40%, #4c1d95 75%, #7c3aed 100%)" },
      { name: "Purple Ribbons",    value: "linear-gradient(135deg, #06041a 0%, #06041a 18%, #4c1d95 22%, #7c3aed 28%, #4c1d95 33%, #06041a 37%, #06041a 55%, #5b21b6 60%, #8b5cf6 67%, #5b21b6 72%, #06041a 76%, #06041a 100%)" },
      { name: "Navy Violet",       value: "linear-gradient(135deg, #04020f 0%, #0f0730 50%, #3730a3 100%)" },
      { name: "Brand Spotlight",   value: "radial-gradient(circle at 35% 55%, #5b21b6 0%, #1a0a3d 45%, #04020f 100%)" },
      { name: "Purple Mist",       value: "radial-gradient(circle at center, #4c1d95 0%, #1e1b4b 45%, #04020f 100%)" },
      { name: "Navy Gold Lhloba",  value: "linear-gradient(135deg, #06041a 0%, #1a0a3d 40%, #4c1d95 65%, #c9a227 100%)" },
    ],
  },
  {
    label: { ar: "🖤 ذهب وسواد", en: "🖤 Gold & Black" },
    presets: [
      { name: "Gold Glow", value: "radial-gradient(circle at center, #c9a227 0%, #0a0a0a 70%)" },
      { name: "Gold Spot", value: "radial-gradient(circle at 30% 70%, #d4af37 0%, #0a0a0a 60%)" },
      { name: "Black to Gold", value: "linear-gradient(135deg, #0a0a0a 0%, #c9a227 100%)" },
      { name: "Gold Stripe", value: "linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 30%, #c9a227 50%, #1a1a1a 70%, #0d0d0d 100%)" },
      { name: "Noir Gold V", value: "linear-gradient(180deg, #0d0d0d 0%, #c9a227 50%, #0d0d0d 100%)" },
      { name: "Dark Champagne", value: "linear-gradient(135deg, #0d0a00 0%, #3d3000 40%, #c9a227 60%, #0d0a00 100%)" },
    ],
  },
  {
    label: { ar: "🌹 روز جولد", en: "🌹 Rose Glam" },
    presets: [
      { name: "Rose Gold", value: "linear-gradient(135deg, #b76e79 0%, #e8b4bc 50%, #c9a227 100%)" },
      { name: "Deep Rose", value: "radial-gradient(circle at center, #e8b4bc 0%, #7a1c3a 60%, #1a0010 100%)" },
      { name: "Blush Noir", value: "linear-gradient(135deg, #1a0010 0%, #b76e79 100%)" },
      { name: "Pink Glam", value: "linear-gradient(135deg, #2c0015 0%, #c9718a 50%, #ffd700 100%)" },
      { name: "Rosé", value: "linear-gradient(135deg, #f5c6d0 0%, #e8879a 50%, #b76e79 100%)" },
      { name: "Dusty Rose", value: "linear-gradient(135deg, #c4a0b0 0%, #8b4563 50%, #4a1628 100%)" },
    ],
  },
  {
    label: { ar: "🤍 رخام فاخر", en: "🤍 Luxury Marble" },
    presets: [
      { name: "White Marble", value: "linear-gradient(135deg, #f5f5f0 0%, #e8e0d8 25%, #d4c5b5 50%, #e8e0d8 75%, #f5f5f0 100%)" },
      { name: "Black Marble", value: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 30%, #1a1a1a 60%, #3d3d3d 100%)" },
      { name: "Gold Marble", value: "linear-gradient(135deg, #2c2c2c 0%, #c9a227 30%, #f5e6a3 50%, #c9a227 70%, #1a1a1a 100%)" },
      { name: "Warm Marble", value: "linear-gradient(135deg, #f5ebe0 0%, #ddbea9 50%, #c9a227 100%)" },
      { name: "Grey Marble", value: "linear-gradient(135deg, #bdc3c7 0%, #6b7280 50%, #2c3e50 100%)" },
      { name: "Stone Dark", value: "linear-gradient(135deg, #d4d4d4 0%, #8a8a8a 40%, #4a4a4a 100%)" },
    ],
  },
  {
    label: { ar: "💜 مخمل ملكي", en: "💜 Royal Velvet" },
    presets: [
      { name: "Dark Velvet", value: "linear-gradient(135deg, #1a0010 0%, #3d0030 50%, #1a0010 100%)" },
      { name: "Royal Purple", value: "linear-gradient(135deg, #12001a 0%, #2d0033 50%, #12001a 100%)" },
      { name: "Bordeaux", value: "linear-gradient(135deg, #1a0505 0%, #3b1010 50%, #6b1a1a 100%)" },
      { name: "Dark Plum", value: "linear-gradient(135deg, #1a0520 0%, #3d1050 50%, #1a0520 100%)" },
      { name: "Emerald Velvet", value: "linear-gradient(135deg, #0a1a0a 0%, #1a3d1a 50%, #0a3020 100%)" },
      { name: "Navy Velvet", value: "linear-gradient(135deg, #000a1a 0%, #001a3d 50%, #000f2d 100%)" },
    ],
  },
  {
    label: { ar: "✨ جلاكسي & كون", en: "✨ Galaxy & Cosmic" },
    presets: [
      { name: "Deep Galaxy", value: "radial-gradient(circle at 40% 40%, #2d1b69 0%, #0d0221 60%, #000000 100%)" },
      { name: "Nebula", value: "radial-gradient(circle at 60% 40%, #833ab4 0%, #1a0533 40%, #000428 100%)" },
      { name: "Aurora", value: "linear-gradient(135deg, #000428 0%, #004e92 50%, #00d2ff 100%)" },
      { name: "Cosmic Gold", value: "radial-gradient(circle at 50% 30%, #c9a227 0%, #1a0533 40%, #0d0221 100%)" },
      { name: "Electric", value: "linear-gradient(135deg, #0575e6 0%, #021b79 50%, #0d0221 100%)" },
      { name: "Deep Space", value: "linear-gradient(135deg, #000000 0%, #0d0221 40%, #1a0533 100%)" },
    ],
  },
];

const GRADIENT_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const RADIAL_POSITIONS = [
  { label: "center", value: "center" },
  { label: "top", value: "top center" },
  { label: "bottom", value: "bottom center" },
  { label: "top-left", value: "top left" },
  { label: "top-right", value: "top right" },
];

export default function BackgroundPanel({ bg, onChange, language }) {
  const isRtl = language === "ar";
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [svgSelId, setSvgSelId] = useState(null);

  const update = (key, val) => onChange({ ...bg, [key]: val });

  const handleImageUpload = async (e) => {
    let file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      if (isHeic(file)) file = await normalizeImageFile(file);
      const { file_url } = await uploadFile({ file });
      onChange({ ...bg, imageUrl: file_url, mode: "image" });
    } catch (err) {
      alert("تعذّر رفع الخلفية: " + (err?.message || err));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const stops = bg.gradientStops || [{ color: "#667eea", position: 0, opacity: 1 }, { color: "#764ba2", position: 100, opacity: 1 }];

  const buildGradientPreview = () => {
    if (bg.gradientPreset && !bg.gradientStops) return bg.gradientPreset;
    const stopsStr = stops.map((s) => `${s.color} ${s.position}%`).join(", ");
    if (bg.gradientType === "radial") return `radial-gradient(circle at ${bg.radialPosition || "center"}, ${stopsStr})`;
    return `linear-gradient(${bg.gradientAngle || 135}deg, ${stopsStr})`;
  };

  const applyPreset = (preset) => {
    onChange({ ...bg, gradientPreset: preset.value, mode: "gradient", gradientStops: null, gradientType: "linear", blur: bg.blur || 0 });
  };

  return (
    <div className="space-y-3 text-xs">
      {/* Mode tabs */}
      <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--hv-border)" }}>
        {[
          { id: "color", labelAr: "لون", labelEn: "Color" },
          { id: "gradient", labelAr: "تدرج", labelEn: "Gradient" },
          { id: "svgDesign", labelAr: "🎨 فنية", labelEn: "🎨 Art" },
          { id: "image", labelAr: "صورة", labelEn: "Image" },
        ].map((m) => (
          <button key={m.id} onClick={() => update("mode", m.id)}
            className={`flex-1 py-1.5 text-xs font-semibold transition ${bg.mode === m.id ? "bg-indigo-600 text-white" : "bg-white text-slate-500 hover:text-indigo-600"}`}>
            {isRtl ? m.labelAr : m.labelEn}
          </button>
        ))}
      </div>

      {bg.mode === "color" && (
        <div className="space-y-3">
          <StudioColorPicker label={isRtl ? "لون الخلفية" : "Background Color"} value={bg.color} onChange={(v) => update("color", v)} />
          <div>
            <label className="text-slate-500 block mb-1">{isRtl ? "شفافية" : "Opacity"}: {Math.round((bg.opacity ?? 1) * 100)}%</label>
            <input type="range" min="0" max="1" step="0.05" value={bg.opacity ?? 1}
              onChange={(e) => update("opacity", parseFloat(e.target.value))} className="w-full" />
          </div>
          <div>
            <label className="text-slate-500 block mb-1">{isRtl ? "🌫️ تغبيش" : "🌫️ Blur"}: {bg.blur || 0}px</label>
            <input type="range" min="0" max="40" value={bg.blur || 0}
              onChange={(e) => update("blur", parseInt(e.target.value))} className="w-full" />
          </div>
        </div>
      )}

      {bg.mode === "gradient" && (
        <div className="space-y-3">
          {/* Preview */}
          <div
            className="h-16 rounded-xl border shadow-inner"
            style={{
              background: buildGradientPreview(),
              filter: bg.blur ? `blur(${bg.blur}px)` : undefined,
              borderColor: "var(--hv-border)",
            }}
          />

          {/* Blur / Frosted Glass */}
          <div className="bg-[var(--hv-surface-2)] rounded-lg p-2 border" style={{ borderColor: "var(--hv-border)" }}>
            <label className="text-amber-600 font-semibold block mb-1">
              {isRtl ? "🌫️ تغبيش (زجاج مثلج)" : "🌫️ Frosted Blur"}: {bg.blur || 0}px
            </label>
            <input type="range" min="0" max="40" value={bg.blur || 0}
              onChange={(e) => update("blur", parseInt(e.target.value))} className="w-full" />
            {bg.blur > 0 && (
              <p className="text-slate-500 text-[10px] mt-1">
                {isRtl ? "✨ تأثير الزجاج المثلج الفاخر" : "✨ Luxury frosted glass effect"}
              </p>
            )}
          </div>

          {/* Gradient type */}
          <div className="flex gap-1">
            {[
              { id: "linear", labelAr: "خطي", labelEn: "Linear" },
              { id: "radial", labelAr: "دائري (إضاءة)", labelEn: "Radial (Spotlight)" },
            ].map((t) => (
              <button key={t.id} onClick={() => update("gradientType", t.id)}
                className={`flex-1 py-1 rounded text-[11px] font-semibold transition ${(bg.gradientType || "linear") === t.id ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-500 hover:text-indigo-600"}`}>
                {isRtl ? t.labelAr : t.labelEn}
              </button>
            ))}
          </div>

          {(bg.gradientType || "linear") === "linear" && (
            <div>
              <label className="text-slate-500 block mb-1">{isRtl ? "الزاوية" : "Angle"}: {bg.gradientAngle || 135}°</label>
              <input type="range" min="0" max="360" step="5" value={bg.gradientAngle || 135}
                onChange={(e) => update("gradientAngle", parseInt(e.target.value))} className="w-full mb-2" />
              <div className="flex gap-1 flex-wrap">
                {GRADIENT_ANGLES.map((a) => (
                  <button key={a} onClick={() => update("gradientAngle", a)}
                    className={`px-2 py-0.5 rounded text-[10px] transition ${bg.gradientAngle === a ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-500 hover:text-indigo-600"}`}>
                    {a}°
                  </button>
                ))}
              </div>
            </div>
          )}

          {bg.gradientType === "radial" && (
            <div>
              <label className="text-slate-500 block mb-1">{isRtl ? "موقع الإضاءة" : "Light Position"}</label>
              <div className="flex gap-1 flex-wrap">
                {RADIAL_POSITIONS.map((p) => (
                  <button key={p.value} onClick={() => update("radialPosition", p.value)}
                    className={`px-2 py-0.5 rounded text-[10px] transition ${(bg.radialPosition || "center") === p.value ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-500 hover:text-indigo-600"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color stops */}
          <div>
            <label className="text-slate-500 block mb-1">{isRtl ? "نقاط اللون" : "Color Stops"}</label>
            {stops.map((stop, idx) => (
              <div key={idx} className="mb-2 bg-[var(--hv-surface-2)] border rounded p-2 space-y-1" style={{ borderColor: "var(--hv-border)" }}>
                <div className="flex items-center gap-1">
                  <input type="color" value={stop.color}
                    onChange={(e) => {
                      const ns = [...stops]; ns[idx] = { ...ns[idx], color: e.target.value };
                      update("gradientStops", ns);
                    }}
                    className="w-7 h-7 rounded cursor-pointer border border-slate-300" />
                  <input type="number" min="0" max="100" value={stop.position}
                    onChange={(e) => {
                      const ns = [...stops]; ns[idx] = { ...ns[idx], position: parseInt(e.target.value) };
                      update("gradientStops", ns);
                    }}
                    className="hv-input w-14 px-1 py-0.5" />
                  <span className="text-slate-500">%</span>
                  {stops.length > 2 && (
                    <button onClick={() => update("gradientStops", stops.filter((_, i) => i !== idx))}
                      className="text-red-400 hover:text-red-300 ms-auto">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button onClick={() => update("gradientStops", [...stops, { color: "#ffffff", position: 100, opacity: 1 }])}
              className="text-indigo-400 hover:text-indigo-300 mt-1">
              + {isRtl ? "نقطة لون" : "Add Stop"}
            </button>
          </div>

          {/* Preset categories — salon/luxury focused */}
          <div className="space-y-4 border-t pt-3" style={{ borderColor: "var(--hv-border)" }}>
            <label className="font-bold text-sm" style={{ color: "var(--hv-text)" }}>{isRtl ? "🎨 خلفيات فاخرة جاهزة" : "🎨 Luxury Presets"}</label>
            {PRESET_CATEGORIES.map((cat) => (
              <div key={cat.label.en}>
                <p className="text-slate-500 text-[11px] font-semibold mb-2">{isRtl ? cat.label.ar : cat.label.en}</p>
                <div className="grid grid-cols-6 gap-1.5">
                  {cat.presets.map((g) => (
                    <button key={g.name} onClick={() => applyPreset(g)}
                      title={g.name}
                      className="h-9 rounded-lg border-2 border-slate-200 hover:border-indigo-500 transition-all hover:scale-110 shadow-md"
                      style={{ background: g.value }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {bg.mode === "svgDesign" && (() => {
        // Migrate old single-layer state to layers array
        const layers = bg.svgLayers && bg.svgLayers.length > 0
          ? bg.svgLayers
          : [{ id: genLayerId(), svgType: bg.svgType || "swoosh", bgColor: bg.bgColor || "#09071f",
               color1: bg.color1 || "#4c1d95", color2: bg.color2 || "#7c3aed",
               size: bg.size ?? 50, position: bg.position ?? 65, angle: bg.angle ?? 0,
               offsetX: 0, offsetY: 0, layerOpacity: 1, blur: bg.blur || 0 }];

        const setLayers = (newLayers) => onChange({ ...bg, svgLayers: newLayers });
        const sel = layers.find(l => l.id === svgSelId) || layers[0] || null;
        const selIdx = layers.findIndex(l => l.id === sel?.id);

        const updateSel = (key, val) => {
          const updated = layers.map(l => l.id === sel.id ? { ...l, [key]: val } : l);
          setLayers(updated);
        };

        const addLayer = () => {
          const nl = makeDefaultLayer("swoosh");
          nl.bgColor = "transparent";
          nl.layerOpacity = 0.85;
          const updated = [...layers, nl];
          setLayers(updated);
          setSvgSelId(nl.id);
        };

        const deleteLayer = (id) => {
          if (layers.length === 1) return;
          const updated = layers.filter(l => l.id !== id);
          setLayers(updated);
          if (svgSelId === id) setSvgSelId(updated[0].id);
        };

        return (
          <div className="space-y-3">
            {/* Layers list */}
            <div className="flex items-center justify-between">
              <p className="font-bold text-sm" style={{ color: "var(--hv-text)" }}>{isRtl ? "🎨 الطبقات الفنية" : "🎨 SVG Layers"}</p>
              <button onClick={addLayer}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition">
                <Plus className="w-3 h-3" />
                {isRtl ? "إضافة" : "Add"}
              </button>
            </div>

            <div className="space-y-1">
              {layers.map((layer, idx) => {
                const typeInfo = SVG_TYPES.find(t => t.id === layer.svgType);
                const prevSvg = generateSvgBackground({ ...layer, uid: `lst${idx}`, transparentBg: false });
                return (
                  <div key={layer.id}
                    onClick={() => setSvgSelId(layer.id)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition border"
                    style={layer.id === sel?.id
                      ? { borderColor: "var(--hv-primary)", background: "rgba(79,70,229,0.08)" }
                      : { borderColor: "var(--hv-border)", background: "var(--hv-surface-2)" }}>
                    <div className="w-8 h-6 bg-slate-100 rounded overflow-hidden relative flex-shrink-0">
                      <div dangerouslySetInnerHTML={{ __html: prevSvg }} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
                    </div>
                    <span className="flex-1 text-slate-600 text-[11px] truncate">
                      {isRtl ? typeInfo?.nameAr : typeInfo?.nameEn} #{idx + 1}
                    </span>
                    {layers.length > 1 && (
                      <button onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }}
                        className="text-red-400 hover:text-red-300 flex-shrink-0">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {sel && (
              <div className="space-y-3 border-t pt-3" style={{ borderColor: "var(--hv-border)" }}>
                <p className="text-slate-500 font-semibold text-[11px]">{isRtl ? "تعديل الطبقة المحددة:" : "Edit Selected Layer:"}</p>

                {/* Shape type grid */}
                <div className="grid grid-cols-5 gap-1.5">
                  {SVG_TYPES.map((type, i) => {
                    const prevSvg = generateSvgBackground({ svgType: type.id, ...SVG_TYPE_DEFAULTS[type.id], uid: `p${i}` });
                    return (
                      <button key={type.id}
                        onClick={() => {
                          const d = SVG_TYPE_DEFAULTS[type.id] || {};
                          const updated = layers.map(l => l.id === sel.id ? { ...l, svgType: type.id, size: d.size, position: d.position, angle: 0 } : l);
                          setLayers(updated);
                        }}
                        className={`flex flex-col items-center gap-1 p-1 rounded-lg border-2 transition ${
                          sel.svgType === type.id ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-400"
                        }`}>
                        <div className="w-full aspect-square bg-slate-100 rounded overflow-hidden relative">
                          <div dangerouslySetInnerHTML={{ __html: prevSvg }} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
                        </div>
                        <span className="text-[9px] text-slate-500 text-center leading-tight">
                          {isRtl ? type.nameAr : type.nameEn}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Background color — only for first layer */}
                {selIdx === 0 && (
                  <StudioColorPicker label={isRtl ? "🖌️ لون الخلفية" : "🖌️ Background"}
                    value={sel.bgColor || "#09071f"}
                    onChange={(v) => updateSel("bgColor", v)} />
                )}
                <StudioColorPicker label={isRtl ? "🎨 اللون الأول" : "🎨 Color 1"}
                  value={sel.color1 || "#4c1d95"}
                  onChange={(v) => updateSel("color1", v)} />
                <StudioColorPicker label={isRtl ? "🎨 اللون الثاني" : "🎨 Color 2"}
                  value={sel.color2 || "#7c3aed"}
                  onChange={(v) => updateSel("color2", v)} />

                {/* Size & shape position */}
                <div>
                  <label className="text-slate-500 block mb-1 text-[11px]">{isRtl ? "الحجم" : "Size"}: {sel.size ?? 50}%</label>
                  <input type="range" min="5" max="95" value={sel.size ?? 50}
                    onChange={(e) => updateSel("size", parseInt(e.target.value))} className="w-full" />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 text-[11px]">{isRtl ? "انتشار الشكل" : "Shape Spread"}: {sel.position ?? 65}%</label>
                  <input type="range" min="0" max="100" value={sel.position ?? 65}
                    onChange={(e) => updateSel("position", parseInt(e.target.value))} className="w-full" />
                </div>

                {/* X / Y offset */}
                <div>
                  <label className="text-slate-500 block mb-1 text-[11px]">{isRtl ? "تحريك أفقي ←→" : "Move X ←→"}: {sel.offsetX ?? 0}%</label>
                  <input type="range" min="-80" max="80" value={sel.offsetX ?? 0}
                    onChange={(e) => updateSel("offsetX", parseInt(e.target.value))} className="w-full" />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 text-[11px]">{isRtl ? "تحريك عمودي ↑↓" : "Move Y ↑↓"}: {sel.offsetY ?? 0}%</label>
                  <input type="range" min="-80" max="80" value={sel.offsetY ?? 0}
                    onChange={(e) => updateSel("offsetY", parseInt(e.target.value))} className="w-full" />
                </div>

                {/* Rotation */}
                <div>
                  <label className="text-slate-500 block mb-1 text-[11px]">{isRtl ? "الدوران" : "Rotation"}: {sel.angle ?? 0}°</label>
                  <input type="range" min="-180" max="180" value={sel.angle ?? 0}
                    onChange={(e) => updateSel("angle", parseInt(e.target.value))} className="w-full" />
                </div>

                {/* Opacity (only for additional layers) */}
                {selIdx > 0 && (
                  <div>
                    <label className="text-slate-500 block mb-1 text-[11px]">{isRtl ? "الشفافية" : "Opacity"}: {Math.round((sel.layerOpacity ?? 1) * 100)}%</label>
                    <input type="range" min="0" max="1" step="0.05" value={sel.layerOpacity ?? 1}
                      onChange={(e) => updateSel("layerOpacity", parseFloat(e.target.value))} className="w-full" />
                  </div>
                )}

                {/* Blur */}
                <div>
                  <label className="text-amber-600 font-semibold block mb-1 text-[11px]">{isRtl ? "🌫️ تغبيش" : "🌫️ Blur"}: {sel.blur || 0}px</label>
                  <input type="range" min="0" max="40" value={sel.blur || 0}
                    onChange={(e) => updateSel("blur", parseInt(e.target.value))} className="w-full" />
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {bg.mode === "image" && (
        <div className="space-y-3">
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-50">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isRtl ? "رفع صورة" : "Upload Image"}
          </button>
          <input ref={fileRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={handleImageUpload} />

          {bg.imageUrl && (
            <div className="relative">
              <img src={bg.imageUrl} alt="" className="w-full h-20 object-cover rounded border border-slate-200" />
              <button onClick={() => update("imageUrl", null)}
                className="absolute top-1 right-1 bg-red-600 rounded p-0.5 text-white hover:bg-red-500">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}

          <div>
            <label className="text-slate-500 block mb-1">{isRtl ? "شفافية الصورة" : "Image Opacity"}</label>
            <input type="range" min="0" max="1" step="0.05" value={bg.imageOpacity ?? 1}
              onChange={(e) => update("imageOpacity", parseFloat(e.target.value))} className="w-full" />
          </div>

          <div className="border-t pt-3" style={{ borderColor: "var(--hv-border)" }}>
            <label className="text-slate-500 block mb-1">{isRtl ? "توليد بالذكاء الاصطناعي" : "Generate with AI"}</label>
            <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={2}
              className="hv-input w-full p-2 text-xs resize-none"
              placeholder={isRtl ? "صف الخلفية المطلوبة..." : "Describe the background..."} />
            <button onClick={() => alert("هذه الميزة غير متاحة في النسخة المحلية")} disabled={!aiPrompt.trim()}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold transition disabled:opacity-50">
              <Wand2 className="w-4 h-4" />
              {isRtl ? "ولّد" : "Generate"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
