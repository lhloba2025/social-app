// ثوابت مشتركة لبوابة فريق المبيعات «هوفيرا» — كل النصوص بالعربي.

export const STATUS_OPTIONS = [
  { value: 'new',             label: 'جديد',         color: 'bg-slate-600' },
  { value: 'contacted',       label: 'تم التواصل',   color: 'bg-blue-600' },
  { value: 'no_answer',       label: 'لا يرد',        color: 'bg-amber-600' },
  { value: 'interested',      label: 'مهتم',          color: 'bg-emerald-600' },
  { value: 'not_interested',  label: 'غير مهتم',      color: 'bg-rose-600' },
  { value: 'scheduled_visit', label: 'موعد زيارة',    color: 'bg-purple-600' },
  { value: 'subscribed',      label: 'مشترك',         color: 'bg-green-700' },
];

export const PRIORITY_OPTIONS = [
  { value: 'low',    label: 'منخفضة' },
  { value: 'normal', label: 'عادية' },
  { value: 'high',   label: 'عالية' },
];

export const TYPE_OPTIONS = [
  { value: 'booking_platform', label: 'منصة حجز' },
  { value: 'opportunity',      label: 'فرصة' },
];

export const SORT_OPTIONS = [
  { value: '-updated_date',  label: 'الأحدث تحديثاً' },
  { value: '-rating',        label: 'التقييم' },
  { value: '-reviews_count', label: 'عدد المراجعات' },
  { value: 'name',           label: 'الاسم' },
];

export const ROLE_LABELS = {
  super_admin: 'سوبر أدمن',
  admin: 'مدير',
  agent: 'عضو فريق',
};

export function statusLabel(value) {
  return STATUS_OPTIONS.find((s) => s.value === value)?.label || 'جديد';
}

export function statusColor(value) {
  return STATUS_OPTIONS.find((s) => s.value === value)?.color || 'bg-slate-600';
}

export function typeLabel(value) {
  return TYPE_OPTIONS.find((t) => t.value === value)?.label || 'فرصة';
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

// تاريخ مختصر بالعربي.
export function shortDate(value) {
  if (!value) return '';
  try {
    const d = new Date(value.replace(' ', 'T'));
    return d.toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return String(value).split(/[ T]/)[0];
  }
}
