import React, { useRef, useState } from "react";
import { Upload, Trash2, Loader2, Wand2 } from "lucide-react";
import { uploadFile } from "@/api/localClient";
import StudioColorPicker from "../StudioColorPicker";

const PRESET_CATEGORIES = [
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

  const update = (key, val) => onChange({ ...bg, [key]: val });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await uploadFile({ file });
    onChange({ ...bg, imageUrl: file_url, mode: "image" });
    setUploading(false);
    e.target.value = "";
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
      <div className="flex rounded-lg overflow-hidden border border-slate-600">
        {[
          { id: "color", labelAr: "لون", labelEn: "Color" },
          { id: "gradient", labelAr: "تدرج", labelEn: "Gradient" },
          { id: "image", labelAr: "صورة", labelEn: "Image" },
        ].map((m) => (
          <button key={m.id} onClick={() => update("mode", m.id)}
            className={`flex-1 py-1.5 text-xs font-semibold transition ${bg.mode === m.id ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-400 hover:text-white"}`}>
            {isRtl ? m.labelAr : m.labelEn}
          </button>
        ))}
      </div>

      {bg.mode === "color" && (
        <div className="space-y-3">
          <StudioColorPicker label={isRtl ? "لون الخلفية" : "Background Color"} value={bg.color} onChange={(v) => update("color", v)} />
          <div>
            <label className="text-slate-400 block mb-1">{isRtl ? "شفافية" : "Opacity"}: {Math.round((bg.opacity ?? 1) * 100)}%</label>
            <input type="range" min="0" max="1" step="0.05" value={bg.opacity ?? 1}
              onChange={(e) => update("opacity", parseFloat(e.target.value))} className="w-full" />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">{isRtl ? "🌫️ تغبيش" : "🌫️ Blur"}: {bg.blur || 0}px</label>
            <input type="range" min="0" max="40" value={bg.blur || 0}
              onChange={(e) => update("blur", parseInt(e.target.value))} className="w-full" />
          </div>
        </div>
      )}

      {bg.mode === "gradient" && (
        <div className="space-y-3">
          {/* Preview */}
          <div
            className="h-16 rounded-xl border border-slate-600 shadow-inner"
            style={{
              background: buildGradientPreview(),
              filter: bg.blur ? `blur(${bg.blur}px)` : undefined,
            }}
          />

          {/* Blur / Frosted Glass */}
          <div className="bg-slate-800 rounded-lg p-2 border border-slate-600">
            <label className="text-yellow-400 font-semibold block mb-1">
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
                className={`flex-1 py-1 rounded text-[11px] font-semibold transition ${(bg.gradientType || "linear") === t.id ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-400 hover:text-white"}`}>
                {isRtl ? t.labelAr : t.labelEn}
              </button>
            ))}
          </div>

          {(bg.gradientType || "linear") === "linear" && (
            <div>
              <label className="text-slate-400 block mb-1">{isRtl ? "الزاوية" : "Angle"}: {bg.gradientAngle || 135}°</label>
              <input type="range" min="0" max="360" step="5" value={bg.gradientAngle || 135}
                onChange={(e) => update("gradientAngle", parseInt(e.target.value))} className="w-full mb-2" />
              <div className="flex gap-1 flex-wrap">
                {GRADIENT_ANGLES.map((a) => (
                  <button key={a} onClick={() => update("gradientAngle", a)}
                    className={`px-2 py-0.5 rounded text-[10px] transition ${bg.gradientAngle === a ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-400 hover:text-white"}`}>
                    {a}°
                  </button>
                ))}
              </div>
            </div>
          )}

          {bg.gradientType === "radial" && (
            <div>
              <label className="text-slate-400 block mb-1">{isRtl ? "موقع الإضاءة" : "Light Position"}</label>
              <div className="flex gap-1 flex-wrap">
                {RADIAL_POSITIONS.map((p) => (
                  <button key={p.value} onClick={() => update("radialPosition", p.value)}
                    className={`px-2 py-0.5 rounded text-[10px] transition ${(bg.radialPosition || "center") === p.value ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-400 hover:text-white"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color stops */}
          <div>
            <label className="text-slate-400 block mb-1">{isRtl ? "نقاط اللون" : "Color Stops"}</label>
            {stops.map((stop, idx) => (
              <div key={idx} className="mb-2 bg-slate-700/50 rounded p-2 space-y-1">
                <div className="flex items-center gap-1">
                  <input type="color" value={stop.color}
                    onChange={(e) => {
                      const ns = [...stops]; ns[idx] = { ...ns[idx], color: e.target.value };
                      update("gradientStops", ns);
                    }}
                    className="w-7 h-7 rounded cursor-pointer border border-slate-600" />
                  <input type="number" min="0" max="100" value={stop.position}
                    onChange={(e) => {
                      const ns = [...stops]; ns[idx] = { ...ns[idx], position: parseInt(e.target.value) };
                      update("gradientStops", ns);
                    }}
                    className="w-14 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-white" />
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
          <div className="space-y-4 border-t border-slate-700 pt-3">
            <label className="text-slate-200 font-bold text-sm">{isRtl ? "🎨 خلفيات فاخرة جاهزة" : "🎨 Luxury Presets"}</label>
            {PRESET_CATEGORIES.map((cat) => (
              <div key={cat.label.en}>
                <p className="text-slate-400 text-[11px] font-semibold mb-2">{isRtl ? cat.label.ar : cat.label.en}</p>
                <div className="grid grid-cols-6 gap-1.5">
                  {cat.presets.map((g) => (
                    <button key={g.name} onClick={() => applyPreset(g)}
                      title={g.name}
                      className="h-9 rounded-lg border-2 border-slate-700 hover:border-yellow-400 transition-all hover:scale-110 shadow-md"
                      style={{ background: g.value }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {bg.mode === "image" && (
        <div className="space-y-3">
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-50">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isRtl ? "رفع صورة" : "Upload Image"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

          {bg.imageUrl && (
            <div className="relative">
              <img src={bg.imageUrl} alt="" className="w-full h-20 object-cover rounded border border-slate-600" />
              <button onClick={() => update("imageUrl", null)}
                className="absolute top-1 right-1 bg-red-600 rounded p-0.5 text-white hover:bg-red-500">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}

          <div>
            <label className="text-slate-400 block mb-1">{isRtl ? "شفافية الصورة" : "Image Opacity"}</label>
            <input type="range" min="0" max="1" step="0.05" value={bg.imageOpacity ?? 1}
              onChange={(e) => update("imageOpacity", parseFloat(e.target.value))} className="w-full" />
          </div>

          <div className="border-t border-slate-700 pt-3">
            <label className="text-slate-400 block mb-1">{isRtl ? "توليد بالذكاء الاصطناعي" : "Generate with AI"}</label>
            <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={2}
              className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white text-xs resize-none"
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
