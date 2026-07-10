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
  Store, PhoneOutgoing, UserCheck, Heart, BadgeCheck, ChevronDown, Trash2, Plus, Home, Languages,
  Paperclip, FileText, Image as ImageIcon, Megaphone,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const EMPTY_STATS = { total: 0, contacted: 0, mine: 0, interested: 0, subscribed: 0 };
const PAGE_SIZE = 30;   // عدد الصوالين لكل دفعة — يمنع تحميل الآلاف دفعة واحدة على الجوال.

export default function SalesPortal({ language }) {
  const [lang, setLang] = useState(language || localStorage.getItem('appLanguage') || 'ar');
  const ar = lang !== 'en';
  const toggleLang = () => {
    const next = ar ? 'en' : 'ar';
    localStorage.setItem('appLanguage', next);
    setLang(next);
  };
  const [user, setUser] = useState(getStoredUser());
  const [stats, setStats] = useState(EMPTY_STATS);
  const [salons, setSalons] = useState([]);
  const [filterOpts, setFilterOpts] = useState({ cities: [], districts: [], districtsByCity: {} });
  const [members, setMembers] = useState([]);   // للمديرين: فلترة حسب المندوب
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [toast, setToast] = useState(null);

  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({ city: '', district: '', type: '', owner: 'all', status: '', ownerId: '' });
  const [sort, setSort] = useState('-updated_date');

  const [editing, setEditing] = useState(null);   // الصالون قيد التحديث
  const [waSalon, setWaSalon] = useState(null);    // الصالون لنافذة واتساب
  const [logSalon, setLogSalon] = useState(null);  // الصالون لنافذة سجل التواصل
  const [adding, setAdding] = useState(false);     // نافذة إضافة صالون جديد
  const [view, setView] = useState('all');         // 'all' كل الصوالين | 'tasks' مهامي
  const [repFilter, setRepFilter] = useState('tasks');  // فئة عرض المندوبة: tasks|interested|subscribed
  const [repStats, setRepStats] = useState(null);       // عدّادات بطاقات المندوبة
  const loadRepStats = useCallback(() => { salesApi.myStats().then(setRepStats).catch(() => {}); }, []);

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // بناء معاملات الطلب (بحث + فلاتر + ترتيب + ترقيم).
  const buildParams = useCallback((offset) => {
    const params = { search: q, sort, ...filters, limit: PAGE_SIZE, offset };
    if (params.owner === 'all') delete params.owner;
    // فلتر المندوب (للمديرين): قيمة 'none' = متاح، وأي قيمة أخرى = معرّف المندوب.
    if (params.ownerId === 'none') params.owner = 'none';
    else if (params.ownerId) params.owner_id = params.ownerId;
    delete params.ownerId;
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
    loadRepStats();
    if (user.role === 'admin' || user.role === 'super_admin') {
      salesApi.members().then(setMembers).catch(() => {});
    }
  }, [user, loadRepStats]);

  // تحديث القوالب تلقائياً (لو الأدمن عدّلها والمندوب فاتح الصفحة): عند رجوع
  // المندوب للتطبيق (focus/visibility). كذلك تُحدَّث عند فتح نافذة واتساب أدناه.
  useEffect(() => {
    if (!user) return;
    const refreshTemplates = () => salesApi.templates().then(setTemplates).catch(() => {});
    const onVisible = () => { if (!document.hidden) refreshTemplates(); };
    window.addEventListener('focus', refreshTemplates);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', refreshTemplates);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user]);

  // كل ما يفتح المندوب نافذة واتساب لصالون، نجلب أحدث القوالب لحظتها.
  useEffect(() => {
    if (user && waSalon) salesApi.templates().then(setTemplates).catch(() => {});
  }, [waSalon, user]);

  // إعادة جلب الصوالين عند تغيّر البحث/الفلاتر/الترتيب (مع تأخير بسيط للبحث).
  useEffect(() => {
    if (!user) return;
    const t = setTimeout(loadSalons, 250);
    return () => clearTimeout(t);
  }, [user, loadSalons]);

  if (!user) {
    return <SalesLogin onSuccess={setUser} ar={ar} onToggleLang={toggleLang} />;
  }

  const logout = async () => {
    await salesApi.logout();
    clearSession();
    setUser(null);
  };

  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  // تثبيت التواصل: عند فتح واتساب أو الاتصال يصير الصالون باسم المندوب فوراً.
  const claimSalon = (salon, channel) => {
    salesApi.contactSalon(salon.id, channel)
      .then((updated) => {
        setSalons((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        salesApi.salonStats().then(setStats).catch(() => {});
      })
      .catch(() => {});
  };

  // حذف صالون (للمدير فأعلى) — مع تأكيد، ثم إزالته من القائمة وتحديث الإحصائيات.
  const handleDelete = async (salon) => {
    if (!window.confirm(ar ? `حذف «${salon.name || 'هذا الصالون'}» نهائياً؟ لا يمكن التراجع.` : `Delete "${salon.name}" permanently? This cannot be undone.`)) return;
    try {
      await salesApi.deleteSalon(salon.id);
      setSalons((prev) => prev.filter((s) => s.id !== salon.id));
      showToast(ar ? 'تم حذف الصالون' : 'Salon deleted');
      salesApi.salonStats().then(setStats).catch(() => {});
    } catch (err) {
      showToast(err.message, 'err');
    }
  };

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
          {user.role === 'super_admin' && (
            <Link
              to="/"
              className="flex items-center gap-1.5 text-[13px] font-medium bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 transition"
              title={ar ? 'النظام الرئيسي' : 'Main System'}
            >
              <Home className="w-4 h-4 text-slate-300" /> <span className="hidden sm:inline">{ar ? 'النظام' : 'System'}</span>
            </Link>
          )}
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
          <button onClick={toggleLang} className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[12px] font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition" title={ar ? 'English' : 'العربية'}>
            <Languages className="w-4 h-4" /> {ar ? 'EN' : 'ع'}
          </button>
          <button onClick={logout} className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition" title={ar ? 'خروج' : 'Sign out'}>
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </header>

      <div className="relative max-w-6xl mx-auto p-4 space-y-5">
        {/* شريط الإحصائيات — للمدير: عام. للمندوبة: بطاقات فئات قابلة للضغط. */}
        {isAdmin ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard icon={Store} label={ar ? 'إجمالي الصوالين' : 'Total Salons'} value={stats.total} accent="text-white" />
            <StatCard icon={PhoneOutgoing} label={ar ? 'تم التواصل' : 'Contacted'} value={stats.contacted} accent="text-blue-400" />
            <StatCard icon={UserCheck} label={ar ? 'من نصيبي أنا' : 'Assigned to Me'} value={stats.mine} accent="text-indigo-400" />
            <StatCard icon={Heart} label={ar ? 'مهتمين' : 'Interested'} value={stats.interested} accent="text-emerald-400" />
            <StatCard icon={BadgeCheck} label={ar ? 'مشتركين' : 'Subscribed'} value={stats.subscribed} accent="text-green-400" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <RepCard active={repFilter === 'tasks'} onClick={() => setRepFilter('tasks')} icon={CheckCircle2} label={ar ? 'مهامي' : 'My Tasks'} value={repStats?.tasks ?? 0} accent="text-fuchsia-400" />
            <RepCard active={repFilter === 'interested'} onClick={() => setRepFilter('interested')} icon={Heart} label={ar ? 'مهتمين' : 'Interested'} value={repStats?.interested ?? 0} accent="text-emerald-400" />
            <RepCard active={repFilter === 'subscribed'} onClick={() => setRepFilter('subscribed')} icon={BadgeCheck} label={ar ? 'مشتركين' : 'Subscribed'} value={repStats?.subscribed ?? 0} accent="text-green-400" />
          </div>
        )}

        {/* مبدّل العرض — للمدير فقط. المندوبة ترى «مهامي» فقط. */}
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => setView('all')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium border transition ${view === 'all' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}>
              <Store className="w-4 h-4" /> {ar ? 'كل الصوالين' : 'All Salons'}
            </button>
            <button onClick={() => setView('tasks')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium border transition ${view === 'tasks' ? 'bg-fuchsia-600 border-fuchsia-500 text-white' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}>
              <CheckCircle2 className="w-4 h-4" /> {ar ? 'مهامي' : 'My Tasks'}
            </button>
          </div>
        )}

        {(!isAdmin || view === 'tasks') ? (
          <MyTasksView ar={ar} showToast={showToast} me={user} templates={templates} filter={isAdmin ? 'tasks' : repFilter} onChanged={loadRepStats} onWhatsApp={(s) => setWaSalon(s)} />
        ) : (<>

        {/* البحث + الفلاتر */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-3 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className={`absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-500 ${ar ? 'right-3.5' : 'left-3.5'}`} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={ar ? 'ابحث بالاسم أو الجوال أو المدينة أو الحي…' : 'Search by name, phone, city or district…'}
                className={`w-full bg-slate-900/60 border border-white/10 rounded-xl py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition ${ar ? 'pr-11 pl-3.5' : 'pl-11 pr-3.5'}`}
              />
            </div>
            {isAdmin && (
              <button
                onClick={() => setAdding(true)}
                className="flex items-center gap-1.5 flex-shrink-0 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium rounded-xl px-3.5 text-sm shadow-lg shadow-indigo-900/30 transition"
              >
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">{ar ? 'إضافة صالون' : 'Add Salon'}</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <Select value={filters.city} onChange={(v) => setFilters((f) => ({ ...f, city: v, district: '' }))} placeholder={ar ? 'كل المدن' : 'All Cities'}
              options={filterOpts.cities.map((c) => ({ value: c, label: c }))} />
            <Select value={filters.district} onChange={(v) => setFilters((f) => ({ ...f, district: v }))}
              placeholder={filters.city ? (ar ? 'كل أحياء المدينة' : 'All Districts') : (ar ? 'اختر مدينة أولاً' : 'Select a city first')}
              options={(filters.city ? (filterOpts.districtsByCity?.[filters.city] || []) : filterOpts.districts).map((c) => ({ value: c, label: c }))} />
            <Select value={filters.type} onChange={(v) => setFilters((f) => ({ ...f, type: v }))} placeholder={ar ? 'كل الأنواع' : 'All Types'}
              options={localizedOptions(TYPE_OPTIONS, ar)} />
            {isAdmin ? (
              <Select value={filters.ownerId} onChange={(v) => setFilters((f) => ({ ...f, ownerId: v }))} placeholder={ar ? 'كل المناديب' : 'All Reps'}
                options={[
                  { value: 'none', label: ar ? 'متاح (بدون مندوب)' : 'Available (unassigned)' },
                  ...members.map((m) => ({ value: m.id, label: m.display_name })),
                ]} />
            ) : (
              <Select value={filters.owner} onChange={(v) => setFilters((f) => ({ ...f, owner: v }))} placeholder={ar ? 'الملكية' : 'Ownership'}
                options={[{ value: 'all', label: ar ? 'الكل' : 'All' }, { value: 'mine', label: ar ? 'من نصيبي' : 'Mine' }, { value: 'none', label: ar ? 'بدون مالك' : 'Unassigned' }]} />
            )}
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
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] divide-y divide-white/5 overflow-hidden">
              {salons.map((s) => (
                <SalonRow
                  key={s.id}
                  salon={s}
                  me={user}
                  ar={ar}
                  onUpdate={() => setEditing(s)}
                  onWhatsApp={() => setWaSalon(s)}
                  onLog={() => setLogSalon(s)}
                  onContact={(channel) => claimSalon(s, channel)}
                  onDelete={isAdmin ? () => handleDelete(s) : undefined}
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
        </>)}
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
          onContact={() => claimSalon(waSalon, 'whatsapp')}
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

      {adding && (
        <AddSalonModal
          ar={ar}
          onClose={() => setAdding(false)}
          onAdded={(salon) => {
            setAdding(false);
            showToast(ar ? 'تمت إضافة الصالون' : 'Salon added');
            setSalons((prev) => [salon, ...prev]);
            salesApi.salonStats().then(setStats).catch(() => {});
            salesApi.salonFilters().then(setFilterOpts).catch(() => {});
          }}
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

// ── قائمة متابعة المندوبة (مهامي / مهتمين / مشتركين) + محادثة + نتيجة ─────────────
function MyTasksView({ ar, showToast, onWhatsApp, me, templates, filter = 'tasks', onChanged }) {
  const [tasks, setTasks] = useState(null);
  const [chatSalon, setChatSalon] = useState(null);   // الصالون المفتوح للمحادثة داخل النظام
  const [followId, setFollowId] = useState(null);
  const [followDate, setFollowDate] = useState('');
  const [openMsg, setOpenMsg] = useState(null);   // الصالون المعروض رسالته (مطويّة افتراضاً)

  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback((spin = true) => {
    if (spin) setRefreshing(true);
    const p = filter === 'tasks' ? salesApi.myTasks() : salesApi.myClients(filter);
    p.then(setTasks).catch((e) => showToast(e.message, 'err')).finally(() => setRefreshing(false));
  }, [showToast, filter]);
  useEffect(() => { setTasks(null); load(); }, [load]);
  // تحديث تلقائي كل ٤٥ ثانية لإظهار الردود الجديدة (تنبيه غير مقروء) دون تدخّل.
  useEffect(() => {
    const iv = setInterval(() => load(false), 45000);
    const onFocus = () => load(false);
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(iv); window.removeEventListener('focus', onFocus); };
  }, [load]);

  const outcome = async (t, payload, msg) => {
    try {
      await salesApi.updateSalon(t.id, payload);
      setTasks((ts) => (ts || []).filter((x) => x.id !== t.id));
      showToast(msg);
      onChanged && onChanged();
    } catch (e) { showToast(e.message, 'err'); }
  };
  // فتح المحادثة: نُصفّر التاق غير المقروء فوراً (تفاؤلياً) بلا انتظار تحديث.
  const openChat = (t) => {
    setChatSalon(t);
    if (t.unread_count) setTasks((ts) => (ts || []).map((x) => (x.id === t.id ? { ...x, unread_count: 0 } : x)));
  };
  // اختيار النتيجة من القائمة المنسدلة.
  const pickOutcome = (t, v) => {
    if (v === 'follow') { setFollowId(t.id); setFollowDate(''); }
    else if (v === 'interested') outcome(t, { status: 'interested', visit_result: 'مهتمة' }, ar ? 'سُجّلت: مهتمة' : 'Interested');
    else if (v === 'not') outcome(t, { status: 'not_interested', visit_result: 'غير مهتمة' }, ar ? 'سُجّلت: غير مهتمة' : 'Not interested');
    else if (v === 'sub') outcome(t, { status: 'subscribed', visit_result: 'اشتركت' }, ar ? 'مبروك! اشتركت 🎉' : 'Subscribed 🎉');
  };

  if (tasks === null) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  const totalUnread = tasks.reduce((n, t) => n + (t.unread_count || 0), 0);
  const TITLE = {
    tasks: ar ? 'مهامي' : 'My Tasks',
    interested: ar ? 'المهتمين' : 'Interested',
    subscribed: ar ? 'المشتركين' : 'Subscribed',
  };
  const EMPTY = {
    tasks: ar ? 'لا مهام حالياً 🎉 كل ما أُسند إليك متابَع.' : 'No tasks right now 🎉',
    interested: ar ? 'لا يوجد عملاء مهتمون بعد.' : 'No interested clients yet.',
    subscribed: ar ? 'لا يوجد مشتركون بعد.' : 'No subscribers yet.',
  };
  const header = (
    <div className="flex items-center justify-between">
      <h3 className="font-bold text-white flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-fuchsia-400" /> {TITLE[filter] || TITLE.tasks} <span className="text-slate-400 text-sm">({tasks.length})</span>
        {totalUnread > 0 && (
          <span className="text-[11px] font-bold bg-rose-600 text-white rounded-full px-2 py-0.5 flex items-center gap-1">
            <MessageCircle className="w-3 h-3" /> {ar ? `${totalUnread} غير مقروء` : `${totalUnread} unread`}
          </span>
        )}
      </h3>
      <button onClick={() => load()} disabled={refreshing} className="flex items-center gap-1.5 text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 rounded-xl px-3 py-1.5 transition">
        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> {ar ? 'تحديث' : 'Refresh'}
      </button>
    </div>
  );

  if (!tasks.length) return (
    <div className="space-y-3">
      {header}
      <div className="text-center py-14 text-slate-500">{EMPTY[filter] || EMPTY.tasks}</div>
    </div>
  );

  return (
    <div className="space-y-2">
      {header}
      {tasks.map((t) => (
        <div key={t.id} className={`rounded-2xl border p-3 ${(t.unread_count > 0 || t.wait_state === 'awaiting_rep') ? 'border-rose-500/50 bg-rose-500/[0.06]' : t.wait_state === 'awaiting_customer' ? 'border-emerald-500/30 bg-emerald-500/[0.05]' : 'border-white/10 bg-white/[0.02]'}`}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white">{t.name || (ar ? 'بدون اسم' : 'Unnamed')}</span>
                {/* شارة الحالة الواضحة: بانتظار ردّك / ردّيتِ وبانتظار العميلة */}
                {t.unread_count > 0 ? (
                  <span className="text-[11px] font-bold rounded-full px-2 py-0.5 bg-rose-600 text-white flex items-center gap-1"><MessageCircle className="w-3 h-3" />{ar ? `بانتظار ردّك · ${t.unread_count} جديدة` : `Your reply · ${t.unread_count} new`}</span>
                ) : t.wait_state === 'awaiting_rep' ? (
                  <span className="text-[11px] font-bold rounded-full px-2 py-0.5 bg-rose-600 text-white flex items-center gap-1"><MessageCircle className="w-3 h-3" />{ar ? 'بانتظار ردّك' : 'Awaiting your reply'}</span>
                ) : t.wait_state === 'awaiting_customer' ? (
                  <span className="text-[11px] rounded-full px-2 py-0.5 bg-emerald-500/20 text-emerald-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{ar ? 'ردّيتِ · بانتظار العميلة' : 'Replied · awaiting client'}</span>
                ) : (
                  <span className={`text-[11px] text-white px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>{statusLabel(t.status, ar)}</span>
                )}
              </div>
              <div className="text-[12px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{t.city || '—'}</span>
                <span style={{ direction: 'ltr' }}>{t.phone}</span>
              </div>
              {t.last_inbound && (
                openMsg === t.id ? (
                  <p
                    onClick={() => setOpenMsg(null)}
                    className="text-sm text-slate-200 mt-1.5 bg-slate-900/50 rounded-lg px-2.5 py-1.5 whitespace-pre-line break-words cursor-pointer"
                    title={ar ? 'إخفاء' : 'Hide'}
                  >💬 {t.last_inbound}</p>
                ) : (
                  <button
                    onClick={() => setOpenMsg(t.id)}
                    className="text-[12px] text-fuchsia-300 hover:text-fuchsia-200 mt-1.5 flex items-center gap-1"
                  ><MessageCircle className="w-3 h-3" /> {ar ? 'عرض الرسالة' : 'Show message'}</button>
                )
              )}
            </div>
            <div className="flex flex-col items-stretch gap-1.5 flex-shrink-0 w-[160px]">
              <button
                onClick={() => openChat(t)}
                className="relative flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-4 py-3 text-sm"
                title={ar ? 'محادثة من داخل النظام (رقم الأعمال)' : 'Chat in-system'}
              >
                <MessageCircle className="w-5 h-5" /> {ar ? 'محادثة' : 'Chat'}
                {t.unread_count > 0 && (
                  <span className="absolute bg-rose-600 border-2 border-slate-950 text-white text-[10px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1" style={{ [ar ? 'right' : 'left']: '-8px', top: '-8px' }}>{t.unread_count}</span>
                )}
              </button>

              {followId === t.id ? (
                <div className="flex flex-col gap-1.5 bg-slate-800/60 rounded-xl p-2">
                  <input type="date" value={followDate} onChange={(e) => setFollowDate(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white" />
                  <div className="flex gap-1.5">
                    <button onClick={() => { if (!followDate) return; outcome(t, { status: 'contacted', follow_up: followDate, visit_result: 'متابعة لاحقة' }, ar ? 'حُدّد موعد المتابعة' : 'Follow-up set'); setFollowId(null); setFollowDate(''); }} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-1.5 text-xs">{ar ? 'تأكيد' : 'OK'}</button>
                    <button onClick={() => { setFollowId(null); setFollowDate(''); }} className="text-slate-400 px-2 text-xs">✕</button>
                  </div>
                </div>
              ) : (
                <select
                  value=""
                  onChange={(e) => { const v = e.target.value; if (v) pickOutcome(t, v); e.target.value = ''; }}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                  title={ar ? 'تسجيل نتيجة المتابعة' : 'Set outcome'}
                >
                  <option value="">📋 {ar ? 'تسجيل النتيجة' : 'Set outcome'}</option>
                  <option value="interested">🟢 {ar ? 'مهتمة' : 'Interested'}</option>
                  <option value="not">🔴 {ar ? 'غير مهتمة' : 'Not interested'}</option>
                  <option value="follow">🟡 {ar ? 'متابعة لاحقة' : 'Follow up'}</option>
                  <option value="sub">✅ {ar ? 'اشتركت' : 'Subscribed'}</option>
                </select>
              )}

              <a
                href={`https://wa.me/${waNumber(t.phone)}`} target="_blank" rel="noreferrer"
                onClick={() => onWhatsApp && onWhatsApp(t)}
                className="text-[11px] text-center text-slate-400 hover:text-emerald-300"
                title={ar ? 'أو من جوالك الشخصي' : 'or from your phone'}
              >{ar ? 'أو واتساب جوالي' : 'my WhatsApp'}</a>
            </div>
          </div>
        </div>
      ))}

      {chatSalon && (
        <ChatModal
          salon={chatSalon} me={me} ar={ar} showToast={showToast} templates={templates}
          onClose={() => { setChatSalon(null); load(false); }}
          onSent={() => load(false)}
        />
      )}
    </div>
  );
}

// نافذة المحادثة داخل النظام — تعرض الخيط وترسل رداً حرّاً عبر رقم الأعمال (٢٤ ساعة).
function ChatModal({ salon, me, ar, showToast, onClose, onSent, templates }) {
  const [data, setData] = useState(null);      // { messages, window_open, last_inbound_at }
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  // الردود السريعة تُحسب فوراً من القوالب المحمّلة مسبقاً (بلا انتظار شبكة).
  const quick = (templates || []).slice(0, 4).map((t) => (t.body || '').replace(/\{me\}/g, me?.name || ''));

  const load = useCallback(() => {
    salesApi.waThread(salon.id).then(setData).catch((e) => showToast(e.message, 'err'));
  }, [salon.id, showToast]);
  useEffect(() => { load(); const iv = setInterval(load, 15000); return () => clearInterval(iv); }, [load]);

  const send = async (body) => {
    const msg = String(body ?? text).trim();
    if (!msg) return;
    setSending(true);
    try {
      await salesApi.waSendMessage(salon.id, msg);
      setText('');
      await load();
      onSent && onSent();
    } catch (e) { showToast(e.message, 'err'); } finally { setSending(false); }
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
        {/* الترويسة */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
          <div className="min-w-0">
            <div className="font-bold text-white truncate">{salon.name || (ar ? 'بدون اسم' : 'Unnamed')}</div>
            <div className="text-[11px] text-slate-400" style={{ direction: 'ltr' }}>{salon.phone}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* الرسائل */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-950/40">
          {!data ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
          ) : data.messages.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">{ar ? 'لا رسائل بعد.' : 'No messages yet.'}</div>
          ) : data.messages.map((m, i) => (
            <div key={i} className={`flex ${m.dir === 'out' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line break-words ${m.dir === 'out' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-100'}`}>
                {m.body || (m.type ? `[${m.type}]` : '')}
                <div className={`text-[10px] mt-1 ${m.dir === 'out' ? 'text-emerald-100/70' : 'text-slate-400'}`}>{fmt(m.ts)}{m.dir === 'out' && m.by ? ` · ${m.by}` : ''}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ردود سريعة + الإدخال */}
        <div className="border-t border-slate-700 p-2.5 flex-shrink-0 space-y-2">
          {open === false ? (
            <div className="text-[12px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
              {ar ? '⏳ انتهت نافذة الـ٢٤ ساعة (لم تردّ العميلة خلالها). لإرسال جديد استخدم حملة بقالب معتمد.' : '24h window closed — use an approved template campaign.'}
            </div>
          ) : (
            <>
              {quick.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {quick.map((q, i) => (
                    <button key={i} onClick={() => setText(q)} className="flex-shrink-0 text-[11px] bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-full px-2.5 py-1 max-w-[180px] truncate" title={q}>{q}</button>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  value={text} onChange={(e) => setText(e.target.value)} rows={1}
                  placeholder={ar ? 'اكتبي رداً…' : 'Type a reply…'}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500 resize-none max-h-28"
                />
                <button onClick={() => send()} disabled={sending || !text.trim()} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl px-4 py-2.5 flex-shrink-0">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : (ar ? 'إرسال' : 'Send')}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 text-center">{ar ? 'تُرسل من رقم هوفيرا للأعمال · اضغطي ردّاً سريعاً لتعبئته' : 'Sent from Hovera business number'}</p>
            </>
          )}
        </div>
      </div>
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

// بطاقة فئة قابلة للضغط للمندوبة — تبدّل قائمة العرض (مهامي/مهتمين/مشتركين).
function RepCard({ icon: Icon, label, value, accent, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border p-3.5 text-start transition ${active ? 'border-fuchsia-500/60 bg-fuchsia-500/10 ring-1 ring-fuchsia-500/40' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={`text-[26px] leading-none font-extrabold ${accent}`}>{value}</div>
          <div className="text-[11px] text-slate-300 mt-2 truncate">{label}</div>
        </div>
        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
          <Icon className={`w-[18px] h-[18px] ${accent}`} />
        </div>
      </div>
    </button>
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

function SalonRow({ salon, me, ar, onUpdate, onWhatsApp, onLog, onContact, onDelete }) {
  const ownedByMe = salon.owner_id && salon.owner_id === me.id;
  const owner = salon.owner_name;
  const wa = waNumber(salon.phone);
  const fuState = followUpState(salon.follow_up);
  const fuFlag = fuState === 'overdue' || fuState === 'due';
  // تحذير ناعم: لو الصالون تحت متابعة مندوب آخر، نطلب تأكيداً قبل التواصل (لا يمنع).
  const ownedByOther = !!salon.owner_id && !ownedByMe;
  const confirmContact = () => !ownedByOther || window.confirm(
    ar ? `هذا الصالون يتابعه «${owner || 'مندوب آخر'}». متأكد تبين تكمّل التواصل معه؟`
       : `This salon is already being followed by "${owner || 'another agent'}". Continue contacting?`
  );
  const mapUrl = salon.lat != null && salon.lng != null
    ? `https://www.google.com/maps/search/?api=1&query=${salon.lat},${salon.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([salon.name, salon.district, salon.city].filter(Boolean).join(' '))}`;

  return (
    <div className="group flex items-center gap-3 px-3 sm:px-4 py-2.5 hover:bg-white/[0.04] transition-colors">
      {/* مؤشّر الحالة (نقطة لونية) */}
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusColor(salon.status)}`} title={statusLabel(salon.status, ar)} />

      {/* الاسم + المدينة + الحالة */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-white text-sm truncate">{salon.name || (ar ? 'بدون اسم' : 'Unnamed')}</span>
          {fuFlag && (
            <CalendarClock
              className={`w-3.5 h-3.5 flex-shrink-0 ${fuState === 'overdue' ? 'text-rose-400' : 'text-amber-400'}`}
              title={fuState === 'overdue' ? (ar ? `متابعة متأخّرة · ${shortDate(salon.follow_up, ar)}` : 'overdue') : (ar ? 'متابعة اليوم' : 'due today')}
            />
          )}
          {Array.isArray(salon.tags) && salon.tags.includes('حملة ميتا') && (
            <span
              className="inline-flex items-center gap-0.5 flex-shrink-0 text-[10px] rounded-full px-1.5 py-0.5 bg-sky-500/15 border border-sky-500/30 text-sky-300"
              title={ar ? 'تواصل عبر حملة ميتا' : 'Contacted via Meta campaign'}
            >
              <Megaphone className="w-2.5 h-2.5" />{ar ? 'حملة ميتا' : 'Meta'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 truncate">
          <span className="flex items-center gap-0.5 flex-shrink-0"><MapPin className="w-3 h-3 text-slate-500" />{salon.city || (ar ? 'بدون مدينة' : '—')}</span>
          <span className="text-slate-600">·</span>
          <span className="truncate">{statusLabel(salon.status, ar)}</span>
        </div>
      </div>

      {/* المندوبة / متاح */}
      {owner ? (
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] rounded-full ps-0.5 pe-2 sm:pe-2.5 py-0.5 flex-shrink-0 ${ownedByMe ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-white/5 border border-white/10 text-slate-300'}`}
          title={owner}
        >
          <span className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
            {(owner || '?').trim().charAt(0)}
          </span>
          <span className="hidden sm:inline max-w-[7rem] truncate">{owner}</span>
        </span>
      ) : (
        <span className="inline-flex items-center text-[11px] font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2.5 py-0.5 flex-shrink-0">
          {ar ? 'متاح' : 'Available'}
        </span>
      )}

      {/* الإجراءات */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <ActionBtn onClick={() => { if (confirmContact()) onWhatsApp(); }} icon={MessageCircle} label={ar ? 'واتساب' : 'WhatsApp'} color="hover:bg-green-500/15 hover:text-green-300" disabled={!wa} />
        <ActionBtn href={salon.phone ? `tel:${salon.phone}` : undefined} onClick={(e) => { if (!confirmContact()) { e?.preventDefault?.(); return; } onContact?.('call'); }} icon={Phone} label={ar ? 'اتصال' : 'Call'} color="hover:bg-blue-500/15 hover:text-blue-300" />
        <ActionBtn onClick={onUpdate} icon={RefreshCw} label={ar ? 'تحديث' : 'Update'} color="hover:bg-indigo-500/15 hover:text-indigo-300" />
        <ActionBtn href={mapUrl} icon={MapPin} label={ar ? 'خريطة' : 'Map'} color="hover:bg-rose-500/15 hover:text-rose-300" external className="hidden sm:flex" />
        <ActionBtn onClick={onLog} icon={History} label={ar ? 'السجل' : 'Log'} color="hover:bg-slate-700 hover:text-white" className="hidden sm:flex" />
        {onDelete && <ActionBtn onClick={onDelete} icon={Trash2} label={ar ? 'حذف' : 'Delete'} color="hover:bg-rose-500/20 hover:text-rose-400" />}
      </div>
    </div>
  );
}

function ActionBtn({ href, onClick, icon: Icon, label, color, external, disabled, className = '' }) {
  const cls = `flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 transition ${disabled ? 'opacity-30 cursor-not-allowed' : color} ${className}`;
  if (href && !disabled) {
    return (
      <a href={href} onClick={onClick} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} className={cls} title={label} aria-label={label}>
        <Icon className="w-4 h-4" />
      </a>
    );
  }
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} className={cls} title={label} aria-label={label}>
      <Icon className="w-4 h-4" />
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

function WhatsAppModal({ salon, me, ar, templates, onContact, onClose }) {
  const wa = waNumber(salon.phone);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const fill = (body) => (body || '').replaceAll('{me}', me.name || '');
  // نص الرسالة + رابط الملف المرفق (إن وُجد) — العميلة تضغط الرابط لتشاهده.
  const buildText = (tpl) => fill(tpl.body) + (tpl.file_url ? `\n${origin}${tpl.file_url}` : '');
  // رابط واتساب الرسمي (wa.me) كرابط <a> يُضغط مباشرة (يفتح التطبيق فوراً على iOS).
  const waUrl = (tpl) => {
    const text = tpl ? buildText(tpl) : '';
    return `https://wa.me/${wa}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
  };

  // مشاركة الملف نفسه عبر لوحة مشاركة الجوال (إرفاق فعلي داخل واتساب).
  const shareFile = async (tpl) => {
    try {
      const res = await fetch(tpl.file_url);
      const blob = await res.blob();
      const file = new File([blob], tpl.file_name || 'file', { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: fill(tpl.body) });
      } else {
        window.open(tpl.file_url, '_blank');
      }
    } catch {
      window.open(tpl.file_url, '_blank');
    }
  };

  return (
    <ModalShell ar={ar} title={`${ar ? 'واتساب' : 'WhatsApp'}: ${salon.name || (ar ? 'عميل' : 'client')}`} onClose={onClose}>
      {templates.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-6">{ar ? 'لا توجد قوالب جاهزة بعد.' : 'No ready templates yet.'}</p>
      ) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {templates.map((tpl) => (
            <div key={tpl.id} className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              <a
                href={waUrl(tpl)}
                onClick={() => { onContact?.(); onClose(); }}
                className={`block p-3 text-sm text-slate-200 hover:bg-green-900/40 transition ${ar ? 'text-right' : 'text-left'}`}
              >
                {fill(tpl.body)}
                {tpl.file_url && (
                  <span className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400">
                    {tpl.file_type === 'image' ? <ImageIcon className="w-3.5 h-3.5 text-emerald-400" /> : tpl.file_type === 'html' ? <FileText className="w-3.5 h-3.5 text-sky-400" /> : <FileText className="w-3.5 h-3.5 text-rose-400" />}
                    {ar ? 'مرفق: ' : 'attachment: '}{tpl.file_name}
                  </span>
                )}
              </a>
              {tpl.file_url && (
                <button
                  onClick={() => { onContact?.(); shareFile(tpl); }}
                  className="w-full flex items-center justify-center gap-1.5 text-[12px] py-1.5 bg-slate-900/60 hover:bg-green-900/40 text-slate-300 border-t border-slate-700 transition"
                >
                  <Paperclip className="w-3.5 h-3.5" /> {ar ? 'إرسال الملف نفسه (إرفاق)' : 'Send the file itself (attach)'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <a
        href={waUrl(null)}
        onClick={() => { onContact?.(); onClose(); }}
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

function AddSalonModal({ ar, onClose, onAdded, onError }) {
  const [form, setForm] = useState({ name: '', phone: '', city: '', district: '', type: 'opportunity', note: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) return onError(ar ? 'اسم الصالون مطلوب' : 'Salon name is required');
    setSaving(true);
    try {
      const salon = await salesApi.addSalon(form);
      onAdded(salon);
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell ar={ar} title={ar ? 'إضافة صالون جديد' : 'Add New Salon'} onClose={onClose}>
      <div className="space-y-3">
        <Field label={ar ? 'اسم الصالون *' : 'Salon name *'}>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder={ar ? 'مثال: صالون لمسة جمال' : 'e.g. Lamset Jamal'} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={ar ? 'الجوال' : 'Phone'}>
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputCls} placeholder="05xxxxxxxx" inputMode="tel" />
          </Field>
          <Field label={ar ? 'النوع' : 'Type'}>
            <select value={form.type} onChange={(e) => set('type', e.target.value)} className={inputCls}>
              <option value="opportunity">{ar ? 'فرصة' : 'Opportunity'}</option>
              <option value="booking_platform">{ar ? 'منصة حجز' : 'Booking Platform'}</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={ar ? 'المدينة' : 'City'}>
            <input value={form.city} onChange={(e) => set('city', e.target.value)} className={inputCls} placeholder={ar ? 'مثال: الرياض' : 'e.g. Riyadh'} />
          </Field>
          <Field label={ar ? 'الحي' : 'District'}>
            <input value={form.district} onChange={(e) => set('district', e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label={ar ? 'ملاحظة' : 'Note'}>
          <textarea value={form.note} onChange={(e) => set('note', e.target.value)} rows={2} className={inputCls} placeholder={ar ? 'أي ملاحظة أولية…' : 'Any initial note…'} />
        </Field>
      </div>
      <div className="flex gap-2 pt-4">
        <button onClick={save} disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-lg py-2.5 flex items-center justify-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} {ar ? 'إضافة الصالون' : 'Add Salon'}
        </button>
        <button onClick={onClose} className="px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">{ar ? 'إلغاء' : 'Cancel'}</button>
      </div>
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
