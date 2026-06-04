import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2, ImagePlus, Download, Check, RefreshCw, Palette, Layers, FileSpreadsheet } from "lucide-react";
import { uploadFile } from "@/api/localClient";
import { addLocalMedia } from "@/utils/localMediaStore";
import { shrinkBlobToLimit } from "@/utils/imageConvert";
import { buildPrompt, generateImage, ASPECTS, loadKit, loadLogo, kitContacts, pxForAspect } from "@/utils/imagePrompt";
import { composeBranded } from "@/utils/composeBrand";
import BrandKitControls from "@/components/BrandKitControls";
// Lazy-load the bulk tab so the heavy Excel library only loads when used.
const BulkImageGen = React.lazy(() => import("./BulkImageGen"));

async function dataUrlToBlob(dataUrl) {
  const r = await fetch(dataUrl);
  return r.blob();
}

// ── Custom (single) generator ──────────────────────────────────────────
function CustomGen({ ar }) {
  const navigate = useNavigate();
  const [scene, setScene] = useState("");
  const [hook, setHook] = useState("");
  const [highlight, setHighlight] = useState("");
  const [aspect, setAspect] = useState("4:5");
  const [bgOnly, setBgOnly] = useState(false);
  // High precision is ALWAYS on now: the AI paints only the scene, then we
  // composite the real logo + hook (real Arabic font) + contact bar on top.
  // (The old toggle let the AI draw the text itself, which always garbled
  // Arabic and disabled live editing — so it was removed.)
  const [kit, setKit] = useState(loadKit);
  const [logo, setLogo] = useState(loadLogo);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  // High-precision mode keeps the raw AI scene so brand elements can be
  // re-composited live (move/resize) without re-generating.
  const [bgUrl, setBgUrl] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const DEFAULT_LAYOUT = { hookY: 0.26, hookScale: 1, hookX: 0.5, logoY: 0.04, logoScale: 1, logoX: 0.5, contactScale: 1, contactY: 0 };
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const setLayoutField = (k, v) => setLayout((p) => ({ ...p, [k]: parseFloat(v) }));

  // Re-composite whenever the scene, brand kit, layout, hook or logo changes
  // (but NOT the scene description — that needs a fresh AI generation).
  React.useEffect(() => {
    if (!bgUrl) return;
    let cancelled = false;
    const t = setTimeout(() => {
      const px = pxForAspect(aspect);
      composeBranded({ bgUrl, logoUrl: logo || "", hook, highlight, kit, contacts: kitContacts(kit), layout, targetW: px?.w, targetH: px?.h })
        .then((img) => { if (!cancelled) { setResult(img); setSaved(false); } })
        .catch(() => {});
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [bgUrl, kit, layout, logo, hook, highlight]);

  const handleGenerate = async () => {
    if (!scene.trim()) { setError(ar ? "اكتب فكرة المشهد أولاً." : "Describe the scene first."); return; }
    setError(""); setSaved(false); setResult(""); setLoading(true);
    try {
      if (!bgOnly) {
        // AI paints the scene only; the effect composites the brand elements
        // (and re-composites live as you tweak layout/colors/text).
        const prompt = buildPrompt({ scene, hook, highlight, aspect, kit, bgOnly: true });
        const sceneUrl = await generateImage({ prompt, aspectRatio: aspect });
        setBgUrl(sceneUrl);
        const px = pxForAspect(aspect);
        const composed = await composeBranded({ bgUrl: sceneUrl, logoUrl: logo || "", hook, highlight, kit, contacts: kitContacts(kit), layout, targetW: px?.w, targetH: px?.h });
        setResult(composed);
      } else {
        setBgUrl("");
        const prompt = buildPrompt({ scene, hook, highlight, aspect, kit, bgOnly });
        const dataUrl = await generateImage({ prompt, referenceImage: logo || undefined, aspectRatio: aspect });
        setResult(dataUrl);
      }
    } catch (e) {
      setError((ar ? "تعذّر التوليد: " : "Generation failed: ") + (e?.message || e));
    } finally { setLoading(false); }
  };

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
        caption_title: hook?.trim() || "", caption_text: "", position: 0, type: "image",
      });
      setSaved(true);
    } catch (e) {
      setError((ar ? "تعذّر الحفظ: " : "Save failed: ") + (e?.message || e));
    } finally { setSaving(false); }
  };

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

  return (
    <div className="p-6 grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
      {/* Left: form */}
      <div className="space-y-4">
        <div>
          <label className="text-[12px] font-bold text-slate-300 block mb-1.5">{ar ? "فكرة المشهد / الوصف" : "Scene / description"}</label>
          <textarea value={scene} onChange={(e) => setScene(e.target.value)} rows={3}
            placeholder={ar ? "مثال: هاتف على رخام كريمي يعرض تطبيق حجز، وردة ناعمة بالخلفية، إضاءة دافئة." : "e.g. A phone on cream marble showing a booking app, warm light."}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 leading-relaxed" />
          <p className="text-[10px] text-slate-500 mt-1">{ar ? "💡 وصف قصير فقط — قواعد الهوية تُضاف تلقائياً." : "💡 Short idea only — brand rules added automatically."}</p>
        </div>

        <div>
          <label className="text-[12px] font-bold text-slate-300 block mb-1.5">{ar ? "نص الهوك (العنوان على الصورة)" : "Hook text"}</label>
          <textarea value={hook} onChange={(e) => setHook(e.target.value)} rows={2} placeholder={ar ? "مثال: أديري صالونك من مكان واحد" : "e.g. Run your salon from one place"}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 leading-relaxed resize-none" />
          <p className="text-[10px] text-slate-500 mt-1">{ar ? "💡 اضغط Enter لإنزال الكلام على سطر جديد." : "💡 Press Enter for a new line."}</p>
        </div>

        <div>
          <label className="text-[12px] font-bold text-slate-300 block mb-1.5">{ar ? "الكلمات المميزة — افصلها بفاصلة (اختياري)" : "Highlight words — comma-separated"}</label>
          <input value={highlight} onChange={(e) => setHighlight(e.target.value)} placeholder={ar ? "مثال: صالونك، الأفضل، اليوم" : "e.g. salon, best, today"}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
          <p className="text-[10px] text-slate-500 mt-1">{ar ? "تقدر تحدّد أكثر من كلمة — كلها بلون الكلمة المميزة." : "Several words allowed — all get the highlight color."}</p>
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

        <div className="flex items-start gap-2 bg-fuchsia-900/20 border border-fuchsia-500/40 rounded-lg p-2.5">
          <span className="mt-0.5">🎯</span>
          <span className="text-[12px] text-slate-100 leading-relaxed">
            {ar ? "النص يُطبع بدقة عالية بالخط الحقيقي" : "Text is composited in the real font (high precision)"}
            <span className="block text-[10px] text-slate-400">{ar ? "الذكاء يرسم المشهد فقط، والنظام يطبع الشعار والهوك والشريط بدقة — والنص يتحدّث مباشرة وتقدر تحرّكه بزر «تحرير»." : "AI paints the scene; the app composites the real logo, hook & bar — text updates live and is editable."}</span>
          </span>
        </div>

        <label className="flex items-start gap-2 bg-slate-800/40 border border-slate-700 rounded-lg p-2.5 cursor-pointer">
          <input type="checkbox" checked={bgOnly} onChange={(e) => setBgOnly(e.target.checked)} className="mt-0.5" />
          <span className="text-[12px] text-slate-200 leading-relaxed">
            {ar ? "خلفية فقط (بدون نص وشعار)" : "Background only (no text/logo)"}
            <span className="block text-[10px] text-slate-500">{ar ? "يولّد المشهد نظيف، وتضيف النص والشعار كطبقات تعدّلها في المنشئ." : "Clean scene; add editable text + logo in the Studio."}</span>
          </span>
        </label>

        <BrandKitControls ar={ar} onChange={(k, l) => { setKit(k); setLogo(l); }} />

        {error && <div className="bg-red-900/30 border border-red-500/40 rounded-lg px-3 py-2 text-[12px] text-red-200 leading-relaxed">{error}</div>}

        <button onClick={handleGenerate} disabled={loading || !scene.trim()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {loading ? (ar ? "جارٍ التوليد…" : "Generating…") : (ar ? "ولّد الصورة" : "Generate")}
        </button>
      </div>

      {/* Right: result */}
      <div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 min-h-[300px] flex items-center justify-center">
          {loading ? (
            <div className="text-center text-slate-500"><Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-indigo-400" /><p className="text-sm">{ar ? "يرسم صورتك…" : "Drawing…"}</p></div>
          ) : result ? (
            <div className="w-full">
              <img src={result} alt="generated" className="w-full rounded-lg" />
              {bgUrl && showEdit && (
                <div className="mt-3 bg-slate-900/60 border border-fuchsia-500/30 rounded-lg p-3 space-y-2">
                  <p className="text-[11px] font-bold text-fuchsia-300">{ar ? "✦ تحرير سريع (يطبّق فوراً بدون إعادة توليد)" : "✦ Quick edit (live)"}</p>
                  {[
                    { k: "hookY", label: ar ? "النص ↕" : "Text ↕", min: 0.02, max: 0.92, step: 0.01 },
                    { k: "hookX", label: ar ? "النص ↔" : "Text ↔", min: 0.1, max: 0.9, step: 0.01 },
                    { k: "hookScale", label: ar ? "حجم النص" : "Text size", min: 0.3, max: 2.6, step: 0.05 },
                    { k: "logoY", label: ar ? "الشعار ↕" : "Logo ↕", min: 0, max: 0.88, step: 0.01 },
                    { k: "logoX", label: ar ? "الشعار ↔" : "Logo ↔", min: 0.05, max: 0.95, step: 0.01 },
                    { k: "logoScale", label: ar ? "حجم الشعار" : "Logo size", min: 0.25, max: 4, step: 0.05 },
                    ...(kit.showContact ? [
                      { k: "contactScale", label: ar ? "حجم الشريط" : "Bar size", min: 0.5, max: 2, step: 0.05 },
                      { k: "contactY", label: ar ? "الشريط ↕" : "Bar ↕", min: 0, max: 0.8, step: 0.01 },
                    ] : []),
                  ].map((s) => (
                    <div key={s.k} className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 w-14 flex-shrink-0">{s.label}</span>
                      <input type="range" min={s.min} max={s.max} step={s.step} value={layout[s.k] ?? DEFAULT_LAYOUT[s.k]} onChange={(e) => setLayoutField(s.k, e.target.value)} className="flex-1 accent-fuchsia-500" />
                    </div>
                  ))}
                  <p className="text-[10px] text-slate-500">{ar ? "الألوان والخط ولون/شكل الشريط من «هويتك» — تتحدّث هنا فوراً." : "Colors/font & bar style from your brand — update live."}</p>
                  <button onClick={() => setLayout(DEFAULT_LAYOUT)} className="text-[10px] text-indigo-400 hover:text-indigo-300 underline">{ar ? "↺ إعادة الافتراضي" : "↺ Reset"}</button>
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <button onClick={handleSave} disabled={saving || saved}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 ${saved ? "bg-emerald-600 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white"} disabled:opacity-60`}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <ImagePlus className="w-4 h-4" />}
                  {saved ? (ar ? "تم الحفظ" : "Saved") : (ar ? "احفظ في المكتبة" : "Save to library")}
                </button>
                <a href={result} download={`image_${Date.now()}.png`} className="px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center"><Download className="w-4 h-4" /></a>
                <button onClick={handleGenerate} disabled={loading} className="px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center"><RefreshCw className="w-4 h-4" /></button>
                {bgUrl && (
                  <button onClick={() => setShowEdit((v) => !v)} title={ar ? "تحرير" : "Edit"}
                    className={`px-3 py-2.5 rounded-lg transition flex items-center gap-1 text-sm font-bold ${showEdit ? "bg-fuchsia-600 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-200"}`}>
                    <Palette className="w-4 h-4" />{ar ? "تحرير" : "Edit"}
                  </button>
                )}
              </div>
              <button onClick={handleEditInStudio} disabled={saving}
                className="w-full mt-2 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Palette className="w-4 h-4" />}
                {ar ? "✏️ افتح في منشئ التصاميم (لتعديل النص والشعار)" : "✏️ Open in Design Studio"}
              </button>
            </div>
          ) : (
            <div className="text-center text-slate-600"><ImagePlus className="w-12 h-12 mx-auto mb-2 opacity-40" /><p className="text-sm">{ar ? "الصورة بتظهر هنا" : "Your image appears here"}</p></div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ImageGenPage({ language }) {
  const ar = (language || localStorage.getItem("appLanguage") || "ar") === "ar";
  const [tab, setTab] = useState("custom");

  return (
    <div dir={ar ? "rtl" : "ltr"} className="h-full overflow-y-auto bg-slate-950 text-white">
      <div className="border-b border-slate-800 bg-slate-900 px-6 pt-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-fuchsia-400" />
          {ar ? "توليد صورة بالذكاء" : "AI Image Generator"}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">{ar ? "اكتب الفكرة → تطلع صورة بهويتك جاهزة للمكتبة." : "Describe it → on-brand image in your library."}</p>
        {/* Tabs */}
        <div className="flex gap-1 mt-3 -mb-px">
          <button onClick={() => setTab("custom")}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition flex items-center gap-1.5 ${tab === "custom" ? "border-fuchsia-500 text-white" : "border-transparent text-slate-400 hover:text-white"}`}>
            <Layers className="w-4 h-4" /> {ar ? "مخصص" : "Custom"}
          </button>
          <button onClick={() => setTab("bulk")}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition flex items-center gap-1.5 ${tab === "bulk" ? "border-fuchsia-500 text-white" : "border-transparent text-slate-400 hover:text-white"}`}>
            <FileSpreadsheet className="w-4 h-4" /> {ar ? "عام (دفعة من إكسل)" : "Bulk (Excel)"}
          </button>
        </div>
      </div>

      {tab === "custom" ? (
        <CustomGen ar={ar} />
      ) : (
        <React.Suspense fallback={<div className="p-10 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>}>
          <BulkImageGen ar={ar} />
        </React.Suspense>
      )}
    </div>
  );
}
