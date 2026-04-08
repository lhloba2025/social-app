import React, { useRef, useState } from "react";
import { Upload, Trash2, Loader2, Wand2 } from "lucide-react";
import { uploadFile } from "@/api/localClient";
import StudioColorPicker from "../StudioColorPicker";

const PRESET_GRADIENTS = [
  { name: "Purple", value: "linear-gradient(135deg, #667eea, #764ba2)" },
  { name: "Pink", value: "linear-gradient(135deg, #f093fb, #f5576c)" },
  { name: "Gold", value: "linear-gradient(135deg, #f6d365, #fda085)" },
  { name: "Green", value: "linear-gradient(135deg, #4facfe, #00f2fe)" },
  { name: "Blue", value: "linear-gradient(135deg, #43e97b, #38f9d7)" },
  { name: "Slate", value: "linear-gradient(135deg, #868f96, #596164)" },
  { name: "Orange", value: "linear-gradient(135deg, #fa709a, #fee140)" },
  { name: "Cyan", value: "linear-gradient(135deg, #a1c4fd, #c2e9fb)" },
];

const GRADIENT_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

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

  const buildGradient = () => {
    const stopsStr = stops.map((s) => `${s.color}${Math.round((s.opacity ?? 1) * 255).toString(16).padStart(2, "0")} ${s.position}%`).join(", ");
    return `linear-gradient(${bg.gradientAngle || 135}deg, ${stopsStr})`;
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
            <label className="text-slate-400 block mb-1">{isRtl ? "🌫️ Blur" : "🌫️ Blur"}px</label>
            <input type="range" min="0" max="30" value={bg.blur || 0}
              onChange={(e) => update("blur", parseInt(e.target.value))} className="w-full" />
          </div>
        </div>
      )}

      {bg.mode === "gradient" && (
        <div className="space-y-3">
          <div
            className="h-12 rounded-lg border border-slate-600"
            style={{ background: buildGradient() }}
          />
          <div>
            <label className="text-slate-400 block mb-1">{isRtl ? "الزاوية" : "Angle"}: {bg.gradientAngle || 135}°</label>
            <input
              type="range" min="0" max="360" step="5"
              value={bg.gradientAngle || 135}
              onChange={(e) => update("gradientAngle", parseInt(e.target.value))}
              className="w-full mb-2"
            />
            <div className="flex gap-1 flex-wrap">
              {GRADIENT_ANGLES.map((a) => (
                <button key={a} onClick={() => update("gradientAngle", a)}
                  className={`px-2 py-0.5 rounded text-[10px] transition ${bg.gradientAngle === a ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-400 hover:text-white"}`}>
                  {a}°
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">{isRtl ? "نقاط اللون" : "Color Stops"}</label>
            {stops.map((stop, idx) => (
              <div key={idx} className="mb-2 bg-slate-700/50 rounded p-2 space-y-1">
                <div className="flex items-center gap-1">
                  <input type="color" value={stop.color}
                    onChange={(e) => {
                      const ns = [...stops];
                      ns[idx] = { ...ns[idx], color: e.target.value };
                      update("gradientStops", ns);
                    }}
                    className="w-7 h-7 rounded cursor-pointer border border-slate-600"
                  />
                  <input type="number" min="0" max="100" value={stop.position}
                    onChange={(e) => {
                      const ns = [...stops];
                      ns[idx] = { ...ns[idx], position: parseInt(e.target.value) };
                      update("gradientStops", ns);
                    }}
                    className="w-14 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-white"
                  />
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
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={stop.opacity ?? 1}
                    onChange={(e) => {
                      const ns = [...stops];
                      ns[idx] = { ...ns[idx], opacity: parseFloat(e.target.value) };
                      update("gradientStops", ns);
                    }}
                    className="flex-1"
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() => update("gradientStops", [...stops, { color: "#ffffff", position: 100, opacity: 1 }])}
              className="text-indigo-400 hover:text-indigo-300 mt-1"
            >+ {isRtl ? "نقطة" : "Stop"}</button>
          </div>

          <div>
            <label className="text-slate-400 block mb-2">{isRtl ? "تدرجات جاهزة" : "Preset Gradients"}</label>
            <div className="grid grid-cols-4 gap-1">
              {PRESET_GRADIENTS.map((g) => (
                <button
                  key={g.name}
                  onClick={() => onChange({ ...bg, gradientPreset: g.value, mode: "gradient", gradientStops: null })}
                  className="h-8 rounded border border-slate-600 hover:border-indigo-400 transition"
                  style={{ background: g.value }}
                  title={g.name}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {bg.mode === "image" && (
        <div className="space-y-3">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isRtl ? "رفع صورة" : "Upload Image"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

          {bg.imageUrl && (
            <div className="relative">
              <img src={bg.imageUrl} alt="" className="w-full h-20 object-cover rounded border border-slate-600" />
              <button
                onClick={() => update("imageUrl", null)}
                className="absolute top-1 right-1 bg-red-600 rounded p-0.5 text-white hover:bg-red-500"
              >
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
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={2}
              className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white text-xs resize-none"
              placeholder={isRtl ? "صف الخلفية المطلوبة..." : "Describe the background..."}
            />
            <button
              onClick={handleAiGenerate}
              disabled={aiLoading || !aiPrompt.trim()}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold transition disabled:opacity-50"
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {isRtl ? "ولّد" : "Generate"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}