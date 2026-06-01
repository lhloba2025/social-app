import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2, ImagePlus, Download, Check, RefreshCw, Upload, X, Palette } from "lucide-react";
import { uploadFile } from "@/api/localClient";
import { addLocalMedia } from "@/utils/localMediaStore";
import { shrinkBlobToLimit } from "@/utils/imageConvert";

// AI image generator — turns an idea + hook into a BRANDED image using the
// in-app Google "Nano Banana" endpoint, then drops it straight into the media
// library ready to schedule. Brand identity (logo, colors, font) is fully
// configurable + remembered, so every client uses their OWN brand — nothing
// is hard-coded.

const LOGO_KEY = "brand_logo_v1";       // remembered reference logo (data URL)
const KIT_KEY  = "brand_kit_v1";        // remembered colors/font/logoColor

const ASPECTS = [
  { id: "4:5",  ar: "منشور 4:5",      en: "Post 4:5" },
  { id: "1:1",  ar: "مربع 1:1",       en: "Square 1:1" },
  { id: "9:16", ar: "ستوري/ريلز 9:16", en: "Story 9:16" },
  { id: "16:9", ar: "عريض 16:9",      en: "Wide 16:9" },
  { id: "3:4",  ar: "عمودي 3:4",      en: "Portrait 3:4" },
  { id: "4:3",  ar: "أفقي 4:3",       en: "Landscape 4:3" },
];

// Arabic font choices. AI image models have no real font files, so we hand
// them a STYLE DESCRIPTION (`s`) instead of a font name — that actually shifts
// the look (Ruqaa vs Kufic vs sans). For an EXACT font, use the Design Studio.
const FONTS = [
  { v: "Tajawal",     ar: "تجوال (حديث)",        s: "a modern geometric Arabic sans-serif with even, rounded monoline strokes" },
  { v: "Cairo",       ar: "القاهرة (حديث)",      s: "a clean contemporary Arabic sans-serif" },
  { v: "Almarai",     ar: "المراعي (بسيط)",      s: "a simple, minimal Arabic sans-serif" },
  { v: "Reem Kufi",   ar: "ريم كوفي (كوفي عصري)", s: "a modern geometric Kufic Arabic style with angular, structured letters" },
  { v: "Changa",      ar: "تشانجا (هندسي)",      s: "a bold geometric Arabic display style" },
  { v: "Lalezar",     ar: "لاله‌زار (عريض)",      s: "a thick, bold, rounded Arabic display style" },
  { v: "El Messiri",  ar: "المسيري (أنيق)",      s: "an elegant, semi-rounded modern Arabic style" },
  { v: "Aref Ruqaa",  ar: "عارف رقعة (رقعة)",     s: "traditional Arabic Ruqaa calligraphy — flowing, handwritten cursive" },
  { v: "Amiri",       ar: "أميري (نسخ كلاسيكي)",  s: "classical Arabic Naskh calligraphy — traditional and refined" },
];
const fontStyle = (v) => (FONTS.find((f) => f.v === v)?.s) || "a modern geometric Arabic sans-serif";

const DEFAULT_KIT = {
  mainColor: "#09007C",      // primary text colour
  highlightColor: "#EF43DC", // highlighted-word colour
  font: "Tajawal",
  changeLogoColor: false,
  logoColor: "#09007C",
};

