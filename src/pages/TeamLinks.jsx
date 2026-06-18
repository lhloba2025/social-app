// TeamLinks — the owner generates ISOLATED links so colleagues can test the
// app in their own private workspace (own designs/library/accounts). Each link
// carries a signed tenant token minted by the backend (/api/team-link), which
// is protected by ADMIN_KEY. The admin key is kept only in this browser.

import React, { useState, useEffect } from "react";
import { Share2, Copy, Check, Trash2, Loader2, KeyRound, UserPlus } from "lucide-react";

const ADMIN_KEY_LS = "team_admin_key";
const LINKS_LS = "team_links_v1";

export default function TeamLinks() {
  const isRtl = (localStorage.getItem("appLanguage") || "ar") === "ar";
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem(ADMIN_KEY_LS) || "");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [links, setLinks] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LINKS_LS) || "[]"); } catch { return []; }
  });
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => { localStorage.setItem(ADMIN_KEY_LS, adminKey); }, [adminKey]);
  useEffect(() => { localStorage.setItem(LINKS_LS, JSON.stringify(links)); }, [links]);

  const generate = async () => {
    setError("");
    if (!adminKey.trim()) { setError(isRtl ? "اكتب مفتاح الإدارة أولاً." : "Enter the admin key first."); return; }
    if (!name.trim()) { setError(isRtl ? "اكتب اسم الزميل." : "Enter a colleague name."); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/team-link?key=${encodeURIComponent(adminKey.trim())}&tenant=${encodeURIComponent(name.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setLinks((prev) => [{ id: data.tenant + "_" + Date.now(), label: name.trim(), url: data.url }, ...prev.filter((l) => l.label !== name.trim())]);
      setName("");
    } catch (e) {
      setError((isRtl ? "تعذّر الإنشاء: " : "Failed: ") + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const copy = async (link) => {
    try { await navigator.clipboard.writeText(link.url); setCopiedId(link.id); setTimeout(() => setCopiedId(null), 1500); } catch { /* ignore */ }
  };
  const remove = (id) => setLinks((prev) => prev.filter((l) => l.id !== id));

  return (
    <div className="hv-page" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-2xl mx-auto">
        <div className="hv-overline">{isRtl ? "مشاركة" : "Sharing"}</div>
        <h1 className="hv-page-title flex items-center gap-2">
          <Share2 className="w-6 h-6" style={{ color: "var(--hv-primary)" }} />
          {isRtl ? "روابط الفريق" : "Team Links"}
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--hv-text-soft)" }}>
          {isRtl
            ? "أنشئ رابطاً خاصاً لكل زميل — يفتح النظام بمساحة معزولة تماماً (تصاميمه وحساباته لحاله، ولا يرى منشوراتك)."
            : "Create a private link per colleague — opens the app in a fully isolated workspace (their own designs/accounts; they never see your posts)."}
        </p>

        {/* Admin key */}
        <div className="hv-card p-4 mb-4">
          <label className="text-xs font-semibold flex items-center gap-1.5 mb-1" style={{ color: "var(--hv-text)" }}>
            <KeyRound className="w-3.5 h-3.5" /> {isRtl ? "مفتاح الإدارة" : "Admin key"}
          </label>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder={isRtl ? "نفس قيمة ADMIN_KEY في Railway" : "Same as ADMIN_KEY in Railway"}
            className="hv-input w-full px-3 py-2"
          />
          <p className="text-[10px] mt-1" style={{ color: "var(--hv-text-faint)" }}>
            {isRtl ? "يُحفظ في متصفحك فقط — لا يُرسل لأحد غير الخادم." : "Stored only in your browser."}
          </p>
        </div>

        {/* Generate */}
        <div className="hv-card p-4 mb-6">
          <label className="text-xs font-semibold flex items-center gap-1.5 mb-1" style={{ color: "var(--hv-text)" }}>
            <UserPlus className="w-3.5 h-3.5" /> {isRtl ? "اسم الزميل" : "Colleague name"}
          </label>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
              placeholder={isRtl ? "مثال: أحمد" : "e.g. Ahmed"}
              className="hv-input flex-1 px-3 py-2"
            />
            <button onClick={generate} disabled={loading} className="hv-btn hv-btn-primary px-4 disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              {isRtl ? "أنشئ رابطاً" : "Generate"}
            </button>
          </div>
          {error && <p className="text-xs mt-2" style={{ color: "var(--hv-secondary-600, #e11d48)" }}>{error}</p>}
        </div>

        {/* Links list */}
        {links.length === 0 ? (
          <p className="text-center text-sm py-8" style={{ color: "var(--hv-text-faint)" }}>
            {isRtl ? "لا توجد روابط بعد." : "No links yet."}
          </p>
        ) : (
          <div className="space-y-2">
            {links.map((l) => (
              <div key={l.id} className="hv-card p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: "var(--hv-text)" }}>{l.label}</p>
                  <p className="text-[11px] truncate" style={{ color: "var(--hv-text-soft)" }} dir="ltr">{l.url}</p>
                </div>
                <button onClick={() => copy(l)} className="hv-btn hv-btn-soft px-3 py-2 text-xs">
                  {copiedId === l.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedId === l.id ? (isRtl ? "تم" : "Copied") : (isRtl ? "نسخ" : "Copy")}
                </button>
                <button onClick={() => remove(l.id)} className="text-red-400 hover:text-red-600 p-1" title={isRtl ? "حذف" : "Delete"}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
