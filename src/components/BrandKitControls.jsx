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

  const SWATCHES = ["#09007C", "#2E14ED", "#EF43DC", "#000000", "#FFFFFF", "#0F172A", "#E9E8E8", "#D4AF37", "#1877F2", "#E4405F"];
  const ColorField = ({ label, value, onCh }) => (
    <div className="flex-1">
      <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--hv-text-soft)" }}>{label}</label>
      <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 border" style={{ background: "var(--hv-surface)", borderColor: "var(--hv-border)" }}>
        <input type="color" value={value} onChange={(e) => onCh(e.target.value)} className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0" title={ar ? "منتقي متقدّم" : "Advanced picker"} />
        <input type="text" value={value} onChange={(e) => onCh(e.target.value)} className="flex-1 bg-transparent text-[12px] outline-none" style={{ color: "var(--hv-text)" }} dir="ltr" />
      </div>
      {/* Clickable presets — no dragging needed */}
      <div className="flex flex-wrap gap-1 mt-1.5">
        {SWATCHES.map((c) => (
          <button key={c} type="button" onClick={() => onCh(c)} title={c}
            className="w-5 h-5 rounded-full border transition"
            style={String(value).toLowerCase() === c.toLowerCase()
              ? { backgroundColor: c, borderColor: "var(--hv-primary)", boxShadow: "0 0 0 2px rgba(79,70,229,0.5)" }
              : { backgroundColor: c, borderColor: "#cbd5e1" }} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="rounded-xl p-3 space-y-3 border" style={{ background: "var(--hv-surface-2)", borderColor: "var(--hv-border)" }}>
      <p className="text-[12px] font-extrabold flex items-center gap-1.5" style={{ color: "var(--hv-secondary-600, #f43f5e)" }}>
        <Palette className="w-4 h-4" /> {ar ? "هويتك (تُحفظ مرة وحدة وتنطبق على الكل)" : "Your brand (saved once, used everywhere)"}
      </p>

      {logo ? (
        <div className="flex items-center gap-3 rounded-lg p-2 border" style={{ background: "var(--hv-surface)", borderColor: "var(--hv-border)" }}>
          <img src={logo} alt="logo" className="w-11 h-11 object-contain rounded bg-slate-50" />
          <span className="text-[11px] flex-1 font-bold text-emerald-600">{ar ? "الشعار محفوظ ويُستخدم تلقائياً" : "Logo saved & auto-used"}</span>
          <button onClick={() => setLogo("")} className="p-1 text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 border border-dashed rounded-lg py-2.5 cursor-pointer text-[12px] hover:bg-slate-100" style={{ background: "var(--hv-surface)", borderColor: "#cbd5e1", color: "var(--hv-text-soft)" }}>
          <Upload className="w-4 h-4" /> {ar ? "ارفع شعارك (PNG)" : "Upload your logo (PNG)"}
          <input type="file" accept="image/png,image/*" className="hidden" onChange={onPickLogo} />
        </label>
      )}

      <div className="flex gap-2">
        <ColorField label={ar ? "لون النص" : "Text color"} value={kit.mainColor} onCh={(v) => setKitField("mainColor", v)} />
        <ColorField label={ar ? "لون الكلمة المميزة" : "Highlight color"} value={kit.highlightColor} onCh={(v) => setKitField("highlightColor", v)} />
      </div>

      <div>
        <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--hv-text-soft)" }}>{ar ? "نوع الخط العربي" : "Arabic font"}</label>
        <select value={kit.font} onChange={(e) => setKitField("font", e.target.value)} className="hv-input text-[12px]">
          {FONTS.map((f) => <option key={f.v} value={f.v}>{ar ? f.ar : f.v}</option>)}
        </select>
        <p className="text-[10px] mt-1" style={{ color: "var(--hv-text-faint)" }}>{ar ? "💡 الذكاء يقرّب الأسلوب فقط. للخط بالضبط استخدم المنشئ." : "💡 AI approximates the style only."}</p>
      </div>

      <div>
        <label className="flex items-center gap-2 text-[11px] font-bold cursor-pointer" style={{ color: "var(--hv-text-soft)" }}>
          <input type="checkbox" checked={kit.changeLogoColor} onChange={(e) => setKitField("changeLogoColor", e.target.checked)} style={{ accentColor: "var(--hv-primary)" }} />
          {ar ? "غيّر لون الشعار (افتراضياً يبقى كما هو)" : "Recolor the logo (default: keep as-is)"}
        </label>
        {kit.changeLogoColor && (
          <div className="mt-2"><ColorField label={ar ? "لون الشعار" : "Logo color"} value={kit.logoColor} onCh={(v) => setKitField("logoColor", v)} /></div>
        )}
      </div>

      {/* Contact bar (handles) — fixed like the logo, used only when checked. */}
      <div className="border-t pt-3" style={{ borderColor: "var(--hv-border)" }}>
        <label className="flex items-center gap-2 text-[11px] font-bold cursor-pointer" style={{ color: "var(--hv-text-soft)" }}>
          <input type="checkbox" checked={!!kit.showContact} onChange={(e) => setKitField("showContact", e.target.checked)} style={{ accentColor: "var(--hv-primary)" }} />
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
                <label className="text-[10px] block mb-0.5" style={{ color: "var(--hv-text-faint)" }}>{label}</label>
                <input value={kit[k] || ""} onChange={(e) => setKitField(k, e.target.value)} placeholder={ph} dir="ltr" className="hv-input !py-1 text-[11px]" />
              </div>
            ))}
            <p className="col-span-2 text-[10px]" style={{ color: "var(--hv-text-faint)" }}>{ar ? "اترك أي خانة فاضية لتجاهلها. الأيقونات فقط بدون أسماء المنصات." : "Leave blank to skip. Icons only — no platform names."}</p>

            {/* Bar style */}
            <div className="col-span-2 border-t pt-2 mt-1 space-y-2" style={{ borderColor: "var(--hv-border)" }}>
              <div className="flex gap-2">
                <ColorField label={ar ? "لون الشريط" : "Bar color"} value={kit.contactBg || "#0F172A"} onCh={(v) => setKitField("contactBg", v)} />
                <ColorField label={ar ? "لون نص الشريط" : "Bar text"} value={kit.contactText || "#FFFFFF"} onCh={(v) => setKitField("contactText", v)} />
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-faint)" }}>{ar ? "اتجاه الشريط" : "Bar direction"}</label>
                <div className="grid grid-cols-2 gap-1">
                  {[{ v: "horizontal", ar: "أفقي", en: "Horizontal" }, { v: "vertical", ar: "عمودي", en: "Vertical" }].map((s) => {
                    const active = (kit.contactLayout || "horizontal") === s.v;
                    return (
                      <button key={s.v} onClick={() => setKitField("contactLayout", s.v)}
                        className="py-1.5 rounded-lg text-[11px] font-bold transition"
                        style={active ? { background: "var(--hv-grad)", color: "#fff" } : { background: "var(--hv-surface)", color: "var(--hv-text-soft)", border: "1px solid var(--hv-border)" }}>
                        {ar ? s.ar : s.en}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--hv-text-faint)" }}>{ar ? "شكل الشريط (للأفقي)" : "Bar shape"}</label>
                <div className="grid grid-cols-2 gap-1">
                  {[{ v: "strip", ar: "ممتد بعرض الصورة", en: "Full width" }, { v: "pill", ar: "كبسولة بالوسط", en: "Centered pill" }].map((s) => {
                    const active = (kit.contactShape || "strip") === s.v;
                    return (
                      <button key={s.v} onClick={() => setKitField("contactShape", s.v)}
                        className="py-1.5 rounded-lg text-[11px] font-bold transition"
                        style={active ? { background: "var(--hv-grad)", color: "#fff" } : { background: "var(--hv-surface)", color: "var(--hv-text-soft)", border: "1px solid var(--hv-border)" }}>
                        {ar ? s.ar : s.en}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