// Build the image prompt from the user's brand kit + this post's content.
// Brand-agnostic: no hard-coded name/colours.
function buildPrompt({ scene, hook, highlight, aspect, kit, bgOnly }) {
  const { mainColor, highlightColor, font, changeLogoColor, logoColor } = kit;
  // Highlight can be several words/phrases, separated by Arabic or Latin commas.
  const hl = (highlight || "").split(/[,،]/).map((s) => s.trim()).filter(Boolean);
  const hlList = hl.map((h) => `"${h}"`).join(", ");

  // Background-only mode: a clean scene with deliberate empty space, NO text or
  // logo — the user adds those as fully-editable layers in the Design Studio.
  if (bgOnly) {
    return `${scene.trim()}

COLOR & STYLE: a clean, premium, uncluttered composition with a light / cream base and a harmonious palette built around ${mainColor} and ${highlightColor}. Leave generous EMPTY NEGATIVE SPACE (especially the top-center and the middle) so a logo and a headline can be placed on top afterward. Photorealistic. Aspect ratio ${aspect}.

Negative: any text, any words, any letters, any logo, any watermark, human faces, clutter, blur, low quality.`;
  }

  return `${scene.trim()}

LOGO PLACEMENT (mandatory): Use the ATTACHED logo PNG as reference and place it at the TOP-CENTER, about 10-12% of the image width. Place the logo DIRECTLY on the scene with a fully transparent background — NO white box, NO circle, NO frame, NO border, NO badge, NO card or container behind it. Do NOT redraw, distort, rearrange, or duplicate it. ${changeLogoColor ? `Recolor the logo to ${logoColor}.` : "Preserve the logo's ORIGINAL colors exactly."}

ARABIC TEXT ACCURACY (critical): render ALL Arabic with PERFECT, correctly-spelled, properly-connected right-to-left letters — real, readable Arabic, never garbled or disconnected glyphs. Write each word EXACTLY ONCE — never duplicate or repeat a word, and never split a single word across two lines. Render the Arabic in ${fontStyle(font)}, Bold, clean, sharp and legible.

${hook && hook.trim()
  ? `HOOK TEXT overlay BELOW the logo, right-aligned, large and Bold: render the EXACT phrase "${hook.trim()}" — every word present, each word appearing only ONCE, no repeats, no extra words, on one or two balanced lines. Render the text in ${mainColor}.${hl.length ? ` Color ONLY these word(s)/phrase(s) in ${highlightColor}: ${hlList}; keep every other word in ${mainColor}.` : ""}`
  : "No text overlay besides the logo."}

COLOR & STYLE: primary text color ${mainColor}${hl.length ? `, highlight color ${highlightColor}` : ""}, on a clean light/cream background. Premium, harmonious, uncluttered, photorealistic. Aspect ratio ${aspect}. No human faces.

Negative: white box / frame / circle / border / badge / card behind the logo, logo on a white sticker outline, distorted logo, redrawn logo, separated logo parts, multiple logos, duplicated word, repeated word, a word written twice, missing words, incomplete or broken Arabic, garbled or disconnected letters, dropped word, blurry, low quality, watermark, cluttered scene, real third-party brand logos, exclamation marks.`;
}

async function dataUrlToBlob(dataUrl) {
  const r = await fetch(dataUrl);
  return r.blob();
}

