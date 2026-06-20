// CRM — a small, clean lead/customer pipeline (إدارة العملاء).
// Board of fixed stages; cards move between stages via a dropdown (no DnD).
// Bilingual (ar/en via localStorage appLanguage), RTL-first. Persists via the
// backend CrmContact entity (react-query).

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  Users, Plus, Search, Pencil, Trash2, MessageCircle, Phone,
  Upload, X, CalendarClock,
} from "lucide-react";
import { localApi } from "@/api/localClient";

const CONTACTS = localApi.entities.CrmContact;

// Fixed pipeline stages, each with a distinct color.
const STAGES = [
  { v: "new",        ar: "جديد",       en: "New",        color: "#64748b" },
  { v: "contacted",  ar: "تواصلنا",    en: "Contacted",  color: "#6366f1" },
  { v: "interested", ar: "مهتم",       en: "Interested", color: "#f59e0b" },
  { v: "customer",   ar: "عميل",       en: "Customer",   color: "#22c55e" },
  { v: "lost",       ar: "غير مهتم",   en: "Lost",       color: "#ef4444" },
];

// Reused from WhatsappOutreach — KSA-aware phone normalization.
function normalizePhone(raw) {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "966" + d.slice(1);
  else if (d.length === 9 && d.startsWith("5")) d = "966" + d;
  return d;
}

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const isOverdue = (dateStr) => !!dateStr && dateStr <= todayStr();

const emptyForm = () => ({
  name: "", phone: "", stage: "new", source: "",
  next_follow_up: "", tags: "", note: "",
});

