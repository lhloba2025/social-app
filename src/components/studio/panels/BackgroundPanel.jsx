import React, { useRef, useState } from "react";
import { Upload, Trash2, Loader2, Wand2 } from "lucide-react";
import { uploadFile } from "@/api/localClient";
import StudioColorPicker from "../StudioColorPicker";

const PRESET_CATEGORIES = [
  {
    label: { ar: "🌑 فاخرة داكنة", en: "🌑 Dark Luxury" },
    presets: [
      { name: "Deep Galaxy", value: "linear-gradient(135deg, #0d0221, #1a0533, #2d1b69)" },
      { name: "Midnight Navy", value: "linear-gradient(135deg, #000428, #004e92)" },
      { name: "Dark Velvet", value: "linear-gradient(135deg, #2c1654, #1a0533)" },
      { name: "Onyx Black", value: "linear-gradient(135deg, #0a0a0a, #1a1a1a, #2d2d2d)" },
      { name: "Deep Crimson", value: "linear-gradient(135deg, #3b0a14, #6b0f1a, #3b0a14)" },
      { name: "Dark Teal", value: "linear-gradient(135deg, #0a1628, #0d2137, #0f3460)" },
    ],
  },
  {
    label: { ar: "✨ ذهبية فاخرة", en: "✨ Gold & Luxury" },
    presets: [
      { name: "Pure Gold", value: "linear-gradient(135deg, #b8860b, #ffd700, #b8860b)" },
      { name: "Rose Gold", value: "linear-gradient(135deg, #b76e79, #e8b4bc, #c9a227)" },
      { name: "Dark Gold", value: "linear-gradient(135deg, #0d0221 0%, #c9a227 100%)" },
      { name: "Night Gold", value: "linear-gradient(135deg, #1a1a2e 0%, #c9a227 50%, #1a1a2e 100%)" },
      { name: "Champagne", value: "linear-gradient(135deg, #f5e6a3, #c9a227, #f5e6a3)" },
      { name: "Emerald Gold", value: "linear-gradient(135deg, #134e5e, #71b280 50%, #c9a227)" },
    ],
  },
  {
    label: { ar: "🎨 عصرية جريئة", en: "🎨 Bold & Modern" },
    presets: [
      { name: "Instagram", value: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)" },
      { name: "Aurora", value: "linear-gradient(135deg, #00d2ff, #3a7bd5)" },
      { name: "Purple Haze", value: "linear-gradient(135deg, #c471ed, #f64f59)" },
      { name: "Ocean Depth", value: "linear-gradient(135deg, #005c97, #363795)" },
      { name: "Neon Magenta", value: "linear-gradient(135deg, #f953c6, #b91d73)" },
      { name: "Electric Blue", value: "linear-gradient(135deg, #0575e6, #021b79)" },
    ],
  },
  {
    label: { ar: "🌿 طبيعية هادئة", en: "🌿 Nature & Calm" },
    presets: [
      { name: "Blush", value: "linear-gradient(135deg, #fbc2eb, #a6c1ee)" },
      { name: "Lavender", value: "linear-gradient(135deg, #e0c3fc, #8ec5fc)" },
      { name: "Peach Soft", value: "linear-gradient(135deg, #ffecd2, #fcb69f)" },
      { name: "Fresh Mint", value: "linear-gradient(135deg, #d4fc79, #96e6a1)" },
      { name: "Sky Blue", value: "linear-gradient(135deg, #e0eafc, #cfdef3)" },
      { name: "Forest Deep", value: "linear-gradient(135deg, #134e5e, #71b280)" },
    ],
  },
  {
    label: { ar: "🔥 نارية", en: "🔥 Warm & Fire" },
    presets: [
      { name: "Sunset", value: "linear-gradient(135deg, #f7971e, #ffd200)" },
      { name: "Fire", value: "linear-gradient(135deg, #f12711, #f5af19)" },
      { name: "Hot Summer", value: "linear-gradient(135deg, #ee0979, #ff6a00)" },
      { name: "Desert", value: "linear-gradient(135deg, #f5af19, #f12711)" },
      { name: "Gold Orange", value: "linear-gradient(135deg, #fa709a, #fee140)" },
      { name: "Mango", value: "linear-gradient(135deg, #f093fb, #f5576c)" },
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

  const handleAiGenerate = () => {
    alert("هذه الميزة غير متاحة في النسخة المحلية");
  };

  const stops = bg.gradientStops || [{ color: "#667eea", position: 0, opacity: 1 }, { color: "#764ba2", position: 100, opacity: 1 }];

  const buildGradientPreview = () => {
    if (bg.gradientPreset && !bg.gradientStops) return bg.gradientPreset;
    const stopsStr = stops.map((s) => `${s.color} ${s.position}%`).join(", ");
    if (bg.gradientType === "radial") return `radial-gradient(circle at ${bg.radialPosition || "center"}, ${stopsStr})`;
    return `linear-gradient(${bg.gradientAngle || 135}deg, ${stopsStr})`;
  };

  const applyPreset = (preset) => {
    onChange({ ...bg, gradientPreset: preset.value, mode: "gradient", gradientStops: null, gradientType: "linear" });
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
          <button
            key={m.id}
            onClick={() => update("mode", m.id)}
            className={`flex-1 py-1.5 text-xs font-semibold transition ${bg.mode === m.id ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-400 hover:text-white"}`}
          >
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
            <label className="text-slate-400 block mb-1">{isRtl ? "🌫️ ضبابية" : "🌫️ Blur"} px</label>
            <input type="range" min="0" max="30" value={bg.blur || 0}
              onChange={(e) => update("blur", parseInt(e.target.value))} className="w-full" />
          </div>
        </div>
      )}

      {bg.mode === "gradient" && (
        <div className="space-y-3">
          {/* Preview */}
          <div className="h-14 rounded-xl border border-slate-600 shadow-inner" style={{ background: buildGradientPreview() }} />

          {/* Gradient type toggle */}
          <div className="flex gap-1">
            {[
              { id: "linear", labelAr: "خطي", labelEn: "Linear" },
              { id: "radial", labelAr: "دائري", labelEn: "Radial" },
            ].map((t) => (
              <button key={t.id} onClick={() => update("gradientType", t.id)}
                className={`flex-1 py-1 rounded text-[11px] font-semibold transition ${(bg.gradientType || "linear") === t.id ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-400 hover:text-white"}`}>
                {isRtl ? t.labelAr : t.labelEn}
              </button>
            ))}
          </div>

          {/* Linear angle */}
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

          {/* Radial position */}
          {bg.gradientType === "radial" && (
            <div>
              <label className="text-slate-400 block mb-1">{isRtl ? "مركز التدرج" : "Radial Center"}</label>
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
                <div className="flex items-center gap-2">
                  <label className="text-slate-400 text-[10px] whitespace-nowrap">{isRtl ? "شفافية" : "Opacity"}: {Math.round((stop.opacity ?? 1) * 100)}%</label>
                  <input type="range" min="0" max="1" step="0.05" value={stop.opacity ?? 1}
                    onChange={(e) => {
                      const ns = [...stops]; ns[idx] = { ...ns[idx], opacity: parseFloat(e.target.value) };
                      update("gradientStops", ns);
                    }} className="flex-1" />
                </div>
              </div>
            ))}
            <button onClick={() => update("gradientStops", [...stops, { color: "#ffffff", position: 100, opacity: 1 }])}
              className="text-indigo-400 hover:text-indigo-300 mt-1">
              + {isRtl ? "نقطة لون" : "Add Stop"}
            </button>
          </div>

          {/* Preset categories */}
          <div className="space-y-3 border-t border-slate-700 pt-3">
            <label className="text-slate-300 font-semibold">{isRtl ? "تدرجات جاهزة" : "Preset Gradients"}</label>
            {PRESET_CATEGORIES.map((cat) => (
              <div key={cat.label.en}>
                <p className="text-slate-500 text-[10px] mb-1.5">{isRtl ? cat.label.ar : cat.label.en}</p>
                <div className="grid grid-cols-6 gap-1">
                  {cat.presets.map((g) => (
                    <button key={g.name} onClick={() => applyPreset(g)}
                      className="h-8 rounded-lg border-2 border-slate-600 hover:border-indigo-400 transition hover:scale-105"
                      style={{ background: g.value }} title={g.name} />
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
            <label className="text-slate-400 block mb-1">{isRtl ? "توليد خلفية بالذكاء الاصطناعي" : "Generate with AI"}</label>
            <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={2}
              className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white text-xs resize-none"
              placeholder={isRtl ? "صف الخلفية المطلوبة..." : "Describe the background..."} />
            <button onClick={handleAiGenerate} disabled={aiLoading || !aiPrompt.trim()}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold transition disabled:opacity-50">
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {isRtl ? "ولّد" : "Generate"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
