// WhatsappOutreach — a lightweight WhatsApp lead/CRM tracker.
// Upload an Excel ONCE; contacts are SAVED (browser storage) so you don't
// re-upload. Send via official wa.me click-to-chat links (you press send, so
// it's ToS-safe). Each contact keeps a status (new / sent / interested / not)
// so you can follow up over time.

import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { Upload, Download, MessageCircle, Check, ExternalLink, Search, Trash2 } from "lucide-react";

const CONTACTS_KEY = "wa_contacts_v1";
const MSG_KEY = "wa_message_v1";

const STATUSES = [
  { v: "new",        ar: "جديد",        en: "New",        color: "#64748b" },
  { v: "sent",       ar: "تم الإرسال",  en: "Sent",       color: "#25D366" },
  { v: "interested", ar: "مهتم",        en: "Interested", color: "#4f46e5" },
  { v: "not",        ar: "غير مهتم",    en: "Not int.",   color: "#ef4444" },
];
const statusOf = (v) => STATUSES.find((s) => s.v === v) || STATUSES[0];

function normalizePhone(raw) {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "966" + d.slice(1);
  else if (d.length === 9 && d.startsWith("5")) d = "966" + d;
  return d;
}
function loadContacts() { try { return JSON.parse(localStorage.getItem(CONTACTS_KEY) || "[]"); } catch { return []; } }

