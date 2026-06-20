import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import StudioColorPicker from "../StudioColorPicker";
import { loadLogo } from "@/utils/imagePrompt";

const THEMES = [
  { name: "بنفسجي", accent: "#7c3aed", text: "#1e1b3a", bg: "#ffffff", card: "#ffffff" },
  { name: "وردي",   accent: "#b76e79", text: "#5b2333", bg: "#fff7f8", card: "#ffffff" },
  { name: "ذهبي",   accent: "#c9a227", text: "#3d3000", bg: "#fffdf5", card: "#ffffff" },
  { name: "أخضر",   accent: "#1a7d5a", text: "#0a3020", bg: "#f5fffa", card: "#ffffff" },
  { name: "نيفي",   accent: "#3730a3", text: "#1e1b4b", bg: "#ffffff", card: "#ffffff" },
  { name: "أسود",   accent: "#111827", text: "#111827", bg: "#ffffff", card: "#ffffff" },
];
const LANGS = [
  { id: "ar", label: "عربي" },
  { id: "en", label: "إنجليزي" },
  { id: "both", label: "الاثنين" },
];
const QUICK_ICONS = ["🔗", "⏰", "💳", "⭐", "🔔", "📊", "✨", "🚀", "🎯", "🛡️", "💡", "📱", "🤝", "🎁", "🔥", "💎", "📈", "🧾", "🗓️", "✅"];

