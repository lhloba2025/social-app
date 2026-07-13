import React, { useState, useEffect } from 'react';
import { salesApi, getStoredUser, clearSession } from '@/api/salesClient';
import SalesLogin from '@/components/sales/SalesLogin';
import HoveraLogo from '@/components/sales/HoveraLogo';
import { roleLabel, statusLabel, statusColor, shortDate, timeAgo, STATUS_OPTIONS } from './salesConstants';
import { Link } from 'react-router-dom';
import {
  Users, MessageSquare, Database, Trash2, Plus, LogOut, ArrowRight, ArrowLeft,
  Download, Upload, FileSpreadsheet, FileDown, Loader2, ShieldAlert, X,
  Pencil, Check, Sparkles, Gauge, AlertTriangle, CalendarClock, Clock, Home, Languages,
  Paperclip, FileText, Image as ImageIcon, Share2, Megaphone,
  Inbox, RefreshCw, ExternalLink, CheckCircle2, Search, Send, CheckCheck, XCircle,
  Play, Pause, BarChart3, UserPlus, Ban,
} from 'lucide-react';

export default function SalesPortalAdmin({ language }) {
  const [lang, setLang] = useState(language || localStorage.getItem('appLanguage') || 'ar');
  const ar = lang !== 'en';
  const toggleLang = () => {
    const next = ar ? 'en' : 'ar';
    localStorage.setItem('appLanguage', next);
    setLang(next);
  };
  const [user, setUser] = useState(getStoredUser());
  const [tab, setTab] = useState('oversight');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  if (!user) return <SalesLogin onSuccess={setUser} ar={ar} onToggleLang={toggleLang} />;

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
    { id: 'campaigns', label: ar ? 'حملات الواتساب' : 'WhatsApp Campaigns', icon: Megaphone },
    { id: 'templates', label: ar ? 'قوالب الواتساب' : 'WhatsApp Templates', icon: MessageSquare },
    { id: 'inbox', label: ar ? 'وارد الردود' : 'Replies Inbox', icon: Inbox },
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
          <button onClick={toggleLang} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-bold bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 transition" title={ar ? 'English' : 'العربية'}>
            <Languages className="w-4 h-4" /> {ar ? 'EN' : 'ع'}
          </button>
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
        {tab === 'campaigns' && <CampaignsTab ar={ar} showToast={showToast} />}
        {tab === 'templates' && <TemplatesTab ar={ar} showToast={showToast} />}
        {tab === 'inbox' && <InboxTab ar={ar} showToast={showToast} />}
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
  const byMember = (data.by_member || []).filter((m) => m.active > 0 || (m.tasks_total || 0) > 0);
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
                {/* مهام المتابعة: منجزة من الإجمالي + شريط تقدّم */}
                <div className="mt-2.5">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-300">{ar ? 'مهام المتابعة المُسندة' : 'Assigned follow-up tasks'}: <b className="text-white">{m.tasks_total || 0}</b></span>
                    <span className="text-emerald-300">{ar ? `أنجز ${m.tasks_done || 0}` : `${m.tasks_done || 0} done`}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${m.tasks_total ? Math.round((m.tasks_done / m.tasks_total) * 100) : 0}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2.5">
                  <OvStat label={ar ? 'قيد المتابعة' : 'Open'} value={m.tasks_open || 0} tone={(m.tasks_open || 0) > 0 ? 'text-fuchsia-300' : 'text-slate-500'} />
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
  const [editing, setEditing] = useState(null);   // العضو قيد التعديل

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

  // مشاركة رابط البوابة مع المناديب الجدد (مشاركة أصلية، أو نسخ كبديل).
  const shareLink = async () => {
    const url = `${window.location.origin}/SalesPortal`;
    const text = ar
      ? `مرحباً 👋 هذا رابط بوابة فريق مبيعات هوفيرا:\n${url}\n\nاطلب اسم المستخدم وكلمة المرور من المدير. تقدر تثبّتها كتطبيق: شارك ⬆️ ← «إضافة إلى الشاشة الرئيسية».`
      : `Hi 👋 Hovera Sales Team Portal:\n${url}\n\nAsk your manager for your username & password. You can install it as an app: Share ⬆️ → "Add to Home Screen".`;
    try {
      // نمرّر النص فقط (الرابط بداخله) — تمرير url منفصلاً يكرّره في بعض التطبيقات.
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); showToast(ar ? 'تم نسخ الرابط والتعليمات' : 'Link & instructions copied'); }
    } catch { /* أُلغيت المشاركة */ }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <h2 className="font-bold text-lg">{ar ? 'أعضاء الفريق' : 'Team Members'}</h2>
        <div className="flex items-center gap-2">
          <button onClick={shareLink} className="flex items-center gap-1.5 bg-slate-800 hover:bg-emerald-600 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm transition">
            <Share2 className="w-4 h-4" /> {ar ? 'مشاركة الرابط' : 'Share Link'}
          </button>
          <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-2 text-sm">
            <Plus className="w-4 h-4" /> {ar ? 'إضافة عضو' : 'Add Member'}
          </button>
        </div>
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
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setEditing(m)} className="text-slate-500 hover:text-indigo-400" title={ar ? 'تعديل' : 'Edit'}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  {m.id !== user.id && (
                    <button onClick={() => remove(m)} className="text-slate-500 hover:text-rose-400" title={ar ? 'حذف' : 'Delete'}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
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

      {editing && (
        <EditMemberModal
          ar={ar} member={editing}
          canSetSuper={user.role === 'super_admin'}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); showToast(ar ? 'تم حفظ التعديل' : 'Saved'); load(); }}
          onError={(m) => showToast(m, 'err')}
        />
      )}
    </div>
  );
}

