import React from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import StudioColorPicker from "../StudioColorPicker";

// Curated accent themes for the services menu.
const THEMES = [
  { name: "بنفسجي", accent: "#7c3aed", text: "#1e1b3a", bg: "#ffffff" },
  { name: "وردي",   accent: "#b76e79", text: "#5b2333", bg: "#fff7f8" },
  { name: "ذهبي",   accent: "#c9a227", text: "#3d3000", bg: "#fffdf5" },
  { name: "أخضر",   accent: "#1a7d5a", text: "#0a3020", bg: "#f5fffa" },
  { name: "نيفي",   accent: "#3730a3", text: "#1e1b4b", bg: "#ffffff" },
  { name: "أسود",   accent: "#111827", text: "#111827", bg: "#ffffff" },
];

// "⃁" = the new Saudi Riyal symbol (U+20C1), then the rest.
const CURRENCIES = ["⃁", "ريال", "ر.س", "﷼", "$", "د.إ", "د.ك", "AED", "USD"];

// A services / price MENU (like a salon or restaurant menu): title + a clean
// list of "name …… price" rows with an optional description under each name.
// Differs from the Offers card: no discount/old-price, dotted leader style.
export default function MenuPanel({ menu, onChange, language }) {
  const isRtl = language === "ar";
  const m = menu || {};
  const items = m.items || [];

  const setItem = (i, patch) =>
    onChange({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  const addItem = () =>
    onChange({ items: [...items, { name: isRtl ? "خدمة جديدة" : "New item", desc: "", price: "0" }] });
  const removeItem = (i) => onChange({ items: items.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-3 text-xs">
      {/* Enable */}
      <div className="flex items-center justify-between rounded-lg p-2.5 border" style={m.show ? { background: "rgba(124,58,237,0.10)", borderColor: "rgba(124,58,237,0.55)" } : { background: "var(--hv-surface-2)", borderColor: "var(--hv-border)" }}>
        <span className="font-bold text-[12px]" style={{ color: "var(--hv-text)" }}>📋 {isRtl ? "قائمة الخدمات / المنيو" : "Services menu"}</span>
        <button
          onClick={() => onChange({ show: !m.show })}
          className="px-3 py-1 rounded text-[11px] font-bold transition"
          style={m.show ? { background: "#7c3aed", color: "#fff" } : { background: "var(--hv-primary)", color: "#fff" }}
        >
          {m.show ? (isRtl ? "ظاهر ✓" : "Shown ✓") : (isRtl ? "إضافة" : "Add")}
        </button>
      </div>

      {!m.show ? (
        <p className="text-[11px] leading-relaxed rounded p-2 border" style={{ color: "var(--hv-text-soft)", background: "var(--hv-surface-2)", borderColor: "var(--hv-border)" }}>
          {isRtl
            ? "اضغط «إضافة» لإظهار قائمة خدمات أنيقة على التصميم — اسم الخدمة، وصف اختياري، والسعر. اسحبها لأي مكان على الكانفاس."
            : "Click Add to drop an elegant services menu on your design — name, optional description, and price. Drag it anywhere."}
        </p>
      ) : (
        <>
          {/* Title / subtitle */}
          <div className="space-y-2">
            <div>
              <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "العنوان" : "Title"}</label>
              <input value={m.title || ""} onChange={(e) => onChange({ title: e.target.value })} className="hv-input w-full" />
            </div>
            <div>
              <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "العنوان الفرعي (الشريط)" : "Subtitle (pill)"}</label>
              <input value={m.subtitle || ""} onChange={(e) => onChange({ subtitle: e.target.value })} className="hv-input w-full" />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold" style={{ color: "var(--hv-text)" }}>{isRtl ? "العناصر" : "Items"}</label>
              <button onClick={addItem} className="hv-btn hv-btn-primary flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold">
                <Plus className="w-3 h-3" /> {isRtl ? "عنصر" : "Item"}
              </button>
            </div>
            {items.map((it, i) => (
              <div key={i} className="rounded-lg p-2 space-y-1.5 border" style={{ background: "var(--hv-surface-2)", borderColor: "var(--hv-border)" }}>
                <div className="flex items-center gap-1">
                  <GripVertical className="w-3 h-3 text-slate-500 flex-shrink-0" />
                  <input value={it.name} onChange={(e) => setItem(i, { name: e.target.value })}
                    placeholder={isRtl ? "اسم الخدمة" : "Item name"} className="hv-input flex-1 text-[11px]" />
                  <button onClick={() => removeItem(i)} className="text-red-500 hover:text-red-600 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex gap-1.5">
                  <input value={it.desc || ""} onChange={(e) => setItem(i, { desc: e.target.value })}
                    placeholder={isRtl ? "وصف اختياري" : "description (optional)"} className="hv-input flex-1 text-[11px]" />
                  <input value={it.price} onChange={(e) => setItem(i, { price: e.target.value })}
                    placeholder={isRtl ? "السعر" : "price"} className="hv-input w-20 text-[11px]" />
                </div>
              </div>
            ))}
          </div>

          {/* Currency + dotted leader */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "العملة" : "Currency"}</label>
              <select value={m.currency || "ريال"} onChange={(e) => onChange({ currency: e.target.value })} className="hv-input w-full text-[11px]">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-1 cursor-pointer mt-4">
              <input type="checkbox" checked={m.showDots !== false} onChange={(e) => onChange({ showDots: e.target.checked })} style={{ accentColor: "var(--hv-primary)" }} />
              <span className="text-[11px]" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "خط منقّط" : "Dotted leader"}</span>
            </label>
          </div>

          {/* Footer note */}
          <div>
            <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "ملاحظة أسفل القائمة (اختياري)" : "Footer note (optional)"}</label>
            <input value={m.footer || ""} onChange={(e) => onChange({ footer: e.target.value })}
              placeholder={isRtl ? "مثال: الأسعار شاملة الضريبة" : "e.g. prices incl. VAT"} className="hv-input w-full text-[11px]" />
          </div>

          {/* Themes */}
          <div>
            <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "ثيم اللون" : "Color theme"}</label>
            <div className="grid grid-cols-6 gap-1.5">
              {THEMES.map((t) => (
                <button key={t.name} title={t.name}
                  onClick={() => onChange({ accent: t.accent, textColor: t.text, bgColor: t.bg })}
                  className="h-8 rounded-lg border-2 transition hover:scale-110"
                  style={{ background: t.accent, borderColor: m.accent === t.accent ? "var(--hv-primary)" : "var(--hv-border)" }} />
              ))}
            </div>
          </div>

          <StudioColorPicker label={isRtl ? "🎨 لون التمييز" : "🎨 Accent"} value={m.accent || "#7c3aed"} onChange={(v) => onChange({ accent: v })} />
          <StudioColorPicker label={isRtl ? "🖌️ لون النص" : "🖌️ Text"} value={m.textColor || "#1e1b3a"} onChange={(v) => onChange({ textColor: v })} />
          <StudioColorPicker label={isRtl ? "🟦 خلفية البطاقة" : "🟦 Card background"} value={m.bgColor || "#ffffff"} onChange={(v) => onChange({ bgColor: v })} />

          {/* Font size */}
          <div>
            <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "🔠 حجم الخط" : "🔠 Font size"}: {Math.round((m.fontScale || 1) * 100)}%</label>
            <input type="range" min="0.5" max="2.2" step="0.05" value={m.fontScale || 1}
              onChange={(e) => onChange({ fontScale: parseFloat(e.target.value) })} className="w-full" style={{ accentColor: "var(--hv-primary)" }} />
          </div>

          {/* Width */}
          <div>
            <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "↔️ عرض القائمة" : "↔️ Width"}: {Math.round(m.width || 70)}%</label>
            <input type="range" min="30" max="95" step="1" value={m.width || 70}
              onChange={(e) => onChange({ width: parseInt(e.target.value) })} className="w-full" style={{ accentColor: "var(--hv-primary)" }} />
          </div>

          <p className="text-[10px] leading-relaxed border-t pt-2" style={{ color: "var(--hv-text-faint)", borderColor: "var(--hv-border)" }}>
            {isRtl ? "💡 اسحب القائمة بالماوس على الكانفاس لتغيير مكانها." : "💡 Drag the menu on the canvas to position it."}
          </p>
        </>
      )}
    </div>
  );
}
