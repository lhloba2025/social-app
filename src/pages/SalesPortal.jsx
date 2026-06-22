import React, { useState, useEffect, useCallback } from 'react';
import { salesApi, getStoredUser, clearSession } from '@/api/salesClient';
import SalesLogin from '@/components/sales/SalesLogin';
import HoveraLogo from '@/components/sales/HoveraLogo';
import {
  STATUS_OPTIONS, PRIORITY_OPTIONS, TYPE_OPTIONS, SORT_OPTIONS,
  statusLabel, statusColor, typeLabel, waNumber, shortDate, shortDateTime,
  timeAgo, followUpState, roleLabel, localizedOptions,
} from './salesConstants';
import {
  Search, Phone, MessageCircle, MapPin, RefreshCw, Star, LogOut,
  AlertTriangle, CheckCircle2, Loader2, X, Shield, History, Clock, CalendarClock,
  Store, PhoneOutgoing, UserCheck, Heart, BadgeCheck, ChevronDown,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const EMPTY_STATS = { total: 0, contacted: 0, mine: 0, interested: 0, subscribed: 0 };
const PAGE_SIZE = 30;   // عدد الصوالين لكل دفعة — يمنع تحميل الآلاف دفعة واحدة على الجوال.

export default function SalesPortal({ language }) {
  const ar = language !== 'en';
  const [user, setUser] = useState(getStoredUser());
  const [stats, setStats] = useState(EMPTY_STATS);
  const [salons, setSalons] = useState([]);
  const [filterOpts, setFilterOpts] = useState({ cities: [], districts: [] });
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [toast, setToast] = useState(null);

  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({ city: '', district: '', type: '', owner: 'all', status: '' });
  const [sort, setSort] = useState('-updated_date');

  const [editing, setEditing] = useState(null);   // الصالون قيد التحديث
  const [waSalon, setWaSalon] = useState(null);    // الصالون لنافذة واتساب
  const [logSalon, setLogSalon] = useState(null);  // الصالون لنافذة سجل التواصل

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // بناء معاملات الطلب (بحث + فلاتر + ترتيب + ترقيم).
  const buildParams = useCallback((offset) => {
    const params = { search: q, sort, ...filters, limit: PAGE_SIZE, offset };
    if (params.owner === 'all') delete params.owner;
    return params;
  }, [q, sort, filters]);

  // تحميل الدفعة الأولى (يستبدل القائمة) — يُستدعى عند تغيّر البحث/الفلاتر.
  const loadSalons = useCallback(async () => {
    setLoading(true);
    try {
      const [list, st] = await Promise.all([
        salesApi.salons(buildParams(0)),
        salesApi.salonStats(),
      ]);
      setSalons(list);
      setHasMore(list.length === PAGE_SIZE);
      setStats(st);
    } catch (err) {
      if (/الجلسة|session/i.test(err.message)) { setUser(null); }
      else showToast(err.message, 'err');
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  // تحميل دفعة إضافية وإلحاقها بالقائمة الحالية.
  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const more = await salesApi.salons(buildParams(salons.length));
      setSalons((prev) => [...prev, ...more]);
      setHasMore(more.length === PAGE_SIZE);
    } catch (err) {
      showToast(err.message, 'err');
    } finally {
      setLoadingMore(false);
    }
  };

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
    return <SalesLogin onSuccess={setUser} ar={ar} />;
  }

  const logout = async () => {
    await salesApi.logout();
    clearSession();
    setUser(null);
  };

  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="relative h-screen overflow-y-auto bg-slate-950 text-white">
      {/* وهج خلفي للعمق */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 right-1/4 w-[42rem] h-[42rem] rounded-full bg-indigo-600/10 blur-[130px]" />
        <div className="absolute -bottom-48 left-1/4 w-[42rem] h-[42rem] rounded-full bg-violet-600/10 blur-[130px]" />
      </div>

      {/* الترويسة الزجاجية */}
      <header className="sticky top-0 z-20 bg-slate-950/70 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <HoveraLogo size={36} ar={ar} />
        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <Link
              to="/SalesPortalAdmin"
              className="flex items-center gap-1.5 text-[13px] font-medium bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 transition"
            >
              <Shield className="w-4 h-4 text-indigo-300" /> {ar ? 'إدارة البوابة' : 'Portal Admin'}
            </Link>
          )}
          <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl ps-1.5 pe-3 py-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[12px] font-bold">
              {(user.name || '?').trim().charAt(0)}
            </div>
            <span className="text-[13px] text-slate-200 font-medium">{user.name}</span>
            <span className="text-[11px] text-slate-500">· {roleLabel(user.role, ar)}</span>
          </div>
          <button onClick={logout} className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition" title={ar ? 'خروج' : 'Sign out'}>
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </header>

      <div className="relative max-w-6xl mx-auto p-4 space-y-5">
        {/* شريط الإحصائيات */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={Store} label={ar ? 'إجمالي الصوالين' : 'Total Salons'} value={stats.total} accent="text-white" />
          <StatCard icon={PhoneOutgoing} label={ar ? 'تم التواصل' : 'Contacted'} value={stats.contacted} accent="text-blue-400" />
          <StatCard icon={UserCheck} label={ar ? 'من نصيبي أنا' : 'Assigned to Me'} value={stats.mine} accent="text-indigo-400" />
          <StatCard icon={Heart} label={ar ? 'مهتمين' : 'Interested'} value={stats.interested} accent="text-emerald-400" />
          <StatCard icon={BadgeCheck} label={ar ? 'مشتركين' : 'Subscribed'} value={stats.subscribed} accent="text-green-400" />
        </div>

        {/* البحث + الفلاتر */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-3 space-y-3">
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-500 ${ar ? 'right-3.5' : 'left-3.5'}`} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={ar ? 'ابحث بالاسم أو الجوال أو المدينة أو الحي…' : 'Search by name, phone, city or district…'}
              className={`w-full bg-slate-900/60 border border-white/10 rounded-xl py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition ${ar ? 'pr-11 pl-3.5' : 'pl-11 pr-3.5'}`}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <Select value={filters.city} onChange={(v) => setFilters((f) => ({ ...f, city: v }))} placeholder={ar ? 'كل المدن' : 'All Cities'}
              options={filterOpts.cities.map((c) => ({ value: c, label: c }))} />
            <Select value={filters.district} onChange={(v) => setFilters((f) => ({ ...f, district: v }))} placeholder={ar ? 'كل الأحياء' : 'All Districts'}
              options={filterOpts.districts.map((c) => ({ value: c, label: c }))} />
            <Select value={filters.type} onChange={(v) => setFilters((f) => ({ ...f, type: v }))} placeholder={ar ? 'كل الأنواع' : 'All Types'}
              options={localizedOptions(TYPE_OPTIONS, ar)} />
            <Select value={filters.owner} onChange={(v) => setFilters((f) => ({ ...f, owner: v }))} placeholder={ar ? 'الملكية' : 'Ownership'}
              options={[{ value: 'all', label: ar ? 'الكل' : 'All' }, { value: 'mine', label: ar ? 'من نصيبي' : 'Mine' }, { value: 'none', label: ar ? 'بدون مالك' : 'Unassigned' }]} />
            <Select value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} placeholder={ar ? 'كل الحالات' : 'All Statuses'}
              options={localizedOptions(STATUS_OPTIONS, ar)} />
            <Select value={sort} onChange={setSort} placeholder={ar ? 'ترتيب' : 'Sort'} options={localizedOptions(SORT_OPTIONS, ar)} allowEmpty={false} />
          </div>
        </div>

        {/* قائمة العملاء */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
        ) : salons.length === 0 ? (
          <div className="text-center py-16 text-slate-500">{ar ? 'لا توجد نتائج مطابقة.' : 'No matching results.'}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {salons.map((s) => (
                <SalonCard
                  key={s.id}
                  salon={s}
                  me={user}
                  ar={ar}
                  onUpdate={() => setEditing(s)}
                  onWhatsApp={() => setWaSalon(s)}
                  onLog={() => setLogSalon(s)}
                />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 disabled:opacity-60 border border-white/10 text-slate-200 rounded-xl px-6 py-2.5 text-sm font-medium transition"
                >
                  {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                  {ar ? 'تحميل المزيد' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {editing && (
        <UpdateModal
          salon={editing}
          ar={ar}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setEditing(null);
            showToast(ar ? 'تم حفظ التحديث' : 'Update saved');
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
          ar={ar}
          templates={templates}
          onClose={() => setWaSalon(null)}
        />
      )}

      {logSalon && (
        <LogModal
          salon={logSalon}
          ar={ar}
          onClose={() => setLogSalon(null)}
          onError={(m) => showToast(m, 'err')}
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
function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={`text-[26px] leading-none font-extrabold ${accent}`}>{value}</div>
          <div className="text-[11px] text-slate-400 mt-2 truncate">{label}</div>
        </div>
        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
          <Icon className={`w-[18px] h-[18px] ${accent}`} />
        </div>
      </div>
    </div>
  );
}

function Select({ value, onChange, options, placeholder, allowEmpty = true }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-slate-900/60 border border-white/10 rounded-xl ps-3 pe-8 py-2.5 text-[13px] text-slate-200 cursor-pointer focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition"
      >
        {allowEmpty && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" style={{ insetInlineEnd: '0.6rem' }} />
    </div>
  );
}

function SalonCard({ salon, me, ar, onUpdate, onWhatsApp, onLog }) {
  const ownedByOther = salon.owner_id && salon.owner_id !== me.id;
  const ownedByMe = salon.owner_id && salon.owner_id === me.id;
  const wa = waNumber(salon.phone);
  const fuState = followUpState(salon.follow_up);
  const hasContact = Boolean(salon.last_contact_date);
  const mapUrl = salon.lat != null && salon.lng != null
    ? `https://www.google.com/maps/search/?api=1&query=${salon.lat},${salon.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([salon.name, salon.district, salon.city].filter(Boolean).join(' '))}`;

  const location = [salon.city, salon.district].filter(Boolean).join(' · ');

  const initial = (salon.name || '؟').trim().charAt(0) || '؟';

  return (
    <div className="group relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] hover:from-white/[0.07] hover:border-white/20 p-4 transition-all duration-200">
      {/* الترويسة: أفاتار + الاسم + الحالة */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/30 to-violet-600/30 border border-white/10 flex items-center justify-center flex-shrink-0">
          <span className="text-base font-bold text-indigo-200">{initial}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-white text-[15px] leading-tight truncate">{salon.name || (ar ? 'بدون اسم' : 'Unnamed')}</h3>
            <span className={`text-[10px] font-medium text-white px-2 py-0.5 rounded-full flex-shrink-0 ${statusColor(salon.status)}`}>
              {statusLabel(salon.status, ar)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1 truncate">
            <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400 fill-amber-400" />{salon.rating || 0}</span>
            <span className="text-slate-600">·</span>
            <span>{salon.reviews_count || 0} {ar ? 'مراجعة' : 'rev'}</span>
            {location && <><span className="text-slate-600">·</span>
              <span className="flex items-center gap-0.5 truncate"><MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />{location}</span></>}
          </div>
        </div>
      </div>

      {/* رقائق الحالة: الملكية + المتابعة (مدمجة) */}
      {(ownedByOther || ownedByMe || fuState === 'due' || fuState === 'overdue') && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {ownedByOther && (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-md px-1.5 py-0.5">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {salon.owner_name} · {shortDate(salon.last_contact_date, ar)}
            </span>
          )}
          {ownedByMe && (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-md px-1.5 py-0.5" title={shortDateTime(salon.last_contact_date, ar)}>
              <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> {ar ? 'بمتابعتك' : 'Mine'}{hasContact ? ` · ${timeAgo(salon.last_contact_date, ar)}` : ''}
            </span>
          )}
          {(fuState === 'due' || fuState === 'overdue') && (
            <span className={`inline-flex items-center gap-1 text-[10px] rounded-md px-1.5 py-0.5 border ${
              fuState === 'overdue' ? 'text-rose-300 bg-rose-500/10 border-rose-500/25' : 'text-amber-200 bg-amber-500/10 border-amber-500/25'
            }`}>
              <CalendarClock className="w-3 h-3 flex-shrink-0" />
              {fuState === 'overdue'
                ? (ar ? `متابعة متأخّرة · ${shortDate(salon.follow_up, ar)}` : `overdue · ${shortDate(salon.follow_up, ar)}`)
                : (ar ? 'متابعة اليوم' : 'due today')}
            </span>
          )}
        </div>
      )}

      {/* الأزرار — أيقونات أنيقة في شريط نحيف */}
      <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-white/5">
        <ActionBtn onClick={onLog} icon={History} label={ar ? 'السجل' : 'Log'} color="hover:bg-slate-700 hover:text-white" />
        <ActionBtn onClick={onUpdate} icon={RefreshCw} label={ar ? 'تحديث' : 'Update'} color="hover:bg-indigo-500/20 hover:text-indigo-300" />
        <ActionBtn href={mapUrl} icon={MapPin} label={ar ? 'خريطة' : 'Map'} color="hover:bg-rose-500/20 hover:text-rose-300" external />
        <ActionBtn onClick={onWhatsApp} icon={MessageCircle} label={ar ? 'واتساب' : 'WhatsApp'} color="hover:bg-green-500/20 hover:text-green-300" disabled={!wa} />
        <ActionBtn href={salon.phone ? `tel:${salon.phone}` : undefined} icon={Phone} label={ar ? 'اتصال' : 'Call'} color="hover:bg-blue-500/20 hover:text-blue-300" />
      </div>
    </div>
  );
}

function ActionBtn({ href, onClick, icon: Icon, label, color, external, disabled }) {
  const cls = `flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 transition ${disabled ? 'opacity-30 cursor-not-allowed' : color}`;
  if (href && !disabled) {
    return (
      <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} className={cls} title={label} aria-label={label}>
        <Icon className="w-[18px] h-[18px]" />
      </a>
    );
  }
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} className={cls} title={label} aria-label={label}>
      <Icon className="w-[18px] h-[18px]" />
    </button>
  );
}

