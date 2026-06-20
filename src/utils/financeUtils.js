// ── Saudi salon accounting helpers (أدوات المحاسبة) ───────────────────────────
// Centralises VAT logic, currency formatting and the category/payment lookups so
// every accounting screen stays consistent and compliant with KSA rules.

// ضريبة القيمة المضافة في السعودية = 15%
export const VAT_RATE = 15;

export const CURRENCY = "SAR";

// ── Money formatting ─────────────────────────────────────────────────────────
export function formatMoney(value, ar = true) {
  const n = Number(value) || 0;
  const s = n.toLocaleString(ar ? "ar-SA" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return ar ? `${s} ر.س` : `${s} SAR`;
}

// ── VAT calculation ──────────────────────────────────────────────────────────
// Given a number the user typed and whether they said it already INCLUDES VAT,
// return { net, vat, total } so we always store all three explicitly.
export function computeVat(amount, { vatIncluded = false, vatRate = VAT_RATE } = {}) {
  const a = Number(amount) || 0;
  const r = Number(vatRate) || 0;
  if (r <= 0) return { net: round2(a), vat: 0, total: round2(a) };
  if (vatIncluded) {
    const net = a / (1 + r / 100);
    const vat = a - net;
    return { net: round2(net), vat: round2(vat), total: round2(a) };
  }
  const vat = a * (r / 100);
  return { net: round2(a), vat: round2(vat), total: round2(a + vat) };
}

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// ── Categories ───────────────────────────────────────────────────────────────
// Income = salon services & products. Expense = typical salon running costs.
export const INCOME_CATEGORIES = [
  { key: "services_hair", ar: "خدمات الشعر", en: "Hair Services" },
  { key: "services_skin", ar: "العناية بالبشرة", en: "Skincare" },
  { key: "services_makeup", ar: "المكياج", en: "Makeup" },
  { key: "services_nails", ar: "الأظافر", en: "Nails" },
  { key: "services_laser", ar: "الليزر والتجميل", en: "Laser & Beauty" },
  { key: "packages", ar: "الباقات والاشتراكات", en: "Packages" },
  { key: "products", ar: "بيع المنتجات", en: "Product Sales" },
  { key: "other_income", ar: "إيرادات أخرى", en: "Other Income" },
];

export const EXPENSE_CATEGORIES = [
  { key: "rent", ar: "الإيجار", en: "Rent" },
  { key: "salaries", ar: "الرواتب", en: "Salaries" },
  { key: "commissions", ar: "العمولات", en: "Commissions" },
  { key: "supplies", ar: "المستلزمات والمواد", en: "Supplies & Materials" },
  { key: "utilities", ar: "كهرباء وماء", en: "Utilities" },
  { key: "marketing", ar: "التسويق والإعلان", en: "Marketing" },
  { key: "maintenance", ar: "الصيانة", en: "Maintenance" },
  { key: "licenses", ar: "الرخص والاشتراكات", en: "Licenses & Subscriptions" },
  { key: "other_expense", ar: "مصروفات أخرى", en: "Other Expenses" },
];

export const PAYMENT_METHODS = [
  { key: "cash", ar: "نقد", en: "Cash" },
  { key: "mada", ar: "مدى", en: "Mada" },
  { key: "transfer", ar: "تحويل بنكي", en: "Bank Transfer" },
  { key: "applepay", ar: "Apple Pay", en: "Apple Pay" },
  { key: "visa", ar: "فيزا / ماستر", en: "Visa / Master" },
  { key: "credit", ar: "آجل", en: "Credit / Due" },
];

// ── Lookups ──────────────────────────────────────────────────────────────────
export function categoryLabel(key, type, ar = true) {
  const list = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const found = list.find((c) => c.key === key);
  return found ? (ar ? found.ar : found.en) : key || "—";
}

export function paymentLabel(key, ar = true) {
  const found = PAYMENT_METHODS.find((p) => p.key === key);
  return found ? (ar ? found.ar : found.en) : key || "—";
}

export function categoriesFor(type) {
  return type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
}

// ── Aggregation for reports ──────────────────────────────────────────────────
// Returns the core KSA accounting figures from a list of transactions.
export function summarize(transactions = []) {
  let income = 0, expense = 0, outputVat = 0, inputVat = 0;
  for (const t of transactions) {
    const net = Number(t.amount) || 0;
    const vat = Number(t.vat_amount) || 0;
    if (t.type === "expense") {
      expense += net;
      inputVat += vat;
    } else {
      income += net;
      outputVat += vat;
    }
  }
  return {
    income: round2(income),                 // إجمالي الإيرادات (صافي)
    expense: round2(expense),               // إجمالي المصروفات (صافي)
    netProfit: round2(income - expense),    // صافي الربح
    outputVat: round2(outputVat),           // ضريبة المخرجات (محصّلة)
    inputVat: round2(inputVat),             // ضريبة المدخلات (مدفوعة)
    vatDue: round2(outputVat - inputVat),   // صافي الضريبة المستحقة للهيئة
  };
}

// Filter helper: keep transactions whose txn_date is within [from, to] (inclusive)
export function inRange(t, from, to) {
  const d = (t.txn_date || t.created_date || "").slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

// Today as YYYY-MM-DD (local)
export function todayStr() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

// First day of current month
export function monthStartStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// Current calendar quarter as { from, to } (YYYY-MM-DD strings). Used as the
// default period for the VAT return report (الإقرار الضريبي).
export function quarterRange() {
  const d = new Date();
  const q = Math.floor(d.getMonth() / 3);          // 0..3
  const startMonth = q * 3;                          // 0,3,6,9
  const from = `${d.getFullYear()}-${String(startMonth + 1).padStart(2, "0")}-01`;
  const end = new Date(d.getFullYear(), startMonth + 3, 0); // last day of quarter
  const to = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  return { from, to };
}
