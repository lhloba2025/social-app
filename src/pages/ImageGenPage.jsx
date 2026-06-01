import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2, ImagePlus, Download, Check, RefreshCw, Upload, X } from "lucide-react";
import { uploadFile } from "@/api/localClient";
import { addLocalMedia } from "@/utils/localMediaStore";
import { shrinkBlobToLimit } from "@/utils/imageConvert";

// AI image generator — turns an idea + hook into a branded Hovera image using
// the in-app Google "Nano Banana" endpoint, then drops it straight into the
// media library ready to schedule. No external tool, no copy-paste.

const LOGO_KEY = "hovera_brand_logo_v1"; // remembered reference logo (data URL)

const ASPECTS = [
  { id: "4:5",  ar: "منشور 4:5 (1080×1350)", en: "Post 4:5" },
  { id: "1:1",  ar: "مربع 1:1 (1080×1080)",  en: "Square 1:1" },
  { id: "9:16", ar: "ستوري 9:16",            en: "Story 9:16" },
];

// Brand prompt template — bakes in the proven Hovera rules so the user only
// supplies the scene + hook. Mirrors the prompt that already works in Lovart.
function buildPrompt({ scene, hook, highlight, aspect }) {
  return `${scene.trim()}

LOGO PLACEMENT (mandatory): Use the ATTACHED Hovera logo PNG as reference and place it at the TOP-CENTER, ~10-12% of image width. PRESERVE LOGO STRUCTURE: vertical stacked — the lowercase "h" symbol (three small dots above + flowing droplet curve) on TOP, the Arabic word "هوفيرا" directly BELOW it. Do NOT separate or place parts side-by-side. Treat the PNG as a sticker placed as-is, do not redraw it. Keep the logo's natural Navy→Royal→Pink gradient.

ARABIC TEXT ACCURACY (critical): render ALL Arabic text with PERFECT, correctly-spelled, properly-connected right-to-left letters. Real, readable Arabic — never fake/garbled/disconnected glyphs. Keep every word complete. Use a modern geometric Arabic sans-serif (Tajawal / Cairo style), even monoline strokes, rounded open terminals, Bold, sharp and legible.

${hook && hook.trim() ? `HOOK TEXT overlay BELOW the logo, right-aligned, large, Tajawal/Cairo Bold: render the COMPLETE phrase "${hook.trim()}" (no word omitted), on one or two balanced lines.${highlight && highlight.trim() ? ` Color the word "${highlight.trim()}" in #EF43DC (pink); render every other word in #09007C (navy).` : " Use #09007C (navy) for the text."}` : "No text overlay besides the logo."}

STRICT COLOR LOCK: only #09007C (navy), #2E14ED (royal), #EF43DC (pink), white, cream. No yellows, greens, or other purples/pinks. Aspect ratio ${aspect}. Photorealistic. No human faces.

Negative: white logo on light background, logo losing its gradient, distorted logo, redrawn logo, horizontal logo layout, separated logo parts, h symbol next to Arabic text, multiple logos, missing words in hook, incomplete Arabic phrase, dropped word, broken Arabic, garbled letters, blurry, low quality, watermark, cluttered scene, real brand logos, exclamation marks.`;
}

async function dataUrlToBlob(dataUrl) {
  const r = await fetch(dataUrl);
  return r.blob();
}

