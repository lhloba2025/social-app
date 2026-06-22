import React, { useState, useEffect } from 'react';
import { salesApi, getStoredUser, clearSession } from '@/api/salesClient';
import SalesLogin from '@/components/sales/SalesLogin';
import HoveraLogo from '@/components/sales/HoveraLogo';
import { roleLabel, statusLabel, statusColor, shortDate, timeAgo } from './salesConstants';
import { Link } from 'react-router-dom';
import {
  Users, MessageSquare, Database, Trash2, Plus, LogOut, ArrowRight, ArrowLeft,
  Download, Upload, FileSpreadsheet, FileDown, Loader2, ShieldAlert, X,
  Pencil, Check, Sparkles, Gauge, AlertTriangle, CalendarClock, Clock, Home,
} from 'lucide-react';

export default function SalesPortalAdmin({ language }) {
  const ar = language !== 'en';
  const [user, setUser] = useState(getStoredUser());
  const [tab, setTab] = useState('oversight');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  if (!user) return <SalesLogin onSuccess={setUser} ar={ar} />;

  const isAdmin = user.role === 'admin' || user.role === 'super_admin';
  const isSuper = user.role === 'super_admin';
  const BackIcon = ar ? ArrowRight : ArrowLeft;

  const logout = async () => {
    await salesApi.logout();
    clearSession();
    setUser(null);
  };

  // عضو فريق عادي لا يدخل صفحة الإدارة.
  if (!isAdmin) {
    return (
      <div dir={ar ? 'rtl' : 'ltr'} className="h-screen flex flex-col items-center justify-center bg-slate-950 text-center p-4 gap-4">
        <ShieldAlert className="w-14 h-14 text-rose-500" />
        <h2 className="text-xl font-bold text-white">{ar ? 'هذه الصفحة للمديرين فقط' : 'This page is for admins only'}</h2>
        <p className="text-slate-400">{ar ? 'ليست لديك صلاحية الوصول لإدارة البوابة.' : 'You don’t have permission to access portal administration.'}</p>
        <Link to="/SalesPortal" className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 py-2 flex items-center gap-2">
          <BackIcon className="w-4 h-4" /> {ar ? 'العودة لصفحة الفريق' : 'Back to Team Page'}
        </Link>
      </div>
    );
  }

  const TABS = [
    { id: 'oversight', label: ar ? 'متابعة الفريق' : 'Team Oversight', icon: Gauge },
    { id: 'members', label: ar ? 'أعضاء الفريق' : 'Team Members', icon: Users },
    { id: 'templates', label: ar ? 'قوالب الواتساب' : 'WhatsApp Templates', icon: MessageSquare },
    ...(isSuper ? [{ id: 'data', label: ar ? 'البيانات والنُّسخ' : 'Data & Backups', icon: Database }] : []),
  ];

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="h-screen overflow-y-auto bg-slate-950 text-white">
      <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HoveraLogo size={36} ar={ar} />
          <span className="text-slate-500 text-sm hidden md:inline">{ar ? 'إدارة بوابة فريق المبيعات' : 'Sales Team Portal Admin'}</span>
        </div>
        <div className="flex items-center gap-3">
          {isSuper && (
            <Link to="/" className="flex items-center gap-1.5 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 transition" title={ar ? 'النظام الرئيسي' : 'Main System'}>
              <Home className="w-4 h-4" /> <span className="hidden sm:inline">{ar ? 'النظام' : 'System'}</span>
            </Link>
          )}
          <Link to="/SalesPortal" className="flex items-center gap-1.5 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 transition">
            <BackIcon className="w-4 h-4" /> {ar ? 'صفحة الفريق' : 'Team Page'}
          </Link>
          <span className="text-sm text-slate-300">{user.name} · <span className="text-slate-500">{roleLabel(user.role, ar)}</span></span>
          <button onClick={logout} className="text-slate-400 hover:text-rose-400 transition" title={ar ? 'خروج' : 'Sign out'}><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4">
        {/* التبويبات */}
        <div className="flex gap-2 mb-4 border-b border-slate-800 overflow-x-auto">
          {TABS.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap flex-shrink-0 ${
                tab === tb.id ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <tb.icon className="w-4 h-4" /> {tb.label}
            </button>
          ))}
        </div>

        {tab === 'oversight' && <OversightTab ar={ar} showToast={showToast} />}
        {tab === 'members' && <MembersTab user={user} ar={ar} showToast={showToast} />}
        {tab === 'templates' && <TemplatesTab ar={ar} showToast={showToast} />}
        {tab === 'data' && isSuper && <DataTab ar={ar} showToast={showToast} />}
      </div>

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg ${
          toast.type === 'err' ? 'bg-rose-600' : 'bg-emerald-600'
        } text-white`}>{toast.msg}</div>
      )}
    </div>
  );
}

// ── متابعة الفريق ───────────────────────────────────────────────────────────────
function OversightTab({ ar, showToast }) {
  const [data, setData] = useState(null);   // null = قيد التحميل
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    salesApi.oversight()
      .then(setData)
      .catch((e) => showToast(e.message, 'err'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  if (loading && !data) {
    return <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-indigo-500" /></div>;
  }
  if (!data) return null;

  const staleDays = data.stale_days ?? 3;
  const neglected = data.neglected || [];
  const byMember = (data.by_member || []).filter((m) => m.active > 0);
  const totalOverdue = neglected.filter((n) => n.follow_up_overdue).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500 leading-relaxed">
          {ar
            ? 'يعرض من تأخّر في المتابعة وأي عميلة مهملة — مبني على آخر تواصل والمواعيد. (لا يشمل نص محادثات الواتساب نفسها.)'
            : 'Shows who is behind and which clients are neglected — based on last contact & dates. (WhatsApp message text is not included.)'}
        </p>
        <button onClick={load} className="text-slate-400 hover:text-white flex-shrink-0" title={ar ? 'تحديث' : 'Refresh'}>
          <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ملخّص لكل عضو */}
      <div>
        <h3 className="font-bold mb-2 flex items-center gap-2"><Users className="w-4 h-4 text-indigo-400" /> {ar ? 'أداء الأعضاء' : 'Member Performance'}</h3>
        {byMember.length === 0 ? (
          <p className="text-slate-500 text-sm py-4">{ar ? 'لا يوجد أعضاء لديهم عملاء بعد.' : 'No members own clients yet.'}</p>
        ) : (
          <div className="space-y-2">
            {byMember.map((m) => (
              <div key={m.user_id} className="bg-slate-900 border border-slate-700 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-white">{m.name}</span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {m.last_activity ? (ar ? `آخر نشاط ${timeAgo(m.last_activity, ar)}` : `active ${timeAgo(m.last_activity, ar)}`) : (ar ? 'لا نشاط' : 'no activity')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2.5">
                  <OvStat label={ar ? 'عملاء نشطين' : 'Active'} value={m.active} tone="text-white" />
                  <OvStat label={ar ? `مهمل (≥${staleDays}ي)` : `Stale (≥${staleDays}d)`} value={m.stale} tone={m.stale > 0 ? 'text-amber-400' : 'text-slate-500'} />
                  <OvStat label={ar ? 'متابعة فائتة' : 'Overdue'} value={m.overdue} tone={m.overdue > 0 ? 'text-rose-400' : 'text-slate-500'} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* العملاء الأكثر إهمالاً */}
      <div>
        <h3 className="font-bold mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          {ar ? 'عملاء تأخّر التواصل معهم' : 'Clients Awaiting Follow-up'}
          {totalOverdue > 0 && (
            <span className="text-[11px] bg-rose-600 text-white px-2 py-0.5 rounded-full">
              {ar ? `${totalOverdue} متابعة فائتة` : `${totalOverdue} overdue`}
            </span>
          )}
        </h3>
        {neglected.length === 0 ? (
          <p className="text-slate-500 text-sm py-4">{ar ? 'ما فيه عملاء نشطين بحاجة متابعة. 👏' : 'No active clients awaiting follow-up. 👏'}</p>
        ) : (
          <div className="space-y-2">
            {neglected.map((n) => (
              <div key={n.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">{n.name || (ar ? 'بدون اسم' : 'Unnamed')}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {ar ? 'المسؤول' : 'Owner'}: <span className="text-slate-200">{n.owner_name || '—'}</span>
                    </div>
                  </div>
                  <span className={`text-[11px] text-white px-2 py-1 rounded-full flex-shrink-0 ${statusColor(n.status)}`}>
                    {statusLabel(n.status, ar)}
                  </span>
                </div>
                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2 text-[12px]">
                  <span className={`flex items-center gap-1 ${(n.days_since ?? 0) >= staleDays ? 'text-amber-300' : 'text-slate-400'}`}>
                    <Clock className="w-3.5 h-3.5" />
                    {n.last_contact_date
                      ? (ar ? `آخر تواصل ${timeAgo(n.last_contact_date, ar)}` : `last ${timeAgo(n.last_contact_date, ar)}`)
                      : (ar ? 'لم يُتواصل بعد' : 'never contacted')}
                  </span>
                  {n.follow_up_overdue && (
                    <span className="flex items-center gap-1 text-rose-300">
                      <CalendarClock className="w-3.5 h-3.5" />
                      {ar ? `متابعة فائتة (${shortDate(n.follow_up, ar)})` : `overdue (${shortDate(n.follow_up, ar)})`}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OvStat({ label, value, tone }) {
  return (
    <div className="bg-slate-800 rounded-lg py-2 text-center">
      <div className={`text-lg font-bold ${tone}`}>{value}</div>
      <div className="text-[10px] text-slate-400">{label}</div>
    </div>
  );
}

// ── أعضاء الفريق ────────────────────────────────────────────────────────────────
function MembersTab({ user, ar, showToast }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = () => {
    setLoading(true);
    salesApi.members().then(setMembers).catch((e) => showToast(e.message, 'err')).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const remove = async (m) => {
    if (!window.confirm(ar ? `حذف العضو «${m.display_name}»؟` : `Delete member “${m.display_name}”?`)) return;
    try { await salesApi.deleteMember(m.id); showToast(ar ? 'تم حذف العضو' : 'Member deleted'); load(); }
    catch (e) { showToast(e.message, 'err'); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-lg">{ar ? 'أعضاء الفريق' : 'Team Members'}</h2>
        <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-2 text-sm">
          <Plus className="w-4 h-4" /> {ar ? 'إضافة عضو' : 'Add Member'}
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
                  <div className="text-xs text-slate-400 mt-0.5">{m.username} · {roleLabel(m.role, ar)}</div>
                </div>
                {m.id !== user.id && (
                  <button onClick={() => remove(m)} className="text-slate-500 hover:text-rose-400" title={ar ? 'حذف' : 'Delete'}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <MemberStat label={ar ? 'عدد عملائه' : 'Clients'} value={m.stats.clients} />
                <MemberStat label={ar ? 'تواصله اليوم' : 'Today'} value={m.stats.today} />
                <MemberStat label={ar ? 'هذا الشهر' : 'This Month'} value={m.stats.month} />
              </div>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <AddMemberModal
          ar={ar}
          canCreateSuper={user.role === 'super_admin'}
          onClose={() => setAdding(false)}
          onAdded={() => { setAdding(false); showToast(ar ? 'تمت إضافة العضو' : 'Member added'); load(); }}
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

function AddMemberModal({ ar, canCreateSuper, onClose, onAdded, onError }) {
  const [form, setForm] = useState({ display_name: '', username: '', password: '', role: 'agent' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.display_name || !form.username || !form.password) {
      return onError(ar ? 'الرجاء تعبئة كل الحقول' : 'Please fill in all fields');
    }
    setSaving(true);
    try { await salesApi.addMember(form); onAdded(); }
    catch (e) { onError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell ar={ar} title={ar ? 'إضافة عضو جديد' : 'Add New Member'} onClose={onClose}>
      <div className="space-y-3">
        <Labeled label={ar ? 'الاسم الظاهر' : 'Display Name'}><input value={form.display_name} onChange={(e) => set('display_name', e.target.value)} className={inputCls} placeholder={ar ? 'مثال: محمد العتيبي' : 'e.g. Mohammed Alotaibi'} /></Labeled>
        <Labeled label={ar ? 'اسم المستخدم' : 'Username'}><input value={form.username} onChange={(e) => set('username', e.target.value)} className={inputCls} placeholder="username" /></Labeled>
        <Labeled label={ar ? 'كلمة المرور' : 'Password'}><input type="text" value={form.password} onChange={(e) => set('password', e.target.value)} className={inputCls} placeholder={ar ? 'كلمة مرور قوية' : 'Strong password'} /></Labeled>
        <Labeled label={ar ? 'الدور' : 'Role'}>
          <select value={form.role} onChange={(e) => set('role', e.target.value)} className={inputCls}>
            <option value="agent">{ar ? 'عضو فريق' : 'Sales Agent'}</option>
            <option value="admin">{ar ? 'مدير' : 'Admin'}</option>
            {canCreateSuper && <option value="super_admin">{ar ? 'سوبر أدمن' : 'Super Admin'}</option>}
          </select>
        </Labeled>
      </div>
      <div className="flex gap-2 pt-4">
        <button onClick={save} disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-lg py-2.5 flex items-center justify-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} {ar ? 'حفظ' : 'Save'}
        </button>
        <button onClick={onClose} className="px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">{ar ? 'إلغاء' : 'Cancel'}</button>
      </div>
    </ModalShell>
  );
}

// ── قوالب الواتساب ──────────────────────────────────────────────────────────────
function TemplatesTab({ ar, showToast }) {
  const [templates, setTemplates] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState('');

  const load = () => {
    setLoading(true);
    salesApi.templates().then(setTemplates).catch((e) => showToast(e.message, 'err')).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const add = async () => {
    if (!body.trim()) return;
    try { await salesApi.addTemplate(body.trim()); setBody(''); showToast(ar ? 'تمت إضافة القالب' : 'Template added'); load(); }
    catch (e) { showToast(e.message, 'err'); }
  };
  const remove = async (id) => {
    if (!window.confirm(ar ? 'حذف هذا القالب؟' : 'Delete this template?')) return;
    try { await salesApi.deleteTemplate(id); showToast(ar ? 'تم حذف القالب' : 'Template deleted'); load(); }
    catch (e) { showToast(e.message, 'err'); }
  };
  const startEdit = (tpl) => { setEditingId(tpl.id); setEditBody(tpl.body); };
  const saveEdit = async (id) => {
    if (!editBody.trim()) return;
    try { await salesApi.updateTemplate(id, editBody.trim()); setEditingId(null); showToast(ar ? 'تم حفظ التعديل' : 'Changes saved'); load(); }
    catch (e) { showToast(e.message, 'err'); }
  };
  const seedDefaults = async () => {
    setSeeding(true);
    try {
      const r = await salesApi.seedDefaultTemplates();
      showToast(r.added > 0
        ? (ar ? `تمت إضافة ${r.added} قالباً جاهزاً` : `Added ${r.added} ready templates`)
        : (ar ? 'القوالب الجاهزة موجودة مسبقاً' : 'Ready templates already exist'));
      load();
    } catch (e) { showToast(e.message, 'err'); } finally { setSeeding(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-bold text-lg">{ar ? 'قوالب ردود الواتساب' : 'WhatsApp Reply Templates'}</h2>
        <button onClick={seedDefaults} disabled={seeding} className="flex items-center gap-1.5 bg-slate-800 hover:bg-emerald-600 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm transition disabled:opacity-60">
          {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {ar ? 'إضافة القوالب الجاهزة' : 'Add Ready Templates'}
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className={inputCls}
          placeholder={ar ? 'اكتب نص القالب… استخدم {me} ليُستبدل تلقائياً باسم العضو.' : 'Write the template… use {me} to auto-insert the member’s name.'}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">{ar ? 'المتغيّر {me} يُستبدل باسم العضو عند الإرسال.' : 'The {me} variable is replaced with the member’s name on send.'}</span>
          <button onClick={add} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-2 text-sm">
            <Plus className="w-4 h-4" /> {ar ? 'إضافة' : 'Add'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-7 h-7 animate-spin text-indigo-500" /></div>
      ) : (
        <div className="space-y-2">
          {templates.map((tpl) => (
            <div key={tpl.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3">
              {editingId === tpl.id ? (
                <div className="space-y-2">
                  <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={4} className={inputCls} autoFocus />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg">{ar ? 'إلغاء' : 'Cancel'}</button>
                    <button onClick={() => saveEdit(tpl.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg">
                      <Check className="w-4 h-4" /> {ar ? 'حفظ' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-slate-200 whitespace-pre-wrap flex-1">{tpl.body}</p>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => startEdit(tpl)} className="text-slate-500 hover:text-indigo-400" title={ar ? 'تعديل' : 'Edit'}><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(tpl.id)} className="text-slate-500 hover:text-rose-400" title={ar ? 'حذف' : 'Delete'}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {templates.length === 0 && (
            <p className="text-slate-500 text-center py-6">
              {ar ? 'لا توجد قوالب بعد. اضغط «إضافة القوالب الجاهزة» للبدء.' : 'No templates yet. Click “Add Ready Templates” to start.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── البيانات والنُّسخ ────────────────────────────────────────────────────────────
function DataTab({ ar, showToast }) {
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
    try { await downloadBlob(await salesApi.backup(), 'hovera-backup.json'); showToast(ar ? 'تم تنزيل النسخة الاحتياطية' : 'Backup downloaded'); }
    catch (e) { showToast(e.message, 'err'); } finally { setBusy(''); }
  };

  const exportExcel = async () => {
    setBusy('export');
    try { await downloadBlob(await salesApi.exportExcel(), 'hovera-salons.xlsx'); showToast(ar ? 'تم تصدير الإكسل' : 'Excel exported'); }
    catch (e) { showToast(e.message, 'err'); } finally { setBusy(''); }
  };

  const importBackup = async (file) => {
    setBusy('import');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const r = await salesApi.importBackup(data);
      showToast(ar
        ? `تم الدمج: أُضيف ${r.added} · حُدّث ${r.updated} · تُجوهل ${r.skipped}`
        : `Merged: added ${r.added} · updated ${r.updated} · skipped ${r.skipped}`);
    } catch (e) { showToast(e.message || (ar ? 'ملف غير صالح' : 'Invalid file'), 'err'); } finally { setBusy(''); }
  };

  const uploadExcel = async (file) => {
    setBusy('upload');
    try {
      const r = await salesApi.uploadExcel(file);
      showToast(ar
        ? `تم الرفع: أُضيف ${r.added} صفّاً · تُجوهل ${r.skipped} مكرّراً`
        : `Uploaded: added ${r.added} rows · skipped ${r.skipped} duplicates`);
    } catch (e) { showToast(e.message, 'err'); } finally { setBusy(''); }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-lg">{ar ? 'البيانات والنُّسخ' : 'Data & Backups'}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <DataCard
          icon={Download} title={ar ? 'نسخة احتياطية' : 'Backup'} desc={ar ? 'تنزيل كل بيانات البوابة كملف JSON.' : 'Download all portal data as a JSON file.'}
          actionLabel={ar ? 'تنزيل النسخة' : 'Download Backup'} loading={busy === 'backup'} onClick={backup}
        />
        <DataCardFile
          icon={Upload} title={ar ? 'استيراد نسخة' : 'Import Backup'} desc={ar ? 'دمج نسخة سابقة — يحدّث الأحدث فقط ولا يمسح.' : 'Merge a previous backup — updates newest only, never deletes.'}
          actionLabel={ar ? 'اختيار ملف JSON' : 'Choose JSON file'} accept=".json" loading={busy === 'import'} onFile={importBackup}
        />
        <DataCard
          icon={FileDown} title={ar ? 'تصدير إكسل' : 'Export Excel'} desc={ar ? 'تصدير قائمة الصوالين كملف إكسل.' : 'Export the salons list as an Excel file.'}
          actionLabel={ar ? 'تصدير إكسل' : 'Export Excel'} loading={busy === 'export'} onClick={exportExcel}
        />
        <DataCardFile
          icon={FileSpreadsheet} title={ar ? 'رفع إكسل صوالين' : 'Upload Salons Excel'} desc={ar ? 'إضافة صوالين جديدة — يمنع تكرار الأرقام ولا يمسح القديم.' : 'Add new salons — prevents duplicate numbers, never deletes existing.'}
          actionLabel={ar ? 'اختيار ملف إكسل' : 'Choose Excel file'} accept=".xlsx,.xls" loading={busy === 'upload'} onFile={uploadExcel}
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
function ModalShell({ title, ar, onClose, children }) {
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
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