export default function ImageGenPage({ language }) {
  const ar = (language || localStorage.getItem("appLanguage") || "ar") === "ar";
  const navigate = useNavigate();

  // ── Post content ───────────────────────────────────────────────
  const [scene, setScene] = useState("");
  const [hook, setHook] = useState("");
  const [highlight, setHighlight] = useState("");
  const [aspect, setAspect] = useState("4:5");
  const [bgOnly, setBgOnly] = useState(false); // scene only → add text/logo in Studio

  // ── Brand kit (remembered) ─────────────────────────────────────
  const [logo, setLogo] = useState(() => localStorage.getItem(LOGO_KEY) || "");
  const [kit, setKit] = useState(() => {
    try { return { ...DEFAULT_KIT, ...JSON.parse(localStorage.getItem(KIT_KEY) || "{}") }; }
    catch { return { ...DEFAULT_KIT }; }
  });
  const setKitField = (k, v) => setKit((prev) => ({ ...prev, [k]: v }));

  // ── Generation state ───────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { try { if (logo) localStorage.setItem(LOGO_KEY, logo); } catch {} }, [logo]);
  useEffect(() => { try { localStorage.setItem(KIT_KEY, JSON.stringify(kit)); } catch {} }, [kit]);

  const onPickLogo = (e) => {
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
      const prompt = buildPrompt({ scene, hook, highlight, aspect, kit, bgOnly });
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

  // Upload the current result to Cloudinary and return its public URL.
  const uploadCurrent = async () => {
    const blob = await dataUrlToBlob(result);
    const shrunk = await shrinkBlobToLimit(blob, { maxBytes: 9_500_000 });
    const file = new File([shrunk], `ai_${Date.now()}.png`, { type: shrunk.type || "image/png" });
    const { url } = await uploadFile({ file });
    return url;
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true); setError("");
    try {
      const url = await uploadCurrent();
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

  // Open the generated image in the Design Studio as an editable layer, so the
  // user can add/move/resize/recolor text and logo freely (impossible on the
  // flat AI image itself). Best paired with the "background only" option.
  const handleEditInStudio = async () => {
    if (!result) return;
    setSaving(true); setError("");
    try {
      const url = await uploadCurrent();
      sessionStorage.setItem("mediaToEdit", JSON.stringify({ type: "image", url, thumbnail: url, name: "AI image" }));
      navigate("/DesignStudio");
    } catch (e) {
      setError((ar ? "تعذّر الفتح في المنشئ: " : "Couldn't open in studio: ") + (e?.message || e));
      setSaving(false);
    }
  };

  const ColorField = ({ label, value, onChange }) => (
    <div className="flex-1">
      <label className="text-[11px] font-semibold text-slate-300 block mb-1">{label}</label>
      <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-[12px] text-white outline-none" dir="ltr" />
      </div>
    </div>
  );

  return (
    <div dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-fuchsia-400" />
          {ar ? "توليد صورة بالذكاء" : "AI Image Generator"}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {ar ? "اكتب الفكرة → تطلع صورة بهويتك جاهزة في مكتبتك." : "Describe it → get an on-brand image in your library."}
        </p>
      </div>

      <div className="p-6 grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {/* ── Left: form ─────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Content */}
          <div>
            <label className="text-[12px] font-bold text-slate-300 block mb-1.5">{ar ? "فكرة المشهد / الوصف" : "Scene / description"}</label>
            <textarea
              value={scene} onChange={(e) => setScene(e.target.value)} rows={3}
              placeholder={ar ? "مثال: هاتف على رخام كريمي يعرض تطبيق حجز، وردة ناعمة بالخلفية، إضاءة دافئة." : "e.g. A phone on cream marble showing a booking app, soft rose behind, warm light."}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 leading-relaxed"
            />
            <p className="text-[10px] text-slate-500 mt-1">{ar ? "💡 اكتب وصفاً قصيراً فقط — قواعد الهوية تُضاف تلقائياً." : "💡 Short idea only — brand rules are added automatically."}</p>
          </div>

          <div>
            <label className="text-[12px] font-bold text-slate-300 block mb-1.5">{ar ? "نص الهوك (العنوان على الصورة)" : "Hook text"}</label>
            <input value={hook} onChange={(e) => setHook(e.target.value)}
              placeholder={ar ? "مثال: أديري صالونك من مكان واحد" : "e.g. Run your salon from one place"}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
          </div>

          <div>
            <label className="text-[12px] font-bold text-slate-300 block mb-1.5">{ar ? "الكلمات المميزة — افصلها بفاصلة (اختياري)" : "Highlight words — comma-separated (optional)"}</label>
            <input value={highlight} onChange={(e) => setHighlight(e.target.value)}
              placeholder={ar ? "مثال: صالونك، الأفضل، اليوم" : "e.g. salon, best, today"}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
            <p className="text-[10px] text-slate-500 mt-1">{ar ? "تقدر تحدّد أكثر من كلمة — كلها بلون الكلمة المميزة." : "Add several words — all get the highlight color."}</p>
          </div>

          <div>
            <label className="text-[12px] font-bold text-slate-300 block mb-1.5">{ar ? "المقاس" : "Size"}</label>
            <div className="grid grid-cols-3 gap-1.5">
              {ASPECTS.map((a) => (
                <button key={a.id} onClick={() => setAspect(a.id)}
                  className={`py-2 rounded-lg text-[11px] font-bold transition ${aspect === a.id ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
                  {ar ? a.ar : a.en}
                </button>
              ))}
            </div>
          </div>

          {/* Background-only toggle */}
          <label className="flex items-start gap-2 bg-slate-800/40 border border-slate-700 rounded-lg p-2.5 cursor-pointer">
            <input type="checkbox" checked={bgOnly} onChange={(e) => setBgOnly(e.target.checked)} className="mt-0.5" />
            <span className="text-[12px] text-slate-200 leading-relaxed">
              {ar ? "خلفية فقط (بدون نص وشعار)" : "Background only (no text/logo)"}
              <span className="block text-[10px] text-slate-500">
                {ar ? "يولّد المشهد نظيف، وتضيف النص والشعار كطبقات تعدّلها بحرية في المنشئ." : "Generates a clean scene; add editable text + logo in the Studio."}
              </span>
            </span>
          </label>

          {/* ── Brand kit ──────────────────────────────────────── */}
          <div className="border border-slate-800 rounded-xl p-3 space-y-3 bg-slate-900/40">
            <p className="text-[12px] font-bold text-fuchsia-300 flex items-center gap-1.5">
              <Palette className="w-4 h-4" /> {ar ? "هويتك (تُحفظ مرة وحدة)" : "Your brand (saved once)"}
            </p>

            {/* Logo */}
            {logo ? (
              <div className="flex items-center gap-3 bg-slate-800/60 rounded-lg p-2">
                <img src={logo} alt="logo" className="w-11 h-11 object-contain rounded bg-white/5" />
                <span className="text-[11px] text-emerald-300 flex-1">{ar ? "الشعار محفوظ ويُستخدم تلقائياً" : "Logo saved & auto-used"}</span>
                <button onClick={() => { setLogo(""); try { localStorage.removeItem(LOGO_KEY); } catch {} }} className="text-slate-400 hover:text-red-300 p-1"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-600 rounded-lg py-2.5 cursor-pointer text-[12px] text-slate-300">
                <Upload className="w-4 h-4" /> {ar ? "ارفع شعارك (PNG)" : "Upload your logo (PNG)"}
                <input type="file" accept="image/png,image/*" className="hidden" onChange={onPickLogo} />
              </label>
            )}

            {/* Colors */}
            <div className="flex gap-2">
              <ColorField label={ar ? "لون النص" : "Text color"} value={kit.mainColor} onChange={(v) => setKitField("mainColor", v)} />
              <ColorField label={ar ? "لون الكلمة المميزة" : "Highlight color"} value={kit.highlightColor} onChange={(v) => setKitField("highlightColor", v)} />
            </div>

            {/* Font */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">{ar ? "نوع الخط العربي" : "Arabic font"}</label>
              <select value={kit.font} onChange={(e) => setKitField("font", e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-[12px] text-white outline-none focus:border-indigo-500">
                {FONTS.map((f) => <option key={f.v} value={f.v}>{ar ? f.ar : f.v}</option>)}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">{ar ? "💡 الذكاء يقرّب الأسلوب فقط. للخط بالضبط: فعّل «خلفية فقط» وأضِف النص في المنشئ." : "💡 AI approximates the style only. For the exact font use Background-only + the Studio."}</p>
            </div>

            {/* Logo color */}
            <div>
              <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-300 cursor-pointer">
                <input type="checkbox" checked={kit.changeLogoColor} onChange={(e) => setKitField("changeLogoColor", e.target.checked)} />
                {ar ? "غيّر لون الشعار (افتراضياً يبقى كما هو)" : "Recolor the logo (default: keep as-is)"}
              </label>
              {kit.changeLogoColor && (
                <div className="mt-2"><ColorField label={ar ? "لون الشعار" : "Logo color"} value={kit.logoColor} onChange={(v) => setKitField("logoColor", v)} /></div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-500/40 rounded-lg px-3 py-2 text-[12px] text-red-200 leading-relaxed">{error}</div>
          )}

          <button onClick={handleGenerate} disabled={loading || !scene.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? (ar ? "جارٍ التوليد… (١٠-٣٠ ثانية)" : "Generating…") : (ar ? "ولّد الصورة" : "Generate")}
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
                  <button onClick={handleSave} disabled={saving || saved}
                    className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 ${saved ? "bg-emerald-600 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white"} disabled:opacity-60`}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <ImagePlus className="w-4 h-4" />}
                    {saved ? (ar ? "تم الحفظ في المكتبة" : "Saved") : (ar ? "احفظ في المكتبة" : "Save to library")}
                  </button>
                  <a href={result} download={`image_${Date.now()}.png`} className="px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center"><Download className="w-4 h-4" /></a>
                  <button onClick={handleGenerate} disabled={loading} className="px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center"><RefreshCw className="w-4 h-4" /></button>
                </div>
                {/* Edit in Studio — overlay editable text/logo layers (the only
                    way to move/resize/recolor text after generation). */}
                <button
                  onClick={handleEditInStudio}
                  disabled={saving}
                  className="w-full mt-2 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Palette className="w-4 h-4" />}
                  {ar ? "✏️ افتح في منشئ التصاميم (لتعديل النص والشعار)" : "✏️ Open in Design Studio"}
                </button>
                {saved && (
                  <button onClick={() => navigate("/DesignLibraryPage")} className="w-full mt-2 text-[12px] text-indigo-300 hover:text-indigo-200 underline">
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
