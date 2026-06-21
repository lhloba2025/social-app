// TeamLinks — the owner generates ISOLATED links so colleagues can test the
// app in their own private workspace (own designs/library/accounts). Each link
// carries a signed tenant token minted by the backend (/api/team-link), which
// is protected by ADMIN_KEY. The admin key is kept only in this browser.
//
// It also manages each user's MONTHLY image-generation quota, so colleagues who
// generate images on the owner's account/billing can each be capped.

import React, { useState, useEffect, useCallback } from "react";
import { Share2, Copy, Check, Trash2, Loader2, KeyRound, UserPlus, ImageIcon, RefreshCw, Save, RotateCcw } from "lucide-react";

const ADMIN_KEY_LS = "team_admin_key";
const LINKS_LS = "team_links_v1";

export default function TeamLinks() {
  const isRtl = (localStorage.getItem("appLanguage") || "ar") === "ar";
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem(ADMIN_KEY_LS) || "");
  const [name, setName] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [links, setLinks] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LINKS_LS) || "[]"); } catch { return []; }
  });
  const [copiedId, setCopiedId] = useState(null);

  // ── Quota management state ──────────────────────────────────────────────────
  const [defaultLimit, setDefaultLimit] = useState(30);
  const [defaultDraft, setDefaultDraft] = useState("");
  const [users, setUsers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [drafts, setDrafts] = useState({}); // tenant -> limit string being edited

  useEffect(() => { localStorage.setItem(ADMIN_KEY_LS, adminKey); }, [adminKey]);
  useEffect(() => { localStorage.setItem(LINKS_LS, JSON.stringify(links)); }, [links]);

  const loadAdmin = useCallback(async () => {
    if (!adminKey.trim()) return;
    setAdminLoading(true); setAdminError("");
    try {
      const res = await fetch(`/api/image-admin?key=${encodeURIComponent(adminKey.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setDefaultLimit(data.defaultLimit);
      setDefaultDraft(String(data.defaultLimit));
      setUsers(data.users || []);
      setDrafts(Object.fromEntries((data.users || []).map((u) => [u.tenant, u.override ? String(u.override) : ""])));
    } catch (e) {
      setAdminError((isRtl ? "تعذّر جلب الحصص: " : "Failed: ") + (e?.message || e));
    } finally {
      setAdminLoading(false);
    }
  }, [adminKey, isRtl]);

  // Auto-load the quota table once a key is present.
  useEffect(() => { if (adminKey.trim()) loadAdmin(); /* eslint-disable-next-line */ }, []);

  const generate = async () => {
    setError("");
    if (!adminKey.trim()) { setError(isRtl ? "اكتب مفتاح الإدارة أولاً." : "Enter the admin key first."); return; }
    if (!name.trim()) { setError(isRtl ? "اكتب اسم الزميل." : "Enter a colleague name."); return; }
    setLoading(true);
    try {
      const limQs = newLimit.trim() ? `&limit=${encodeURIComponent(newLimit.trim())}` : "";
      const res = await fetch(`/api/team-link?key=${encodeURIComponent(adminKey.trim())}&tenant=${encodeURIComponent(name.trim())}${limQs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setLinks((prev) => [{ id: data.tenant + "_" + Date.now(), label: name.trim(), url: data.url }, ...prev.filter((l) => l.label !== name.trim())]);
      setName(""); setNewLimit("");
      loadAdmin();
    } catch (e) {
      setError((isRtl ? "تعذّر الإنشاء: " : "Failed: ") + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const saveDefault = async () => {
    setAdminError("");
    try {
      const res = await fetch(`/api/image-admin/default?key=${encodeURIComponent(adminKey.trim())}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: Number(defaultDraft) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      loadAdmin();
    } catch (e) { setAdminError(e?.message || String(e)); }
  };

  const saveUserLimit = async (tenant) => {
    setAdminError("");
    try {
      const res = await fetch(`/api/image-admin/limit?key=${encodeURIComponent(adminKey.trim())}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant, limit: Number(drafts[tenant] || 0) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      loadAdmin();
    } catch (e) { setAdminError(e?.message || String(e)); }
  };

  const resetUser = async (tenant) => {
    setAdminError("");
    try {
      const res = await fetch(`/api/image-admin/reset?key=${encodeURIComponent(adminKey.trim())}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      loadAdmin();
    } catch (e) { setAdminError(e?.message || String(e)); }
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
            ? "أنشئ رابطاً خاصاً لكل زميل — يفتح النظام بمساحة معزولة تماماً (تصاميمه وحساباته لحاله، ولا يرى منشوراتك). وتقدر تحدد لكل واحد عدد الصور المسموح شهرياً."
            : "Create a private link per colleague — opens the app in a fully isolated workspace. You can also cap each user's monthly image generations."}
        </p>

        {/* Admin key */}
        <div className="hv-card p-4 mb-4">
          <label className="text-xs font-semibold flex items-center gap-1.5 mb-1" style={{ color: "var(--hv-text)" }}>
            <KeyRound className="w-3.5 h-3.5" /> {isRtl ? "مفتاح الإدارة" : "Admin key"}
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder={isRtl ? "نفس قيمة ADMIN_KEY في Railway" : "Same as ADMIN_KEY in Railway"}
              className="hv-input flex-1 px-3 py-2"
            />
            <button onClick={loadAdmin} disabled={adminLoading || !adminKey.trim()} className="hv-btn hv-btn-soft px-3 disabled:opacity-50" title={isRtl ? "تحديث" : "Refresh"}>
              {adminLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
          </div>
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
            <input
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
              type="number" min="1"
              placeholder={isRtl ? `صور/شهر (${defaultLimit})` : `imgs/mo (${defaultLimit})`}
              className="hv-input w-32 px-3 py-2"
              title={isRtl ? "عدد الصور المسموح شهرياً (اتركه فاضي = الافتراضي)" : "Monthly image cap (blank = default)"}
            />
            <button onClick={generate} disabled={loading} className="hv-btn hv-btn-primary px-4 disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              {isRtl ? "أنشئ" : "Generate"}
            </button>
          </div>
          <p className="text-[10px] mt-1.5" style={{ color: "var(--hv-text-faint)" }}>
            {isRtl ? "خانة الصور اختيارية — اتركها فاضية ليأخذ الزميل الحد الافتراضي." : "Image cap is optional — blank uses the default."}
          </p>
          {error && <p className="text-xs mt-2" style={{ color: "var(--hv-secondary-600, #e11d48)" }}>{error}</p>}
        </div>

        {/* Links list */}
        {links.length > 0 && (
          <div className="space-y-2 mb-8">
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

        {/* ── Image quota management ──────────────────────────────────────────── */}
        <div className="hv-overline">{isRtl ? "حصص توليد الصور" : "Image quotas"}</div>
        <h2 className="text-lg font-extrabold mb-1 flex items-center gap-2" style={{ color: "var(--hv-text)" }}>
          <ImageIcon className="w-5 h-5" style={{ color: "var(--hv-primary)" }} />
          {isRtl ? "حصة الصور لكل مستخدم (شهرياً)" : "Per-user monthly image quota"}
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--hv-text-soft)" }}>
          {isRtl
            ? "حسابك أنت بلا حدود. كل زميل له عدد محدد كل شهر يرجع صفر تلقائياً أول الشهر — وتقدر تغيّره أو تصفّره وقت ما تبي."
            : "Your own account is unlimited. Each colleague gets a monthly cap that resets automatically — change or reset it anytime."}
        </p>

        {/* Global default */}
        <div className="hv-card p-4 mb-4">
          <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--hv-text)" }}>
            {isRtl ? "الحد الافتراضي لأي مستخدم بلا حد خاص" : "Default cap for users without a custom limit"}
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="number" min="1"
              value={defaultDraft}
              onChange={(e) => setDefaultDraft(e.target.value)}
              className="hv-input w-32 px-3 py-2"
            />
            <span className="text-xs" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "صورة / الشهر" : "imgs / month"}</span>
            <button onClick={saveDefault} disabled={!adminKey.trim()} className="hv-btn hv-btn-primary px-4 disabled:opacity-50 ms-auto">
              <Save className="w-4 h-4" /> {isRtl ? "حفظ" : "Save"}
            </button>
          </div>
        </div>

        {adminError && <p className="text-xs mb-3" style={{ color: "var(--hv-secondary-600, #e11d48)" }}>{adminError}</p>}

        {/* Per-user rows */}
        {!adminKey.trim() ? (
          <p className="text-center text-sm py-6" style={{ color: "var(--hv-text-faint)" }}>
            {isRtl ? "اكتب مفتاح الإدارة لعرض المستخدمين." : "Enter the admin key to view users."}
          </p>
        ) : users.length === 0 ? (
          <p className="text-center text-sm py-6" style={{ color: "var(--hv-text-faint)" }}>
            {isRtl ? "لا يوجد مستخدمون بعد. أنشئ رابط فريق ليظهر هنا." : "No users yet."}
          </p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => {
              const pct = u.limit > 0 ? Math.min(100, Math.round((u.used / u.limit) * 100)) : 0;
              const danger = u.used >= u.limit;
              return (
                <div key={u.tenant} className="hv-card p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: "var(--hv-text)" }}>{u.label}</p>
                      <p className="text-[11px]" style={{ color: danger ? "#e11d48" : "var(--hv-text-soft)" }}>
                        {isRtl ? "استهلك" : "Used"} {u.used} / {u.limit} {isRtl ? "هذا الشهر" : "this month"}
                        {u.override ? (isRtl ? " · حد خاص" : " · custom") : (isRtl ? " · افتراضي" : " · default")}
                      </p>
                    </div>
                    <button onClick={() => resetUser(u.tenant)} className="hv-btn hv-btn-soft px-2.5 py-1.5 text-xs" title={isRtl ? "تصفير الاستهلاك هذا الشهر" : "Reset this month"}>
                      <RotateCcw className="w-3.5 h-3.5" /> {isRtl ? "تصفير" : "Reset"}
                    </button>
                  </div>
                  {/* usage bar */}
                  <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: "var(--hv-border, #e5e7eb)" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: danger ? "#e11d48" : "var(--hv-primary)" }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px]" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "الحد الشهري" : "Monthly cap"}</span>
                    <input
                      type="number" min="0"
                      value={drafts[u.tenant] ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [u.tenant]: e.target.value }))}
                      placeholder={`${defaultLimit}`}
                      className="hv-input w-24 px-2.5 py-1.5 text-sm"
                      title={isRtl ? "اتركه فاضي ليأخذ الافتراضي" : "Blank = default"}
                    />
                    <button onClick={() => saveUserLimit(u.tenant)} className="hv-btn hv-btn-primary px-3 py-1.5 text-xs">
                      <Save className="w-3.5 h-3.5" /> {isRtl ? "حفظ" : "Save"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