export default function ImageGenPage({ language }) {
  const ar = (language || localStorage.getItem("appLanguage") || "ar") === "ar";
  const navigate = useNavigate();

  const [scene, setScene] = useState("");
  const [hook, setHook] = useState("");
  const [highlight, setHighlight] = useState("");
  const [aspect, setAspect] = useState("4:5");
  const [logo, setLogo] = useState(() => localStorage.getItem(LOGO_KEY) || "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");   // data URL of generated image
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Persist the chosen reference logo so the user sets it once.
  useEffect(() => {
    try { if (logo) localStorage.setItem(LOGO_KEY, logo); } catch { /* quota */ }
  }, [logo]);

  const onPickLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!scene.trim()) { setError(ar ? "اكتب فكرة المشهد أولاً." : "Describe the scene first."); return; }
    setError(""); setSaved(false); setResult(""); setLoading(true);
    try {
      const prompt = buildPrompt({ scene, hook, highlight, aspect });
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, referenceImage: logo || undefined, aspectRatio: aspect }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.error || `HTTP ${res.status}`);
      setResult(data.dataUrl);
    } catch (e) {
      setError((ar ? "تعذّر التوليد: " : "Generation failed: ") + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true); setError("");
    try {
      const blob = await dataUrlToBlob(result);
      const shrunk = await shrinkBlobToLimit(blob, { maxBytes: 9_500_000 });
      const file = new File([shrunk], `ai_${Date.now()}.png`, { type: shrunk.type || "image/png" });
      const { url } = await uploadFile({ file });
      addLocalMedia({
        url,
        name: (hook && hook.trim()) ? hook.trim().slice(0, 40) : (scene.trim().slice(0, 40) || "AI image"),
        platform: "instagram",
        post_id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        caption_title: hook?.trim() || "",
        caption_text: "",
        position: 0,
        type: "image",
      });
      setSaved(true);
    } catch (e) {
      setError((ar ? "تعذّر الحفظ: " : "Save failed: ") + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-fuchsia-400" />
          {ar ? "توليد صورة بالذكاء" : "AI Image Generator"}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {ar ? "اكتب الفكرة → تطلع الصورة جاهزة في مكتبتك للجدولة." : "Describe it → get a ready image in your library."}
        </p>
      </div>

      <div className="p-6 grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {/* ── Left: form ─────────────────────────────────────────── */}
        <div className="space-y-4">
          <div>
            <label className="text-[12px] font-bold text-slate-300 block mb-1.5">
              {ar ? "فكرة المشهد / الوصف" : "Scene / description"}
            </label>
            <textarea
              value={scene}
              onChange={(e) => setScene(e.target.value)}
              rows={4}
              placeholder={ar
                ? "مثال: هاتف على رخام كريمي يعرض تطبيق حجز مواعيد أنيق، وردة وردية ناعمة في الخلفية، إضاءة دافئة."
                : "e.g. A phone on cream marble showing an elegant booking app, a soft pink rose blurred behind, warm light."}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>

          <div>
            <label className="text-[12px] font-bold text-slate-300 block mb-1.5">
              {ar ? "نص الهوك (العنوان على الصورة)" : "Hook text (headline)"}
            </label>
            <input
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              placeholder={ar ? "مثال: أديري صالونك كله من مكان واحد" : "e.g. Run your salon from one place"}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-[12px] font-bold text-slate-300 block mb-1.5">
              {ar ? "الكلمة المميزة (وردي) — اختياري" : "Highlight word (pink) — optional"}
            </label>
            <input
              value={highlight}
              onChange={(e) => setHighlight(e.target.value)}
              placeholder={ar ? "مثال: صالونك" : "e.g. salon"}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-[12px] font-bold text-slate-300 block mb-1.5">
              {ar ? "المقاس" : "Size"}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {ASPECTS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAspect(a.id)}
                  className={`py-2 rounded-lg text-[11px] font-bold transition ${
                    aspect === a.id ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {ar ? a.ar : a.en}
                </button>
              ))}
            </div>
          </div>

          {/* Reference logo */}
          <div>
            <label className="text-[12px] font-bold text-slate-300 block mb-1.5">
              {ar ? "شعار هوفيرا (مرجع للصورة)" : "Hovera logo (reference)"}
            </label>
            {logo ? (
              <div className="flex items-center gap-3 bg-slate-800/60 rounded-lg p-2">
                <img src={logo} alt="logo" className="w-12 h-12 object-contain rounded bg-white/5" />
                <span className="text-[11px] text-emerald-300 flex-1">{ar ? "الشعار محفوظ ويُستخدم تلقائياً" : "Logo saved & auto-used"}</span>
                <button onClick={() => { setLogo(""); try { localStorage.removeItem(LOGO_KEY); } catch {} }} className="text-slate-400 hover:text-red-300 p-1" title={ar ? "إزالة" : "Remove"}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-600 rounded-lg py-3 cursor-pointer text-[12px] text-slate-300">
                <Upload className="w-4 h-4" />
                {ar ? "ارفع شعار هوفيرا (PNG) — مرة وحدة" : "Upload Hovera logo (PNG) — once"}
                <input type="file" accept="image/png,image/*" className="hidden" onChange={onPickLogo} />
              </label>
            )}
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-500/40 rounded-lg px-3 py-2 text-[12px] text-red-200 leading-relaxed">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading || !scene.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? (ar ? "جارٍ التوليد… (10-30 ثانية)" : "Generating…") : (ar ? "ولّد الصورة" : "Generate")}
          </button>
        </div>

        {/* ── Right: result ──────────────────────────────────────── */}
        <div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 min-h-[300px] flex items-center justify-center">
            {loading ? (
              <div className="text-center text-slate-500">
                <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-indigo-400" />
                <p className="text-sm">{ar ? "يرسم صورتك…" : "Drawing your image…"}</p>
              </div>
            ) : result ? (
              <div className="w-full">
                <img src={result} alt="generated" className="w-full rounded-lg" />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleSave}
                    disabled={saving || saved}
                    className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 ${
                      saved ? "bg-emerald-600 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white"
                    } disabled:opacity-60`}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <ImagePlus className="w-4 h-4" />}
                    {saved ? (ar ? "تم الحفظ في المكتبة" : "Saved to library") : (ar ? "احفظ في المكتبة" : "Save to library")}
                  </button>
                  <a
                    href={result}
                    download={`hovera_${Date.now()}.png`}
                    className="px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center"
                    title={ar ? "تنزيل" : "Download"}
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center"
                    title={ar ? "ولّد غيرها" : "Regenerate"}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                {saved && (
                  <button
                    onClick={() => navigate("/DesignLibraryPage")}
                    className="w-full mt-2 text-[12px] text-indigo-300 hover:text-indigo-200 underline"
                  >
                    {ar ? "اذهب للمكتبة للجدولة ←" : "Go to library to schedule →"}
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center text-slate-600">
                <ImagePlus className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{ar ? "الصورة بتظهر هنا" : "Your image appears here"}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
