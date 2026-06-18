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
  // Free mode: send the scene prompt as-is (no forced bright lighting / salon
  // props), so dark/moody or non-salon scenes come out as described.
  const [freeScene, setFreeScene] = useState(false);
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
  const DEFAULT_LAYOUT = { hookY: 0.26, hookScale: 1, hookX: 0.5, logoY: 0.04, logoScale: 1, logoX: 0.5, contactScale: 1, contactY: 0, hookAlign: "center", hookBg: true, hookBgColor: "#FFFFFF", cardOn: false, cardTitle: "", cardBody: "", cardX: 0.5, cardY: 0.6, cardScale: 0.62, cardLogo: true, cardRotate: 0, logoScrim: true };
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
        const prompt = buildPrompt({ scene, hook, highlight, aspect, kit, bgOnly: true, freeScene });
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
    <div className="p-6 md:p-8 grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
      {/* Left: form */}
      <div className="space-y-4">
        <div>
          <label className="text-[12px] font-bold block mb-1.5" style={{ color: "var(--hv-text)" }}>{ar ? "فكرة المشهد / الوصف" : "Scene / description"}</label>
          <textarea value={scene} onChange={(e) => setScene(e.target.value)} rows={3}
            placeholder={ar ? "مثال: هاتف على رخام كريمي يعرض تطبيق حجز، وردة ناعمة بالخلفية، إضاءة دافئة." : "e.g. A phone on cream marble showing a booking app, warm light."}
            className="hv-input w-full leading-relaxed" />
          <p className="text-[10px] mt-1" style={{ color: "var(--hv-text-faint)" }}>{ar ? "💡 وصف قصير فقط — قواعد الهوية تُضاف تلقائياً." : "💡 Short idea only — brand rules added automatically."}</p>
        </div>

        <div>
          <label className="text-[12px] font-bold block mb-1.5" style={{ color: "var(--hv-text)" }}>{ar ? "نص الهوك (العنوان على الصورة)" : "Hook text"}</label>
          <textarea value={hook} onChange={(e) => setHook(e.target.value)} rows={2} placeholder={ar ? "مثال: أديري صالونك من مكان واحد" : "e.g. Run your salon from one place"}
            className="hv-input w-full leading-relaxed resize-none" />
          <p className="text-[10px] mt-1" style={{ color: "var(--hv-text-faint)" }}>{ar ? "💡 اضغط Enter لإنزال الكلام على سطر جديد." : "💡 Press Enter for a new line."}</p>
        </div>

        <div>
          <label className="text-[12px] font-bold block mb-1.5" style={{ color: "var(--hv-text)" }}>{ar ? "الكلمات المميزة — افصلها بفاصلة (اختياري)" : "Highlight words — comma-separated"}</label>
          <input value={highlight} onChange={(e) => setHighlight(e.target.value)} placeholder={ar ? "مثال: صالونك، الأفضل، اليوم" : "e.g. salon, best, today"}
            className="hv-input w-full" />
          <p className="text-[10px] mt-1" style={{ color: "var(--hv-text-faint)" }}>{ar ? "تقدر تحدّد أكثر من كلمة — كلها بلون الكلمة المميزة." : "Several words allowed — all get the highlight color."}</p>
        </div>

        {/* Notification card (logo + title + body) — like an app notification */}
        <div className="rounded-lg p-2.5 space-y-2 border" style={{ background: "var(--hv-surface-2)", borderColor: "var(--hv-border)" }}>
          <label className="flex items-center gap-2 text-[12px] font-bold cursor-pointer" style={{ color: "var(--hv-text)" }}>
            <input type="checkbox" checked={!!layout.cardOn} onChange={(e) => setLayout((p) => ({ ...p, cardOn: e.target.checked }))} style={{ accentColor: "var(--hv-primary)" }} />
            {ar ? "🔔 بطاقة إشعار (شعار + عنوان + نص)" : "🔔 Notification card"}
          </label>
          {layout.cardOn && (
            <>
              <input value={layout.cardTitle || ""} onChange={(e) => setLayout((p) => ({ ...p, cardTitle: e.target.value }))}
                placeholder={ar ? "عنوان البطاقة — مثال: هوفيرا" : "Card title — e.g. Hovera"}
                className="hv-input w-full" />
              <textarea value={layout.cardBody || ""} onChange={(e) => setLayout((p) => ({ ...p, cardBody: e.target.value }))} rows={2}
                placeholder={ar ? "نص البطاقة — مثال: تذكير: موعدك بعد ساعتين في الصالون" : "Card body — e.g. Reminder: your appointment in 2 hours"}
                className="hv-input w-full resize-none leading-relaxed" />
              <label className="flex items-center gap-2 text-[11px] cursor-pointer" style={{ color: "var(--hv-text-soft)" }}>
                <input type="checkbox" checked={layout.cardLogo !== false} onChange={(e) => setLayout((p) => ({ ...p, cardLogo: e.target.checked }))} style={{ accentColor: "var(--hv-primary)" }} />
                {ar ? "إظهار الشعار داخل البطاقة" : "Show logo in card"}
              </label>
              <p className="text-[10px]" style={{ color: "var(--hv-text-faint)" }}>{ar ? "بعد التوليد، حرّكها وكبّرها من زر «تحرير»." : "After generating, move/resize it from Edit."}</p>
            </>
          )}
        </div>

        <div>
          <label className="text-[12px] font-bold block mb-1.5" style={{ color: "var(--hv-text)" }}>{ar ? "المقاس" : "Size"}</label>
          <div className="grid grid-cols-3 gap-1.5">
            {ASPECTS.map((a) => (
              <button key={a.id} onClick={() => setAspect(a.id)}
                className="py-2 rounded-lg text-[11px] font-bold transition border"
                style={aspect === a.id ? { background: "var(--hv-primary)", color: "#fff", borderColor: "var(--hv-primary)" } : { background: "var(--hv-surface)", color: "var(--hv-text-soft)", borderColor: "var(--hv-border)" }}>
                {ar ? a.ar : a.en}
              </button>
            ))}
          </div>
        </div>

        {/* Compact options — two toggles side by side + one short hint */}
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer border text-[12px] font-semibold transition"
            style={freeScene ? { background: "rgba(79,70,229,0.07)", borderColor: "var(--hv-primary)", color: "var(--hv-text)" } : { background: "var(--hv-surface-2)", borderColor: "var(--hv-border)", color: "var(--hv-text-soft)" }}>
            <input type="checkbox" checked={freeScene} onChange={(e) => setFreeScene(e.target.checked)} style={{ accentColor: "var(--hv-primary)" }} />
            🎨 {ar ? "وضع حر" : "Free scene"}
          </label>
          <label className="flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer border text-[12px] font-semibold transition"
            style={bgOnly ? { background: "rgba(79,70,229,0.07)", borderColor: "var(--hv-primary)", color: "var(--hv-text)" } : { background: "var(--hv-surface-2)", borderColor: "var(--hv-border)", color: "var(--hv-text-soft)" }}>
            <input type="checkbox" checked={bgOnly} onChange={(e) => setBgOnly(e.target.checked)} style={{ accentColor: "var(--hv-primary)" }} />
            🖼️ {ar ? "خلفية فقط" : "Background only"}
          </label>
        </div>
        <p className="text-[10px] leading-relaxed" style={{ color: "var(--hv-text-faint)" }}>
          {ar
            ? "🎯 الذكاء يرسم المشهد والنظام يطبع الشعار والنص بدقة (يتحدّث ويتحرّك من «تحرير»). «وضع حر» يتبع وصفك حرفياً، و«خلفية فقط» بدون نص أو شعار."
            : "🎯 AI paints the scene; the app composites logo & text precisely (editable). Free = follow your scene literally; Background only = no text/logo."}
        </p>

        <BrandKitControls ar={ar} onChange={(k, l) => { setKit(k); setLogo(l); }} />

        {error && <div className="rounded-lg px-3 py-2 text-[12px] leading-relaxed border" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#dc2626" }}>{error}</div>}

        <button onClick={handleGenerate} disabled={loading || !scene.trim()}
          className="hv-btn hv-btn-primary w-full py-3 disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {loading ? (ar ? "جارٍ التوليد…" : "Generating…") : (ar ? "ولّد الصورة" : "Generate")}
        </button>
      </div>

      {/* Right: result — sticky so it stays in view while scrolling the form */}
      <div className="self-start md:sticky md:top-6">
        <div className="hv-card rounded-2xl p-4 min-h-[360px] flex items-center justify-center" style={{ background: "var(--hv-surface)" }}>
          {loading ? (
            <div className="text-center" style={{ color: "var(--hv-text-soft)" }}><Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" style={{ color: "var(--hv-primary)" }} /><p className="text-sm">{ar ? "يرسم صورتك…" : "Drawing…"}</p></div>
          ) : result ? (
            <div className="w-full">
              <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: "repeating-conic-gradient(var(--hv-surface-2) 0% 25%, #ffffff 0% 50%) 50% / 20px 20px" }}>
                <img src={result} alt="generated" className="w-full block rounded-xl" />
              </div>
              {bgUrl && showEdit && (
                <div className="mt-3 rounded-lg p-3 space-y-2 border" style={{ background: "var(--hv-surface)", borderColor: "rgba(251,113,133,0.35)" }}>
                  <p className="text-[11px] font-bold" style={{ color: "var(--hv-secondary-600, var(--hv-secondary))" }}>{ar ? "✦ تحرير سريع (يطبّق فوراً بدون إعادة توليد)" : "✦ Quick edit (live)"}</p>
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
                    ...(layout.cardOn ? [
                      { k: "cardX", label: ar ? "البطاقة ↔" : "Card ↔", min: 0.15, max: 0.85, step: 0.01 },
                      { k: "cardY", label: ar ? "البطاقة ↕" : "Card ↕", min: 0.1, max: 0.95, step: 0.01 },
                      { k: "cardScale", label: ar ? "حجم البطاقة" : "Card size", min: 0.35, max: 0.95, step: 0.01 },
                      { k: "cardRotate", label: ar ? "ميل البطاقة" : "Card tilt", min: -45, max: 45, step: 1 },
                    ] : []),
                  ].map((s) => (
                    <div key={s.k} className="flex items-center gap-2">
                      <span className="text-[10px] w-14 flex-shrink-0" style={{ color: "var(--hv-text-soft)" }}>{s.label}</span>
                      <input type="range" min={s.min} max={s.max} step={s.step} value={layout[s.k] ?? DEFAULT_LAYOUT[s.k]} onChange={(e) => setLayoutField(s.k, e.target.value)} className="flex-1" style={{ accentColor: "var(--hv-primary)" }} />
                    </div>
                  ))}

                  {/* Text alignment (like Word) — global default. Picking one
                      clears per-line overrides so it applies to every line. */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] w-14 flex-shrink-0" style={{ color: "var(--hv-text-soft)" }}>{ar ? "محاذاة الكل" : "Align all"}</span>
                    <div className="flex-1 grid grid-cols-3 gap-1">
                      {[{ v: "right", ar: "يمين", en: "Right" }, { v: "center", ar: "توسيط", en: "Center" }, { v: "left", ar: "يسار", en: "Left" }].map((o) => {
                        const active = (layout.hookAlign || "center") === o.v && !(layout.hookAligns || []).length;
                        return (
                        <button key={o.v} onClick={() => setLayout((p) => ({ ...p, hookAlign: o.v, hookAligns: [] }))}
                          className="py-1 rounded text-[10px] font-bold transition border"
                          style={active ? { background: "var(--hv-primary)", color: "#fff", borderColor: "var(--hv-primary)" } : { background: "var(--hv-surface)", color: "var(--hv-text-soft)", borderColor: "var(--hv-border)" }}>{ar ? o.ar : o.en}</button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Per-line alignment — appears when the hook has >1 line (Enter). */}
                  {hook.split(/\r?\n/).length > 1 && (
                    <div className="rounded-lg p-2 space-y-1" style={{ background: "var(--hv-surface-2)" }}>
                      <span className="text-[10px]" style={{ color: "var(--hv-text-soft)" }}>{ar ? "محاذاة كل سطر على حدة:" : "Per-line align:"}</span>
                      {hook.split(/\r?\n/).map((seg, i) => {
                        const cur = (layout.hookAligns || [])[i] || layout.hookAlign || "center";
                        return (
                          <div key={i} className="flex items-center gap-1.5">
                            <span className="text-[9px] flex-1 truncate text-right" style={{ color: "var(--hv-text-soft)" }} dir="rtl" title={seg}>{seg.trim() || `${ar ? "سطر" : "line"} ${i + 1}`}</span>
                            <div className="flex gap-0.5 flex-shrink-0">
                              {[{ v: "right", t: "يمين" }, { v: "center", t: "توسيط" }, { v: "left", t: "يسار" }].map((o) => (
                                <button key={o.v} title={o.t}
                                  onClick={() => setLayout((p) => { const arr = [...(p.hookAligns || [])]; arr[i] = o.v; return { ...p, hookAligns: arr }; })}
                                  className="px-1.5 py-0.5 rounded text-[9px] font-bold transition border"
                                  style={cur === o.v ? { background: "var(--hv-primary)", color: "#fff", borderColor: "var(--hv-primary)" } : { background: "var(--hv-surface)", color: "var(--hv-text-soft)", borderColor: "var(--hv-border)" }}>{o.t}</button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Light backdrop behind the logo (guarantees a clean near-white logo area) */}
                  <label className="flex items-center gap-1.5 text-[10px] cursor-pointer" style={{ color: "var(--hv-text-soft)" }}>
                    <input type="checkbox" checked={layout.logoScrim !== false} onChange={(e) => setLayout((p) => ({ ...p, logoScrim: e.target.checked }))} style={{ accentColor: "var(--hv-primary)" }} />
                    {ar ? "خلفية فاتحة خلف الشعار (تضمن منطقة شعار نظيفة)" : "Light backdrop behind logo"}
                  </label>

                  {/* Text background plate */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="flex items-center gap-1.5 text-[10px] cursor-pointer" style={{ color: "var(--hv-text-soft)" }}>
                      <input type="checkbox" checked={layout.hookBg !== false} onChange={(e) => setLayout((p) => ({ ...p, hookBg: e.target.checked }))} style={{ accentColor: "var(--hv-primary)" }} />
                      {ar ? "خلفية للنص" : "Text background"}
                    </label>
                    {layout.hookBg !== false && (
                      <div className="flex items-center gap-1.5">
                        <input type="color" value={layout.hookBgColor || "#FFFFFF"} onChange={(e) => setLayout((p) => ({ ...p, hookBgColor: e.target.value }))} className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0" />
                        {["#FFFFFF", "#000000", "#1d2a6b", "#09007C", "#10203a", "#F7E8F4"].map((s) => (
                          <button key={s} type="button" onClick={() => setLayout((p) => ({ ...p, hookBgColor: s }))}
                            className="w-5 h-5 rounded-full border" style={{ backgroundColor: s, borderColor: (layout.hookBgColor || "#FFFFFF").toLowerCase() === s.toLowerCase() ? "var(--hv-primary)" : "var(--hv-border)", boxShadow: (layout.hookBgColor || "#FFFFFF").toLowerCase() === s.toLowerCase() ? "0 0 0 2px rgba(79,70,229,.35)" : "none" }} />
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="text-[10px]" style={{ color: "var(--hv-text-faint)" }}>{ar ? "الألوان والخط ولون/شكل الشريط من «هويتك» — تتحدّث هنا فوراً." : "Colors/font & bar style from your brand — update live."}</p>
                  <button onClick={() => setLayout(DEFAULT_LAYOUT)} className="text-[10px] underline" style={{ color: "var(--hv-primary)" }}>{ar ? "↺ إعادة الافتراضي" : "↺ Reset"}</button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center px-6 py-10" style={{ color: "var(--hv-text-faint)" }}>
              <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--hv-surface-2)" }}>
                <ImagePlus className="w-8 h-8 opacity-60" style={{ color: "var(--hv-primary)" }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: "var(--hv-text-soft)" }}>{ar ? "صورتك بتظهر هنا" : "Your image appears here"}</p>
              <p className="text-[11px] mt-1">{ar ? "اكتب الفكرة في النموذج واضغط «ولّد الصورة»" : "Describe it in the form and hit Generate"}</p>
            </div>
          )}
        </div>

        {/* Actions — always visible; enabled once an image exists */}
        <div className="grid grid-cols-2 gap-2.5 mt-3">
          <button onClick={handleSave} disabled={!result || saving || saved}
            className={`hv-btn py-2.5 disabled:opacity-50 ${saved ? "" : "hv-btn-primary"}`}
            style={saved ? { background: "#10b981", color: "#fff" } : undefined}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <ImagePlus className="w-4 h-4" />}
            {saved ? (ar ? "تم الحفظ" : "Saved") : (ar ? "احفظ في المكتبة" : "Save")}
          </button>
          <button onClick={handleEditInStudio} disabled={!result || saving}
            className="hv-btn hv-btn-accent py-2.5 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Palette className="w-4 h-4" />}
            {ar ? "افتح في المنشئ" : "Open in Studio"}
          </button>
        </div>
        <div className="flex items-center justify-between gap-1 mt-2.5 rounded-xl p-1.5 border" style={{ background: "var(--hv-surface-2)", borderColor: "var(--hv-border)" }}>
          {result ? (
            <a href={result} download={`image_${Date.now()}.png`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition hover:bg-white" style={{ color: "var(--hv-text-soft)" }}>
              <Download className="w-4 h-4" /> {ar ? "تنزيل" : "Download"}
            </a>
          ) : (
            <span className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold opacity-40" style={{ color: "var(--hv-text-soft)" }}>
              <Download className="w-4 h-4" /> {ar ? "تنزيل" : "Download"}
            </span>
          )}
          <span className="w-px h-5 flex-shrink-0" style={{ background: "var(--hv-border)" }} />
          <button onClick={handleGenerate} disabled={!result || loading}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition hover:bg-white disabled:opacity-40" style={{ color: "var(--hv-text-soft)" }}>
            <RefreshCw className="w-4 h-4" /> {ar ? "إعادة توليد" : "Regenerate"}
          </button>
          <span className="w-px h-5 flex-shrink-0" style={{ background: "var(--hv-border)" }} />
          <button onClick={() => setShowEdit((v) => !v)} disabled={!bgUrl}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition hover:bg-white disabled:opacity-40"
            style={showEdit ? { background: "var(--hv-primary)", color: "#fff" } : { color: "var(--hv-text-soft)" }}>
            <Palette className="w-4 h-4" /> {ar ? "تحرير" : "Edit"}
          </button>
        </div>
        {result && sessionStorage.getItem("greetingReturn") === "1" && (
          <button
            onClick={() => { sessionStorage.setItem("greetingTemplateUrl", result); sessionStorage.removeItem("greetingReturn"); navigate("/GreetingCards"); }}
            className="hv-btn hv-btn-primary w-full mt-2.5 py-2.5"
          >
            🎁 {ar ? "استخدم هذه الصورة في بطاقة التهنئة" : "Use in greeting card"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ImageGenPage({ language }) {
  const ar = (language || localStorage.getItem("appLanguage") || "ar") === "ar";
  const [tab, setTab] = useState("custom");

  return (
    <div dir={ar ? "rtl" : "ltr"} className="hv-page">
      <div className="border-b px-6 pt-5" style={{ borderColor: "var(--hv-border)", background: "var(--hv-surface)" }}>
        <h1 className="hv-page-title flex items-center gap-2">
          <Sparkles className="w-5 h-5" style={{ color: "var(--hv-secondary)" }} />
          {ar ? "توليد صورة بالذكاء" : "AI Image Generator"}
        </h1>
        <p className="hv-page-sub">{ar ? "اكتب الفكرة → تطلع صورة بهويتك جاهزة للمكتبة." : "Describe it → on-brand image in your library."}</p>
        {/* Tabs */}
        <div className="flex gap-1 mt-3 -mb-px">
          <button onClick={() => setTab("custom")}
            className="px-4 py-2 text-sm font-bold border-b-2 transition flex items-center gap-1.5"
            style={tab === "custom" ? { borderColor: "var(--hv-primary)", color: "var(--hv-primary)" } : { borderColor: "transparent", color: "var(--hv-text-soft)" }}>
            <Layers className="w-4 h-4" /> {ar ? "مخصص" : "Custom"}
          </button>
          <button onClick={() => setTab("bulk")}
            className="px-4 py-2 text-sm font-bold border-b-2 transition flex items-center gap-1.5"
            style={tab === "bulk" ? { borderColor: "var(--hv-primary)", color: "var(--hv-primary)" } : { borderColor: "transparent", color: "var(--hv-text-soft)" }}>
            <FileSpreadsheet className="w-4 h-4" /> {ar ? "عام (دفعة من إكسل)" : "Bulk (Excel)"}
          </button>
        </div>
      </div>

      {tab === "custom" ? (
        <CustomGen ar={ar} />
      ) : (
        <React.Suspense fallback={<div className="p-10 text-center" style={{ color: "var(--hv-text-soft)" }}><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>}>
          <BulkImageGen ar={ar} />
        </React.Suspense>
      )}
    </div>
  );
}
