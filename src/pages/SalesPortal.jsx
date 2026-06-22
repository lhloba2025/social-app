import React, { useState, useEffect, useCallback } from 'react';
import { salesApi, getStoredUser, clearSession } from '@/api/salesClient';
import SalesLogin from '@/components/sales/SalesLogin';
import HoveraLogo from '@/components/sales/HoveraLogo';
import {
  STATUS_OPTIONS, PRIORITY_OPTIONS, TYPE_OPTIONS, SORT_OPTIONS,
  statusLabel, statusColor, typeLabel, waNumber, shortDate, ROLE_LABELS,
} from './salesConstants';
import {
  Search, Phone, MessageCircle, MapPin, RefreshCw, Star, LogOut,
  AlertTriangle, CheckCircle2, Loader2, X, Shield,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const EMPTY_STATS = { total: 0, contacted: 0, mine: 0, interested: 0, subscribed: 0 };

export default function SalesPortal() {
  const [user, setUser] = useState(getStoredUser());
  const [stats, setStats] = useState(EMPTY_STATS);
  const [salons, setSalons] = useState([]);
  const [filterOpts, setFilterOpts] = useState({ cities: [], districts: [] });
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({ city: '', district: '', type: '', owner: 'all', status: '' });
  const [sort, setSort] = useState('-updated_date');

  const [editing, setEditing] = useState(null);   // الصالون قيد التحديث
  const [waSalon, setWaSalon] = useState(null);    // الصالون لنافذة واتساب

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadSalons = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search: q, sort, ...filters };
      if (params.owner === 'all') delete params.owner;
      const [list, st] = await Promise.all([salesApi.salons(params), salesApi.salonStats()]);
      setSalons(list);
      setStats(st);
    } catch (err) {
      if (/الجلسة/.test(err.message)) { setUser(null); }
      else showToast(err.message, 'err');
    } finally {
      setLoading(false);
    }
  }, [q, sort, filters]);

  // تحميل أولي للبيانات الثابتة (فلاتر + قوالب) بعد الدخول.
  useEffect(() => {
    if (!user) return;
    salesApi.salonFilters().then(setFilterOpts).catch(() => {});
    salesApi.templates().then(setTemplates).catch(() => {});
  }, [user]);

  // إعادة جلب الصوالين عند تغيّر البحث/الفلاتر/الترتيب (مع تأخير بسيط للبحث).
  useEffect(() => {
    if (!user) return;
    const t = setTimeout(loadSalons, 250);
    return () => clearTimeout(t);
  }, [user, loadSalons]);

  if (!user) {
    return <SalesLogin onSuccess={setUser} />;
  }

  const logout = async () => {
    await salesApi.logout();
    clearSession();
    setUser(null);
  };

  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  return (
    <div dir="rtl" className="h-screen overflow-y-auto bg-slate-950 text-white">
      {/* الترويسة */}
      <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <HoveraLogo size={36} />
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              to="/SalesPortalAdmin"
              className="flex items-center gap-1.5 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 transition"
            >
              <Shield className="w-4 h-4" /> إدارة البوابة
            </Link>
          )}
          <span className="text-sm text-slate-300">
            {user.name} · <span className="text-slate-500">{ROLE_LABELS[user.role]}</span>
          </span>
          <button onClick={logout} className="text-slate-400 hover:text-rose-400 transition" title="خروج">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {/* شريط الإحصائيات */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="إجمالي الصوالين" value={stats.total} color="text-white" />
          <StatCard label="تم التواصل" value={stats.contacted} color="text-blue-400" />
          <StatCard label="من نصيبي أنا" value={stats.mine} color="text-indigo-400" />
          <StatCard label="مهتمين" value={stats.interested} color="text-emerald-400" />
          <StatCard label="مشتركين" value={stats.subscribed} color="text-green-400" />
        </div>

        {/* البحث + الفلاتر */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث بالاسم أو الجوال أو المدينة أو الحي…"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pr-10 pl-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <Select value={filters.city} onChange={(v) => setFilters((f) => ({ ...f, city: v }))} placeholder="كل المدن"
              options={filterOpts.cities.map((c) => ({ value: c, label: c }))} />
            <Select value={filters.district} onChange={(v) => setFilters((f) => ({ ...f, district: v }))} placeholder="كل الأحياء"
              options={filterOpts.districts.map((c) => ({ value: c, label: c }))} />
            <Select value={filters.type} onChange={(v) => setFilters((f) => ({ ...f, type: v }))} placeholder="كل الأنواع"
              options={TYPE_OPTIONS} />
            <Select value={filters.owner} onChange={(v) => setFilters((f) => ({ ...f, owner: v }))} placeholder="الملكية"
              options={[{ value: 'all', label: 'الكل' }, { value: 'mine', label: 'من نصيبي' }, { value: 'none', label: 'بدون مالك' }]} />
            <Select value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} placeholder="كل الحالات"
              options={STATUS_OPTIONS} />
            <Select value={sort} onChange={setSort} placeholder="ترتيب" options={SORT_OPTIONS} allowEmpty={false} />
          </div>
        </div>

        {/* قائمة العملاء */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
        ) : salons.length === 0 ? (
          <div className="text-center py-16 text-slate-500">لا توجد نتائج مطابقة.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {salons.map((s) => (
              <SalonCard
                key={s.id}
                salon={s}
                me={user}
                onUpdate={() => setEditing(s)}
                onWhatsApp={() => setWaSalon(s)}
              />
            ))}
          </div>
        )}
      </div>

      {editing && (
        <UpdateModal
          salon={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setEditing(null);
            showToast('تم حفظ التحديث');
            setSalons((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
            salesApi.salonStats().then(setStats).catch(() => {});
          }}
          onError={(m) => showToast(m, 'err')}
        />
      )}

      {waSalon && (
        <WhatsAppModal
          salon={waSalon}
          me={user}
          templates={templates}
          onClose={() => setWaSalon(null)}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg ${
          toast.type === 'err' ? 'bg-rose-600' : 'bg-emerald-600'
        } text-white`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── مكوّنات فرعية ───────────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-center">
      <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}

function Select({ value, onChange, options, placeholder, allowEmpty = true }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
    >
      {allowEmpty && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function SalonCard({ salon, me, onUpdate, onWhatsApp }) {
  const ownedByOther = salon.owner_id && salon.owner_id !== me.id;
  const ownedByMe = salon.owner_id && salon.owner_id === me.id;
  const wa = waNumber(salon.phone);
  const mapUrl = salon.lat != null && salon.lng != null
    ? `https://www.google.com/maps/search/?api=1&query=${salon.lat},${salon.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([salon.name, salon.district, salon.city].filter(Boolean).join(' '))}`;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-white truncate">{salon.name || 'بدون اسم'}</h3>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
            <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400" /> {salon.rating || 0}</span>
            <span>{salon.reviews_count || 0} مراجعة</span>
            <span>{typeLabel(salon.type)}</span>
          </div>
        </div>
        <span className={`text-[11px] text-white px-2 py-1 rounded-full ${statusColor(salon.status)}`}>
          {statusLabel(salon.status)}
        </span>
      </div>

      <div className="text-sm text-slate-300 flex items-center gap-1">
        <MapPin className="w-3.5 h-3.5 text-slate-500" />
        {[salon.city, salon.district].filter(Boolean).join(' · ') || 'موقع غير محدد'}
      </div>

      {salon.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {salon.tags.map((t, i) => (
            <span key={i} className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
      )}

      {/* شارة الملكية */}
      {ownedByOther && (
        <div className="flex items-center gap-1.5 text-[12px] text-amber-300 bg-amber-950/40 border border-amber-800/60 rounded-lg px-2.5 py-1.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          سبق التواصل من قبل: {salon.owner_name} · {shortDate(salon.last_contact_date)}
        </div>
      )}
      {ownedByMe && (
        <div className="flex items-center gap-1.5 text-[12px] text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 rounded-lg px-2.5 py-1.5">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          بمتابعتك أنت
        </div>
      )}

      {/* الأزرار */}
      <div className="grid grid-cols-4 gap-2 pt-1">
        <ActionBtn href={salon.phone ? `tel:${salon.phone}` : undefined} icon={Phone} label="اتصال" color="hover:bg-blue-600" />
        <ActionBtn onClick={onWhatsApp} icon={MessageCircle} label="واتساب" color="hover:bg-green-600" disabled={!wa} />
        <ActionBtn href={mapUrl} icon={MapPin} label="خريطة" color="hover:bg-rose-600" external />
        <ActionBtn onClick={onUpdate} icon={RefreshCw} label="تحديث" color="hover:bg-indigo-600" />
      </div>
    </div>
  );
}

function ActionBtn({ href, onClick, icon: Icon, label, color, external, disabled }) {
  const cls = `flex flex-col items-center gap-1 py-2 rounded-lg bg-slate-800 text-slate-300 transition text-xs ${disabled ? 'opacity-40 cursor-not-allowed' : color + ' hover:text-white'}`;
  if (href && !disabled) {
    return (
      <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} className={cls}>
        <Icon className="w-4 h-4" /> {label}
      </a>
    );
  }
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} className={cls}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

function UpdateModal({ salon, onClose, onSaved, onError }) {
  const [form, setForm] = useState({
    status: salon.status || 'new',
    visit_result: salon.visit_result || '',
    subscription_type: salon.subscription_type || '',
    follow_up: salon.follow_up || '',
    priority: salon.priority || 'normal',
    note: salon.note || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const updated = await salesApi.updateSalon(salon.id, form);
      onSaved(updated);
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={`تحديث: ${salon.name || 'عميل'}`} onClose={onClose}>
      <div className="space-y-3">
        <Field label="الحالة">
          <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="نتيجة الزيارة">
          <input value={form.visit_result} onChange={(e) => set('visit_result', e.target.value)} className={inputCls} placeholder="مثال: تمت الزيارة، طلب وقتاً للتفكير" />
        </Field>
        <Field label="نوع الاشتراك">
          <input value={form.subscription_type} onChange={(e) => set('subscription_type', e.target.value)} className={inputCls} placeholder="مثال: شهري، سنوي" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="المتابعة">
            <input type="date" value={form.follow_up} onChange={(e) => set('follow_up', e.target.value)} className={inputCls} />
          </Field>
          <Field label="الأولوية">
            <select value={form.priority} onChange={(e) => set('priority', e.target.value)} className={inputCls}>
              {PRIORITY_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>
        </div>
        <Field label="ملاحظة">
          <textarea value={form.note} onChange={(e) => set('note', e.target.value)} rows={3} className={inputCls} placeholder="أي ملاحظة عن هذا التواصل…" />
        </Field>
      </div>
      <div className="flex gap-2 pt-4">
        <button onClick={save} disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-lg py-2.5 flex items-center justify-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} حفظ التحديث
        </button>
        <button onClick={onClose} className="px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">إلغاء</button>
      </div>
    </ModalShell>
  );
}

function WhatsAppModal({ salon, me, templates, onClose }) {
  const wa = waNumber(salon.phone);
  const fill = (body) => (body || '').replaceAll('{me}', me.name || '');
  const open = (body) => {
    const text = encodeURIComponent(fill(body));
    window.open(`https://wa.me/${wa}?text=${text}`, '_blank');
    onClose();
  };

  return (
    <ModalShell title={`واتساب: ${salon.name || 'عميل'}`} onClose={onClose}>
      {templates.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-6">لا توجد قوالب جاهزة بعد.</p>
      ) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => open(t.body)}
              className="w-full text-right bg-slate-800 hover:bg-green-900/40 border border-slate-700 hover:border-green-700 rounded-lg p-3 text-sm text-slate-200 transition"
            >
              {fill(t.body)}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => window.open(`https://wa.me/${wa}`, '_blank')}
        className="w-full mt-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg py-2.5 flex items-center justify-center gap-2"
      >
        <MessageCircle className="w-4 h-4" /> فتح المحادثة بدون قالب
      </button>
    </ModalShell>
  );
}

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

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-slate-300 text-sm mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500';
