import React, { useState } from "react";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import StudioColorPicker from "../StudioColorPicker";
import { loadLogo } from "@/utils/imagePrompt";

const THEMES = [
  { name: "بنفسجي", accent: "#7c3aed", text: "#1e1b3a", bg: "#ffffff" },
  { name: "وردي",   accent: "#b76e79", text: "#5b2333", bg: "#fff7f8" },
  { name: "ذهبي",   accent: "#c9a227", text: "#3d3000", bg: "#fffdf5" },
  { name: "أخضر",   accent: "#1a7d5a", text: "#0a3020", bg: "#f5fffa" },
  { name: "نيفي",   accent: "#3730a3", text: "#1e1b4b", bg: "#ffffff" },
  { name: "أسود",   accent: "#111827", text: "#111827", bg: "#ffffff" },
];
const CURRENCIES = ["⃁", "ريال", "ر.س", "﷼", "$", "د.إ", "د.ك", "AED", "USD"];
const STYLES = [
  { id: "classic", ar: "كلاسيكي", en: "Classic" },
  { id: "luxe",    ar: "فخم",     en: "Luxe" },
  { id: "modern",  ar: "عصري",    en: "Modern" },
  { id: "minimal", ar: "بسيط",    en: "Minimal" },
];
const LANGS = [
  { id: "ar", label: "عربي" },
  { id: "en", label: "إنجليزي" },
  { id: "both", label: "الاثنين" },
];
const QUICK_ICONS = ["💇", "💈", "✂️", "💅", "🦶", "💄", "💆", "🧖", "🧴", "🌸", "💎", "✨", "🔥", "⭐", "🧔", "👁️", "🛁", "🥤", "☕", "🍰"];

