import React, { useState } from "react";
import { Loader2, Upload, X, FileText } from "lucide-react";
import { loadKit, loadLogo, FONTS } from "@/utils/imagePrompt";
import { composeLetterhead } from "@/utils/composeLetterhead";

const SWATCHES = ["#09007C", "#2E14ED", "#EF43DC", "#0F172A", "#000000", "#1877F2", "#0A7E5E", "#8A1538", "#B8860B", "#475569"];

// Guided form for the official A4 letterhead (ترويسة). All fields are optional —
// the user fills only what they want shown. On submit it composites the header
// and hands back a PNG data URL (opened in the Design Studio for fine-tuning).
export default function LetterheadForm({ isRtl = true, size, onCancel, onDone }) {
  const ar = isRtl;
  const kit = loadKit();
  const savedLogo = loadLogo();

  const [logo, setLogo] = useState(savedLogo || "");
  const [f, setF] = useState({
    companyName: "",
    tagline: "",
    cr: "",
    vat: "",
    phone: kit.cWhatsapp || "",
    email: "",
    website: kit.cWebsite || "",
    address: "",
  });
  const [headerColor, setHeaderColor] = useState(kit.mainColor || "#09007C");
  const [font, setFont] = useState(kit.font || "Tajawal");
  const [band, setBand] = useState("band"); // "band" | "line"
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const onPickLogo = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => setLogo(String(r.result || ""));
    r.readAsDataURL(file);
  };

  const FIELDS = [
    ["companyName", ar ? "اسم المنشأة" : "Company name", ar ? "مثال: مؤسسة هوفيرا للتجارة" : "Company"],
    ["tagline", ar ? "وصف / شعار نصي (اختياري)" : "Tagline", ar ? "مثال: حلول إدارة الصالونات" : "Tagline"],
    ["cr", ar ? "رقم السجل التجاري" : "CR number", "1010xxxxxx"],
    ["vat", ar ? "الرقم الضريبي (VAT)" : "VAT number", "3xxxxxxxxxxxxx3"],
    ["phone", ar ? "الجوال / الهاتف" : "Phone", "0551 64 65 66"],
    ["email", ar ? "البريد الإلكتروني" : "Email", "info@hovera.sa"],
    ["website", ar ? "الموقع الإلكتروني" : "Website", "hovera.sa"],
    ["address", ar ? "العنوان" : "Address", ar ? "الرياض، المملكة العربية السعودية" : "Address"],
  ];

  const anyFilled = logo || Object.values(f).some((v) => v && v.trim());

  const handleCreate = async () => {
    if (!anyFilled) { setErr(ar ? "عبّي خانة وحدة على الأقل أو ارفع الشعار." : "Fill at least one field."); return; }
    setErr(""); setBusy(true);
    try {
      const dataUrl = await composeLetterhead({
        width: size?.width || 1654,
        height: size?.height || 2339,
        kit: { ...kit, font },
        logoUrl: logo || "",
        fields: f,
        style: { band, headerColor, textColor: "#0F172A" },
        ar,
      });
      onDone(dataUrl);
    } catch (e) {
      setErr((ar ? "تعذّر الإنشاء: " : "Failed: ") + (e?.message || e));
      setBusy(false);
    }
  };

  return (
    <div dir={ar ? "rtl" : "ltr"} className="fixed inset-0 bg-black/80 z-[90] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <p className="font-bold text-white flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-400" /> {ar ? "بيانات الترويسة الرسمية" : "Letterhead details"}</p>
          <button onClick={onCancel} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-[12px] text-slate-400 leading-relaxed">{ar ? "عبّي اللي تبيه فقط — أي خانة تتركها فاضية ما تظهر في الترويسة. بعد الإنشاء بتفتح في المحرر تقدر تحرّكها وتعدّل الخط." : "Fill only what you want; blank fields are skipped."}</p>

          {/* Logo */}
          {logo ? (
            <div className="flex items-center gap-3 bg-slate-800/60 rounded-lg p-2">
              <img src={logo} alt="logo" className="w-12 h-12 object-contain rounded bg-white/10" />
              <span className="text-[12px] text-emerald-300 flex-1">{ar ? "الشعار جاهز" : "Logo ready"}</span>
              <button onClick={() => setLogo("")} className="text-slate-400 hover:text-red-300 p-1"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-600 rounded-lg py-2.5 cursor-pointer text-[12px] text-slate-300">
              <Upload className="w-4 h-4" /> {ar ? "ارفع الشعار (اختياري)" : "Upload logo (optional)"}
              <input type="file" accept="image/png,image/*" className="hidden" onChange={onPickLogo} />
            </label>
          )}

          {/* Fields */}
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map(([k, label, ph]) => (
              <div key={k} className={k === "companyName" || k === "tagline" || k === "address" ? "col-span-2" : ""}>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">{label}</label>
                <input value={f[k]} onChange={(e) => set(k, e.target.value)} placeholder={ph} dir={k === "companyName" || k === "tagline" || k === "address" ? "rtl" : "ltr"}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-[13px] text-white outline-none focus:border-indigo-500" />
              </div>
            ))}
          </div>

          {/* Style */}
          <div className="border-t border-slate-800 pt-3 space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">{ar ? "اللون الأساسي" : "Primary color"}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={headerColor} onChange={(e) => setHeaderColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                <div className="flex flex-wrap gap-1">
                  {SWATCHES.map((s) => (
                    <button key={s} type="button" onClick={() => setHeaderColor(s)}
                      className={`w-5 h-5 rounded-full border ${headerColor.toLowerCase() === s.toLowerCase() ? "border-white ring-2 ring-white/70" : "border-slate-500"}`} style={{ backgroundColor: s }} />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">{ar ? "نوع الخط" : "Font"}</label>
              <select value={font} onChange={(e) => setFont(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-[12px] text-white outline-none">
                {FONTS.map((ff) => <option key={ff.v} value={ff.v}>{ar ? ff.ar : ff.v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">{ar ? "خلفية الرأس" : "Header style"}</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[{ v: "band", ar: "شريط ملوّن خفيف", en: "Soft band" }, { v: "line", ar: "خط فقط (أبيض)", en: "Line only" }].map((s) => (
                  <button key={s.v} onClick={() => setBand(s.v)}
                    className={`py-1.5 rounded text-[11px] font-bold transition ${band === s.v ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>{ar ? s.ar : s.en}</button>
                ))}
              </div>
            </div>
          </div>

          {err && <div className="bg-red-900/30 border border-red-500/40 rounded-lg px-3 py-2 text-[12px] text-red-200">{err}</div>}

          <div className="flex gap-2 pt-1">
            <button onClick={onCancel} className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold">{ar ? "إلغاء" : "Cancel"}</button>
            <button onClick={handleCreate} disabled={busy}
              className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-bold text-sm transition disabled:opacity-60 flex items-center justify-center gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {ar ? "إنشاء الترويسة وفتحها في المحرر" : "Create & open in editor"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