// Features Showcase — hero (logo + title + subtitle) above a grid of cards
// (icon + title + short description), bilingual (ar/en/both), configurable
// columns and auto-fit.
export default function FeaturesPanel({ features, onChange, language }) {
  const isRtl = language === "ar";
  const m = features || {};
  const [iconFor, setIconFor] = useState(null); // index whose icon picker is open

  const cards = m.cards || [];
  const setCards = (next) => onChange({ cards: next });
  const setCard = (i, patch) => setCards(cards.map((c, j) => j === i ? { ...c, ...patch } : c));
  const addCard = () => setCards([...cards, { icon: "✨", title: isRtl ? "ميزة جديدة" : "New feature", titleEn: "", desc: isRtl ? "وصف قصير" : "Short description", descEn: "" }]);
  const removeCard = (i) => setCards(cards.filter((_, j) => j !== i));

  const onPickLogo = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => onChange({ showLogo: true, logoUrl: String(r.result || "") });
    r.readAsDataURL(f);
  };

  const lang = m.lang || "ar";
  const showAr = lang === "ar" || lang === "both";
  const showEn = lang === "en" || lang === "both";

  return (
    <div className="space-y-3 text-xs">
      {/* Enable */}
      <div className="flex items-center justify-between rounded-lg p-2.5 border" style={m.show ? { background: "rgba(124,58,237,0.10)", borderColor: "rgba(124,58,237,0.55)" } : { background: "var(--hv-surface-2)", borderColor: "var(--hv-border)" }}>
        <span className="font-bold text-[12px]" style={{ color: "var(--hv-text)" }}>✨ {isRtl ? "عرض المميزات" : "Features showcase"}</span>
        <button onClick={() => onChange({ show: !m.show })} className="px-3 py-1 rounded text-[11px] font-bold transition" style={m.show ? { background: "#7c3aed", color: "#fff" } : { background: "var(--hv-primary)", color: "#fff" }}>
          {m.show ? (isRtl ? "ظاهر ✓" : "Shown ✓") : (isRtl ? "إضافة" : "Add")}
        </button>
      </div>

      {!m.show ? (
        <p className="text-[11px] leading-relaxed rounded p-2 border" style={{ color: "var(--hv-text-soft)", background: "var(--hv-surface-2)", borderColor: "var(--hv-border)" }}>
          {isRtl ? "اضغط «إضافة» لشبكة مميزات احترافية بعنوان وبطاقات (أيقونة + عنوان + وصف) — تتقلّص تلقائياً لتناسب التصميم. اسحبها لأي مكان." : "Click Add for a pro features grid with a title and cards (icon + title + description) — auto-fits the canvas. Drag it anywhere."}
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
            {/* Columns + autofit */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-[10px]" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "أعمدة:" : "Cols:"}</span>
                {[1, 2, 3].map((c) => (
                  <button key={c} onClick={() => onChange({ columns: c })} className="w-7 py-0.5 rounded text-[11px] font-bold transition"
                    style={(m.columns || 2) === c ? { background: "var(--hv-primary)", color: "#fff" } : { background: "var(--hv-surface)", color: "var(--hv-text-soft)", border: "1px solid var(--hv-border)" }}>{c}</button>
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
          {showAr && <input value={m.subtitle || ""} onChange={(e) => onChange({ subtitle: e.target.value })} placeholder={isRtl ? "العنوان الفرعي" : "Subtitle (AR)"} className="hv-input w-full" />}
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
              {isRtl ? "أضف الشعار في الأعلى" : "Add logo on top"}
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

          {/* Cards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold" style={{ color: "var(--hv-text)" }}>{isRtl ? "البطاقات" : "Cards"}</label>
              <button onClick={addCard} className="hv-btn hv-btn-primary flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold"><Plus className="w-3 h-3" /> {isRtl ? "بطاقة" : "Card"}</button>
            </div>

            {cards.map((c, i) => (
              <div key={i} className="rounded-lg p-1.5 space-y-1 border" style={{ background: "var(--hv-surface-2)", borderColor: "var(--hv-border)" }}>
                <div className="flex items-center gap-1">
                  <button onClick={() => setIconFor(iconFor === i ? null : i)} title={isRtl ? "أيقونة" : "Icon"}
                    className="w-7 h-7 rounded flex items-center justify-center text-sm flex-shrink-0" style={{ background: "var(--hv-surface)", border: "1px solid var(--hv-border)" }}>
                    {c.icon || "🙂"}
                  </button>
                  {showAr && <input value={c.title || ""} onChange={(e) => setCard(i, { title: e.target.value })} placeholder={isRtl ? "العنوان" : "Title AR"} className="hv-input flex-1 text-[11px] font-bold" />}
                  <button onClick={() => removeCard(i)} className="text-red-500 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                {iconFor === i && (
                  <div className="flex flex-wrap gap-1 p-1 rounded" style={{ background: "var(--hv-surface)" }}>
                    <input value={c.icon || ""} onChange={(e) => setCard(i, { icon: e.target.value })} placeholder="emoji" className="hv-input w-14 text-[11px]" />
                    {QUICK_ICONS.map((e) => (
                      <button key={e} onClick={() => { setCard(i, { icon: e }); setIconFor(null); }} className="w-6 h-6 rounded text-sm hover:bg-slate-100">{e}</button>
                    ))}
                  </div>
                )}
                {showEn && <input value={c.titleEn || ""} onChange={(e) => setCard(i, { titleEn: e.target.value })} placeholder="Title EN" dir="ltr" className="hv-input w-full text-[11px]" />}
                {showAr && <input value={c.desc || ""} onChange={(e) => setCard(i, { desc: e.target.value })} placeholder={isRtl ? "وصف قصير" : "Description AR"} className="hv-input w-full text-[11px]" />}
                {showEn && <input value={c.descEn || ""} onChange={(e) => setCard(i, { descEn: e.target.value })} placeholder="Description EN" dir="ltr" className="hv-input w-full text-[11px]" />}
              </div>
            ))}
            <button onClick={addCard} className="w-full py-1 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1" style={{ background: "rgba(124,58,237,0.08)", color: "var(--hv-primary-700)" }}><Plus className="w-3 h-3" /> {isRtl ? "بطاقة" : "Card"}</button>
          </div>

          {/* Footer */}
          {showAr && <input value={m.footer || ""} onChange={(e) => onChange({ footer: e.target.value })} placeholder={isRtl ? "ملاحظة أسفل (عربي)" : "Footer (AR)"} className="hv-input w-full text-[11px]" />}
          {showEn && <input value={m.footerEn || ""} onChange={(e) => onChange({ footerEn: e.target.value })} placeholder="Footer (EN)" dir="ltr" className="hv-input w-full text-[11px]" />}

          {/* Themes + colors */}
          <div>
            <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "ثيم اللون" : "Color theme"}</label>
            <div className="grid grid-cols-6 gap-1.5">
              {THEMES.map((t) => (
                <button key={t.name} title={t.name} onClick={() => onChange({ accent: t.accent, textColor: t.text, bgColor: t.bg, cardBg: t.card })}
                  className="h-8 rounded-lg border-2 transition hover:scale-110" style={{ background: t.accent, borderColor: m.accent === t.accent ? "var(--hv-primary)" : "var(--hv-border)" }} />
              ))}
            </div>
          </div>
          <StudioColorPicker label={isRtl ? "🎨 التمييز" : "🎨 Accent"} value={m.accent || "#7c3aed"} onChange={(v) => onChange({ accent: v })} />
          <StudioColorPicker label={isRtl ? "🖌️ النص" : "🖌️ Text"} value={m.textColor || "#1e1b3a"} onChange={(v) => onChange({ textColor: v })} />
          <StudioColorPicker label={isRtl ? "🟦 الخلفية" : "🟦 Background"} value={m.bgColor || "#ffffff"} onChange={(v) => onChange({ bgColor: v })} />
          <StudioColorPicker label={isRtl ? "🟪 خلفية البطاقة" : "🟪 Card bg"} value={m.cardBg || "#ffffff"} onChange={(v) => onChange({ cardBg: v })} />

          {/* Font size + width */}
          <div>
            <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "🔠 حجم الخط" : "🔠 Font"}: {Math.round((m.fontScale || 1) * 100)}%</label>
            <input type="range" min="0.5" max="2.2" step="0.05" value={m.fontScale || 1} onChange={(e) => onChange({ fontScale: parseFloat(e.target.value) })} className="w-full" style={{ accentColor: "var(--hv-primary)" }} />
          </div>
          <div>
            <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "↔️ العرض" : "↔️ Width"}: {Math.round(m.width || 82)}%</label>
            <input type="range" min="30" max="95" step="1" value={m.width || 82} onChange={(e) => onChange({ width: parseInt(e.target.value) })} className="w-full" style={{ accentColor: "var(--hv-primary)" }} />
          </div>
          <p className="text-[10px] leading-relaxed border-t pt-2" style={{ color: "var(--hv-text-faint)", borderColor: "var(--hv-border)" }}>
            {isRtl ? "💡 اسحب الشبكة على الكانفاس لتغيير مكانها. «تحجيم تلقائي» يخليها تقعد داخل التصميم." : "💡 Drag on the canvas. Auto-fit keeps it inside the design."}
          </p>
        </>
      )}
    </div>
  );
}
