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
      <div className={`flex items-center justify-between rounded-lg p-2.5 border ${o.show ? "bg-emerald-500/15 border-emerald-500/60" : "bg-slate-800/60 border-slate-600"}`}>
        <span className="font-bold text-[12px] text-slate-100">💰 {isRtl ? "بطاقة العروض والأسعار" : "Offers & Pricing"}</span>
        <button
          onClick={() => onChange({ show: !o.show })}
          className={`px-3 py-1 rounded text-[11px] font-bold transition ${o.show ? "bg-emerald-500 text-slate-900" : "bg-indigo-600 text-white hover:bg-indigo-500"}`}
        >
          {o.show ? (isRtl ? "ظاهر ✓" : "Shown ✓") : (isRtl ? "إضافة" : "Add")}
        </button>
      </div>

      {!o.show ? (
        <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-800/50 rounded p-2">
          {isRtl
            ? "اضغط «إضافة» لإظهار بطاقة أسعار احترافية على التصميم — اكتب خدماتك وأسعارها، ولوّنها بثيم واحد. اسحبها لأي مكان على الكانفاس."
            : "Click Add to drop a professional price list on your design. Type your services & prices, pick a theme, and drag it anywhere."}
        </p>
      ) : (
        <>
          {/* Title / subtitle */}
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "العنوان" : "Title"}</label>
              <input value={o.title || ""} onChange={(e) => onChange({ title: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "العنوان الفرعي (الشريط)" : "Subtitle (pill)"}</label>
              <input value={o.subtitle || ""} onChange={(e) => onChange({ subtitle: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white outline-none focus:border-indigo-500" />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-slate-300 font-bold">{isRtl ? "الخدمات والأسعار" : "Services & prices"}</label>
              <button onClick={addItem} className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold">
                <Plus className="w-3 h-3" /> {isRtl ? "صف" : "Row"}
              </button>
            </div>
            {items.map((it, i) => (
              <div key={i} className="bg-slate-800/70 border border-slate-700 rounded-lg p-2 space-y-1.5">
                <div className="flex items-center gap-1">
                  <GripVertical className="w-3 h-3 text-slate-500 flex-shrink-0" />
                  <input value={it.service} onChange={(e) => setItem(i, { service: e.target.value })}
                    placeholder={isRtl ? "اسم الخدمة" : "Service name"}
                    className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-[11px] outline-none focus:border-indigo-500" />
                  <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-300 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex gap-1.5">
                  <div className="flex-1">
                    <label className="text-[9px] text-emerald-300 block">{isRtl ? "السعر الجديد" : "New price"}</label>
                    <input value={it.price} onChange={(e) => setItem(i, { price: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-[11px] outline-none focus:border-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[9px] text-slate-400 block">{isRtl ? "السعر القديم" : "Old price"}</label>
                    <input value={it.oldPrice} onChange={(e) => setItem(i, { oldPrice: e.target.value })}
                      placeholder={isRtl ? "اختياري" : "optional"}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-[11px] outline-none focus:border-slate-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Currency + show old */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "العملة" : "Currency"}</label>
              <select value={o.currency || "ريال"} onChange={(e) => onChange({ currency: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white text-[11px] outline-none">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-1 cursor-pointer mt-4">
              <input type="checkbox" checked={o.showOld !== false} onChange={(e) => onChange({ showOld: e.target.checked })} />
              <span className="text-[11px] text-slate-300">{isRtl ? "أظهر «بدلاً من»" : "Show old price"}</span>
            </label>
          </div>

          {/* Footer note */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "ملاحظة أسفل البطاقة (اختياري)" : "Footer note (optional)"}</label>
            <input value={o.footer || ""} onChange={(e) => onChange({ footer: e.target.value })}
              placeholder={isRtl ? "مثال: العرض غير شامل الريفيل" : "e.g. terms apply"}
              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white text-[11px] outline-none focus:border-indigo-500" />
          </div>

          {/* Themes */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "ثيم اللون" : "Color theme"}</label>
            <div className="grid grid-cols-6 gap-1.5">
              {THEMES.map((t) => (
                <button key={t.name} title={t.name}
                  onClick={() => onChange({ accent: t.accent, textColor: t.text, rowBg: t.row })}
                  className={`h-8 rounded-lg border-2 transition hover:scale-110 ${o.accent === t.accent ? "border-white" : "border-slate-600"}`}
                  style={{ background: t.accent }} />
              ))}
            </div>
          </div>

          {/* Fine colors */}
          <StudioColorPicker label={isRtl ? "🎨 لون التمييز" : "🎨 Accent"} value={o.accent || "#b76e79"} onChange={(v) => onChange({ accent: v })} />
          <StudioColorPicker label={isRtl ? "🖌️ لون النص" : "🖌️ Text"} value={o.textColor || "#5b2333"} onChange={(v) => onChange({ textColor: v })} />
          <StudioColorPicker label={isRtl ? "🟦 خلفية الصف" : "🟦 Row background"} value={o.rowBg || "#ffffff"} onChange={(v) => onChange({ rowBg: v })} />

          {/* Width */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "العرض" : "Width"}: {Math.round(o.width || 72)}%</label>
            <input type="range" min="30" max="95" step="1" value={o.width || 72}
              onChange={(e) => onChange({ width: parseInt(e.target.value) })} className="w-full accent-indigo-500" />
          </div>

          <p className="text-[10px] text-slate-500 leading-relaxed border-t border-slate-700 pt-2">
            {isRtl ? "💡 اسحب البطاقة بالماوس على الكانفاس لتغيير مكانها." : "💡 Drag the card on the canvas to position it."}
          </p>
        </>
      )}
    </div>
  );
}
