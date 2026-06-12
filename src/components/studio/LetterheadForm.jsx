import React, { useState, useEffect } from "react";
import { Loader2, Upload, X, FileText, Download, Check, ImagePlus, Edit3 } from "lucide-react";
import { loadKit, loadLogo, FONTS } from "@/utils/imagePrompt";
import { composeLetterhead } from "@/utils/composeLetterhead";
import { uploadFile } from "@/api/localClient";
import { addLocalMedia } from "@/utils/localMediaStore";
import { shrinkBlobToLimit } from "@/utils/imageConvert";

const SWATCHES = ["#09007C", "#2E14ED", "#EF43DC", "#0F172A", "#000000", "#1877F2"];
const ACCENTS = ["#8DB600", "#EF43DC", "#D4AF37", "#0A7E5E", "#2E14ED", "#8A1538"];

// Live editor for the official letterhead STRIP (ترويسة). Fills only what the
// user wants, with a live preview + controls (logo size/position/recolor, text
// size, logo placement). Outputs a PNG: download, save to library, or open in
// the Design Studio.
export default function LetterheadForm({ isRtl = true, size, onCancel, onDone }) {
  const ar = isRtl;
  const kit = loadKit();
  const savedLogo = loadLogo();

  const [logo, setLogo] = useState(savedLogo || "");
  const [f, setF] = useState({
    nameAr: "", subAr: "", nameEn: "", subEn: "",
    cr: "", vat: "", phone: kit.cWhatsapp || "", website: kit.cWebsite || "",
  });
  const [headerColor, setHeaderColor] = useState(kit.mainColor || "#0F172A");
  const [accentColor, setAccentColor] = useState(kit.highlightColor || "#8DB600");
  const [font, setFont] = useState(kit.font || "Tajawal");
  const [recolorLogo, setRecolorLogo] = useState(false);
  const [logoColor, setLogoColor] = useState(kit.mainColor || "#0F172A");
  const [layout, setLayout] = useState({ orientation: "center", logoScale: 1, logoDy: 0, logoDx: 0, textScale: 1 });

  // Background controls.
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [transparent, setTransparent] = useState(false);
  const [accentBorder, setAccentBorder] = useState(false);

  // Contact bar (optional bottom band).
  const [showContact, setShowContact] = useState(false);
  const [contactBg, setContactBg] = useState(kit.mainColor || "#0F172A");
  const [contacts, setContacts] = useState({
    instagram: kit.cInstagram || "", snapchat: kit.cSnapchat || "", tiktok: kit.cTiktok || "",
    twitter: kit.cTwitter || "", whatsapp: kit.cWhatsapp || "", website: kit.cWebsite || "",
  });
  const setContact = (k, v) => { setContacts((p) => ({ ...p, [k]: v })); setSaved(false); };
  const contactsList = showContact ? [
    contacts.instagram && { p: "Instagram", v: contacts.instagram },
    contacts.snapchat && { p: "Snapchat", v: contacts.snapchat },
    contacts.tiktok && { p: "TikTok", v: contacts.tiktok },
    contacts.twitter && { p: "X (Twitter)", v: contacts.twitter },
    contacts.whatsapp && { p: "WhatsApp", v: contacts.whatsapp },
    contacts.website && { p: "Website", v: contacts.website },
  ].filter(Boolean) : [];

  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => { setF((p) => ({ ...p, [k]: v })); setSaved(false); };
  // Numeric layout values (sliders) — parse to number.
  const setLay = (k, v) => { setLayout((p) => ({ ...p, [k]: typeof v === "number" ? v : parseFloat(v) })); setSaved(false); };
  // String layout values (e.g. orientation) — set verbatim. (Previously these
  // went through setLay's parseFloat, turning "right"/"left" into NaN, so the
  // logo-position buttons silently did nothing.)
  const setLayStr = (k, v) => { setLayout((p) => ({ ...p, [k]: v })); setSaved(false); };

  // What each arrangement places where — shown to the user so the options are
  // self-explanatory (no guessing what goes left vs right).
  const ORIENT_OPTIONS = [
    { v: "center", ar: "شعار بالنص", en: "Logo center",
      descAr: "الشعار في الوسط · المعلومات العربية يمين · الإنجليزية يسار", descEn: "Logo centered · Arabic on the right · English on the left" },
    { v: "right", ar: "شعار يمين", en: "Logo right",
      descAr: "الشعار على اليمين · الكتابة (عربي) على اليسار", descEn: "Logo on the right · Arabic text on the left" },
    { v: "left", ar: "شعار يسار", en: "Logo left",
      descAr: "الشعار على اليسار · الكتابة (عربي) على اليمين", descEn: "Logo on the left · Arabic text on the right" },
  ];
  const orientDesc = ORIENT_OPTIONS.find((o) => o.v === (layout.orientation || "center"));

  const W = size?.width || 1654, H = size?.height || 280;

  const onPickLogo = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => { setLogo(String(r.result || "")); setSaved(false); };
    r.readAsDataURL(file);
  };

  const FIELDS = [
    ["nameAr", ar ? "الاسم بالعربي (يمين)" : "Arabic name", "صالون روز التجميلي", "rtl"],
    ["subAr", ar ? "السطر التحتي بالعربي" : "Arabic subtitle", "للتزيين النسائي", "rtl"],
    ["nameEn", ar ? "الاسم بالإنجليزي (يسار)" : "English name", "ROSE BEAUTY SALON", "ltr"],
    ["subEn", ar ? "السطر التحتي بالإنجليزي" : "English subtitle", "FOR WOMEN'S BEAUTY", "ltr"],
    ["cr", ar ? "رقم السجل التجاري" : "CR number", "1010915001", "ltr"],
    ["vat", ar ? "الرقم الضريبي — اختياري" : "VAT (optional)", "3xxxxxxxxxxxxx3", "ltr"],
    ["phone", ar ? "الجوال / الهاتف — اختياري" : "Phone (optional)", "0551 64 65 66", "ltr"],
    ["website", ar ? "الموقع — اختياري" : "Website (optional)", "hovera.sa", "ltr"],
  ];

  const anyFilled = logo || Object.values(f).some((v) => v && v.trim()) || contactsList.length > 0;

  // Live re-composite (debounced) whenever anything changes.
  useEffect(() => {
    if (!anyFilled) { setPreview(""); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const dataUrl = await composeLetterhead({
          width: W, height: H,
          kit: { ...kit, font, changeLogoColor: recolorLogo, logoColor },
          logoUrl: logo || "",
          fields: f,
          style: { headerColor, accentColor, bgColor, transparent, accentBorder, contactBg, contactText: "#FFFFFF" },
          contacts: contactsList,
          layout, ar,
        });
        if (!cancelled) setPreview(dataUrl);
      } catch (e) { if (!cancelled) setErr(e?.message || String(e)); }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [f, logo, headerColor, accentColor, font, recolorLogo, logoColor, layout, bgColor, transparent, accentBorder, showContact, contacts, contactBg]); // eslint-disable-line

  const handleSave = async () => {
    if (!preview) return;
    setBusy(true); setErr("");
    try {
      const blob = await (await fetch(preview)).blob();
      const shrunk = await shrinkBlobToLimit(blob, { maxBytes: 9_500_000 });
      const file = new File([shrunk], `letterhead_${Date.now()}.png`, { type: "image/png" });
      const { url } = await uploadFile({ file });
      addLocalMedia({
        url, name: ar ? "ترويسة رسمية" : "Letterhead",
        platform: "general", post_id: `lh_${Date.now()}`,
        caption_title: "", caption_text: "", position: 0, type: "image",
      });
      setSaved(true);
    } catch (e) { setErr((ar ? "تعذّر الحفظ: " : "Save failed: ") + (e?.message || e)); }
    finally { setBusy(false); }
  };

  const SLIDERS = [
    { k: "logoScale", label: ar ? "حجم الشعار" : "Logo size", min: 0.4, max: 2, step: 0.05 },
    { k: "logoDx", label: ar ? "الشعار ↔" : "Logo ↔", min: -0.42, max: 0.42, step: 0.01 },
    { k: "logoDy", label: ar ? "الشعار ↕" : "Logo ↕", min: -0.35, max: 0.35, step: 0.01 },
    { k: "textScale", label: ar ? "حجم النص" : "Text size", min: 0.6, max: 1.7, step: 0.05 },
  ];

  const swatchStyle = (active, c) => active
    ? { backgroundColor: c, borderColor: "var(--hv-primary)", boxShadow: "0 0 0 2px rgba(79,70,229,0.5)" }
    : { backgroundColor: c, borderColor: "#cbd5e1" };

  return (
    <div dir={ar ? "rtl" : "ltr"} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[94vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10" style={{ borderColor: "var(--hv-border)" }}>
          <p className="font-extrabold flex items-center gap-2" style={{ color: "var(--hv-text)" }}><FileText className="w-5 h-5" style={{ color: "var(--hv-primary)" }} /> {ar ? "الترويسة الرسمية" : "Letterhead"}</p>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-slate-100" style={{ color: "var(--hv-text-soft)" }}><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Live preview */}
          <div className="rounded-lg p-2 border" style={{ borderColor: "var(--hv-border)", background: "repeating-conic-gradient(#eef0f8 0 25%, #e3e6f2 0 50%) 0 0 / 24px 24px" }}>
            {preview ? (
              <img src={preview} alt="letterhead" className="w-full rounded shadow" />
            ) : (
              <div className="text-center py-8 text-[12px]" style={{ color: "var(--hv-text-faint)" }}>{ar ? "عبّي خانة وحدة على الأقل لتظهر المعاينة" : "Fill a field to preview"}</div>
            )}
          </div>

          <p className="text-[12px] leading-relaxed" style={{ color: "var(--hv-text-soft)" }}>{ar ? "عبّي اللي تبيه فقط — أي خانة فاضية ما تظهر. كل تعديل يتحدّث في المعاينة فوراً." : "Fill only what you want; live preview updates instantly."}</p>

          {/* Logo */}
          {logo ? (
            <div className="flex items-center gap-3 rounded-lg p-2 border" style={{ background: "var(--hv-surface-2)", borderColor: "var(--hv-border)" }}>
              <img src={logo} alt="logo" className="w-12 h-12 object-contain rounded bg-slate-50" />
              <span className="text-[12px] flex-1 font-bold text-emerald-600">{ar ? "الشعار جاهز" : "Logo ready"}</span>
              <button onClick={() => { setLogo(""); setSaved(false); }} className="p-1 text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 border border-dashed rounded-lg py-2.5 cursor-pointer text-[12px] hover:bg-slate-100" style={{ background: "var(--hv-surface)", borderColor: "#cbd5e1", color: "var(--hv-text-soft)" }}>
              <Upload className="w-4 h-4" /> {ar ? "ارفع الشعار (اختياري)" : "Upload logo (optional)"}
              <input type="file" accept="image/png,image/*" className="hidden" onChange={onPickLogo} />
            </label>
          )}

          {/* Fields */}
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map(([k, label, ph, dir]) => (
              <div key={k}>
                <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--hv-text-soft)" }}>{label}</label>
                <input value={f[k]} onChange={(e) => set(k, e.target.value)} placeholder={ph} dir={dir} className="hv-input text-[13px]" />
              </div>
            ))}
          </div>

          {/* Edit controls */}
          <div className="border-t pt-3 space-y-3" style={{ borderColor: "var(--hv-border)" }}>
            <p className="text-[12px] font-extrabold flex items-center gap-1.5" style={{ color: "var(--hv-secondary-600,#f43f5e)" }}><Edit3 className="w-4 h-4" /> {ar ? "التحرير" : "Edit"}</p>

            {/* Logo placement — now with a description of what goes where */}
            <div>
              <label className="text-[11px] font-bold block mb-1.5" style={{ color: "var(--hv-text-soft)" }}>{ar ? "ترتيب الترويسة (مكان الشعار)" : "Layout (logo position)"}</label>
              <div className="grid grid-cols-3 gap-1.5">
                {ORIENT_OPTIONS.map((o) => {
                  const active = (layout.orientation || "center") === o.v;
                  return (
                    <button key={o.v} onClick={() => setLayStr("orientation", o.v)}
                      className="py-2 rounded-lg text-[11px] font-bold transition flex flex-col items-center gap-1"
                      style={active ? { background: "var(--hv-grad)", color: "#fff" } : { background: "var(--hv-surface)", color: "var(--hv-text-soft)", border: "1px solid var(--hv-border)" }}>
                      {/* tiny visual hint of logo position */}
                      <span className="flex items-center gap-0.5">
                        {o.v === "left" && <span className="w-2 h-2 rounded-sm" style={{ background: active ? "#fff" : "var(--hv-primary)" }} />}
                        <span className="w-4 h-1.5 rounded-sm" style={{ background: active ? "rgba(255,255,255,0.55)" : "#cbd5e1" }} />
                        {o.v === "center" && <span className="w-2 h-2 rounded-sm" style={{ background: active ? "#fff" : "var(--hv-primary)" }} />}
                        <span className="w-4 h-1.5 rounded-sm" style={{ background: active ? "rgba(255,255,255,0.55)" : "#cbd5e1" }} />
                        {o.v === "right" && <span className="w-2 h-2 rounded-sm" style={{ background: active ? "#fff" : "var(--hv-primary)" }} />}
                      </span>
                      {ar ? o.ar : o.en}
                    </button>
                  );
                })}
              </div>
              {orientDesc && (
                <p className="text-[10.5px] mt-1.5 leading-relaxed" style={{ color: "var(--hv-text-faint)" }}>
                  ℹ️ {ar ? orientDesc.descAr : orientDesc.descEn}
                </p>
              )}
            </div>

            {/* Sliders */}
            {SLIDERS.map((s) => (
              <div key={s.k} className="flex items-center gap-2">
                <span className="text-[10px] w-16 flex-shrink-0" style={{ color: "var(--hv-text-soft)" }}>{s.label}</span>
                <input type="range" min={s.min} max={s.max} step={s.step} value={layout[s.k]} onChange={(e) => setLay(s.k, e.target.value)} className="flex-1" style={{ accentColor: "var(--hv-primary)" }} />
              </div>
            ))}

            {/* Background */}
            <div className="rounded-lg p-2.5 space-y-2 border" style={{ background: "var(--hv-surface-2)", borderColor: "var(--hv-border)" }}>
              <p className="text-[11px] font-bold" style={{ color: "var(--hv-text)" }}>{ar ? "الخلفية" : "Background"}</p>
              <label className="flex items-center gap-2 text-[11px] cursor-pointer" style={{ color: "var(--hv-text-soft)" }}>
                <input type="checkbox" checked={transparent} onChange={(e) => { setTransparent(e.target.checked); setSaved(false); }} style={{ accentColor: "var(--hv-primary)" }} />
                {ar ? "خلفية شفافة (للوضع فوق ورق)" : "Transparent background"}
              </label>
              {!transparent && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] w-16 flex-shrink-0" style={{ color: "var(--hv-text-soft)" }}>{ar ? "لون الخلفية" : "Bg color"}</span>
                  <input type="color" value={bgColor} onChange={(e) => { setBgColor(e.target.value); setSaved(false); }} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                  <div className="flex flex-wrap gap-1">
                    {["#FFFFFF", "#F7F5F0", "#0F172A", "#09007C", "#FCE7F3", "#ECFCCB"].map((s) => (
                      <button key={s} type="button" onClick={() => { setBgColor(s); setSaved(false); }}
                        className="w-5 h-5 rounded-full border" style={swatchStyle(bgColor.toLowerCase() === s.toLowerCase(), s)} />
                    ))}
                  </div>
                </div>
              )}
              <label className="flex items-center gap-2 text-[11px] cursor-pointer" style={{ color: "var(--hv-text-soft)" }}>
                <input type="checkbox" checked={accentBorder} onChange={(e) => { setAccentBorder(e.target.checked); setSaved(false); }} style={{ accentColor: "var(--hv-primary)" }} />
                {ar ? "إضافة خط ملوّن (إطار علوي)" : "Accent border line"}
              </label>
            </div>

            {/* Contact bar */}
            <div className="rounded-lg p-2.5 space-y-2 border" style={{ background: "var(--hv-surface-2)", borderColor: "var(--hv-border)" }}>
              <label className="flex items-center gap-2 text-[11px] font-bold cursor-pointer" style={{ color: "var(--hv-text)" }}>
                <input type="checkbox" checked={showContact} onChange={(e) => { setShowContact(e.target.checked); setSaved(false); }} style={{ accentColor: "var(--hv-primary)" }} />
                {ar ? "أضف شريط التواصل (شريط سفلي بالأيقونات)" : "Add contact bar"}
              </label>
              {showContact && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["instagram", ar ? "انستقرام" : "Instagram"],
                      ["snapchat", ar ? "سناب شات" : "Snapchat"],
                      ["tiktok", ar ? "تيك توك" : "TikTok"],
                      ["twitter", ar ? "تويتر / X" : "Twitter / X"],
                      ["whatsapp", ar ? "واتساب" : "WhatsApp"],
                      ["website", ar ? "الموقع" : "Website"],
                    ].map(([k, label]) => (
                      <input key={k} value={contacts[k]} onChange={(e) => setContact(k, e.target.value)} placeholder={label} dir="ltr" className="hv-input !py-1.5 text-[12px]" />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] w-16 flex-shrink-0" style={{ color: "var(--hv-text-soft)" }}>{ar ? "لون الشريط" : "Bar color"}</span>
                    <input type="color" value={contactBg} onChange={(e) => { setContactBg(e.target.value); setSaved(false); }} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                    <div className="flex flex-wrap gap-1">
                      {SWATCHES.map((s) => (
                        <button key={s} type="button" onClick={() => { setContactBg(s); setSaved(false); }}
                          className="w-5 h-5 rounded-full border" style={swatchStyle(contactBg.toLowerCase() === s.toLowerCase(), s)} />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Logo recolor */}
            {logo && (
              <div>
                <label className="flex items-center gap-2 text-[11px] font-bold cursor-pointer" style={{ color: "var(--hv-text-soft)" }}>
                  <input type="checkbox" checked={recolorLogo} onChange={(e) => { setRecolorLogo(e.target.checked); setSaved(false); }} style={{ accentColor: "var(--hv-primary)" }} />
                  {ar ? "غيّر لون الشعار" : "Recolor logo"}
                </label>
                {recolorLogo && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <input type="color" value={logoColor} onChange={(e) => { setLogoColor(e.target.value); setSaved(false); }} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                    <div className="flex flex-wrap gap-1">
                      {SWATCHES.map((s) => (
                        <button key={s} type="button" onClick={() => { setLogoColor(s); setSaved(false); }}
                          className="w-5 h-5 rounded-full border" style={swatchStyle(logoColor.toLowerCase() === s.toLowerCase(), s)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Colors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--hv-text-soft)" }}>{ar ? "لون الاسم" : "Name color"}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={headerColor} onChange={(e) => { setHeaderColor(e.target.value); setSaved(false); }} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                  <div className="flex flex-wrap gap-1">
                    {SWATCHES.map((s) => (
                      <button key={s} type="button" onClick={() => { setHeaderColor(s); setSaved(false); }}
                        className="w-5 h-5 rounded-full border" style={swatchStyle(headerColor.toLowerCase() === s.toLowerCase(), s)} />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--hv-text-soft)" }}>{ar ? "لون التمييز والخط" : "Accent color"}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={accentColor} onChange={(e) => { setAccentColor(e.target.value); setSaved(false); }} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                  <div className="flex flex-wrap gap-1">
                    {ACCENTS.map((s) => (
                      <button key={s} type="button" onClick={() => { setAccentColor(s); setSaved(false); }}
                        className="w-5 h-5 rounded-full border" style={swatchStyle(accentColor.toLowerCase() === s.toLowerCase(), s)} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Font */}
            <div>
              <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--hv-text-soft)" }}>{ar ? "نوع الخط" : "Font"}</label>
              <select value={font} onChange={(e) => { setFont(e.target.value); setSaved(false); }} className="hv-input text-[12px]">
                {FONTS.map((ff) => <option key={ff.v} value={ff.v}>{ar ? ff.ar : ff.v}</option>)}
              </select>
            </div>
          </div>

          {err && <div className="rounded-lg px-3 py-2 text-[12px] border" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#dc2626" }}>{err}</div>}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-3 border-t" style={{ borderColor: "var(--hv-border)" }}>
            <button onClick={onCancel} className="hv-btn hv-btn-ghost text-sm">{ar ? "إلغاء" : "Cancel"}</button>
            <a href={preview || undefined} download={`letterhead_${Date.now()}.png`}
              className={`hv-btn text-sm inline-flex items-center gap-1.5 ${preview ? "hv-btn-soft" : "hv-btn-ghost opacity-50 pointer-events-none"}`}>
              <Download className="w-4 h-4" /> {ar ? "تحميل" : "Download"}
            </a>
            <button onClick={handleSave} disabled={!preview || busy || saved}
              className={`hv-btn text-sm inline-flex items-center gap-1.5 disabled:opacity-60 ${saved ? "bg-emerald-600 text-white" : "hv-btn-soft"}`}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <ImagePlus className="w-4 h-4" />}
              {saved ? (ar ? "محفوظة" : "Saved") : (ar ? "حفظ بالمكتبة" : "Save")}
            </button>
            <button onClick={() => preview && onDone(preview)} disabled={!preview}
              className="hv-btn hv-btn-primary flex-1 min-w-[140px] text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2">
              <Edit3 className="w-4 h-4" /> {ar ? "فتح في المحرر" : "Open in editor"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
