// WhatsappOutreach — upload an Excel of phone numbers, write one message, and
// send via WhatsApp ONE BY ONE using official wa.me click-to-chat links.
// This is fully compliant (you press send yourself, no automation/bot) so your
// number is never at risk of a ban. Batches let you do e.g. 10 at a time.

import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Upload, Download, MessageCircle, Check, ExternalLink, Users, ChevronLeft, ChevronRight } from "lucide-react";

// Normalise a phone to wa.me digits-only international form (Saudi-aware).
function normalizePhone(raw) {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "966" + d.slice(1);           // 05XXXXXXXX → 9665XXXXXXXX
  else if (d.length === 9 && d.startsWith("5")) d = "966" + d; // 5XXXXXXXX → 9665XXXXXXXX
  return d;
}

export default function WhatsappOutreach() {
  const isRtl = (localStorage.getItem("appLanguage") || "ar") === "ar";
  const [rows, setRows] = useState([]);          // [{ phone, name }]
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [batchSize, setBatchSize] = useState(10);
  const [batch, setBatch] = useState(0);
  const [sent, setSent] = useState(() => new Set()); // phones marked done
  const [error, setError] = useState("");

  const onUpload = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setError(""); setFileName(f.name);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
      const out = [];
      const seen = new Set();
      for (const r of aoa) {
        if (!r || !r.length) continue;
        const phone = normalizePhone(r[0]);
        if (!phone || phone.length < 10) continue;   // skips header / invalid rows
        if (seen.has(phone)) continue;               // dedupe
        seen.add(phone);
        out.push({ phone, name: (r[1] != null ? String(r[1]) : "").trim() });
      }
      if (!out.length) { setError(isRtl ? "ما لقيت أرقام صالحة. تأكد إن العمود الأول أرقام الجوال." : "No valid numbers found. First column should be phone numbers."); }
      setRows(out); setBatch(0); setSent(new Set());
    } catch (err) {
      setError((isRtl ? "تعذّر قراءة الملف: " : "Couldn't read file: ") + (err?.message || err));
    } finally { e.target.value = ""; }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      [isRtl ? "الجوال" : "Phone", isRtl ? "الاسم (اختياري)" : "Name (optional)"],
      ["0551646566", "صالون النخبة"],
      ["966500000000", "مشغل الورد"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Numbers");
    XLSX.writeFile(wb, isRtl ? "نموذج_الأرقام.xlsx" : "numbers_template.xlsx");
  };

  const total = rows.length;
  const batches = Math.max(1, Math.ceil(total / Math.max(1, batchSize)));
  const start = batch * batchSize;
  const current = useMemo(() => rows.slice(start, start + batchSize), [rows, start, batchSize]);

  const linkFor = (r) => {
    const text = (message || "").replace(/\{(الاسم|name)\}/gi, r.name || "");
    return `https://wa.me/${r.phone}?text=${encodeURIComponent(text)}`;
  };
  const markSent = (phone) => setSent((p) => { const n = new Set(p); n.add(phone); return n; });
  const sentCount = current.filter((r) => sent.has(r.phone)).length;

  return (
    <div className="hv-page" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto">
        <div className="hv-overline">{isRtl ? "تسويق" : "Outreach"}</div>
        <h1 className="hv-page-title flex items-center gap-2">
          <MessageCircle className="w-6 h-6" style={{ color: "#25D366" }} />
          {isRtl ? "تواصل واتساب" : "WhatsApp Outreach"}
        </h1>
        <p className="text-sm mb-5" style={{ color: "var(--hv-text-soft)" }}>
          {isRtl
            ? "ارفع قائمة أرقام، اكتب رسالة وحدة، والنظام يجهّز لكل رقم رابط واتساب بالرسالة جاهزة — تضغط وترسل بنفسك (آمن ١٠٠٪ وما يحظر رقمك)."
            : "Upload numbers, write one message; each gets a ready WhatsApp link — you press send yourself (100% safe, no ban risk)."}
        </p>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Setup */}
          <div className="space-y-4">
            <div className="hv-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold" style={{ color: "var(--hv-text)" }}>1) {isRtl ? "قائمة الأرقام" : "Numbers list"}</h3>
                <button onClick={downloadTemplate} className="hv-btn hv-btn-ghost text-xs">
                  <Download className="w-3.5 h-3.5" /> {isRtl ? "نموذج إكسل" : "Template"}
                </button>
              </div>
              <label className="flex items-center justify-center gap-2 border border-dashed rounded-lg py-3 cursor-pointer text-sm hover:bg-slate-50" style={{ borderColor: "var(--hv-border)", color: "var(--hv-text-soft)" }}>
                <Upload className="w-4 h-4" /> {fileName || (isRtl ? "ارفع ملف إكسل (جوال + اسم اختياري)" : "Upload Excel (phone + optional name)")}
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onUpload} />
              </label>
              {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
              {total > 0 && (
                <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--hv-text-soft)" }}>
                  <Users className="w-3.5 h-3.5" /> {isRtl ? `${total} رقم صالح` : `${total} valid numbers`}
                </p>
              )}
            </div>

            <div className="hv-card p-4 space-y-2">
              <h3 className="text-sm font-bold" style={{ color: "var(--hv-text)" }}>2) {isRtl ? "الرسالة" : "Message"}</h3>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5}
                placeholder={isRtl ? "اكتب رسالتك… استخدم {الاسم} ليتم استبداله باسم كل جهة." : "Write your message… use {name} to insert each contact's name."}
                className="hv-input w-full leading-relaxed" />
              <p className="text-[11px]" style={{ color: "var(--hv-text-faint)" }}>
                {isRtl ? "💡 اكتب {الاسم} في أي مكان ليُستبدل باسم كل رقم تلقائياً." : "💡 Use {name} to auto-insert each contact's name."}
              </p>
            </div>

            <div className="hv-card p-4 space-y-2">
              <h3 className="text-sm font-bold" style={{ color: "var(--hv-text)" }}>3) {isRtl ? "حجم الدفعة" : "Batch size"}</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "كم رقم في الدفعة الواحدة؟" : "Numbers per batch?"}</span>
                <input type="number" min="1" max="100" value={batchSize}
                  onChange={(e) => { setBatchSize(Math.max(1, parseInt(e.target.value) || 1)); setBatch(0); }}
                  className="hv-input w-20 px-2 py-1" />
              </div>
            </div>
          </div>

          {/* Send list */}
          <div className="hv-card p-4">
            {total === 0 ? (
              <div className="text-center py-16" style={{ color: "var(--hv-text-faint)" }}>
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{isRtl ? "ارفع قائمة الأرقام لتبدأ" : "Upload a list to begin"}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold" style={{ color: "var(--hv-text)" }}>
                    {isRtl ? `الدفعة ${batch + 1} من ${batches}` : `Batch ${batch + 1} of ${batches}`}
                  </h3>
                  <span className="text-xs font-semibold" style={{ color: "#25D366" }}>{sentCount}/{current.length} {isRtl ? "تم" : "sent"}</span>
                </div>

                <div className="space-y-2 max-h-[460px] overflow-y-auto">
                  {current.map((r) => {
                    const done = sent.has(r.phone);
                    return (
                      <div key={r.phone} className="flex items-center gap-2 rounded-lg border px-3 py-2"
                        style={{ borderColor: done ? "#25D366" : "var(--hv-border)", background: done ? "rgba(37,211,102,0.06)" : "var(--hv-surface)" }}>
                        <div className="flex-1 min-w-0">
                          {r.name && <p className="text-sm font-bold truncate" style={{ color: "var(--hv-text)" }}>{r.name}</p>}
                          <p className="text-[12px]" dir="ltr" style={{ color: "var(--hv-text-soft)" }}>+{r.phone}</p>
                        </div>
                        {done && <Check className="w-4 h-4" style={{ color: "#25D366" }} />}
                        <a href={linkFor(r)} target="_blank" rel="noreferrer" onClick={() => markSent(r.phone)}
                          className="hv-btn text-xs px-3 py-2" style={{ background: "#25D366", color: "#fff" }}>
                          <ExternalLink className="w-3.5 h-3.5" /> {isRtl ? "فتح وإرسال" : "Open & send"}
                        </a>
                      </div>
                    );
                  })}
                </div>

                {batches > 1 && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: "var(--hv-border)" }}>
                    <button onClick={() => setBatch((b) => Math.max(0, b - 1))} disabled={batch === 0}
                      className="hv-btn hv-btn-ghost text-xs disabled:opacity-40">
                      <ChevronRight className="w-3.5 h-3.5" /> {isRtl ? "السابقة" : "Prev"}
                    </button>
                    <button onClick={() => setBatch((b) => Math.min(batches - 1, b + 1))} disabled={batch >= batches - 1}
                      className="hv-btn hv-btn-primary text-xs disabled:opacity-40">
                      {isRtl ? "الدفعة التالية" : "Next batch"} <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <p className="text-[11px] mt-4 leading-relaxed" style={{ color: "var(--hv-text-faint)" }}>
          {isRtl
            ? "ℹ️ كل زر يفتح محادثة واتساب بالرسالة جاهزة — تضغط إرسال بنفسك. هذا أسلوب نظامي لا يخالف واتساب ولا يعرّض رقمك للحظر. للإرسال التلقائي الكامل نحتاج WhatsApp Business API (قوالب معتمدة + موافقة المستلمين)."
            : "ℹ️ Each button opens WhatsApp with your message ready — you press send. Compliant, no ban risk. Full automation needs the WhatsApp Business API."}
        </p>
      </div>
    </div>
  );
}
