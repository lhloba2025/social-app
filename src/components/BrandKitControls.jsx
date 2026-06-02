import React, { useState, useEffect } from "react";
import { Upload, X, Palette } from "lucide-react";
import { LOGO_KEY, KIT_KEY, FONTS, loadKit, loadLogo } from "@/utils/imagePrompt";

// Reusable brand-identity controls (logo + colors + Arabic font + logo recolor).
// Self-persisting to localStorage, and notifies the parent via onChange so it
// can use the current kit/logo when generating. Shared by the custom + bulk
// image generators so a client's identity is set ONCE and applies everywhere.
export default function BrandKitControls({ ar, onChange }) {
  const [logo, setLogo] = useState(loadLogo);
  const [kit, setKit] = useState(loadKit);

  useEffect(() => {
    try { if (logo) localStorage.setItem(LOGO_KEY, logo); else localStorage.removeItem(LOGO_KEY); } catch {}
    onChange?.(kit, logo);
  }, [logo]);
  useEffect(() => {
    try { localStorage.setItem(KIT_KEY, JSON.stringify(kit)); } catch {}
    onChange?.(kit, logo);
  }, [kit]);
  useEffect(() => { onChange?.(kit, logo); }, []); // initial

  const setKitField = (k, v) => setKit((prev) => ({ ...prev, [k]: v }));
  const onPickLogo = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => setLogo(String(r.result || ""));
    r.readAsDataURL(f);
  };

  const ColorField = ({ label, value, onCh }) => (
    <div className="flex-1">
      <label className="text-[11px] font-semibold text-slate-300 block mb-1">{label}</label>
      <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5">
        <input type="color" value={value} onChange={(e) => onCh(e.target.value)} className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0" />
        <input type="text" value={value} onChange={(e) => onCh(e.target.value)} className="flex-1 bg-transparent text-[12px] text-white outline-none" dir="ltr" />
      </div>
    </div>
  );

  return (
    <div className="border border-slate-800 rounded-xl p-3 space-y-3 bg-slate-900/40">
      <p className="text-[12px] font-bold text-fuchsia-300 flex items-center gap-1.5">
        <Palette className="w-4 h-4" /> {ar ? "هويتك (تُحفظ مرة وحدة وتنطبق على الكل)" : "Your brand (saved once, used everywhere)"}
      </p>

      {logo ? (
        <div className="flex items-center gap-3 bg-slate-800/60 rounded-lg p-2">
          <img src={logo} alt="logo" className="w-11 h-11 object-contain rounded bg-white/5" />
          <span className="text-[11px] text-emerald-300 flex-1">{ar ? "الشعار محفوظ ويُستخدم تلقائياً" : "Logo saved & auto-used"}</span>
          <button onClick={() => setLogo("")} className="text-slate-400 hover:text-red-300 p-1"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-600 rounded-lg py-2.5 cursor-pointer text-[12px] text-slate-300">
          <Upload className="w-4 h-4" /> {ar ? "ارفع شعارك (PNG)" : "Upload your logo (PNG)"}
          <input type="file" accept="image/png,image/*" className="hidden" onChange={onPickLogo} />
        </label>
      )}

      <div className="flex gap-2">
        <ColorField label={ar ? "لون النص" : "Text color"} value={kit.mainColor} onCh={(v) => setKitField("mainColor", v)} />
        <ColorField label={ar ? "لون الكلمة المميزة" : "Highlight color"} value={kit.highlightColor} onCh={(v) => setKitField("highlightColor", v)} />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-slate-300 block mb-1">{ar ? "نوع الخط العربي" : "Arabic font"}</label>
        <select value={kit.font} onChange={(e) => setKitField("font", e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-[12px] text-white outline-none focus:border-indigo-500">
          {FONTS.map((f) => <option key={f.v} value={f.v}>{ar ? f.ar : f.v}</option>)}
        </select>
        <p className="text-[10px] text-slate-500 mt-1">{ar ? "💡 الذكاء يقرّب الأسلوب فقط. للخط بالضبط استخدم المنشئ." : "💡 AI approximates the style only."}</p>
      </div>

      <div>
        <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-300 cursor-pointer">
          <input type="checkbox" checked={kit.changeLogoColor} onChange={(e) => setKitField("changeLogoColor", e.target.checked)} />
          {ar ? "غيّر لون الشعار (افتراضياً يبقى كما هو)" : "Recolor the logo (default: keep as-is)"}
        </label>
        {kit.changeLogoColor && (
          <div className="mt-2"><ColorField label={ar ? "لون الشعار" : "Logo color"} value={kit.logoColor} onCh={(v) => setKitField("logoColor", v)} /></div>
        )}
      </div>

      {/* Contact bar (handles) — fixed like the logo, used only when checked. */}
      <div className="border-t border-slate-800 pt-3">
        <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-300 cursor-pointer">
          <input type="checkbox" checked={!!kit.showContact} onChange={(e) => setKitField("showContact", e.target.checked)} />
          {ar ? "أضف شريط معرفات التواصل أسفل الصورة" : "Add a contact bar at the bottom"}
        </label>
        {kit.showContact && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              ["cInstagram", ar ? "انستقرام" : "Instagram", "@hovera_sa"],
              ["cTiktok", ar ? "تيك توك" : "TikTok", "@hovera_sa"],
              ["cSnapchat", ar ? "سناب" : "Snapchat", "@hovera_sa"],
              ["cTwitter", ar ? "تويتر/X" : "X", "@hovera_sa"],
              ["cWhatsapp", ar ? "واتساب/جوال" : "WhatsApp", "055 1 64 65 66"],
              ["cWebsite", ar ? "الموقع" : "Website", "hovera.sa"],
            ].map(([k, label, ph]) => (
              <div key={k}>
                <label className="text-[10px] text-slate-400 block mb-0.5">{label}</label>
                <input value={kit[k] || ""} onChange={(e) => setKitField(k, e.target.value)} placeholder={ph} dir="ltr"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[11px] text-white outline-none focus:border-indigo-500" />
              </div>
            ))}
            <p className="col-span-2 text-[10px] text-slate-500">{ar ? "اترك أي خانة فاضية لتجاهلها. الأيقونات فقط بدون أسماء المنصات." : "Leave blank to skip. Icons only — no platform names."}</p>

            {/* Bar style */}
            <div className="col-span-2 border-t border-slate-800 pt-2 mt-1 space-y-2">
              <div className="flex gap-2">
                <ColorField label={ar ? "لون الشريط" : "Bar color"} value={kit.contactBg || "#0F172A"} onCh={(v) => setKitField("contactBg", v)} />
                <ColorField label={ar ? "لون نص الشريط" : "Bar text"} value={kit.contactText || "#FFFFFF"} onCh={(v) => setKitField("contactText", v)} />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">{ar ? "اتجاه الشريط" : "Bar direction"}</label>
                <div className="grid grid-cols-2 gap-1">
                  {[{ v: "horizontal", ar: "أفقي", en: "Horizontal" }, { v: "vertical", ar: "عمودي", en: "Vertical" }].map((s) => (
                    <button key={s.v} onClick={() => setKitField("contactLayout", s.v)}
                      className={`py-1.5 rounded text-[11px] font-bold transition ${ (kit.contactLayout || "horizontal") === s.v ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
                      {ar ? s.ar : s.en}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">{ar ? "شكل الشريط (للأفقي)" : "Bar shape"}</label>
                <div className="grid grid-cols-2 gap-1">
                  {[{ v: "strip", ar: "ممتد بعرض الصورة", en: "Full width" }, { v: "pill", ar: "كبسولة بالوسط", en: "Centered pill" }].map((s) => (
                    <button key={s.v} onClick={() => setKitField("contactShape", s.v)}
                      className={`py-1.5 rounded text-[11px] font-bold transition ${ (kit.contactShape || "strip") === s.v ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
                      {ar ? s.ar : s.en}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