function UpdateModal({ salon, ar, onClose, onSaved, onError }) {
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
    <ModalShell ar={ar} title={`${ar ? 'تحديث' : 'Update'}: ${salon.name || (ar ? 'عميل' : 'client')}`} onClose={onClose}>
      <div className="space-y-3">
        <Field label={ar ? 'الحالة' : 'Status'}>
          <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{ar ? s.ar : s.en}</option>)}
          </select>
        </Field>
        <Field label={ar ? 'نتيجة الزيارة' : 'Visit Result'}>
          <input value={form.visit_result} onChange={(e) => set('visit_result', e.target.value)} className={inputCls} placeholder={ar ? 'مثال: تمت الزيارة، طلب وقتاً للتفكير' : 'e.g. Visited, asked for time to decide'} />
        </Field>
        <Field label={ar ? 'نوع الاشتراك' : 'Subscription Type'}>
          <input value={form.subscription_type} onChange={(e) => set('subscription_type', e.target.value)} className={inputCls} placeholder={ar ? 'مثال: شهري، سنوي' : 'e.g. Monthly, Yearly'} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={ar ? 'المتابعة' : 'Follow-up'}>
            <input type="date" value={form.follow_up} onChange={(e) => set('follow_up', e.target.value)} className={inputCls} />
          </Field>
          <Field label={ar ? 'الأولوية' : 'Priority'}>
            <select value={form.priority} onChange={(e) => set('priority', e.target.value)} className={inputCls}>
              {PRIORITY_OPTIONS.map((p) => <option key={p.value} value={p.value}>{ar ? p.ar : p.en}</option>)}
            </select>
          </Field>
        </div>
        <Field label={ar ? 'ملاحظة' : 'Note'}>
          <textarea value={form.note} onChange={(e) => set('note', e.target.value)} rows={3} className={inputCls} placeholder={ar ? 'أي ملاحظة عن هذا التواصل…' : 'Any note about this contact…'} />
        </Field>
      </div>
      <div className="flex gap-2 pt-4">
        <button onClick={save} disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-lg py-2.5 flex items-center justify-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} {ar ? 'حفظ التحديث' : 'Save Update'}
        </button>
        <button onClick={onClose} className="px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">{ar ? 'إلغاء' : 'Cancel'}</button>
      </div>
    </ModalShell>
  );
}