// Services / price MENU with sections, per-item icons, bilingual (ar/en/both),
// style presets, 1-2 columns and auto-fit.
export default function MenuPanel({ menu, onChange, language }) {
  const isRtl = language === "ar";
  const m = menu || {};
  const [openSec, setOpenSec] = useState(0);
  const [iconFor, setIconFor] = useState(null); // "si:ii" whose icon picker is open

  // Normalize: migrate an old flat items[] into one section.
  const sections = (m.sections && m.sections.length)
    ? m.sections
    : (m.items ? [{ title: "", titleEn: "", items: m.items }] : []);

  const setSections = (next) => onChange({ sections: next, items: undefined });
  const setSec = (si, patch) => setSections(sections.map((s, i) => i === si ? { ...s, ...patch } : s));
  const addSection = () => { setSections([...sections, { title: isRtl ? "قسم جديد" : "New section", titleEn: "", items: [{ name: isRtl ? "خدمة" : "Item", nameEn: "", icon: "", desc: "", price: "0" }] }]); setOpenSec(sections.length); };
  const removeSection = (si) => setSections(sections.filter((_, i) => i !== si));
  const setItem = (si, ii, patch) => setSec(si, { items: sections[si].items.map((it, j) => j === ii ? { ...it, ...patch } : it) });
  const addItem = (si) => setSec(si, { items: [...(sections[si].items || []), { name: isRtl ? "خدمة جديدة" : "New item", nameEn: "", icon: "", desc: "", price: "0" }] });
  const removeItem = (si, ii) => setSec(si, { items: sections[si].items.filter((_, j) => j !== ii) });

  const onPickLogo = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => onChange({ showLogo: true, logoUrl: String(r.result || "") });
    r.readAsDataURL(f);
  };
  const onPickBg = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => onChange({ bgImage: String(r.result || ""), bgImageOpacity: m.bgImageOpacity ?? 0.15 });
    r.readAsDataURL(f);
  };

  const lang = m.lang || "ar";
  const showAr = lang === "ar" || lang === "both";
  const showEn = lang === "en" || lang === "both";

  return (
    <div className="space-y-3 text-xs">
      {/* Enable */}
      <div className="flex items-center justify-between rounded-lg p-2.5 border" style={m.show ? { background: "rgba(124,58,237,0.10)", borderColor: "rgba(124,58,237,0.55)" } : { background: "var(--hv-surface-2)", borderColor: "var(--hv-border)" }}>
        <span className="font-bold text-[12px]" style={{ color: "var(--hv-text)" }}>📋 {isRtl ? "قائمة الخدمات / المنيو" : "Services menu"}</span>
        <button onClick={() => onChange({ show: !m.show })} className="px-3 py-1 rounded text-[11px] font-bold transition" style={m.show ? { background: "#7c3aed", color: "#fff" } : { background: "var(--hv-primary)", color: "#fff" }}>
          {m.show ? (isRtl ? "ظاهر ✓" : "Shown ✓") : (isRtl ? "إضافة" : "Add")}
        </button>
      </div>

      {!m.show ? (
        <p className="text-[11px] leading-relaxed rounded p-2 border" style={{ color: "var(--hv-text-soft)", background: "var(--hv-surface-2)", borderColor: "var(--hv-border)" }}>
          {isRtl ? "اضغط «إضافة» لمنيو احترافي بأقسام وأيقونات ولغتين — يتقلّص تلقائياً ليناسب التصميم. اسحبه لأي مكان." : "Click Add for a pro menu with sections, icons and bilingual support — auto-fits the canvas. Drag it anywhere."}
        </p>
      ) : (
        <>
          {/* Display options */}
          <div className="rounded-lg p-2.5 space-y-2 border" style={{ background: "var(--hv-surface-2)", borderColor: "var(--hv-border)" }}>
            {/* Language */}
            <div>
              <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "اللغة" : "Language"}</label>
              <div className="grid grid-cols-3 gap-1">
                {LANGS.map((l) => (
                  <button key={l.id} onClick={() => onChange({ lang: l.id })} className="py-1 rounded-lg text-[11px] font-bold transition"
                    style={(m.lang || "ar") === l.id ? { background: "var(--hv-grad)", color: "#fff" } : { background: "var(--hv-surface)", color: "var(--hv-text-soft)", border: "1px solid var(--hv-border)" }}>{l.label}</button>
                ))}
              </div>
            </div>
            {/* Style */}
            <div>
              <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "التصميم" : "Style"}</label>
              <div className="grid grid-cols-4 gap-1">
                {STYLES.map((s) => (
                  <button key={s.id} onClick={() => onChange({ style: s.id })} className="py-1 rounded-lg text-[10px] font-bold transition"
                    style={(m.style || "classic") === s.id ? { background: "var(--hv-grad)", color: "#fff" } : { background: "var(--hv-surface)", color: "var(--hv-text-soft)", border: "1px solid var(--hv-border)" }}>{isRtl ? s.ar : s.en}</button>
                ))}
              </div>
            </div>
            {/* Columns + autofit */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-[10px]" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "أعمدة:" : "Cols:"}</span>
                {[1, 2].map((c) => (
                  <button key={c} onClick={() => onChange({ columns: c })} className="w-7 py-0.5 rounded text-[11px] font-bold transition"
                    style={(m.columns || 1) === c ? { background: "var(--hv-primary)", color: "#fff" } : { background: "var(--hv-surface)", color: "var(--hv-text-soft)", border: "1px solid var(--hv-border)" }}>{c}</button>
                ))}
              </div>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={m.autoFit !== false} onChange={(e) => onChange({ autoFit: e.target.checked })} style={{ accentColor: "var(--hv-primary)" }} />
                <span className="text-[10px]" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "تحجيم تلقائي" : "Auto-fit"}</span>
              </label>
            </div>
          </div>

          {/* Title */}
          {showAr && <input value={m.title || ""} onChange={(e) => onChange({ title: e.target.value })} placeholder={isRtl ? "العنوان (عربي)" : "Title (AR)"} className="hv-input w-full" />}
          {showEn && <input value={m.titleEn || ""} onChange={(e) => onChange({ titleEn: e.target.value })} placeholder="Title (EN)" dir="ltr" className="hv-input w-full" />}
          {showAr && <input value={m.subtitle || ""} onChange={(e) => onChange({ subtitle: e.target.value })} placeholder={isRtl ? "العنوان الفرعي (شريط)" : "Subtitle pill (AR)"} className="hv-input w-full" />}
          {showEn && <input value={m.subtitleEn || ""} onChange={(e) => onChange({ subtitleEn: e.target.value })} placeholder="Subtitle (EN)" dir="ltr" className="hv-input w-full" />}

          {/* Logo */}
          <div className="rounded-lg p-2.5 space-y-2 border" style={{ background: "var(--hv-surface-2)", borderColor: "var(--hv-border)" }}>
            <label className="flex items-center gap-2 cursor-pointer text-[11px] font-bold" style={{ color: "var(--hv-text)" }}>
              <input type="checkbox" checked={!!m.showLogo} onChange={(e) => {
                const on = e.target.checked;
                const patch = { showLogo: on };
                if (on && !m.logoUrl) { const bl = loadLogo(); if (bl) patch.logoUrl = bl; }
                onChange(patch);
              }} style={{ accentColor: "var(--hv-primary)" }} />
              {isRtl ? "أضف الشعار أعلى المنيو" : "Add logo on top"}
            </label>
            {m.showLogo && (
              <>
                {m.logoUrl
                  ? <img src={m.logoUrl} alt="logo" className="h-10 mx-auto object-contain rounded bg-slate-50 p-1" />
                  : <p className="text-[10px]" style={{ color: "#b45309" }}>{isRtl ? "ما فيه شعار محفوظ — ارفع واحد أو استخدم شعار العلامة." : "No saved logo — upload one or use the brand logo."}</p>}
                <div className="flex gap-1.5">
                  <label className="hv-btn hv-btn-ghost flex-1 text-[10px] cursor-pointer !py-1.5">
                    {isRtl ? "رفع شعار" : "Upload"}
                    <input type="file" accept="image/png,image/*" className="hidden" onChange={onPickLogo} />
                  </label>
                  <button onClick={() => { const bl = loadLogo(); if (bl) onChange({ logoUrl: bl }); }}
                    className="hv-btn hv-btn-soft flex-1 text-[10px] !py-1.5">{isRtl ? "شعار العلامة" : "Brand logo"}</button>
                </div>
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "حجم الشعار" : "Logo size"}: {Math.round(m.logoSize || 22)}%</label>
                  <input type="range" min="10" max="50" step="1" value={m.logoSize || 22} onChange={(e) => onChange({ logoSize: parseInt(e.target.value) })} className="w-full" style={{ accentColor: "var(--hv-primary)" }} />
                </div>
              </>
            )}
          </div>

          {/* Background image */}
          <div className="rounded-lg p-2.5 space-y-2 border" style={{ background: "var(--hv-surface-2)", borderColor: "var(--hv-border)" }}>
            <p className="text-[11px] font-bold" style={{ color: "var(--hv-text)" }}>🖼️ {isRtl ? "خلفية صورة (شفافة)" : "Background image (faded)"}</p>
            {m.bgImage
              ? <img src={m.bgImage} alt="bg" className="h-14 w-full object-cover rounded" />
              : <p className="text-[10px]" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "ارفع صورة (أظافر، مساج، شعر…) تظهر خلف المنيو بشفافية." : "Upload an image (nails, massage…) shown faded behind the menu."}</p>}
            <div className="flex gap-1.5">
              <label className="hv-btn hv-btn-ghost flex-1 text-[10px] cursor-pointer !py-1.5">
                {isRtl ? "رفع صورة" : "Upload"}
                <input type="file" accept="image/*" className="hidden" onChange={onPickBg} />
              </label>
              {m.bgImage && <button onClick={() => onChange({ bgImage: "" })} className="hv-btn hv-btn-danger text-[10px] !py-1.5">{isRtl ? "إزالة" : "Remove"}</button>}
            </div>
            {m.bgImage && (
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "الشفافية" : "Opacity"}: {Math.round((m.bgImageOpacity ?? 0.15) * 100)}%</label>
                <input type="range" min="0.03" max="0.6" step="0.01" value={m.bgImageOpacity ?? 0.15} onChange={(e) => onChange({ bgImageOpacity: parseFloat(e.target.value) })} className="w-full" style={{ accentColor: "var(--hv-primary)" }} />
              </div>
            )}
            <p className="text-[9px]" style={{ color: "var(--hv-text-faint)" }}>{isRtl ? "💡 تقدر تجيب صور شفافة من تبويب «صور» ← «ابحث عن صور PNG»." : "💡 Find images in the Images tab → search PNGs."}</p>
          </div>

          {/* Sections */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold" style={{ color: "var(--hv-text)" }}>{isRtl ? "الأقسام والخدمات" : "Sections & items"}</label>
              <button onClick={addSection} className="hv-btn hv-btn-primary flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold"><Plus className="w-3 h-3" /> {isRtl ? "قسم" : "Section"}</button>
            </div>

            {sections.map((sec, si) => (
              <div key={si} className="rounded-lg border" style={{ borderColor: "var(--hv-border)", background: "var(--hv-surface)" }}>
                {/* Section header */}
                <div className="flex items-center gap-1 p-1.5">
                  <button onClick={() => setOpenSec(openSec === si ? -1 : si)} style={{ color: "var(--hv-text-soft)" }}>
                    {openSec === si ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  <input value={sec.title || ""} onChange={(e) => setSec(si, { title: e.target.value })} placeholder={isRtl ? "اسم القسم (شعر/أظافر…)" : "Section (AR)"} className="hv-input flex-1 text-[11px] font-bold" />
                  <button onClick={() => removeSection(si)} className="text-red-500 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                {openSec === si && (
                  <div className="px-2 pb-2 space-y-1.5">
                    {showEn && <input value={sec.titleEn || ""} onChange={(e) => setSec(si, { titleEn: e.target.value })} placeholder="Section (EN)" dir="ltr" className="hv-input w-full text-[11px]" />}
                    {(sec.items || []).map((it, ii) => {
                      const key = `${si}:${ii}`;
                      return (
                        <div key={ii} className="rounded-lg p-1.5 space-y-1 border" style={{ background: "var(--hv-surface-2)", borderColor: "var(--hv-border)" }}>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setIconFor(iconFor === key ? null : key)} title={isRtl ? "أيقونة" : "Icon"}
                              className="w-7 h-7 rounded flex items-center justify-center text-sm flex-shrink-0" style={{ background: "var(--hv-surface)", border: "1px solid var(--hv-border)" }}>
                              {it.icon || "🙂"}
                            </button>
                            {showAr && <input value={it.name || ""} onChange={(e) => setItem(si, ii, { name: e.target.value })} placeholder={isRtl ? "الاسم" : "Name AR"} className="hv-input flex-1 text-[11px]" />}
                            <input value={it.price || ""} onChange={(e) => setItem(si, ii, { price: e.target.value })} placeholder={isRtl ? "سعر" : "price"} className="hv-input w-16 text-[11px]" />
                            <button onClick={() => removeItem(si, ii)} className="text-red-500 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                          {iconFor === key && (
                            <div className="flex flex-wrap gap-1 p-1 rounded" style={{ background: "var(--hv-surface)" }}>
                              <button onClick={() => { setItem(si, ii, { icon: "" }); }} className="w-6 h-6 rounded text-[9px]" style={{ border: "1px solid var(--hv-border)" }} title="بدون">✕</button>
                              {QUICK_ICONS.map((e) => (
                                <button key={e} onClick={() => { setItem(si, ii, { icon: e }); setIconFor(null); }} className="w-6 h-6 rounded text-sm hover:bg-slate-100">{e}</button>
                              ))}
                            </div>
                          )}
                          {showEn && <input value={it.nameEn || ""} onChange={(e) => setItem(si, ii, { nameEn: e.target.value })} placeholder="Name EN" dir="ltr" className="hv-input w-full text-[11px]" />}
                          <input value={it.desc || ""} onChange={(e) => setItem(si, ii, { desc: e.target.value })} placeholder={isRtl ? "وصف اختياري" : "description"} className="hv-input w-full text-[11px]" />
                        </div>
                      );
                    })}
                    <button onClick={() => addItem(si)} className="w-full py-1 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1" style={{ background: "rgba(124,58,237,0.08)", color: "var(--hv-primary-700)" }}><Plus className="w-3 h-3" /> {isRtl ? "خدمة" : "Item"}</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Currency + dots */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "العملة" : "Currency"}</label>
              <select value={m.currency || "ريال"} onChange={(e) => onChange({ currency: e.target.value })} className="hv-input w-full text-[11px]">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-1 cursor-pointer mt-4">
              <input type="checkbox" checked={m.showDots !== false} onChange={(e) => onChange({ showDots: e.target.checked })} style={{ accentColor: "var(--hv-primary)" }} />
              <span className="text-[11px]" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "خط منقّط" : "Dotted"}</span>
            </label>
          </div>

          {/* Footer */}
          {showAr && <input value={m.footer || ""} onChange={(e) => onChange({ footer: e.target.value })} placeholder={isRtl ? "ملاحظة أسفل (عربي)" : "Footer (AR)"} className="hv-input w-full text-[11px]" />}
          {showEn && <input value={m.footerEn || ""} onChange={(e) => onChange({ footerEn: e.target.value })} placeholder="Footer (EN)" dir="ltr" className="hv-input w-full text-[11px]" />}

          {/* Themes + colors */}
          <div>
            <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "ثيم اللون" : "Color theme"}</label>
            <div className="grid grid-cols-6 gap-1.5">
              {THEMES.map((t) => (
                <button key={t.name} title={t.name} onClick={() => onChange({ accent: t.accent, textColor: t.text, bgColor: t.bg })}
                  className="h-8 rounded-lg border-2 transition hover:scale-110" style={{ background: t.accent, borderColor: m.accent === t.accent ? "var(--hv-primary)" : "var(--hv-border)" }} />
              ))}
            </div>
          </div>
          <StudioColorPicker label={isRtl ? "🎨 التمييز" : "🎨 Accent"} value={m.accent || "#7c3aed"} onChange={(v) => onChange({ accent: v })} />
          <StudioColorPicker label={isRtl ? "🖌️ النص" : "🖌️ Text"} value={m.textColor || "#1e1b3a"} onChange={(v) => onChange({ textColor: v })} />
          <StudioColorPicker label={isRtl ? "🟦 خلفية البطاقة" : "🟦 Card bg"} value={m.bgColor || "#ffffff"} onChange={(v) => onChange({ bgColor: v })} />

          {/* Font size + width */}
          <div>
            <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "🔠 حجم الخط" : "🔠 Font"}: {Math.round((m.fontScale || 1) * 100)}%</label>
            <input type="range" min="0.5" max="2.2" step="0.05" value={m.fontScale || 1} onChange={(e) => onChange({ fontScale: parseFloat(e.target.value) })} className="w-full" style={{ accentColor: "var(--hv-primary)" }} />
          </div>
          <div>
            <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "↔️ العرض" : "↔️ Width"}: {Math.round(m.width || 70)}%</label>
            <input type="range" min="30" max="95" step="1" value={m.width || 70} onChange={(e) => onChange({ width: parseInt(e.target.value) })} className="w-full" style={{ accentColor: "var(--hv-primary)" }} />
          </div>
          <p className="text-[10px] leading-relaxed border-t pt-2" style={{ color: "var(--hv-text-faint)", borderColor: "var(--hv-border)" }}>
            {isRtl ? "💡 اسحب المنيو على الكانفاس لتغيير مكانه. «تحجيم تلقائي» يخليه يقعد داخل التصميم." : "💡 Drag on the canvas. Auto-fit keeps it inside the design."}
          </p>
        </>
      )}
    </div>
  );
}
