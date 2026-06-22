// ثوابت مشتركة لبوابة فريق المبيعات «هوفيرا» — ثنائية اللغة (عربي/إنجليزي).

export const STATUS_OPTIONS = [
  { value: 'new',             ar: 'جديد',         en: 'New',            color: 'bg-slate-600' },
  { value: 'contacted',       ar: 'تم التواصل',   en: 'Contacted',      color: 'bg-blue-600' },
  { value: 'no_answer',       ar: 'لا يرد',        en: 'No Answer',      color: 'bg-amber-600' },
  { value: 'interested',      ar: 'مهتم',          en: 'Interested',     color: 'bg-emerald-600' },
  { value: 'not_interested',  ar: 'غير مهتم',      en: 'Not Interested', color: 'bg-rose-600' },
  { value: 'scheduled_visit', ar: 'موعد زيارة',    en: 'Visit Scheduled',color: 'bg-purple-600' },
  { value: 'subscribed',      ar: 'مشترك',         en: 'Subscribed',     color: 'bg-green-700' },
];

export const PRIORITY_OPTIONS = [
  { value: 'low',    ar: 'منخفضة', en: 'Low' },
  { value: 'normal', ar: 'عادية',  en: 'Normal' },
  { value: 'high',   ar: 'عالية',  en: 'High' },
];

export const TYPE_OPTIONS = [
  { value: 'booking_platform', ar: 'منصة حجز', en: 'Booking Platform' },
  { value: 'opportunity',      ar: 'فرصة',     en: 'Opportunity' },
];

export const SORT_OPTIONS = [
  { value: '-updated_date',  ar: 'الأحدث تحديثاً', en: 'Recently Updated' },
  { value: '-rating',        ar: 'التقييم',        en: 'Rating' },
  { value: '-reviews_count', ar: 'عدد المراجعات',  en: 'Reviews Count' },
  { value: 'name',           ar: 'الاسم',          en: 'Name' },
];

const ROLE_LABELS = {
  super_admin: { ar: 'سوبر أدمن', en: 'Super Admin' },
  admin:       { ar: 'مدير',       en: 'Admin' },
  agent:       { ar: 'عضو فريق',   en: 'Sales Agent' },
};

// مُترجِم بسيط: t(ar, 'عربي', 'English')
export function t(ar, arText, enText) {
  return ar ? arText : enText;
}

function pickLabel(list, value, ar, fallbackAr, fallbackEn) {
  const found = list.find((o) => o.value === value);
  if (!found) return ar ? (fallbackAr ?? value) : (fallbackEn ?? value);
  return ar ? found.ar : found.en;
}

export function statusLabel(value, ar = true) {
  return pickLabel(STATUS_OPTIONS, value || 'new', ar, 'جديد', 'New');
}

export function statusColor(value) {
  return STATUS_OPTIONS.find((s) => s.value === value)?.color || 'bg-slate-600';
}

export function typeLabel(value, ar = true) {
  return pickLabel(TYPE_OPTIONS, value, ar, 'فرصة', 'Opportunity');
}

export function priorityLabel(value, ar = true) {
  return pickLabel(PRIORITY_OPTIONS, value, ar, 'عادية', 'Normal');
}

export function roleLabel(role, ar = true) {
  const r = ROLE_LABELS[role];
  return r ? (ar ? r.ar : r.en) : role;
}

// خيارات مترجمة جاهزة لقوائم <select> حسب اللغة.
export function localizedOptions(list, ar) {
  return list.map((o) => ({ value: o.value, label: ar ? o.ar : o.en }));
}

// تنسيق رقم الجوال لرابط واتساب (يفترض السعودية كافتراضي).
export function waNumber(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = '966' + d.slice(1);
  else if (d.startsWith('5') && d.length === 9) d = '966' + d;
  return d;
}

// تاريخ مختصر حسب اللغة.
export function shortDate(value, ar = true) {
  if (!value) return '';
  try {
    const d = new Date(String(value).replace(' ', 'T'));
    return d.toLocaleDateString(ar ? 'ar' : 'en', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return String(value).split(/[ T]/)[0];
  }
}