function EditMemberModal({ ar, member, canSetSuper, onClose, onSaved, onError }) {
  const [displayName, setDisplayName] = useState(member.display_name || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(member.role || 'agent');
  const [saving, setSaving] = useState(false);
  const inputCls = 'bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white w-full outline-none focus:border-indigo-500';

  const save = async () => {
    if (!displayName.trim()) return onError(ar ? 'الاسم مطلوب' : 'Name required');
    setSaving(true);
    try {
      const payload = { display_name: displayName.trim(), role };
      if (password.trim()) payload.password = password.trim();
      await salesApi.updateMember(member.id, payload);
      onSaved();
    } catch (e) { onError(e.message); } finally { setSaving(false); }
  };

  return (
    <ModalShell title={ar ? 'تعديل العضو' : 'Edit Member'} ar={ar} onClose={onClose}>
      <div className="space-y-3">
        <Labeled label={ar ? 'الاسم الظاهر' : 'Display name'}>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} />
        </Labeled>
        <Labeled label={ar ? 'اسم المستخدم (للدخول)' : 'Username'}>
          <input value={member.username} disabled className={`${inputCls} opacity-60`} />
        </Labeled>
        <Labeled label={ar ? 'الدور' : 'Role'}>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
            <option value="agent">{roleLabel('agent', ar)}</option>
            <option value="admin">{roleLabel('admin', ar)}</option>
            {canSetSuper && <option value="super_admin">{roleLabel('super_admin', ar)}</option>}
          </select>
        </Labeled>
        <Labeled label={ar ? 'كلمة مرور جديدة (اختياري)' : 'New password (optional)'}>
          <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={ar ? 'اتركها فارغة لعدم التغيير' : 'Leave blank to keep'} className={inputCls} />
        </Labeled>
        <button onClick={save} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-bold flex items-center justify-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} {ar ? 'حفظ' : 'Save'}
        </button>
      </div>
    </ModalShell>
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
  const attachFile = async (id, file) => {
    if (!file) return;
    try { await salesApi.uploadTemplateFile(id, file); showToast(ar ? 'تم إرفاق الملف' : 'File attached'); load(); }
    catch (e) { showToast(e.message, 'err'); }
  };
  const removeFile = async (id) => {
    try { await salesApi.deleteTemplateFile(id); showToast(ar ? 'تم حذف الملف' : 'File removed'); load(); }
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
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-slate-200 whitespace-pre-wrap flex-1">{tpl.body}</p>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => startEdit(tpl)} className="text-slate-500 hover:text-indigo-400" title={ar ? 'تعديل' : 'Edit'}><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => remove(tpl.id)} className="text-slate-500 hover:text-rose-400" title={ar ? 'حذف' : 'Delete'}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  {/* مرفق القالب (صورة/PDF) */}
                  <div className="flex items-center gap-2 mt-2">
                    {tpl.file_url ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-300">
                        {tpl.file_type === 'image' ? <ImageIcon className="w-3.5 h-3.5 text-emerald-400" /> : tpl.file_type === 'html' ? <FileText className="w-3.5 h-3.5 text-sky-400" /> : <FileText className="w-3.5 h-3.5 text-rose-400" />}
                        <a href={tpl.file_url} target="_blank" rel="noreferrer" className="hover:text-white underline max-w-[12rem] truncate">{tpl.file_name || (ar ? 'ملف' : 'file')}</a>
                        <button onClick={() => removeFile(tpl.id)} className="text-slate-500 hover:text-rose-400" title={ar ? 'إزالة الملف' : 'Remove file'}><X className="w-3.5 h-3.5" /></button>
                      </span>
                    ) : (
                      <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-2 py-1 cursor-pointer transition">
                        <Paperclip className="w-3.5 h-3.5" /> {ar ? 'إرفاق صورة / PDF / HTML' : 'Attach image / PDF / HTML'}
                        <input type="file" accept="image/*,application/pdf,text/html,.html,.htm" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) attachFile(tpl.id, f); e.target.value = ''; }} />
                      </label>
                    )}
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

  const markCampaign = async (file) => {
    setBusy('campaign');
    try {
      const r = await salesApi.markCampaign(file);
      showToast(ar
        ? `تم: ${r.matched} صالون وُسم «حملة ميتا» · وُزّع منها ${r.distributed ?? 0} كمهام على الفريق بالتساوي · ${r.notFound} رقم غير موجود`
        : `Done: ${r.matched} tagged · ${r.distributed ?? 0} auto-distributed as tasks · ${r.notFound} not found`);
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
        <DataCardFile
          icon={Megaphone} title={ar ? 'تحديد تواصل حملة ميتا' : 'Mark Meta Campaign Contact'}
          desc={ar ? 'ارفع ملف أرقام الحملة — الصوالين المطابقة تُوسَم بـ«حملة ميتا» وتتحوّل حالتها لـ«تم التواصل».' : 'Upload the campaign numbers file — matched salons get the “Meta campaign” tag and status becomes contacted.'}
          actionLabel={ar ? 'اختيار ملف الأرقام' : 'Choose numbers file'} accept=".xlsx,.xls,.csv" loading={busy === 'campaign'} onFile={markCampaign}
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

// ── وارد ردود واتساب ────────────────────────────────────────────────────────────
function InboxTab({ ar, showToast }) {
  const [replies, setReplies] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', from: '', to: '', handled: '', owner_id: '', status: '' });

  // نحتفظ بأحدث فلاتر داخل ref حتى يستخدمها التحديث التلقائي دون إعادة جدولة.
  const filtersRef = React.useRef(filters);
  filtersRef.current = filters;

  const load = React.useCallback((showSpinner = false) => {
    if (showSpinner) setLoading(true);
    const f = filtersRef.current;
    Promise.all([
      salesApi.waReplies(f),
      salesApi.waStats({ from: f.from, to: f.to }),
    ])
      .then(([rep, st]) => { setReplies(rep); setStats(st); })
      .catch((e) => showToast(e.message, 'err'))
      .finally(() => setLoading(false));
  }, [showToast]);

  // تحميل أولي + عند تغيّر الفلاتر.
  useEffect(() => { load(true); }, [filters, load]);
  // تحديث تلقائي كل ٣٠ ثانية (بلا مؤشّر تحميل).
  useEffect(() => {
    const id = setInterval(() => load(false), 30000);
    return () => clearInterval(id);
  }, [load]);

  // أعضاء الفريق لإسناد الصوالين من داخل الوارد.
  const [members, setMembers] = useState([]);
  const [threadSalon, setThreadSalon] = useState(null);   // صالون لعرض كامل المحادثة (للأدمن)
  useEffect(() => { salesApi.members().then((m) => setMembers(m.filter((u) => u.role === 'agent' || u.role === 'admin'))).catch(() => {}); }, []);
  const assign = async (row, ownerId) => {
    if (!row.salon_id) return;
    try {
      await salesApi.assignSalon(row.salon_id, ownerId);
      const name = members.find((m) => m.id === ownerId)?.display_name || '';
      setReplies((rs) => rs.map((r) => (r.salon_id === row.salon_id ? { ...r, assigned_to: name } : r)));
      showToast(ar ? `تم الإسناد إلى ${name}` : `Assigned to ${name}`);
    } catch (e) { showToast(e.message, 'err'); }
  };

  const toggleHandled = async (row) => {
    const next = !row.handled;
    setReplies((rs) => rs.map((r) => (r.id === row.id ? { ...r, handled: next } : r)));
    try { await salesApi.waSetHandled(row.id, next); }
    catch (e) {
      showToast(e.message, 'err');
      setReplies((rs) => rs.map((r) => (r.id === row.id ? { ...r, handled: !next } : r)));
    }
  };

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const fmtTime = (tsSec, receivedAt) => {
    const d = tsSec ? new Date(Number(tsSec) * 1000) : (receivedAt ? new Date(receivedAt) : null);
    if (!d || isNaN(d)) return '—';
    try {
      return new Intl.DateTimeFormat(ar ? 'ar-SA-u-nu-latn' : 'en-GB', {
        timeZone: 'Asia/Riyadh', dateStyle: 'medium', timeStyle: 'short',
      }).format(d);
    } catch { return d.toISOString(); }
  };

  const STAT_CARDS = [
    { key: 'sent', label: ar ? 'أُرسلت' : 'Sent', icon: Send, color: 'text-slate-300' },
    { key: 'delivered', label: ar ? 'وصلت' : 'Delivered', icon: Check, color: 'text-sky-300' },
    { key: 'read', label: ar ? 'قُرئت' : 'Read', icon: CheckCheck, color: 'text-emerald-300' },
    { key: 'failed', label: ar ? 'فشلت' : 'Failed', icon: XCircle, color: 'text-rose-300' },
  ];

  const inputCls = 'bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 outline-none';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-bold text-lg flex items-center gap-2"><Inbox className="w-5 h-5 text-indigo-400" /> {ar ? 'وارد ردود واتساب' : 'WhatsApp Replies Inbox'}</h2>
        <button onClick={() => load(true)} className="flex items-center gap-1.5 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 transition">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> {ar ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STAT_CARDS.map((c) => (
          <div key={c.key} className="bg-slate-900 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-white">{stats ? (stats[c.key] ?? 0) : '—'}</div>
              <div className="text-xs text-slate-400 mt-0.5">{c.label}</div>
            </div>
            <c.icon className={`w-6 h-6 ${c.color}`} />
          </div>
        ))}
      </div>

      {/* أبرز أكواد الأخطاء */}
      {stats?.errors?.length > 0 && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3">
          <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> {ar ? 'أبرز أكواد أخطاء الإرسال' : 'Top send-error codes'}</div>
          <div className="flex flex-wrap gap-2">
            {stats.errors.map((e) => (
              <span key={e.error_code} className="text-xs rounded-full px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-300" title={ar ? 'كود خطأ واتساب' : 'WhatsApp error code'}>
                {e.error_code} · {e.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* الفلاتر */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 ${ar ? 'right-3' : 'left-3'}`} />
          <input value={filters.search} onChange={(e) => set('search', e.target.value)} placeholder={ar ? 'بحث بالرقم أو الاسم أو النص…' : 'Search number/name/text…'} className={`${inputCls} w-full ${ar ? 'pr-9' : 'pl-9'}`} />
        </div>
        <input type="date" value={filters.from} onChange={(e) => set('from', e.target.value)} className={`${inputCls} w-full`} title={ar ? 'من تاريخ' : 'From'} />
        <input type="date" value={filters.to} onChange={(e) => set('to', e.target.value)} className={`${inputCls} w-full`} title={ar ? 'إلى تاريخ' : 'To'} />
        <select value={filters.handled} onChange={(e) => set('handled', e.target.value)} className={`${inputCls} w-full`}>
          <option value="">{ar ? 'الكل' : 'All'}</option>
          <option value="false">{ar ? 'غير معالَج' : 'Unhandled'}</option>
          <option value="true">{ar ? 'معالَج' : 'Handled'}</option>
        </select>
        <select value={filters.owner_id} onChange={(e) => set('owner_id', e.target.value)} className={`${inputCls} w-full`} title={ar ? 'المندوب' : 'Rep'}>
          <option value="">{ar ? 'كل المناديب' : 'All reps'}</option>
          <option value="none">{ar ? 'غير مُسند' : 'Unassigned'}</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => set('status', e.target.value)} className={`${inputCls} w-full`} title={ar ? 'الحالة' : 'Status'}>
          <option value="">{ar ? 'كل الحالات' : 'All statuses'}</option>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{ar ? s.ar : s.en}</option>)}
        </select>
      </div>

      {/* القائمة */}
      {loading && replies.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
      ) : replies.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Inbox className="w-10 h-10 mx-auto mb-2 opacity-50" />
          {ar ? 'لا توجد ردود بعد. ستظهر هنا فور وصولها من ميتا.' : 'No replies yet. They will appear here as they arrive from Meta.'}
        </div>
      ) : (
        <div className="space-y-2">
          {replies.map((r) => (
            <div key={r.id} className={`bg-slate-900 border rounded-xl p-3 ${r.handled ? 'border-slate-800 opacity-70' : 'border-slate-700'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-sm">{r.profile_name || (ar ? 'بدون اسم' : 'Unknown')}</span>
                    <span className="text-xs text-slate-400 dir-ltr" style={{ direction: 'ltr' }}>{r.from_number}</span>
                    {r.salon_name && (
                      <span className="text-[11px] rounded-full px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                        {r.salon_name}{r.salon_city ? ` · ${r.salon_city}` : ''}
                      </span>
                    )}
                    {r.campaign_name && (
                      <span className="text-[11px] rounded-full px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center gap-1"><Megaphone className="w-2.5 h-2.5" />{r.campaign_name}</span>
                    )}
                    {r.msg_type && r.msg_type !== 'text' && (
                      <span className="text-[11px] rounded-full px-2 py-0.5 bg-slate-700/50 border border-slate-600 text-slate-300">{r.msg_type}</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-200 mt-1.5 whitespace-pre-line break-words">{r.body || (r.msg_type && r.msg_type !== 'text' ? (WA_MEDIA_LABEL[r.msg_type] || `[${r.msg_type}]`) : '—')}</p>
                  <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtTime(r.wa_timestamp, r.received_at)}</span>
                    {r.salon_id && (
                      <span className="flex items-center gap-1">
                        <UserPlus className="w-3 h-3" />
                        <select
                          value=""
                          onChange={(e) => { if (e.target.value) assign(r, e.target.value); }}
                          className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-slate-200 outline-none"
                          title={ar ? 'إسناد لمندوب' : 'Assign to rep'}
                        >
                          <option value="">{r.assigned_to ? `${ar ? 'مُسند: ' : 'Assigned: '}${r.assigned_to}` : (ar ? 'إسناد لمندوب' : 'Assign')}</option>
                          {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
                        </select>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {r.salon_id && (
                    <button
                      onClick={() => setThreadSalon({ id: r.salon_id, name: r.salon_name, phone: r.from_number, assigned_to: r.assigned_to })}
                      className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-2.5 py-1.5 transition"
                      title={ar ? 'عرض كامل المحادثة (لمتابعة المندوبة)' : 'View full conversation'}
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> {ar ? 'المحادثة' : 'Conversation'}
                    </button>
                  )}
                  <a
                    href={`https://wa.me/${String(r.from_number || '').replace(/\D/g, '')}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-2.5 py-1.5 transition"
                    title={ar ? 'فتح المحادثة في واتساب' : 'Open chat in WhatsApp'}
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> {ar ? 'واتساب' : 'WhatsApp'}
                  </a>
                  <button
                    onClick={() => toggleHandled(r)}
                    className={`flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 transition border ${
                      r.handled
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                    }`}
                    title={ar ? 'وضع كمعالَج' : 'Mark handled'}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> {r.handled ? (ar ? 'معالَج' : 'Handled') : (ar ? 'معالجة' : 'Handle')}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {replies.length >= 500 && (
            <p className="text-center text-xs text-slate-500 pt-2">{ar ? 'عرض أول ٥٠٠ رد — استخدم البحث والفلاتر لتضييق النتائج.' : 'Showing first 500 — use search/filters to narrow.'}</p>
          )}
        </div>
      )}

      {threadSalon && <AdminChatModal ar={ar} showToast={showToast} salon={threadSalon} onClose={() => setThreadSalon(null)} />}
    </div>
  );
}

// صورة واردة تُجلب عبر التوكن (رابط ميتا محمي) وتُعرض كـ blob.
const WA_MEDIA_LABEL = { image: '📷 صورة', video: '🎥 فيديو', audio: '🎙️ رسالة صوتية', document: '📎 مستند', sticker: '😀 ملصق' };
function WaImage({ mediaId }) {
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let on = true, u;
    salesApi.waMediaUrl(mediaId).then((x) => { if (on) { u = x; setUrl(x); } }).catch(() => setErr(true));
    return () => { on = false; if (u) URL.revokeObjectURL(u); };
  }, [mediaId]);
  if (err) return <span className="text-[12px] opacity-80">📷 صورة (تعذّر التحميل)</span>;
  if (!url) return <span className="text-[12px] opacity-70 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> 📷</span>;
  return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="" className="rounded-lg max-h-56 max-w-full" /></a>;
}
function WaMsgContent({ m }) {
  if (m.dir === 'in' && m.type === 'image' && m.media_id) {
    return (<><WaImage mediaId={m.media_id} />{m.body ? <div className="mt-1">{m.body}</div> : null}</>);
  }
  if (m.dir === 'in' && m.media_id) {
    return <span>{WA_MEDIA_LABEL[m.type] || '📎 مرفق'}{m.body ? ` · ${m.body}` : ''}</span>;
  }
  return <>{m.body || (m.type && m.type !== 'text' ? (WA_MEDIA_LABEL[m.type] || `[${m.type}]`) : '')}</>;
}

// عرض كامل محادثة صالون للأدمن — مع إمكانية الرد بدل المندوبة (يظهر اسم المُرسِلة).
function AdminChatModal({ ar, showToast, salon, onClose }) {
  const [data, setData] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const load = React.useCallback(() => {
    salesApi.waThread(salon.id).then(setData).catch((e) => showToast(e.message, 'err'));
  }, [salon.id, showToast]);
  useEffect(() => { load(); const iv = setInterval(load, 15000); return () => clearInterval(iv); }, [load]);

  const send = async () => {
    const msg = text.trim();
    if (!msg) return;
    setSending(true);
    try { await salesApi.waSendMessage(salon.id, msg); setText(''); await load(); }
    catch (e) { showToast(e.message, 'err'); } finally { setSending(false); }
  };
  const sendImage = async (file) => {
    if (!file) return;
    setSending(true);
    try { await salesApi.waSendImage(salon.id, file, text.trim()); setText(''); await load(); }
    catch (e) { showToast(e.message, 'err'); } finally { setSending(false); }
  };

  const fmt = (ts) => {
    if (!ts) return '';
    try { return new Intl.DateTimeFormat(ar ? 'ar-SA-u-nu-latn' : 'en-GB', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }).format(new Date(ts * 1000)); }
    catch { return ''; }
  };
  const open = data?.window_open;

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md h-[85vh] sm:h-[70vh] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
          <div className="min-w-0">
            <div className="font-bold text-white truncate">{salon.name || (ar ? 'بدون اسم' : 'Unnamed')}{salon.assigned_to ? <span className="text-[11px] text-indigo-300 font-normal"> · {salon.assigned_to}</span> : null}</div>
            <div className="text-[11px] text-slate-400" style={{ direction: 'ltr' }}>{salon.phone}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-950/40">
          {!data ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
          ) : data.messages.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">{ar ? 'لا رسائل بعد.' : 'No messages yet.'}</div>
          ) : data.messages.map((m, i) => (
            <div key={i} className={`flex ${m.dir === 'out' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line break-words ${m.dir === 'out' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-100'}`}>
                <WaMsgContent m={m} />
                <div className={`text-[10px] mt-1 ${m.dir === 'out' ? 'text-emerald-100/70' : 'text-slate-400'}`}>{m.dir === 'out' ? `${m.by || (ar ? 'النظام' : 'System')} · ` : ''}{fmt(m.ts)}</div>
              </div>
            </div>
          ))}
        </div>
        {/* الأدمن يقدر يرد بدل المندوبة (ضمن نافذة ٢٤ ساعة) */}
        <div className="border-t border-slate-700 p-2.5 flex-shrink-0">
          {open === false ? (
            <div className="text-[12px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
              {ar ? '⏳ انتهت نافذة الـ٢٤ ساعة — لا يمكن إرسال رسالة حرّة الآن.' : '24h window closed.'}
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <label className={`flex-shrink-0 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-xl px-3 py-2.5 cursor-pointer ${sending ? 'opacity-50 pointer-events-none' : ''}`} title={ar ? 'إرسال صورة' : 'Send image'}>
                <ImageIcon className="w-5 h-5" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) sendImage(f); e.target.value = ''; }} />
              </label>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} placeholder={ar ? 'رُدّ بدل المندوبة…' : 'Reply as admin…'} className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500 resize-none max-h-28" />
              <button onClick={send} disabled={sending || !text.trim()} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl px-4 py-2.5 flex-shrink-0">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : (ar ? 'إرسال' : 'Send')}
              </button>
            </div>
          )}
          <p className="text-[10px] text-slate-500 text-center mt-1.5">{ar ? 'يُرسل من رقم هوفيرا للأعمال' : 'Sent from Hovera business number'}</p>
        </div>
      </div>
    </div>
  );
}

// ── حملات الواتساب (المرحلة ٢) ──────────────────────────────────────────────────
// ذاكرة مؤقّتة لقوائم القوالب الحيّة (تُجلب من ميتا) — لتظهر فوراً عند إعادة فتح
// النافذة بدل انتظار الشبكة في كل مرة. تُحدَّث بالخلفية عند كل فتح.
let LIVE_TEMPLATES_CACHE = null;

const CAMP_STATUS = {
  draft:     { ar: 'مسودّة',        en: 'Draft',     color: 'bg-slate-600' },
  sending:   { ar: 'قيد الإرسال',   en: 'Sending',   color: 'bg-cyan-600' },
  paused:    { ar: 'موقوفة مؤقتاً', en: 'Paused',    color: 'bg-amber-600' },
  done:      { ar: 'مكتملة',        en: 'Done',      color: 'bg-emerald-600' },
  cancelled: { ar: 'ملغاة',         en: 'Cancelled', color: 'bg-rose-600' },
};

function CampaignsTab({ ar, showToast }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const load = React.useCallback(() => {
    salesApi.waCampaigns()
      .then(setCampaigns)
      .catch((e) => showToast(e.message, 'err'))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { load(); }, [load]);
  // تحديث تلقائي كل ٥ ثوانٍ طالما هناك حملة قيد الإرسال.
  useEffect(() => {
    if (!campaigns.some((c) => c.status === 'sending')) return;
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [campaigns, load]);

  const action = async (fn, id) => {
    try { await fn(id); load(); }
    catch (e) { showToast(e.message, 'err'); }
  };
  const exportCamp = async (id) => {
    try {
      const res = await salesApi.waExportCampaign(id);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `campaign-${id}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { showToast(e.message, 'err'); }
  };
  const removeCamp = async (c) => {
    if (!window.confirm(ar ? `حذف حملة «${c.name}» نهائياً؟ لا يمكن التراجع. (لا يؤثّر على حالات الصوالين)` : `Delete campaign "${c.name}" permanently?`)) return;
    try { await salesApi.waDeleteCampaign(c.id); showToast(ar ? 'تم حذف الحملة' : 'Campaign deleted'); load(); }
    catch (e) { showToast(e.message, 'err'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-bold text-lg flex items-center gap-2"><Megaphone className="w-5 h-5 text-indigo-400" /> {ar ? 'حملات الواتساب' : 'WhatsApp Campaigns'}</h2>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-1.5"><Plus className="w-4 h-4" /> {ar ? 'حملة جديدة' : 'New Campaign'}</button>
        </div>
      </div>

      {creating && <CreateCampaign ar={ar} showToast={showToast} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />}
      {detailId && <CampaignDetail ar={ar} showToast={showToast} id={detailId} onClose={() => { setDetailId(null); load(); }} />}

      {loading && campaigns.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12 text-slate-500"><Megaphone className="w-10 h-10 mx-auto mb-2 opacity-50" />{ar ? 'لا توجد حملات بعد. أنشئ حملة جديدة للبدء.' : 'No campaigns yet.'}</div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c) => {
            const st = CAMP_STATUS[c.status] || CAMP_STATUS.draft;
            const sent = c.counts?.sent || 0, failed = c.counts?.failed || 0;
            const pct = c.total ? Math.round(((sent + failed) / c.total) * 100) : 0;
            return (
              <div key={c.id} className="bg-slate-900 border border-slate-700 rounded-xl p-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white">{c.name}</span>
                      <span className={`text-[11px] text-white px-2 py-0.5 rounded-full ${st.color}`}>{ar ? st.ar : st.en}</span>
                      {c.media_id && <span className="text-[11px] text-slate-300 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> {ar ? 'صورة' : 'image'}</span>}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{ar ? 'القالب' : 'Template'}: {c.template_name} · {c.total} {ar ? 'مستلم' : 'recipients'}</div>
                    {c.note && <div className="text-[11px] text-amber-400 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {c.note}</div>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(c.status === 'draft' || c.status === 'paused') && (
                      <button onClick={() => action(salesApi.waStartCampaign, c.id)} className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-2.5 py-1.5"><Play className="w-3.5 h-3.5" /> {ar ? (c.status === 'paused' ? 'استئناف' : 'بدء الإرسال') : 'Start'}</button>
                    )}
                    {c.status === 'sending' && (
                      <button onClick={() => action(salesApi.waPauseCampaign, c.id)} className="flex items-center gap-1 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded-lg px-2.5 py-1.5"><Pause className="w-3.5 h-3.5" /> {ar ? 'إيقاف' : 'Pause'}</button>
                    )}
                    {!['done', 'cancelled'].includes(c.status) && (
                      <button onClick={() => action(salesApi.waCancelCampaign, c.id)} className="flex items-center gap-1 text-xs bg-slate-700 hover:bg-rose-600 text-white rounded-lg px-2.5 py-1.5"><XCircle className="w-3.5 h-3.5" /> {ar ? 'إلغاء' : 'Cancel'}</button>
                    )}
                    <button onClick={() => setDetailId(c.id)} className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white rounded-lg px-2.5 py-1.5"><BarChart3 className="w-3.5 h-3.5" /> {ar ? 'التفاصيل' : 'Details'}</button>
                    <button onClick={() => exportCamp(c.id)} className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white rounded-lg px-2.5 py-1.5"><FileDown className="w-3.5 h-3.5" /></button>
                    <button onClick={() => removeCamp(c)} className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-rose-600 border border-slate-600 text-white rounded-lg px-2.5 py-1.5" title={ar ? 'حذف الحملة' : 'Delete campaign'}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                {/* شريط التقدّم */}
                <div className="mt-2">
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-cyan-500" style={{ width: `${pct}%` }} /></div>
                  <div className="text-[11px] text-slate-400 mt-1 flex gap-3">
                    <span>{ar ? 'أُرسل' : 'Sent'}: {sent}/{c.total}</span>
                    {failed > 0 && <span className="text-rose-400">{ar ? 'فشل' : 'Failed'}: {failed}</span>}
                    {c.counts?.pending > 0 && <span>{ar ? 'متبقٍ' : 'Pending'}: {c.counts.pending}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TeamBoard ar={ar} showToast={showToast} />
    </div>
  );
}

function CreateCampaign({ ar, showToast, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState('filters'); // filters | manual | file
  const [cities, setCities] = useState([]);
  const [city, setCity] = useState('');
  const [status, setStatus] = useState('');   // '' = الجدد فقط (الافتراضي)
  const [limit, setLimit] = useState('');
  const [numbersFile, setNumbersFile] = useState(null);
  const [numbersText, setNumbersText] = useState('');   // أرقام يدوية (رقم أو أكثر)
  const [templates, setTemplates] = useState(LIVE_TEMPLATES_CACHE);   // يظهر فوراً من الذاكرة إن وُجد
  const [tpl, setTpl] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [busy, setBusy] = useState(false);
  // معاينة حيّة للمستلمين (بالفلاتر): العدد + قائمة قابلة للبحث.
  const [preview, setPreview] = useState(null);   // { total, matched, rows }
  const [previewLoading, setPreviewLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [excludeCampaigned, setExcludeCampaigned] = useState(true);   // استبعاد من سبق أن أُرسلت لهم حملة
  const [randomPick, setRandomPick] = useState(false);               // عيّنة عشوائية بحدّ N
  const [picked, setPicked] = useState({});       // to_number -> name (اختيار يدوي من القائمة)
  const pickedNums = Object.keys(picked);
  const togglePick = (r) => setPicked((p) => {
    const n = { ...p };
    if (n[r.to_number]) delete n[r.to_number]; else n[r.to_number] = r.name || r.to_number;
    return n;
  });

  useEffect(() => {
    salesApi.salonFilters().then((f) => setCities(f.cities || [])).catch(() => {});
    salesApi.waTemplatesLive()
      .then((t) => { LIVE_TEMPLATES_CACHE = t; setTemplates(t); })
      .catch((e) => { setTemplates((prev) => prev || []); showToast(e.message, 'err'); });
  }, [showToast]);

  // معاينة حيّة للعدد + القائمة (وضع الفلاتر أو الأرقام اليدوية).
  useEffect(() => {
    if (mode === 'file') { setPreview(null); return; }
    if (mode === 'manual' && !numbersText.trim()) { setPreview({ total: 0, matched: 0, rows: [] }); return; }
    setPreviewLoading(true);
    const t = setTimeout(() => {
      const base = mode === 'manual' ? { numbers: numbersText, search } : { city, status, limit, search };
      const params = { ...base, ...(excludeCampaigned ? { exclude_campaigned: 1 } : {}), ...(randomPick && limit ? { random: 1 } : {}) };
      salesApi.waRecipientsPreview(params)
        .then(setPreview)
        .catch(() => setPreview(null))
        .finally(() => setPreviewLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [mode, city, status, limit, search, numbersText, excludeCampaigned, randomPick]);

  const submit = async () => {
    if (!name.trim()) return showToast(ar ? 'أدخل اسم الحملة' : 'Enter campaign name', 'err');
    if (!tpl) return showToast(ar ? 'اختر قالباً' : 'Pick a template', 'err');
    if (tpl.has_image && !imageFile) return showToast(ar ? 'هذا القالب يتطلّب صورة ترويسة' : 'This template needs a header image', 'err');
    // لو اختار المستخدم صوالين محددة من القائمة → نرسل لهم فقط، بغضّ النظر عن الوضع.
    if (!pickedNums.length) {
      if (mode === 'file' && !numbersFile) return showToast(ar ? 'ارفع ملف الأرقام' : 'Upload numbers file', 'err');
      if (mode === 'manual' && !numbersText.trim()) return showToast(ar ? 'اكتب رقماً واحداً على الأقل' : 'Enter at least one number', 'err');
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('template_name', tpl.name);
      fd.append('template_lang', tpl.language || 'ar');
      if (excludeCampaigned) fd.append('exclude_campaigned', '1');
      if (pickedNums.length) fd.append('numbers_text', pickedNums.join('\n'));
      else if (mode === 'file') fd.append('numbers', numbersFile);
      else if (mode === 'manual') fd.append('numbers_text', numbersText.trim());
      else { if (city) fd.append('city', city); if (status) fd.append('status', status); if (limit) fd.append('limit', limit); if (randomPick && limit) fd.append('random', '1'); }
      if (imageFile) fd.append('image', imageFile);
      const r = await salesApi.waCreateCampaign(fd);
      showToast(ar ? `أُنشئت الحملة — ${r.total} مستلم. اضغط «بدء الإرسال».` : `Created — ${r.total} recipients.`);
      onCreated();
    } catch (e) { showToast(e.message, 'err'); } finally { setBusy(false); }
  };

  const inputCls = 'bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white w-full outline-none focus:border-indigo-500';
  return (
    <ModalShell title={ar ? 'حملة واتساب جديدة' : 'New WhatsApp Campaign'} ar={ar} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-400">{ar ? 'اسم الحملة' : 'Campaign name'}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder={ar ? 'مثال: إطلاق العرض - الرياض' : 'e.g. Launch - Riyadh'} />
        </div>

        {/* اختيار المستلمين */}
        <div className="flex gap-2 text-sm">
          <button onClick={() => setMode('filters')} className={`flex-1 rounded-lg py-1.5 border ${mode === 'filters' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>{ar ? 'بالفلاتر' : 'By filters'}</button>
          <button onClick={() => setMode('manual')} className={`flex-1 rounded-lg py-1.5 border ${mode === 'manual' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>{ar ? 'أرقام يدوية' : 'Type numbers'}</button>
          <button onClick={() => setMode('file')} className={`flex-1 rounded-lg py-1.5 border ${mode === 'file' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>{ar ? 'ملف أرقام' : 'Numbers file'}</button>
        </div>
        {mode === 'filters' ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              <select value={city} onChange={(e) => setCity(e.target.value)} className={inputCls}><option value="">{ar ? 'كل المدن' : 'All cities'}</option>{cities.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                <option value="">{ar ? 'الجدد فقط (افتراضي)' : 'New only'}</option>
                <option value="campaigned">{ar ? '★ من سبق أن أُرسلت له حملة' : '★ Already campaigned'}</option>
                {STATUS_OPTIONS.filter((s) => !['do_not_send'].includes(s.value)).map((s) => <option key={s.value} value={s.value}>{ar ? s.ar : s.en}</option>)}
              </select>
              <input value={limit} onChange={(e) => setLimit(e.target.value.replace(/\D/g, ''))} className={inputCls} placeholder={ar ? 'حدّ N (مثلاً 500)' : 'Limit N'} inputMode="numeric" />
            </div>
            {limit ? (
              <label className="flex items-center gap-2 text-[13px] text-slate-300 cursor-pointer mt-2">
                <input type="checkbox" checked={randomPick} onChange={(e) => setRandomPick(e.target.checked)} className="w-4 h-4 accent-indigo-500" />
                🎲 {ar ? `اختيار ${limit} عشوائياً من المطابقين (بدل الأحدث)` : `Pick ${limit} at random`}
              </label>
            ) : null}
          </>
        ) : mode === 'manual' ? (
          <textarea
            value={numbersText} onChange={(e) => setNumbersText(e.target.value)} rows={3}
            className={inputCls}
            placeholder={ar ? 'اكتب رقماً واحداً أو أكثر — كل رقم في سطر\nمثال: 0550629242' : 'One or more numbers, one per line\ne.g. 0550629242'}
          />
        ) : (
          <label className="bg-slate-800 hover:bg-indigo-600 cursor-pointer text-white rounded-lg py-2 text-sm flex items-center justify-center gap-2">
            <Upload className="w-4 h-4" /> {numbersFile ? numbersFile.name : (ar ? 'اختيار ملف الأرقام (Excel/CSV)' : 'Choose numbers file')}
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => setNumbersFile(e.target.files?.[0] || null)} />
          </label>
        )}
        <label className={`flex items-center gap-2 text-sm cursor-pointer bg-slate-800/40 border border-slate-700 rounded-lg px-3 py-2 ${(mode !== 'filters' ? false : status === 'campaigned') ? 'opacity-50' : 'text-slate-200'}`}>
          <input type="checkbox" disabled={mode === 'filters' && status === 'campaigned'} checked={excludeCampaigned && !(mode === 'filters' && status === 'campaigned')} onChange={(e) => setExcludeCampaigned(e.target.checked)} className="w-4 h-4 accent-indigo-500" />
          {ar ? 'استبعاد من سبق أن أُرسلت له حملة («حملة ميتا»)' : 'Exclude anyone already campaigned'}
        </label>
        <p className="text-[11px] text-slate-500">{ar ? 'يُستثنى تلقائياً كل من طلب «لا ترسل»، وتُمنع الأرقام المكرّرة. ومن تُرسَل له الحملة يُوسَم «حملة ميتا» تلقائياً.' : 'Opt-outs excluded, duplicates removed; sent recipients get the «حملة ميتا» tag.'}</p>

        {/* معاينة المستلمين — العدد + بحث + قائمة (فلاتر أو أرقام يدوية) */}
        {mode !== 'file' && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300 flex items-center gap-1.5"><Users className="w-4 h-4 text-indigo-400" /> {ar ? 'المستلمون المطابقون' : 'Matching recipients'}</span>
              <span className="text-lg font-bold text-white flex items-center gap-1">
                {previewLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                {preview ? preview.total : '—'}
              </span>
            </div>
            {mode === 'filters' && excludeCampaigned && preview && (
              preview.excluded > 0 ? (
                <p className="text-[11px] text-emerald-300">{ar ? `✓ استُبعد ${preview.excluded} سبق أن أُرسلت لهم حملة` : `✓ Excluded ${preview.excluded} already-campaigned`}</p>
              ) : (
                <p className="text-[11px] text-slate-500">{ar ? 'لا يوجد ضمن هذه القائمة من سبق مراسلته (الجدد لم تُرسل لهم أصلاً).' : 'None in this list were previously campaigned.'}</p>
              )
            )}
            <div className="relative">
              <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 ${ar ? 'right-2.5' : 'left-2.5'}`} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={ar ? 'بحث بالاسم أو الرقم…' : 'Search name/number…'} className={`${inputCls} ${ar ? 'pr-8' : 'pl-8'}`} />
            </div>
            <p className="text-[11px] text-slate-500">{ar ? 'اضغط على أي صالون لاختياره وإرسال الحملة له فقط (يمكن اختيار أكثر من واحد).' : 'Tap a salon to send only to it (multi-select).'}</p>
            {pickedNums.length > 0 && (
              <div className="flex items-center justify-between gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg px-2.5 py-1.5">
                <span className="text-xs text-indigo-200">{ar ? `المحدّدون: ${pickedNums.length} — سترسل لهم فقط` : `Selected: ${pickedNums.length} — will send to these only`}</span>
                <button onClick={() => setPicked({})} className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1"><X className="w-3 h-3" /> {ar ? 'مسح' : 'Clear'}</button>
              </div>
            )}
            {preview && preview.rows.length > 0 ? (
              <div className="max-h-44 overflow-y-auto divide-y divide-slate-700/50 rounded-lg">
                {preview.rows.map((r) => {
                  const on = !!picked[r.to_number];
                  return (
                    <button
                      type="button" key={r.to_number} onClick={() => togglePick(r)}
                      className={`w-full flex items-center justify-between gap-2 px-1.5 py-1.5 text-xs text-start transition ${on ? 'bg-indigo-600/25' : 'hover:bg-slate-700/40'}`}
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 border ${on ? 'bg-indigo-500 border-indigo-400' : 'border-slate-500'}`}>{on && <Check className="w-2.5 h-2.5 text-white" />}</span>
                        <span className="text-slate-200 truncate">{r.name || (ar ? 'رقم بدون صالون' : 'No salon')}{r.city ? <span className="text-slate-500"> · {r.city}</span> : null}</span>
                      </span>
                      <span className="text-slate-400 flex-shrink-0" style={{ direction: 'ltr' }}>{r.to_number}</span>
                    </button>
                  );
                })}
                {preview.total > preview.rows.length && !search && (
                  <div className="text-[11px] text-slate-500 px-1.5 py-1">{ar ? `و${preview.total - preview.rows.length} صالوناً آخر… (ابحث للوصول إليهم)` : `and ${preview.total - preview.rows.length} more… (search to reach them)`}</div>
                )}
              </div>
            ) : preview && !previewLoading ? (
              <div className="text-xs text-slate-500 py-2 text-center">{search ? (ar ? 'لا نتائج للبحث' : 'No search matches') : (ar ? 'لا مستلمين مطابقين — عدّل الفلاتر' : 'No matching recipients')}</div>
            ) : null}
          </div>
        )}

        {/* القالب */}
        <div>
          <label className="text-xs text-slate-400">{ar ? 'القالب (المعتمد فقط)' : 'Template (approved)'}</label>
          {templates === null ? (
            <div className="text-sm text-slate-500 flex items-center gap-2 py-2"><Loader2 className="w-4 h-4 animate-spin" /> {ar ? 'جلب القوالب…' : 'Loading…'}</div>
          ) : templates.length === 0 ? (
            <div className="text-sm text-rose-400 py-2">{ar ? 'لا توجد قوالب معتمدة (أو التوكن غير مضبوط).' : 'No approved templates.'}</div>
          ) : (
            <select value={tpl?.name || ''} onChange={(e) => setTpl(templates.find((t) => t.name === e.target.value) || null)} className={inputCls}>
              <option value="">{ar ? '— اختر —' : '— pick —'}</option>
              {templates.map((t) => <option key={t.name + t.language} value={t.name}>{t.name} ({t.language}){t.has_image ? ' 🖼' : ''}</option>)}
            </select>
          )}
        </div>
        {tpl?.has_image && (
          <label className="bg-slate-800 hover:bg-indigo-600 cursor-pointer text-white rounded-lg py-2 text-sm flex items-center justify-center gap-2">
            <ImageIcon className="w-4 h-4" /> {imageFile ? imageFile.name : (ar ? 'صورة الترويسة (مطلوبة)' : 'Header image (required)')}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
          </label>
        )}

        <button onClick={submit} disabled={busy} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-bold flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {pickedNums.length
            ? (ar ? `إنشاء الحملة للمحدّدين (${pickedNums.length})` : `Create for selected (${pickedNums.length})`)
            : (ar ? 'إنشاء الحملة (مسودّة)' : 'Create campaign (draft)')}
        </button>
        <p className="text-[11px] text-slate-500 text-center">{ar ? 'تُنشأ كمسودّة أولاً — راجع العدد ثم اضغط «بدء الإرسال».' : 'Created as draft — review count then Start.'}</p>
      </div>
    </ModalShell>
  );
}

function CampaignDetail({ ar, showToast, id, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let on = true;
    const load = () => salesApi.waCampaign(id).then((d) => { if (on) setData(d); }).catch((e) => showToast(e.message, 'err'));
    load();
    const iv = setInterval(load, 5000);
    return () => { on = false; clearInterval(iv); };
  }, [id, showToast]);

  const DELIV = { sent: ar ? 'أُرسلت' : 'Sent', delivered: ar ? 'وصلت' : 'Delivered', read: ar ? 'قُرئت' : 'Read', failed: ar ? 'فشلت' : 'Failed' };
  const t = data?.totals;
  return (
    <ModalShell title={data?.campaign?.name || (ar ? 'تفاصيل الحملة' : 'Campaign')} ar={ar} onClose={onClose}>
      {!data ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[['sent', ar ? 'أُرسلت' : 'Sent'], ['delivered', ar ? 'وصلت' : 'Delivered'], ['read', ar ? 'قُرئت' : 'Read'], ['failed', ar ? 'فشلت' : 'Failed'], ['pending', ar ? 'متبقٍ' : 'Pending'], ['total', ar ? 'الإجمالي' : 'Total']].map(([k, lbl]) => (
              <div key={k} className="bg-slate-800 rounded-lg p-2"><div className="text-lg font-bold text-white">{t?.[k] ?? 0}</div><div className="text-[10px] text-slate-400">{lbl}</div></div>
            ))}
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1">
            {data.rows.map((r) => (
              <div key={r.id} className="bg-slate-800/60 rounded-lg px-2.5 py-1.5 text-xs flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-white truncate">{r.salon_name || r.to_number}</div>
                  <div className="text-slate-500" style={{ direction: 'ltr' }}>{r.to_number}{r.salon_city ? ` · ${r.salon_city}` : ''}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`px-1.5 py-0.5 rounded ${r.send_status === 'failed' ? 'bg-rose-500/20 text-rose-300' : r.send_status === 'sent' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-600/40 text-slate-300'}`}>
                    {r.delivery ? DELIV[r.delivery] : (r.send_status === 'sent' ? DELIV.sent : r.send_status === 'failed' ? DELIV.failed : (ar ? 'بالانتظار' : 'pending'))}
                  </span>
                  {r.error_code && <div className="text-rose-400 mt-0.5">{r.error_code}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ModalShell>
  );
}

function TeamBoard({ ar, showToast }) {
  const [board, setBoard] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [agents, setAgents] = useState([]);
  const [awaitingRep, setAwaitingRep] = useState(null);   // المندوبة المفتوحة قائمة انتظارها
  const load = () => salesApi.teamBoard().then(setBoard).catch((e) => showToast(e.message, 'err'));
  useEffect(() => { load(); salesApi.members().then((m) => setAgents(m.filter((u) => u.role === 'agent'))).catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reassign = async (m) => {
    if (!window.confirm(ar
      ? `تحويل مهام «${m.name}» (${m.tasks}) لباقي الفريق بالتساوي؟\n(الملكية تنتقل للمناديب الآخرين — مثلاً عند غياب المندوبة)`
      : `Move ${m.name}'s ${m.tasks} tasks to the rest of the team?`)) return;
    setBusyId(m.user_id);
    try {
      const r = await salesApi.reassignFrom(m.user_id);
      showToast(ar ? `تم تحويل ${r.moved} مهمة من ${m.name} لباقي الفريق` : `Moved ${r.moved} tasks from ${m.name}`);
      load();
    } catch (e) { showToast(e.message, 'err'); } finally { setBusyId(null); }
  };

  if (!board) return null;
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2"><Users className="w-4 h-4 text-indigo-400" /> {ar ? 'لوحة الفريق (المساءلة)' : 'Team Board'}</h3>
        <span className="text-[11px] text-slate-500 flex items-center gap-1"><Megaphone className="w-3 h-3" /> {ar ? 'التوزيع تلقائي عند رفع كل دفعة حملة' : 'Auto-distributed on each campaign upload'}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-slate-400 text-xs border-b border-slate-800">
            <th className="text-start py-2 px-2">{ar ? 'المندوب' : 'Rep'}</th>
            <th className="py-2 px-2">{ar ? 'المهام' : 'Tasks'}</th>
            <th className="py-2 px-2">{ar ? 'ردّت عليها' : 'Replied'}</th>
            <th className="py-2 px-2">{ar ? 'بانتظار ردّها' : 'Awaiting'}</th>
            <th className="py-2 px-2">{ar ? 'مهتم' : 'Interested'}</th>
            <th className="py-2 px-2">{ar ? 'مشترك' : 'Subscribed'}</th>
            <th className="py-2 px-2"></th>
          </tr></thead>
          <tbody>
            {board.map((m) => (
              <tr key={m.user_id} className="border-b border-slate-800/50">
                <td className="py-2 px-2 text-white">{m.name}</td>
                <td className="py-2 px-2 text-center text-slate-200 font-bold">{m.tasks}</td>
                <td className="py-2 px-2 text-center text-emerald-300">{m.rep_replied}</td>
                <td className="py-2 px-2 text-center">
                  {m.awaiting > 0 ? (
                    <button onClick={() => setAwaitingRep(m)} className="bg-rose-600 hover:bg-rose-500 text-white rounded-full px-2.5 py-0.5 font-bold" title={ar ? 'عرض ومتابعة هذه المحادثات' : 'View & handle'}>{m.awaiting}</button>
                  ) : <span className="text-slate-500">0</span>}
                </td>
                <td className="py-2 px-2 text-center text-emerald-300">{m.interested}</td>
                <td className="py-2 px-2 text-center text-green-400">{m.subscribed}</td>
                <td className="py-2 px-2 text-center">
                  {m.tasks > 0 && (
                    <button onClick={() => reassign(m)} disabled={busyId === m.user_id}
                      className="inline-flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-amber-600 border border-slate-600 text-slate-200 rounded-lg px-2 py-1 transition disabled:opacity-60"
                      title={ar ? 'تحويل مهامها لباقي الفريق' : 'Reassign to team'}>
                      {busyId === m.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}
                      {ar ? 'تحويل' : 'Reassign'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {awaitingRep && (
        <AwaitingListModal
          ar={ar} showToast={showToast} rep={awaitingRep} agents={agents}
          onClose={() => { setAwaitingRep(null); load(); }}
        />
      )}
    </div>
  );
}

// قائمة صوالين المندوبة «بانتظار ردّها» — ردّ أو تحويل واحداً واحداً.
function AwaitingListModal({ ar, showToast, rep, agents, onClose }) {
  const [list, setList] = useState(null);
  const [chatSalon, setChatSalon] = useState(null);
  const [busy, setBusy] = useState('');

  const load = React.useCallback(() => {
    salesApi.repTasks(rep.user_id, 'awaiting').then(setList).catch((e) => showToast(e.message, 'err'));
  }, [rep.user_id, showToast]);
  useEffect(() => { load(); }, [load]);

  const reassignOne = async (s, ownerId) => {
    if (!ownerId) return;
    setBusy(s.id);
    try {
      await salesApi.assignSalon(s.id, ownerId);
      setList((ls) => (ls || []).filter((x) => x.id !== s.id));
      showToast(ar ? 'تم التحويل' : 'Reassigned');
    } catch (e) { showToast(e.message, 'err'); } finally { setBusy(''); }
  };

  const others = agents.filter((a) => a.id !== rep.user_id);

  return (
    <ModalShell title={`${ar ? 'بانتظار رد' : 'Awaiting reply'} · ${rep.name}`} ar={ar} onClose={onClose}>
      {!list ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
      ) : list.length === 0 ? (
        <div className="text-center text-slate-500 text-sm py-8">{ar ? 'لا شيء بانتظار الرد 🎉' : 'Nothing awaiting 🎉'}</div>
      ) : (
        <div className="space-y-2">
          {list.map((s) => (
            <div key={s.id} className="bg-slate-800/60 rounded-xl p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-white text-sm font-bold truncate">{s.name || (ar ? 'بدون اسم' : 'Unnamed')}</div>
                  <div className="text-[11px] text-slate-400" style={{ direction: 'ltr' }}>{s.phone}</div>
                </div>
                <button onClick={() => setChatSalon({ id: s.id, name: s.name, phone: s.phone, assigned_to: rep.name })}
                  className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-2.5 py-1.5 flex-shrink-0">
                  <MessageSquare className="w-3.5 h-3.5" /> {ar ? 'ردّ' : 'Reply'}
                </button>
              </div>
              {s.last_inbound && <p className="text-[12px] text-slate-300 mt-1.5 bg-slate-900/50 rounded-lg px-2 py-1 whitespace-pre-line break-words">💬 {s.last_inbound}</p>}
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">{ar ? 'تحويل إلى:' : 'Reassign to:'}</span>
                <select value="" disabled={busy === s.id} onChange={(e) => { if (e.target.value) reassignOne(s, e.target.value); }}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none">
                  <option value="">{busy === s.id ? (ar ? 'جارٍ…' : '…') : (ar ? '— اختر مندوبة —' : '— pick rep —')}</option>
                  {others.map((a) => <option key={a.id} value={a.id}>{a.display_name}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {chatSalon && <AdminChatModal ar={ar} showToast={showToast} salon={chatSalon} onClose={() => { setChatSalon(null); load(); }} />}
    </ModalShell>
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