export default function WhatsappOutreach() {
  const isRtl = (localStorage.getItem("appLanguage") || "ar") === "ar";
  const [contacts, setContacts] = useState(loadContacts);
  const [message, setMessage] = useState(() => localStorage.getItem(MSG_KEY) || "");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [lastAdded, setLastAdded] = useState(0);

  useEffect(() => { try { localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts)); } catch {} }, [contacts]);
  useEffect(() => { try { localStorage.setItem(MSG_KEY, message); } catch {} }, [message]);

  const update = (phone, patch) => setContacts((list) => list.map((c) => (c.phone === phone ? { ...c, ...patch, updatedAt: Date.now() } : c)));
  const remove = (phone) => setContacts((list) => list.filter((c) => c.phone !== phone));

  const onUpload = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setError(""); setFileName(f.name);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
      const ncols = aoa.reduce((m, r) => Math.max(m, (r || []).length), 0);
      // Auto-detect the phone column (most valid phone cells), ignore others.
      let phoneCol = 0, best = -1;
      for (let c = 0; c < ncols; c++) {
        let cnt = 0;
        for (const r of aoa) if (normalizePhone(r?.[c]).length >= 10) cnt++;
        if (cnt > best) { best = cnt; phoneCol = c; }
      }
      const header = aoa[0] || [];
      let nameCol = -1;
      header.forEach((h, i) => { if (nameCol === -1 && /(اسم|name)/i.test(String(h ?? ""))) nameCol = i; });
      if (nameCol === -1) {
        for (let c = 0; c < ncols; c++) {
          if (c === phoneCol) continue;
          const sample = aoa.find((r) => r && String(r[c] ?? "").trim());
          if (sample && normalizePhone(sample[c]).length < 10) { nameCol = c; break; }
        }
      }
      // Merge into the saved list (new phones only; keep existing statuses).
      setContacts((prev) => {
        const byPhone = new Map(prev.map((c) => [c.phone, c]));
        let added = 0;
        for (const r of aoa) {
          const phone = normalizePhone(r?.[phoneCol]);
          if (!phone || phone.length < 10) continue;
          const name = nameCol >= 0 ? String(r[nameCol] ?? "").trim() : "";
          if (byPhone.has(phone)) {
            const ex = byPhone.get(phone);
            if (!ex.name && name) ex.name = name; // fill missing name
          } else {
            byPhone.set(phone, { phone, name, status: "new", updatedAt: Date.now() });
            added++;
          }
        }
        setLastAdded(added);
        return Array.from(byPhone.values());
      });
      if (best <= 0) setError(isRtl ? "ما لقيت أرقام صالحة في الملف." : "No valid numbers found.");
    } catch (err) {
      setError((isRtl ? "تعذّر قراءة الملف: " : "Couldn't read file: ") + (err?.message || err));
    } finally { e.target.value = ""; }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([[isRtl ? "الاسم" : "Name", isRtl ? "الجوال" : "Phone"], ["صالون النخبة", "0551646566"]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, isRtl ? "نموذج_العملاء.xlsx" : "contacts_template.xlsx");
  };

  const counts = useMemo(() => {
    const c = { all: contacts.length, new: 0, sent: 0, interested: 0, not: 0 };
    contacts.forEach((x) => { c[x.status] = (c[x.status] || 0) + 1; });
    return c;
  }, [contacts]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => (filter === "all" || c.status === filter) &&
      (!q || (c.name || "").toLowerCase().includes(q) || c.phone.includes(q)));
  }, [contacts, filter, search]);

  const linkFor = (c) => `https://wa.me/${c.phone}?text=${encodeURIComponent((message || "").replace(/\{(الاسم|name)\}/gi, c.name || ""))}`;

  return (
    <div className="hv-page" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto">
        <div className="hv-overline">{isRtl ? "متابعة العملاء" : "Lead tracking"}</div>
        <h1 className="hv-page-title flex items-center gap-2">
          <MessageCircle className="w-6 h-6" style={{ color: "#25D366" }} />
          {isRtl ? "تواصل واتساب — متابعة العملاء" : "WhatsApp Outreach — CRM"}
        </h1>
        <p className="text-sm mb-5" style={{ color: "var(--hv-text-soft)" }}>
          {isRtl ? "عملاؤك محفوظون هنا — ارفع الإكسل مرة وحدة، وكل واحد تتواصل معه تتحدّث حالته تلقائياً." : "Your contacts are saved here — upload once; each one's status updates as you reach out."}
        </p>

        {/* Message + upload */}
        <div className="grid md:grid-cols-2 gap-4 mb-5">
          <div className="hv-card p-4 space-y-2">
            <h3 className="text-sm font-bold" style={{ color: "var(--hv-text)" }}>{isRtl ? "الرسالة" : "Message"}</h3>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
              placeholder={isRtl ? "اكتب رسالتك… {الاسم} يُستبدل باسم كل عميل." : "Write your message… {name} = each contact's name."}
              className="hv-input w-full leading-relaxed" />
            <p className="text-[11px]" style={{ color: "var(--hv-text-faint)" }}>{isRtl ? "💡 {الاسم} يُستبدل تلقائياً." : "💡 {name} auto-inserts the name."}</p>
          </div>
          <div className="hv-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold" style={{ color: "var(--hv-text)" }}>{isRtl ? "إضافة عملاء" : "Add contacts"}</h3>
              <button onClick={downloadTemplate} className="hv-btn hv-btn-ghost text-xs"><Download className="w-3.5 h-3.5" /> {isRtl ? "نموذج" : "Template"}</button>
            </div>
            <label className="flex items-center justify-center gap-2 border border-dashed rounded-lg py-3 cursor-pointer text-sm hover:bg-slate-50" style={{ borderColor: "var(--hv-border)", color: "var(--hv-text-soft)" }}>
              <Upload className="w-4 h-4" /> {fileName || (isRtl ? "ارفع إكسل (يُضاف للقائمة)" : "Upload Excel (merges)")}
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onUpload} />
            </label>
            {lastAdded > 0 && <p className="text-[11px] text-emerald-600">{isRtl ? `أُضيف ${lastAdded} عميل جديد` : `${lastAdded} new added`}</p>}
            {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {[{ v: "all", ar: "الكل", en: "All" }, ...STATUSES].map((s) => (
            <button key={s.v} onClick={() => setFilter(s.v)}
              className="px-3 py-1.5 rounded-full text-xs font-bold transition border"
              style={filter === s.v ? { background: "var(--hv-primary)", color: "#fff", borderColor: "var(--hv-primary)" } : { background: "var(--hv-surface)", color: "var(--hv-text-soft)", borderColor: "var(--hv-border)" }}>
              {isRtl ? s.ar : s.en} ({counts[s.v] || 0})
            </button>
          ))}
          <div className="flex items-center gap-1.5 rounded-lg border px-2 py-1 ms-auto" style={{ borderColor: "var(--hv-border)" }}>
            <Search className="w-3.5 h-3.5" style={{ color: "var(--hv-text-faint)" }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={isRtl ? "بحث…" : "Search…"} className="bg-transparent text-xs outline-none w-28" style={{ color: "var(--hv-text)" }} />
          </div>
        </div>

        {/* List */}
        {visible.length === 0 ? (
          <div className="hv-card text-center py-16" style={{ color: "var(--hv-text-faint)" }}>
            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <p className="text-sm">{contacts.length === 0 ? (isRtl ? "ارفع قائمة عملائك لتبدأ" : "Upload your contacts to begin") : (isRtl ? "لا نتائج لهذا الفلتر" : "No matches")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((c) => {
              const st = statusOf(c.status);
              return (
                <div key={c.phone} className="hv-card flex items-center gap-3 px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    {c.name && <p className="text-sm font-bold truncate" style={{ color: "var(--hv-text)" }}>{c.name}</p>}
                    <p className="text-[12px]" dir="ltr" style={{ color: "var(--hv-text-soft)" }}>+{c.phone}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.color + "22", color: st.color }}>{isRtl ? st.ar : st.en}</span>
                  <select value={c.status} onChange={(e) => update(c.phone, { status: e.target.value })} className="hv-input !w-auto !py-1 text-[11px]">
                    {STATUSES.map((s) => <option key={s.v} value={s.v}>{isRtl ? s.ar : s.en}</option>)}
                  </select>
                  <a href={linkFor(c)} target="_blank" rel="noreferrer"
                    onClick={() => { if (c.status === "new") update(c.phone, { status: "sent" }); }}
                    className="hv-btn text-xs px-3 py-2" style={{ background: "#25D366", color: "#fff" }}>
                    <ExternalLink className="w-3.5 h-3.5" /> {isRtl ? "فتح وإرسال" : "Send"}
                  </a>
                  <button onClick={() => remove(c.phone)} className="text-slate-300 hover:text-red-500 p-1" title={isRtl ? "حذف" : "Delete"}><Trash2 className="w-4 h-4" /></button>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[11px] mt-4 leading-relaxed" style={{ color: "var(--hv-text-faint)" }}>
          {isRtl ? "ℹ️ العملاء محفوظون في متصفحك. كل زر «فتح وإرسال» يفتح واتساب بالرسالة جاهزة وترسل بنفسك (نظامي وآمن). حدّث حالة العميل من القائمة لمتابعته." : "ℹ️ Contacts are saved in your browser. Each Send opens WhatsApp with your message ready — you press send."}
        </p>
      </div>
    </div>
  );
}
