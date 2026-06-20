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
  // WhatsApp Cloud API auto-send
  const [apiOk, setApiOk] = useState(false);
  const [tpl, setTpl] = useState("hello_world");
  const [lang, setLang] = useState("en_US");
  const [imgUrl, setImgUrl] = useState("");
  const [useName, setUseName] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(null);
  // Template manager
  const [showTpl, setShowTpl] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [tplForm, setTplForm] = useState({ name: "", category: "MARKETING", language: "ar", body: "", example: "", footer: "" });
  const [tplBusy, setTplBusy] = useState(false);
  const [tplMsg, setTplMsg] = useState("");

  useEffect(() => { try { localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts)); } catch {} }, [contacts]);
  useEffect(() => { try { localStorage.setItem(MSG_KEY, message); } catch {} }, [message]);
  useEffect(() => { fetch("/api/whatsapp/status").then((r) => r.json()).then((d) => setApiOk(!!d.configured)).catch(() => {}); }, []);

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

  // Fully-automatic send (one click) via the WhatsApp Cloud API.
  const autoSend = async () => {
    const targets = visible;
    if (!targets.length || sending) return;
    if (!window.confirm(isRtl ? `إرسال تلقائي لـ ${targets.length} عميل عبر القالب «${tpl}»؟` : `Auto-send to ${targets.length} via "${tpl}"?`)) return;
    setSending(true);
    let ok = 0, fail = 0;
    for (let i = 0; i < targets.length; i++) {
      const c = targets[i];
      try {
        const res = await fetch("/api/whatsapp/send", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: c.phone, template: tpl.trim(), language: (lang.trim() || "ar"), imageUrl: imgUrl.trim() || undefined, bodyParams: useName ? [c.name || ""] : [] }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) { ok++; update(c.phone, { status: "sent" }); }
        else fail++;
      } catch { fail++; }
      setProgress({ done: i + 1, total: targets.length, ok, fail });
      await new Promise((r) => setTimeout(r, 800)); // gentle pacing
    }
    setSending(false);
  };

  const loadTemplates = async () => {
    setTplLoading(true); setTplMsg("");
    try { const r = await fetch("/api/whatsapp/templates"); const d = await r.json(); if (r.ok) setTemplates(d.templates || []); else setTplMsg(d.error || "خطأ"); }
    catch (e) { setTplMsg(String(e?.message || e)); } finally { setTplLoading(false); }
  };
  const openTpl = () => { setShowTpl(true); loadTemplates(); };
  const createTpl = async () => {
    if (!tplForm.name.trim() || !tplForm.body.trim()) { setTplMsg(isRtl ? "الاسم والنص مطلوبان" : "Name & body required"); return; }
    setTplBusy(true); setTplMsg("");
    try {
      const r = await fetch("/api/whatsapp/templates", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tplForm.name, category: tplForm.category, language: tplForm.language || "ar", bodyText: tplForm.body, footerText: tplForm.footer || undefined, examples: tplForm.example ? [tplForm.example] : [] }),
      });
      const d = await r.json();
      if (r.ok && d.success) { setTplMsg(isRtl ? "✅ أُرسل القالب للموافقة" : "✅ Submitted"); setTplForm({ ...tplForm, name: "", body: "", example: "", footer: "" }); loadTemplates(); }
      else setTplMsg(d.error || "خطأ");
    } catch (e) { setTplMsg(String(e?.message || e)); } finally { setTplBusy(false); }
  };

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

        {/* Auto-send via WhatsApp Cloud API */}
        {apiOk && (
          <div className="hv-card p-4 mb-4 border-2" style={{ borderColor: "#25D366" }}>
            <h3 className="text-sm font-bold flex items-center gap-1.5 mb-2" style={{ color: "#128C3E" }}>
              ⚡ {isRtl ? "إرسال تلقائي (واتساب API) — بضغطة وحدة" : "Auto-send (WhatsApp API)"}
            </h3>
            <div className="grid sm:grid-cols-3 gap-2 mb-2">
              <label className="text-[11px] font-semibold block" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "اسم القالب المعتمد" : "Template name"}
                <input value={tpl} onChange={(e) => setTpl(e.target.value)} dir="ltr" className="hv-input w-full mt-1 px-2 py-1" />
              </label>
              <label className="text-[11px] font-semibold block" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "اللغة" : "Language"}
                <input value={lang} onChange={(e) => setLang(e.target.value)} dir="ltr" className="hv-input w-full mt-1 px-2 py-1" />
              </label>
              <label className="text-[11px] font-semibold block" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "رابط صورة (اختياري)" : "Image URL (optional)"}
                <input value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} dir="ltr" className="hv-input w-full mt-1 px-2 py-1" />
              </label>
            </div>
            <label className="flex items-center gap-2 text-[11px] mb-2 cursor-pointer" style={{ color: "var(--hv-text-soft)" }}>
              <input type="checkbox" checked={useName} onChange={(e) => setUseName(e.target.checked)} style={{ accentColor: "#25D366" }} />
              {isRtl ? "القالب فيه متغيّر {{1}} — أرسل اسم العميل" : "Template has {{1}} — send contact name"}
            </label>
            <button onClick={autoSend} disabled={sending || visible.length === 0}
              className="hv-btn text-sm disabled:opacity-50" style={{ background: "#25D366", color: "#fff" }}>
              {sending ? (isRtl ? "جارٍ الإرسال…" : "Sending…") : (isRtl ? `⚡ إرسال تلقائي لـ ${visible.length} (المعروضين)` : `Auto-send to ${visible.length}`)}
            </button>
            <button onClick={openTpl} className="hv-btn hv-btn-soft text-sm ms-2">📋 {isRtl ? "قوالبي" : "Templates"}</button>
            {progress && <span className="text-[11px] ms-3" style={{ color: "var(--hv-text-soft)" }}>{progress.done}/{progress.total} · {isRtl ? "نجح" : "ok"} {progress.ok} · {isRtl ? "فشل" : "fail"} {progress.fail}</span>}
            <p className="text-[10px] mt-2 leading-relaxed" style={{ color: "var(--hv-text-faint)" }}>
              {isRtl ? "⚠️ الرقم التجريبي يرسل فقط للأرقام اللي أضفتها في API Setup. للإرسال لكل القائمة تحتاج رقم إنتاج + قالب معتمد." : "Test number only sends to verified recipients; production needs a real number + approved template."}
            </p>
          </div>
        )}

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

        {/* Templates manager */}
        {showTpl && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowTpl(false)}>
            <div className="hv-card rounded-2xl p-5 w-[640px] max-w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} dir={isRtl ? "rtl" : "ltr"}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-base" style={{ color: "var(--hv-text)" }}>📋 {isRtl ? "قوالبي" : "My templates"}</h3>
                <button onClick={() => setShowTpl(false)} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
              </div>

              <div className="rounded-lg border p-3 space-y-2 mb-4" style={{ borderColor: "var(--hv-border)" }}>
                <p className="text-xs font-bold" style={{ color: "var(--hv-text)" }}>{isRtl ? "إنشاء قالب جديد" : "Create template"}</p>
                <div className="grid grid-cols-3 gap-2">
                  <input value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} placeholder={isRtl ? "الاسم (إنجليزي)" : "name"} dir="ltr" className="hv-input px-2 py-1 text-xs" />
                  <select value={tplForm.category} onChange={(e) => setTplForm({ ...tplForm, category: e.target.value })} className="hv-input px-2 py-1 text-xs">
                    <option value="MARKETING">Marketing</option><option value="UTILITY">Utility</option>
                  </select>
                  <input value={tplForm.language} onChange={(e) => setTplForm({ ...tplForm, language: e.target.value })} placeholder="ar" dir="ltr" className="hv-input px-2 py-1 text-xs" />
                </div>
                <textarea value={tplForm.body} onChange={(e) => setTplForm({ ...tplForm, body: e.target.value })} rows={3}
                  placeholder={isRtl ? "نص الرسالة… استخدم {{1}} لاسم العميل" : "Body… use {{1}} for name"} className="hv-input w-full text-xs leading-relaxed" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={tplForm.example} onChange={(e) => setTplForm({ ...tplForm, example: e.target.value })} placeholder={isRtl ? "مثال لـ {{1}} (صالون النخبة)" : "example for {{1}}"} className="hv-input px-2 py-1 text-xs" />
                  <input value={tplForm.footer} onChange={(e) => setTplForm({ ...tplForm, footer: e.target.value })} placeholder={isRtl ? "تذييل (اختياري)" : "footer (optional)"} className="hv-input px-2 py-1 text-xs" />
                </div>
                <button onClick={createTpl} disabled={tplBusy} className="hv-btn hv-btn-primary text-xs disabled:opacity-50">
                  {tplBusy ? (isRtl ? "جارٍ…" : "…") : (isRtl ? "إنشاء وإرسال للموافقة" : "Create & submit")}
                </button>
                {tplMsg && <p className="text-[11px]" style={{ color: tplMsg.startsWith("✅") ? "#16a34a" : "#dc2626" }}>{tplMsg}</p>}
                <p className="text-[10px]" style={{ color: "var(--hv-text-faint)" }}>{isRtl ? "💡 لإضافة صورة في الترويسة، أنشئ القالب من WhatsApp Manager (رفع الصورة يحتاج خطوة إضافية)." : "Image header: use WhatsApp Manager."}</p>
              </div>

              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold" style={{ color: "var(--hv-text)" }}>{isRtl ? "القوالب الموجودة" : "Existing templates"}</p>
                <button onClick={loadTemplates} className="hv-btn hv-btn-ghost text-xs">{isRtl ? "تحديث" : "Refresh"}</button>
              </div>
              {tplLoading ? <p className="text-xs text-slate-400">…</p> : (
                <div className="space-y-1.5">
                  {templates.length === 0 && <p className="text-xs text-slate-400">{isRtl ? "لا قوالب بعد" : "None yet"}</p>}
                  {templates.map((t) => {
                    const col = t.status === "APPROVED" ? "#16a34a" : t.status === "REJECTED" ? "#dc2626" : "#d97706";
                    return (
                      <div key={t.name + t.language} className="flex items-center gap-2 rounded border px-2 py-1.5" style={{ borderColor: "var(--hv-border)" }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate" dir="ltr" style={{ color: "var(--hv-text)" }}>{t.name}</p>
                          <p className="text-[10px]" style={{ color: "var(--hv-text-soft)" }}>{t.language} · {t.category}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: col + "22", color: col }}>{t.status}</span>
                        {t.status === "APPROVED" && (
                          <button onClick={() => { setTpl(t.name); setLang(t.language); setShowTpl(false); }} className="hv-btn hv-btn-soft text-[10px] px-2 py-1">{isRtl ? "استخدم" : "Use"}</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