export default function CRM({ language }) {
  const ar = (language || localStorage.getItem("appLanguage") || "ar") === "ar";
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState({ open: false, initial: null });
  const [form, setForm] = useState(emptyForm());
  const [importMsg, setImportMsg] = useState("");

  const { data: contacts = [] } = useQuery({
    queryKey: ["crm-contacts"],
    queryFn: () => CONTACTS.list("-created_date"),
  });

  const save = useMutation({
    mutationFn: (payload) =>
      modal.initial ? CONTACTS.update(modal.initial.id, payload) : CONTACTS.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-contacts"] });
      setModal({ open: false, initial: null });
    },
  });
  const del = useMutation({
    mutationFn: (id) => CONTACTS.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-contacts"] });
      setModal({ open: false, initial: null });
    },
  });
  const moveStage = useMutation({
    mutationFn: ({ id, stage }) => CONTACTS.update(id, { stage }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-contacts"] }),
  });

  // ── Filtering + grouping ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.phone || "").includes(q)
    );
  }, [contacts, search]);

  const byStage = useMemo(() => {
    const map = Object.fromEntries(STAGES.map((s) => [s.v, []]));
    for (const c of filtered) (map[c.stage] || map.new).push(c);
    return map;
  }, [filtered]);

  // ── Modal handlers ────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm(emptyForm());
    setModal({ open: true, initial: null });
  };
  const openEdit = (c) => {
    setForm({
      name: c.name || "", phone: c.phone || "", stage: c.stage || "new",
      source: c.source || "", next_follow_up: c.next_follow_up || "",
      tags: c.tags || "", note: c.note || "",
    });
    setModal({ open: true, initial: c });
  };
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const handleSave = () => {
    if (!form.name.trim() && !form.phone.trim()) return;
    save.mutate({
      name: form.name.trim(),
      phone: normalizePhone(form.phone) || form.phone.trim(),
      stage: form.stage,
      source: form.source.trim(),
      next_follow_up: form.next_follow_up || "",
      tags: form.tags.trim(),
      note: form.note.trim(),
    });
  };

  // ── Excel import (auto-detect phone + name; dedupe by phone) ───────────────
  const onImport = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImportMsg("");
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
      const ncols = aoa.reduce((m, r) => Math.max(m, (r || []).length), 0);
      // Phone column = the one with the most valid phone cells.
      let phoneCol = 0, best = -1;
      for (let c = 0; c < ncols; c++) {
        let cnt = 0;
        for (const r of aoa) if (normalizePhone(r?.[c]).length >= 10) cnt++;
        if (cnt > best) { best = cnt; phoneCol = c; }
      }
      // Name column: header match, else first non-phone text column.
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
      const existing = new Set(contacts.map((c) => c.phone));
      const seen = new Set();
      const toCreate = [];
      for (const r of aoa) {
        const phone = normalizePhone(r?.[phoneCol]);
        if (!phone || phone.length < 10) continue;
        if (existing.has(phone) || seen.has(phone)) continue;
        seen.add(phone);
        const name = nameCol >= 0 ? String(r[nameCol] ?? "").trim() : "";
        toCreate.push({ name, phone, stage: "new" });
      }
      if (!toCreate.length) {
        setImportMsg(ar ? "لا أرقام جديدة في الملف." : "No new numbers found.");
        return;
      }
      await Promise.all(toCreate.map((c) => CONTACTS.create(c)));
      qc.invalidateQueries({ queryKey: ["crm-contacts"] });
      setImportMsg(ar ? `أُضيف ${toCreate.length} عميل جديد.` : `Added ${toCreate.length} new contact(s).`);
    } catch (err) {
      setImportMsg((ar ? "تعذّر قراءة الملف: " : "Couldn't read file: ") + (err?.message || err));
    } finally {
      e.target.value = "";
    }
  };

  const labelCls = "block text-xs font-bold mb-1.5";
  const inputCls = "hv-input w-full text-sm";

  return (
    <div className="hv-page" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-[1400px] mx-auto">
        <div className="hv-overline">{ar ? "متابعة العملاء" : "Pipeline"}</div>
        <h1 className="hv-page-title flex items-center gap-2">
          <Users className="w-6 h-6" style={{ color: "var(--hv-primary)" }} />
          {ar ? "إدارة العملاء" : "CRM"}
        </h1>
        <p className="text-sm mb-5" style={{ color: "var(--hv-text-soft)" }}>
          {ar ? "تابع عملاءك ومراحلهم — حرّك كل عميل بين المراحل وتابع موعد المتابعة." : "Track your leads & customers across stages, and follow up on time."}
        </p>

        {/* Top bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 rounded-lg border px-2 py-1.5" style={{ borderColor: "var(--hv-border)" }}>
            <Search className="w-4 h-4" style={{ color: "var(--hv-text-faint)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={ar ? "بحث بالاسم أو الجوال…" : "Search name or phone…"}
              className="bg-transparent text-sm outline-none w-44"
              style={{ color: "var(--hv-text)" }}
            />
          </div>
          <button onClick={openAdd} className="hv-btn hv-btn-primary text-sm">
            <Plus className="w-4 h-4" /> {ar ? "عميل جديد" : "New contact"}
          </button>
          <label className="hv-btn hv-btn-soft text-sm cursor-pointer">
            <Upload className="w-4 h-4" /> {ar ? "استيراد إكسل" : "Import Excel"}
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onImport} />
          </label>
          {importMsg && (
            <span className="text-[11px]" style={{ color: "var(--hv-text-soft)" }}>{importMsg}</span>
          )}
        </div>

        {/* Stats strip */}
        <div className="flex flex-wrap gap-2 mb-5">
          <div className="hv-card px-3 py-2 text-center min-w-[84px]">
            <p className="text-lg font-extrabold" style={{ color: "var(--hv-text)" }}>{contacts.length}</p>
            <p className="text-[10px] font-bold" style={{ color: "var(--hv-text-soft)" }}>{ar ? "الإجمالي" : "Total"}</p>
          </div>
          {STAGES.map((s) => (
            <div key={s.v} className="hv-card px-3 py-2 text-center min-w-[84px]" style={{ borderTop: `3px solid ${s.color}` }}>
              <p className="text-lg font-extrabold" style={{ color: s.color }}>{byStage[s.v]?.length || 0}</p>
              <p className="text-[10px] font-bold" style={{ color: "var(--hv-text-soft)" }}>{ar ? s.ar : s.en}</p>
            </div>
          ))}
        </div>

        {/* Board */}
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((s) => {
            const list = byStage[s.v] || [];
            return (
              <div key={s.v} className="flex-shrink-0 w-72">
                <div
                  className="flex items-center justify-between px-3 py-2 rounded-t-xl"
                  style={{ background: s.color + "18", borderBottom: `2px solid ${s.color}` }}
                >
                  <span className="text-sm font-extrabold" style={{ color: s.color }}>{ar ? s.ar : s.en}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: s.color + "22", color: s.color }}>{list.length}</span>
                </div>
                <div className="space-y-2 mt-2 min-h-[60px]">
                  {list.length === 0 && (
                    <p className="text-[11px] text-center py-4" style={{ color: "var(--hv-text-faint)" }}>—</p>
                  )}
                  {list.map((c) => {
                    const overdue = isOverdue(c.next_follow_up);
                    return (
                      <div key={c.id} className="hv-card p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            {c.name && <p className="text-sm font-bold truncate" style={{ color: "var(--hv-text)" }}>{c.name}</p>}
                            {c.phone && <p className="text-[12px]" dir="ltr" style={{ color: "var(--hv-text-soft)" }}>+{c.phone}</p>}
                          </div>
                          <button onClick={() => openEdit(c)} className="text-slate-300 hover:text-indigo-500 p-0.5" title={ar ? "تعديل" : "Edit"}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {c.source && (
                          <p className="text-[10px] mt-1" style={{ color: "var(--hv-text-faint)" }}>
                            {ar ? "المصدر: " : "Source: "}{c.source}
                          </p>
                        )}
                        {c.next_follow_up && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5"
                            style={overdue
                              ? { background: "#ef444422", color: "#ef4444" }
                              : { background: "var(--hv-primary-soft, #6366f118)", color: "var(--hv-primary)" }}
                          >
                            <CalendarClock className="w-3 h-3" /> {c.next_follow_up}
                          </span>
                        )}
                        {c.note && (
                          <p className="text-[11px] mt-1.5 line-clamp-2" style={{ color: "var(--hv-text-soft)" }}>{c.note}</p>
                        )}

                        {/* Quick actions */}
                        <div className="flex items-center gap-1.5 mt-2">
                          {c.phone && (
                            <a href={`https://wa.me/${normalizePhone(c.phone)}`} target="_blank" rel="noreferrer"
                              className="p-1.5 rounded-lg" style={{ background: "#25D36618", color: "#128C3E" }} title="WhatsApp">
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {c.phone && (
                            <a href={`tel:+${normalizePhone(c.phone)}`}
                              className="p-1.5 rounded-lg" style={{ background: "#6366f118", color: "var(--hv-primary)" }} title={ar ? "اتصال" : "Call"}>
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <select
                            value={c.stage}
                            onChange={(e) => moveStage.mutate({ id: c.id, stage: e.target.value })}
                            className="hv-input !w-auto !py-1 text-[11px] ms-auto"
                            title={ar ? "نقل لمرحلة" : "Move to stage"}
                          >
                            {STAGES.map((st) => (
                              <option key={st.v} value={st.v}>{ar ? st.ar : st.en}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add / Edit modal */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setModal({ open: false, initial: null })}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden" dir={ar ? "rtl" : "ltr"} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-gray-900 font-extrabold text-lg">
                {modal.initial ? (ar ? "تعديل عميل" : "Edit contact") : (ar ? "عميل جديد" : "New contact")}
              </h2>
              <button onClick={() => setModal({ open: false, initial: null })} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto" style={{ color: "var(--hv-text)" }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{ar ? "الاسم" : "Name"}</label>
                  <input className={inputCls} value={form.name} onChange={(e) => setF("name", e.target.value)} placeholder={ar ? "اسم العميل" : "Contact name"} />
                </div>
                <div>
                  <label className={labelCls}>{ar ? "الجوال" : "Phone"}</label>
                  <input className={inputCls} dir="ltr" value={form.phone} onChange={(e) => setF("phone", e.target.value)} placeholder="05xxxxxxxx" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{ar ? "المرحلة" : "Stage"}</label>
                  <select className={inputCls} value={form.stage} onChange={(e) => setF("stage", e.target.value)}>
                    {STAGES.map((s) => <option key={s.v} value={s.v}>{ar ? s.ar : s.en}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{ar ? "المصدر" : "Source"}</label>
                  <input className={inputCls} value={form.source} onChange={(e) => setF("source", e.target.value)} placeholder={ar ? "إنستقرام، إحالة…" : "Instagram, referral…"} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{ar ? "موعد المتابعة" : "Next follow-up"}</label>
                  <input type="date" className={inputCls} value={form.next_follow_up} onChange={(e) => setF("next_follow_up", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>{ar ? "وسوم (بفاصلة)" : "Tags (comma)"}</label>
                  <input className={inputCls} value={form.tags} onChange={(e) => setF("tags", e.target.value)} placeholder={ar ? "VIP، عروس" : "VIP, bride"} />
                </div>
              </div>

              <div>
                <label className={labelCls}>{ar ? "ملاحظة" : "Note"}</label>
                <textarea rows={3} className={`${inputCls} leading-relaxed`} value={form.note} onChange={(e) => setF("note", e.target.value)} placeholder={ar ? "تفاصيل أو متابعة…" : "Details or follow-up…"} />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              {modal.initial && (
                <button
                  onClick={() => { if (window.confirm(ar ? "حذف هذا العميل؟" : "Delete this contact?")) del.mutate(modal.initial.id); }}
                  className="py-2.5 px-4 rounded-xl border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50"
                  title={ar ? "حذف" : "Delete"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setModal({ open: false, initial: null })} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50">
                {ar ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleSave}
                disabled={save.isPending || (!form.name.trim() && !form.phone.trim())}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-40"
              >
                {save.isPending ? (ar ? "جارٍ الحفظ…" : "Saving…") : (ar ? "حفظ" : "Save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
