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
    <div dir={ar ? 'rtl' : 'ltr'} className="h-screen overflow-y-auto bg-slate-950 text-white">
      {/* الترويسة */}
      <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <HoveraLogo size={36} ar={ar} />
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              to="/SalesPortalAdmin"
              className="flex items-center gap-1.5 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 transition"
            >
              <Shield className="w-4 h-4" /> {ar ? 'إدارة البوابة' : 'Portal Admin'}
            </Link>
          )}
          <span className="text-sm text-slate-300">
            {user.name} · <span className="text-slate-500">{roleLabel(user.role, ar)}</span>
          </span>
          <button onClick={logout} className="text-slate-400 hover:text-rose-400 transition" title={ar ? 'خروج' : 'Sign out'}>
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {/* شريط الإحصائيات */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label={ar ? 'إجمالي الصوالين' : 'Total Salons'} value={stats.total} color="text-white" />
          <StatCard label={ar ? 'تم التواصل' : 'Contacted'} value={stats.contacted} color="text-blue-400" />
          <StatCard label={ar ? 'من نصيبي أنا' : 'Assigned to Me'} value={stats.mine} color="text-indigo-400" />
          <StatCard label={ar ? 'مهتمين' : 'Interested'} value={stats.interested} color="text-emerald-400" />
          <StatCard label={ar ? 'مشتركين' : 'Subscribed'} value={stats.subscribed} color="text-green-400" />
        </div>

        {/* البحث + الفلاتر */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 space-y-3">
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 ${ar ? 'right-3' : 'left-3'}`} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={ar ? 'ابحث بالاسم أو الجوال أو المدينة أو الحي…' : 'Search by name, phone, city or district…'}
              className={`w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 ${ar ? 'pr-10 pl-3' : 'pl-10 pr-3'}`}
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
                  className="flex items-center gap-2 bg-slate-800 hover:bg-indigo-600 disabled:opacity-60 border border-slate-700 text-white rounded-lg px-5 py-2.5 text-sm font-medium transition"
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

function SalonCard({ salon, me, ar, onUpdate, onWhatsApp, onLog }) {
  const ownedByOther = salon.owner_id && salon.owner_id !== me.id;
  const ownedByMe = salon.owner_id && salon.owner_id === me.id;
  const wa = waNumber(salon.phone);
  const fuState = followUpState(salon.follow_up);
  const hasContact = Boolean(salon.last_contact_date);
  const mapUrl = salon.lat != null && salon.lng != null
    ? `https://www.google.com/maps/search/?api=1&query=${salon.lat},${salon.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([salon.name, salon.district, salon.city].filter(Boolean).join(' '))}`;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-white truncate">{salon.name || (ar ? 'بدون اسم' : 'Unnamed')}</h3>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
            <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400" /> {salon.rating || 0}</span>
            <span>{salon.reviews_count || 0} {ar ? 'مراجعة' : 'reviews'}</span>
            <span>{typeLabel(salon.type, ar)}</span>
          </div>
        </div>
        <span className={`text-[11px] text-white px-2 py-1 rounded-full ${statusColor(salon.status)}`}>
          {statusLabel(salon.status, ar)}
        </span>
      </div>

      <div className="text-sm text-slate-300 flex items-center gap-1">
        <MapPin className="w-3.5 h-3.5 text-slate-500" />
        {[salon.city, salon.district].filter(Boolean).join(' · ') || (ar ? 'موقع غير محدد' : 'Location not set')}
      </div>

      {salon.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {salon.tags.map((tag, i) => (
            <span key={i} className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>
      )}

      {/* شارة الملكية */}
      {ownedByOther && (
        <div className="flex items-center gap-1.5 text-[12px] text-amber-300 bg-amber-950/40 border border-amber-800/60 rounded-lg px-2.5 py-1.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {ar
            ? <>سبق التواصل من قبل: {salon.owner_name} · {shortDate(salon.last_contact_date, ar)}</>
            : <>Already contacted by: {salon.owner_name} · {shortDate(salon.last_contact_date, ar)}</>}
        </div>
      )}
      {ownedByMe && (
        <div className="flex items-center justify-between gap-1.5 text-[12px] text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 rounded-lg px-2.5 py-1.5">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {ar ? 'بمتابعتك أنت' : 'Followed up by you'}
          </span>
          {hasContact && (
            <span className="flex items-center gap-1 text-emerald-400/90" title={shortDateTime(salon.last_contact_date, ar)}>
              <Clock className="w-3.5 h-3.5" />
              {ar ? 'آخر تواصل' : 'Last contact'}: {timeAgo(salon.last_contact_date, ar)}
            </span>
          )}
        </div>
      )}

      {/* تنبيه موعد المتابعة */}
      {(fuState === 'due' || fuState === 'overdue') && (
        <div className={`flex items-center gap-1.5 text-[12px] rounded-lg px-2.5 py-1.5 border ${
          fuState === 'overdue'
            ? 'text-rose-300 bg-rose-950/40 border-rose-800/60'
            : 'text-amber-200 bg-amber-950/40 border-amber-700/60'
        }`}>
          <CalendarClock className="w-4 h-4 flex-shrink-0" />
          {fuState === 'overdue'
            ? (ar ? `متابعة متأخّرة — كانت ${shortDate(salon.follow_up, ar)}` : `Follow-up overdue — was ${shortDate(salon.follow_up, ar)}`)
            : (ar ? 'متابعة اليوم' : 'Follow-up due today')}
        </div>
      )}

      {/* الأزرار */}
      <div className="grid grid-cols-5 gap-2 pt-1">
        <ActionBtn href={salon.phone ? `tel:${salon.phone}` : undefined} icon={Phone} label={ar ? 'اتصال' : 'Call'} color="hover:bg-blue-600" />
        <ActionBtn onClick={onWhatsApp} icon={MessageCircle} label={ar ? 'واتساب' : 'WhatsApp'} color="hover:bg-green-600" disabled={!wa} />
        <ActionBtn href={mapUrl} icon={MapPin} label={ar ? 'خريطة' : 'Map'} color="hover:bg-rose-600" external />
        <ActionBtn onClick={onUpdate} icon={RefreshCw} label={ar ? 'تحديث' : 'Update'} color="hover:bg-indigo-600" />
        <ActionBtn onClick={onLog} icon={History} label={ar ? 'السجل' : 'Log'} color="hover:bg-slate-600" />
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
  // فتح تطبيق واتساب مباشرة عبر رابط التطبيق (whatsapp://) — يتجاوز صفحة
  // "Welcome to WhatsApp" التي يعرضها رابط wa.me في المتصفّح.
  const openChat = (body) => {
    const q = body ? `&text=${encodeURIComponent(fill(body))}` : '';
    window.location.href = `whatsapp://send?phone=${wa}${q}`;
    onClose();
  };

  return (
    <ModalShell ar={ar} title={`${ar ? 'واتساب' : 'WhatsApp'}: ${salon.name || (ar ? 'عميل' : 'client')}`} onClose={onClose}>
      {templates.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-6">{ar ? 'لا توجد قوالب جاهزة بعد.' : 'No ready templates yet.'}</p>
      ) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => openChat(tpl.body)}
              className={`w-full bg-slate-800 hover:bg-green-900/40 border border-slate-700 hover:border-green-700 rounded-lg p-3 text-sm text-slate-200 transition ${ar ? 'text-right' : 'text-left'}`}
            >
              {fill(tpl.body)}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => openChat('')}
        className="w-full mt-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg py-2.5 flex items-center justify-center gap-2"
      >
        <MessageCircle className="w-4 h-4" /> {ar ? 'فتح المحادثة بدون قالب' : 'Open chat without a template'}
      </button>
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