function WhatsAppModal({ salon, me, ar, templates, onClose }) {
  const wa = waNumber(salon.phone);
  const fill = (body) => (body || '').replaceAll('{me}', me.name || '');
  // رابط واتساب الرسمي (wa.me). نستخدمه كرابط <a> تُضغط مباشرة — وهذه أفضل
  // طريقة ليفتح iOS التطبيق فوراً عبر الـ Universal Link بدون تأكيد "Open".
  // (استخدام window.open/تبويب جديد هو ما كان يعرض صفحة "Welcome to WhatsApp".)
  const waUrl = (body) => {
    const q = body ? `?text=${encodeURIComponent(fill(body))}` : '';
    return `https://wa.me/${wa}${q}`;
  };

  return (
    <ModalShell ar={ar} title={`${ar ? 'واتساب' : 'WhatsApp'}: ${salon.name || (ar ? 'عميل' : 'client')}`} onClose={onClose}>
      {templates.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-6">{ar ? 'لا توجد قوالب جاهزة بعد.' : 'No ready templates yet.'}</p>
      ) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {templates.map((tpl) => (
            <a
              key={tpl.id}
              href={waUrl(tpl.body)}
              onClick={onClose}
              className={`block w-full bg-slate-800 hover:bg-green-900/40 border border-slate-700 hover:border-green-700 rounded-lg p-3 text-sm text-slate-200 transition ${ar ? 'text-right' : 'text-left'}`}
            >
              {fill(tpl.body)}
            </a>
          ))}
        </div>
      )}
      <a
        href={waUrl('')}
        onClick={onClose}
        className="w-full mt-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg py-2.5 flex items-center justify-center gap-2"
      >
        <MessageCircle className="w-4 h-4" /> {ar ? 'فتح المحادثة بدون قالب' : 'Open chat without a template'}
      </a>
    </ModalShell>
  );
}

