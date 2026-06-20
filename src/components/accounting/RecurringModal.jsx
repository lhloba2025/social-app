import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  VAT_RATE,
  computeVat,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  formatMoney,
} from "@/utils/financeUtils";

const emptyForm = () => ({
  name: "",
  category: "",
  amount: "",
  vatIncluded: false,
  vat_rate: VAT_RATE,
  payment_method: "cash",
  day_of_month: 1,
  active: true,
});

export default function RecurringModal({
  isOpen,
  onClose,
  onSave,
  initial,
  ar = true,
  saving = false,
}) {
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      initial
        ? {
            name: initial.name || "",
            category: initial.category || "",
            amount: String(initial.amount ?? ""),
            vatIncluded: false,
            vat_rate: initial.vat_rate ?? VAT_RATE,
            payment_method: initial.payment_method || "cash",
            day_of_month: initial.day_of_month ?? 1,
            active: initial.active !== false,
          }
        : emptyForm()
    );
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const { net, vat, total } = computeVat(form.amount, {
    vatIncluded: form.vatIncluded,
    vatRate: form.vat_rate,
  });
  const canSave = form.name.trim() && form.category && Number(form.amount) > 0 && !saving;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name: form.name.trim(),
      category: form.category,
      amount: net,
      vat_rate: Number(form.vat_rate) || 0,
      vat_amount: vat,
      total,
      payment_method: form.payment_method,
      day_of_month: Math.min(28, Math.max(1, Number(form.day_of_month) || 1)),
      active: form.active,
    });
  };

  const labelCls = "block text-xs font-bold text-gray-600 mb-1.5";
  const inputCls =
    "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition";

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        dir={ar ? "rtl" : "ltr"}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-gray-900 font-extrabold text-lg">
            {initial
              ? ar ? "تعديل مصروف متكرّر" : "Edit Recurring Expense"
              : ar ? "إضافة مصروف متكرّر" : "Add Recurring Expense"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <div>
            <label className={labelCls}>{ar ? "الاسم" : "Name"}</label>
            <input
              className={inputCls}
              value={form.name}
              placeholder={ar ? "مثال: إيجار المحل" : "e.g. Shop rent"}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{ar ? "التصنيف" : "Category"}</label>
              <select className={inputCls} value={form.category} onChange={(e) => set("category", e.target.value)}>
                <option value="">{ar ? "اختر..." : "Select..."}</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{ar ? c.ar : c.en}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{ar ? "يوم الاستحقاق من الشهر" : "Day of month"}</label>
              <input
                type="number"
                min="1"
                max="28"
                className={inputCls}
                value={form.day_of_month}
                onChange={(e) => set("day_of_month", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{ar ? "المبلغ (ر.س)" : "Amount (SAR)"}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                value={form.amount}
                placeholder="0.00"
                onChange={(e) => set("amount", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>{ar ? "نسبة الضريبة %" : "VAT %"}</label>
              <input
                type="number"
                min="0"
                step="0.5"
                className={inputCls}
                value={form.vat_rate}
                onChange={(e) => set("vat_rate", e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.vatIncluded}
              onChange={(e) => set("vatIncluded", e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-600"
            />
            {ar ? "المبلغ المُدخل شامل الضريبة" : "Entered amount includes VAT"}
          </label>

          <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[11px] text-gray-500 mb-0.5">{ar ? "الصافي" : "Net"}</p>
              <p className="text-sm font-bold text-gray-800">{formatMoney(net, ar)}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 mb-0.5">{ar ? "الضريبة" : "VAT"}</p>
              <p className="text-sm font-bold text-indigo-600">{formatMoney(vat, ar)}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 mb-0.5">{ar ? "الإجمالي" : "Total"}</p>
              <p className="text-sm font-extrabold text-gray-900">{formatMoney(total, ar)}</p>
            </div>
          </div>

          <div>
            <label className={labelCls}>{ar ? "طريقة الدفع" : "Payment Method"}</label>
            <select className={inputCls} value={form.payment_method} onChange={(e) => set("payment_method", e.target.value)}>
              {PAYMENT_METHODS.map((p) => (
                <option key={p.key} value={p.key}>{ar ? p.ar : p.en}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => set("active", e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-600"
            />
            {ar ? "مُفعّل (يُسجَّل تلقائياً كل شهر)" : "Active (auto-posted monthly)"}
          </label>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50">
            {ar ? "إلغاء" : "Cancel"}
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (ar ? "جارٍ الحفظ..." : "Saving...") : ar ? "حفظ" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
