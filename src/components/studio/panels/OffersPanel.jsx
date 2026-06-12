import React from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import StudioColorPicker from "../StudioColorPicker";

// Curated accent themes for the pricing block.
const THEMES = [
  { name: "وردي", accent: "#b76e79", text: "#5b2333", row: "#ffffff" },
  { name: "ذهبي", accent: "#c9a227", text: "#3d3000", row: "#fffdf5" },
  { name: "نيفي", accent: "#3730a3", text: "#1e1b4b", row: "#ffffff" },
  { name: "أخضر", accent: "#1a7d5a", text: "#0a3020", row: "#ffffff" },
  { name: "أسود", accent: "#111827", text: "#111827", row: "#ffffff" },
  { name: "بنفسجي", accent: "#7c3aed", text: "#3b0764", row: "#ffffff" },
];

const CURRENCIES = ["ريال", "ر.س", "﷼", "$", "د.إ", "د.ك", "AED", "USD"];

export default function OffersPanel({ offers, onChange, language }) {
  const isRtl = language === "ar";
  const o = offers || {};
  const items = o.items || [];

  const setItem = (i, patch) =>
    onChange({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  const addItem = () =>
    onChange({ items: [...items, { service: isRtl ? "خدمة جديدة" : "New service", price: "0", oldPrice: "" }] });
  const removeItem = (i) => onChange({ items: items.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-3 text-xs">
      {/* Enable */}
      <div className="flex items-center justify-between rounded-lg p-2.5 border" style={o.show ? { background: "rgba(16,185,129,0.10)", borderColor: "rgba(16,185,129,0.55)" } : { background: "var(--hv-surface-2)", borderColor: "var(--hv-border)" }}>
        <span className="font-bold text-[12px]" style={{ color: "var(--hv-text)" }}>💰 {isRtl ? "بطاقة العروض والأسعار" : "Offers & Pricing"}</span>
        <button
          onClick={() => onChange({ show: !o.show })}
          className="px-3 py-1 rounded text-[11px] font-bold transition"
          style={o.show ? { background: "#10b981", color: "#fff" } : { background: "var(--hv-primary)", color: "#fff" }}
        >
          {o.show ? (isRtl ? "ظاهر ✓" : "Shown ✓") : (isRtl ? "إضافة" : "Add")}
        </button>
      </div>

      {!o.show ? (
        <p className="text-[11px] leading-relaxed rounded p-2 border" style={{ color: "var(--hv-text-soft)", background: "var(--hv-surface-2)", borderColor: "var(--hv-border)" }}>
          {isRtl
            ? "اضغط «إضافة» لإظهار بطاقة أسعار احترافية على التصميم — اكتب خدماتك وأسعارها، ولوّنها بثيم واحد. اسحبها لأي مكان على الكانفاس."
            : "Click Add to drop a professional price list on your design. Type your services & prices, pick a theme, and drag it anywhere."}
        </p>
      ) : (
        <>
          {/* Title / subtitle */}
          <div className="space-y-2">
            <div>
              <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "العنوان" : "Title"}</label>
              <input value={o.title || ""} onChange={(e) => onChange({ title: e.target.value })}
                className="hv-input w-full" />
            </div>
            <div>
              <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "العنوان الفرعي (الشريط)" : "Subtitle (pill)"}</label>
              <input value={o.subtitle || ""} onChange={(e) => onChange({ subtitle: e.target.value })}
                className="hv-input w-full" />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold" style={{ color: "var(--hv-text)" }}>{isRtl ? "الخدمات والأسعار" : "Services & prices"}</label>
              <button onClick={addItem} className="hv-btn hv-btn-primary flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold">
                <Plus className="w-3 h-3" /> {isRtl ? "صف" : "Row"}
              </button>
            </div>
            {items.map((it, i) => (
              <div key={i} className="rounded-lg p-2 space-y-1.5 border" style={{ background: "var(--hv-surface-2)", borderColor: "var(--hv-border)" }}>
                <div className="flex items-center gap-1">
                  <GripVertical className="w-3 h-3 text-slate-500 flex-shrink-0" />
                  <input value={it.service} onChange={(e) => setItem(i, { service: e.target.value })}
                    placeholder={isRtl ? "اسم الخدمة" : "Service name"}
                    className="hv-input flex-1 text-[11px]" />
                  <button onClick={() => removeItem(i)} className="text-red-500 hover:text-red-600 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex gap-1.5">
                  <div className="flex-1">
                    <label className="text-[9px] block" style={{ color: "#059669" }}>{isRtl ? "السعر الجديد" : "New price"}</label>
                    <input value={it.price} onChange={(e) => setItem(i, { price: e.target.value })}
                      className="hv-input w-full text-[11px]" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[9px] block" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "السعر القديم" : "Old price"}</label>
                    <input value={it.oldPrice} onChange={(e) => setItem(i, { oldPrice: e.target.value })}
                      placeholder={isRtl ? "اختياري" : "optional"}
                      className="hv-input w-full text-[11px]" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Currency + show old */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "العملة" : "Currency"}</label>
              <select value={o.currency || "ريال"} onChange={(e) => onChange({ currency: e.target.value })}
                className="hv-input w-full text-[11px]">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-1 cursor-pointer mt-4">
              <input type="checkbox" checked={o.showOld !== false} onChange={(e) => onChange({ showOld: e.target.checked })} style={{ accentColor: "var(--hv-primary)" }} />
              <span className="text-[11px]" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "أظهر «بدلاً من»" : "Show old price"}</span>
            </label>
          </div>

          {/* Footer note */}
          <div>
            <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "ملاحظة أسفل البطاقة (اختياري)" : "Footer note (optional)"}</label>
            <input value={o.footer || ""} onChange={(e) => onChange({ footer: e.target.value })}
              placeholder={isRtl ? "مثال: العرض غير شامل الريفيل" : "e.g. terms apply"}
              className="hv-input w-full text-[11px]" />
          </div>

          {/* Themes */}
          <div>
            <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "ثيم اللون" : "Color theme"}</label>
            <div className="grid grid-cols-6 gap-1.5">
              {THEMES.map((t) => (
                <button key={t.name} title={t.name}
                  onClick={() => onChange({ accent: t.accent, textColor: t.text, rowBg: t.row })}
                  className="h-8 rounded-lg border-2 transition hover:scale-110"
                  style={{ background: t.accent, borderColor: o.accent === t.accent ? "var(--hv-primary)" : "var(--hv-border)" }} />
              ))}
            </div>
          </div>

          {/* Fine colors */}
          <StudioColorPicker label={isRtl ? "🎨 لون التمييز" : "🎨 Accent"} value={o.accent || "#b76e79"} onChange={(v) => onChange({ accent: v })} />
          <StudioColorPicker label={isRtl ? "🖌️ لون النص" : "🖌️ Text"} value={o.textColor || "#5b2333"} onChange={(v) => onChange({ textColor: v })} />
          <StudioColorPicker label={isRtl ? "🟦 خلفية الصف" : "🟦 Row background"} value={o.rowBg || "#ffffff"} onChange={(v) => onChange({ rowBg: v })} />

          {/* Font size */}
          <div>
            <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "🔠 حجم الخط" : "🔠 Font size"}: {Math.round((o.fontScale || 1) * 100)}%</label>
            <input type="range" min="0.5" max="2.2" step="0.05" value={o.fontScale || 1}
              onChange={(e) => onChange({ fontScale: parseFloat(e.target.value) })} className="w-full" style={{ accentColor: "var(--hv-primary)" }} />
          </div>

          {/* Width */}
          <div>
            <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "↔️ عرض البطاقة" : "↔️ Width"}: {Math.round(o.width || 72)}%</label>
            <input type="range" min="30" max="95" step="1" value={o.width || 72}
              onChange={(e) => onChange({ width: parseInt(e.target.value) })} className="w-full" style={{ accentColor: "var(--hv-primary)" }} />
          </div>

          <p className="text-[10px] leading-relaxed border-t pt-2" style={{ color: "var(--hv-text-faint)", borderColor: "var(--hv-border)" }}>
            {isRtl ? "💡 اسحب البطاقة بالماوس على الكانفاس لتغيير مكانها." : "💡 Drag the card on the canvas to position it."}
          </p>
        </>
      )}
    </div>
  );
}