function LogModal({ salon, ar, onClose, onError }) {
  const [log, setLog] = useState(null);   // null = قيد التحميل

  useEffect(() => {
    let alive = true;
    salesApi.salonLog(salon.id)
      .then((rows) => { if (alive) setLog(rows); })
      .catch((e) => { if (alive) { setLog([]); onError?.(e.message); } });
    return () => { alive = false; };
  }, [salon.id]);

  return (
    <ModalShell ar={ar} title={`${ar ? 'سجل التواصل' : 'Contact Log'}: ${salon.name || (ar ? 'عميل' : 'client')}`} onClose={onClose}>
      {log === null ? (
        <div className="flex justify-center py-10"><Loader2 className="w-7 h-7 animate-spin text-indigo-500" /></div>
      ) : log.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">
          {ar ? 'لا يوجد سجل تواصل لهذا العميل بعد.' : 'No contact history for this client yet.'}
        </p>
      ) : (
        <ol className="space-y-3 max-h-[60vh] overflow-y-auto">
          {log.map((entry) => (
            <li key={entry.id} className={`relative bg-slate-800/60 border border-slate-700 rounded-lg p-3 ${ar ? 'pr-4' : 'pl-4'}`}>
              <div className={`absolute top-3 w-1.5 h-1.5 rounded-full ${statusColor(entry.status)} ${ar ? 'right-1' : 'left-1'}`} />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className={`text-[11px] text-white px-2 py-0.5 rounded-full ${statusColor(entry.status)}`}>
                  {statusLabel(entry.status, ar)}
                </span>
                <span className="text-[11px] text-slate-400">{shortDateTime(entry.created_date, ar)}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1.5">
                {ar ? 'بواسطة' : 'by'} <span className="text-slate-200">{entry.user_name || (ar ? 'غير معروف' : 'unknown')}</span>
              </div>
              {entry.note && <p className="text-sm text-slate-200 mt-1.5 whitespace-pre-wrap">{entry.note}</p>}
            </li>
          ))}
        </ol>
      )}
    </ModalShell>
  );
}

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

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-slate-300 text-sm mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500';
