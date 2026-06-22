import React, { useState, useEffect } from 'react';
import { salesApi, getStoredUser, clearSession } from '@/api/salesClient';
import SalesLogin from '@/components/sales/SalesLogin';
import HoveraLogo from '@/components/sales/HoveraLogo';
import { ROLE_LABELS } from './salesConstants';
import { Link } from 'react-router-dom';
import {
  Users, MessageSquare, Database, Trash2, Plus, LogOut, ArrowRight,
  Download, Upload, FileSpreadsheet, FileDown, Loader2, ShieldAlert, X,
} from 'lucide-react';

export default function SalesPortalAdmin() {
  const [user, setUser] = useState(getStoredUser());
  const [tab, setTab] = useState('members');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  if (!user) return <SalesLogin onSuccess={setUser} />;

  const isAdmin = user.role === 'admin' || user.role === 'super_admin';
  const isSuper = user.role === 'super_admin';

  const logout = async () => {
    await salesApi.logout();
    clearSession();
    setUser(null);
  };

  // عضو فريق عادي لا يدخل صفحة الإدارة.
  if (!isAdmin) {
    return (
      <div dir="rtl" className="h-screen flex flex-col items-center justify-center bg-slate-950 text-center p-4 gap-4">
        <ShieldAlert className="w-14 h-14 text-rose-500" />
        <h2 className="text-xl font-bold text-white">هذه الصفحة للمديرين فقط</h2>
        <p className="text-slate-400">ليست لديك صلاحية الوصول لإدارة البوابة.</p>
        <Link to="/SalesPortal" className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 py-2 flex items-center gap-2">
          <ArrowRight className="w-4 h-4" /> العودة لصفحة الفريق
        </Link>
      </div>
    );
  }

  const TABS = [
    { id: 'members', label: 'أعضاء الفريق', icon: Users },
    { id: 'templates', label: 'قوالب الواتساب', icon: MessageSquare },
    ...(isSuper ? [{ id: 'data', label: 'البيانات والنُّسخ', icon: Database }] : []),
  ];

  return (
    <div dir="rtl" className="h-screen overflow-y-auto bg-slate-950 text-white">
      <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HoveraLogo size={36} />
          <span className="text-slate-500 text-sm hidden md:inline">إدارة بوابة فريق المبيعات</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/SalesPortal" className="flex items-center gap-1.5 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 transition">
            <ArrowRight className="w-4 h-4" /> صفحة الفريق
          </Link>
          <span className="text-sm text-slate-300">{user.name} · <span className="text-slate-500">{ROLE_LABELS[user.role]}</span></span>
          <button onClick={logout} className="text-slate-400 hover:text-rose-400 transition" title="خروج"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4">
        {/* التبويبات */}
        <div className="flex gap-2 mb-4 border-b border-slate-800">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                tab === t.id ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'members' && <MembersTab user={user} showToast={showToast} />}
        {tab === 'templates' && <TemplatesTab showToast={showToast} />}
        {tab === 'data' && isSuper && <DataTab showToast={showToast} />}
      </div>

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg ${
          toast.type === 'err' ? 'bg-rose-600' : 'bg-emerald-600'
        } text-white`}>{toast.msg}</div>
      )}
    </div>
  );
}

// ── أعضاء الفريق ────────────────────────────────────────────────────────────────
function MembersTab({ user, showToast }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = () => {
    setLoading(true);
    salesApi.members().then(setMembers).catch((e) => showToast(e.message, 'err')).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const remove = async (m) => {
    if (!window.confirm(`حذف العضو «${m.display_name}»؟`)) return;
    try { await salesApi.deleteMember(m.id); showToast('تم حذف العضو'); load(); }
    catch (e) { showToast(e.message, 'err'); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-lg">أعضاء الفريق</h2>
        <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-2 text-sm">
          <Plus className="w-4 h-4" /> إضافة عضو
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-indigo-500" /></div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-white">{m.display_name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{m.username} · {ROLE_LABELS[m.role]}</div>
                </div>
                {m.id !== user.id && (
                  <button onClick={() => remove(m)} className="text-slate-500 hover:text-rose-400" title="حذف">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <MemberStat label="عدد عملائه" value={m.stats.clients} />
                <MemberStat label="تواصله اليوم" value={m.stats.today} />
                <MemberStat label="هذا الشهر" value={m.stats.month} />
              </div>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <AddMemberModal
          canCreateSuper={user.role === 'super_admin'}
          onClose={() => setAdding(false)}
          onAdded={() => { setAdding(false); showToast('تمت إضافة العضو'); load(); }}
          onError={(m) => showToast(m, 'err')}
        />
      )}
    </div>
  );
}

function MemberStat({ label, value }) {
  return (
    <div className="bg-slate-800 rounded-lg py-2 text-center">
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-[11px] text-slate-400">{label}</div>
    </div>
  );
}

function AddMemberModal({ canCreateSuper, onClose, onAdded, onError }) {
  const [form, setForm] = useState({ display_name: '', username: '', password: '', role: 'agent' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.display_name || !form.username || !form.password) {
      return onError('الرجاء تعبئة كل الحقول');
    }
    setSaving(true);
    try { await salesApi.addMember(form); onAdded(); }
    catch (e) { onError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell title="إضافة عضو جديد" onClose={onClose}>
      <div className="space-y-3">
        <Labeled label="الاسم الظاهر"><input value={form.display_name} onChange={(e) => set('display_name', e.target.value)} className={inputCls} placeholder="مثال: محمد العتيبي" /></Labeled>
        <Labeled label="اسم المستخدم"><input value={form.username} onChange={(e) => set('username', e.target.value)} className={inputCls} placeholder="username" /></Labeled>
        <Labeled label="كلمة المرور"><input type="text" value={form.password} onChange={(e) => set('password', e.target.value)} className={inputCls} placeholder="كلمة مرور قوية" /></Labeled>
        <Labeled label="الدور">
          <select value={form.role} onChange={(e) => set('role', e.target.value)} className={inputCls}>
            <option value="agent">عضو فريق</option>
            <option value="admin">مدير</option>
            {canCreateSuper && <option value="super_admin">سوبر أدمن</option>}
          </select>
        </Labeled>
      </div>
      <div className="flex gap-2 pt-4">
        <button onClick={save} disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-lg py-2.5 flex items-center justify-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} حفظ
        </button>
        <button onClick={onClose} className="px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">إلغاء</button>
      </div>
    </ModalShell>
  );
}

// ── قوالب الواتساب ──────────────────────────────────────────────────────────────
function TemplatesTab({ showToast }) {
  const [templates, setTemplates] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    salesApi.templates().then(setTemplates).catch((e) => showToast(e.message, 'err')).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const add = async () => {
    if (!body.trim()) return;
    try { await salesApi.addTemplate(body.trim()); setBody(''); showToast('تمت إضافة القالب'); load(); }
    catch (e) { showToast(e.message, 'err'); }
  };
  const remove = async (id) => {
    try { await salesApi.deleteTemplate(id); showToast('تم حذف القالب'); load(); }
    catch (e) { showToast(e.message, 'err'); }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-lg">قوالب ردود الواتساب</h2>
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className={inputCls}
          placeholder="اكتب نص القالب… استخدم {me} ليُستبدل تلقائياً باسم العضو."
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">المتغيّر {'{me}'} يُستبدل باسم العضو عند الإرسال.</span>
          <button onClick={add} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-2 text-sm">
            <Plus className="w-4 h-4" /> إضافة
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-7 h-7 animate-spin text-indigo-500" /></div>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3 flex items-start justify-between gap-3">
              <p className="text-sm text-slate-200 whitespace-pre-wrap">{t.body}</p>
              <button onClick={() => remove(t.id)} className="text-slate-500 hover:text-rose-400 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {templates.length === 0 && <p className="text-slate-500 text-center py-6">لا توجد قوالب بعد.</p>}
        </div>
      )}
    </div>
  );
}

// ── البيانات والنُّسخ ────────────────────────────────────────────────────────────
function DataTab({ showToast }) {
  const [busy, setBusy] = useState('');

  const downloadBlob = async (res, filename) => {
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const backup = async () => {
    setBusy('backup');
    try { await downloadBlob(await salesApi.backup(), 'hovera-backup.json'); showToast('تم تنزيل النسخة الاحتياطية'); }
    catch (e) { showToast(e.message, 'err'); } finally { setBusy(''); }
  };

  const exportExcel = async () => {
    setBusy('export');
    try { await downloadBlob(await salesApi.exportExcel(), 'hovera-salons.xlsx'); showToast('تم تصدير الإكسل'); }
    catch (e) { showToast(e.message, 'err'); } finally { setBusy(''); }
  };

  const importBackup = async (file) => {
    setBusy('import');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const r = await salesApi.importBackup(data);
      showToast(`تم الدمج: أُضيف ${r.added} · حُدّث ${r.updated} · تُجوهل ${r.skipped}`);
    } catch (e) { showToast(e.message || 'ملف غير صالح', 'err'); } finally { setBusy(''); }
  };

  const uploadExcel = async (file) => {
    setBusy('upload');
    try {
      const r = await salesApi.uploadExcel(file);
      showToast(`تم الرفع: أُضيف ${r.added} صفّاً · تُجوهل ${r.skipped} مكرّراً`);
    } catch (e) { showToast(e.message, 'err'); } finally { setBusy(''); }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-lg">البيانات والنُّسخ</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <DataCard
          icon={Download} title="نسخة احتياطية" desc="تنزيل كل بيانات البوابة كملف JSON."
          actionLabel="تنزيل النسخة" loading={busy === 'backup'} onClick={backup}
        />
        <DataCardFile
          icon={Upload} title="استيراد نسخة" desc="دمج نسخة سابقة — يحدّث الأحدث فقط ولا يمسح."
          actionLabel="اختيار ملف JSON" accept=".json" loading={busy === 'import'} onFile={importBackup}
        />
        <DataCard
          icon={FileDown} title="تصدير إكسل" desc="تصدير قائمة الصوالين كملف إكسل."
          actionLabel="تصدير إكسل" loading={busy === 'export'} onClick={exportExcel}
        />
        <DataCardFile
          icon={FileSpreadsheet} title="رفع إكسل صوالين" desc="إضافة صوالين جديدة — يمنع تكرار الأرقام ولا يمسح القديم."
          actionLabel="اختيار ملف إكسل" accept=".xlsx,.xls" loading={busy === 'upload'} onFile={uploadExcel}
        />
      </div>
    </div>
  );
}

function DataCard({ icon: Icon, title, desc, actionLabel, loading, onClick }) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-white font-bold"><Icon className="w-5 h-5 text-indigo-400" /> {title}</div>
      <p className="text-sm text-slate-400 flex-1">{desc}</p>
      <button onClick={onClick} disabled={loading} className="bg-slate-800 hover:bg-indigo-600 disabled:opacity-60 text-white rounded-lg py-2 text-sm flex items-center justify-center gap-2 transition">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />} {actionLabel}
      </button>
    </div>
  );
}

function DataCardFile({ icon: Icon, title, desc, actionLabel, accept, loading, onFile }) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-white font-bold"><Icon className="w-5 h-5 text-indigo-400" /> {title}</div>
      <p className="text-sm text-slate-400 flex-1">{desc}</p>
      <label className="bg-slate-800 hover:bg-indigo-600 cursor-pointer text-white rounded-lg py-2 text-sm flex items-center justify-center gap-2 transition">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />} {actionLabel}
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
        />
      </label>
    </div>
  );
}

// ── أدوات مشتركة ────────────────────────────────────────────────────────────────
function ModalShell({ title, onClose, children }) {
  return (
    <div dir="rtl" className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Labeled({ label, children }) {
  return (
    <div>
      <label className="block text-slate-300 text-sm mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500';
