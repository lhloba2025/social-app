import React, { useState, useEffect } from "react";
import { X, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import {
  VAT_RATE,
  computeVat,
  categoriesFor,
  PAYMENT_METHODS,
  formatMoney,
  todayStr,
} from "@/utils/financeUtils";

const emptyForm = () => ({
  type: "income",
  category: "",
  description: "",
  amount: "",
  vatIncluded: false,
  vat_rate: VAT_RATE,
  payment_method: "cash",
  ref_no: "",
  employee_id: "",
  txn_date: todayStr(),
  notes: "",
});

export default function TransactionModal({
  isOpen,
  onClose,
  onSave,
  initial,
  employees = [],
  services = [],
  ar = true,
  saving = false,
}) {
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    if (!isOpen) return;
    if (initial) {
      // Re-derive vatIncluded=false editing model from stored net amount.
      setForm({
        type: initial.type || "income",
        category: initial.category || "",
        description: initial.description || "",
        amount: String(initial.amount ?? ""),
        vatIncluded: false,
        vat_rate: initial.vat_rate ?? VAT_RATE,
        payment_method: initial.payment_method || "cash",
        ref_no: initial.ref_no || "",
        employee_id: initial.employee_id || "",
        txn_date: (initial.txn_date || todayStr()).slice(0, 10),
        notes: initial.notes || "",
      });
    } else {
      setForm(emptyForm());
    }
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isExpense = form.type === "expense";

  // Picking a service from the catalog auto-fills the income fields. The user
  // can still edit everything afterwards; choosing "بدون" clears nothing.
  const pickService = (id) => {
    const s = services.find((x) => String(x.id) === String(id));
    if (!s) return;
    setForm((f) => ({
      ...f,
      description: f.description || s.name || "",
      amount: String(s.price ?? ""),
      vatIncluded: s.vat_included === true || s.vat_included === 1,
      category: s.category || "service",
    }));
  };
  const { net, vat, total } = computeVat(form.amount, {
    vatIncluded: form.vatIncluded,
    vatRate: form.vat_rate,
  });

  const canSave = form.category && Number(form.amount) > 0 && !saving;

  const handleSave = () => {
    if (!canSave) return;
    const emp = employees.find((e) => e.id === form.employee_id);
    onSave({
      type: form.type,
      category: form.category,
      description: form.description.trim(),
      amount: net,
      vat_rate: Number(form.vat_rate) || 0,
      vat_amount: vat,
      total,
      payment_method: form.payment_method,
      ref_no: form.ref_no.trim(),
      employee_id: form.employee_id || "",
      employee_name: emp ? emp.name : "",
      txn_date: form.txn_date,
      notes: form.notes.trim(),
    });
  };

  const labelCls = "block text-xs font-bold text-gray-600 mb-1.5";
  const inputCls =
    "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition";

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        dir={ar ? "rtl" : "ltr"}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-gray-900 font-extrabold text-lg">
            {initial
              ? ar ? "تعديل حركة" : "Edit Transaction"
              : ar ? "إضافة حركة مالية" : "Add Transaction"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => set("type", "income") || set("category", "")}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border transition ${
                !isExpense
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                  : "bg-white border-gray-200 text-gray-500"
              }`}
            >
              <ArrowDownCircle className="w-4 h-4" />
              {ar ? "إيراد" : "Income"}
            </button>
            <button
              type="button"
              onClick={() => set("type", "expense") || set("category", "")}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border transition ${
                isExpense
                  ? "bg-rose-50 border-rose-300 text-rose-700"
                  : "bg-white border-gray-200 text-gray-500"
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" />
              {ar ? "مصروف" : "Expense"}
            </button>
          </div>

          {/* Service picker (income only) — auto-fills price, VAT, category */}
          {!isExpense && services.filter((s) => s.active !== false).length > 0 && (
            <div>
              <label className={labelCls}>{ar ? "اختر خدمة (اختياري)" : "Pick a service (optional)"}</label>
              <select
                className={inputCls}
                defaultValue=""
                onChange={(e) => { pickService(e.target.value); e.target.value = ""; }}
              >
                <option value="">{ar ? "— تعبئة سريعة من الخدمات —" : "— Quick fill from services —"}</option>
                {services
                  .filter((s) => s.active !== false)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {Number(s.price) || 0}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Category + date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{ar ? "التصنيف" : "Category"}</label>
              <select
                className={inputCls}
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
              >
                <option value="">{ar ? "اختر..." : "Select..."}</option>
                {categoriesFor(form.type).map((c) => (
                  <option key={c.key} value={c.key}>
                    {ar ? c.ar : c.en}
                  </option>
                ))}
                {/* A service may carry a category not in the standard list. */}
                {form.category &&
                  !categoriesFor(form.type).some((c) => c.key === form.category) && (
                    <option value={form.category}>
                      {form.category === "service" ? (ar ? "خدمة" : "Service") : form.category}
                    </option>
                  )}
              </select>
            </div>
            <div>
              <label className={labelCls}>{ar ? "التاريخ" : "Date"}</label>
              <input
                type="date"
                className={inputCls}
                value={form.txn_date}
                onChange={(e) => set("txn_date", e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>{ar ? "الوصف" : "Description"}</label>
            <input
              className={inputCls}
              value={form.description}
              placeholder={ar ? "مثال: صبغة شعر للعميلة نورة" : "e.g. Hair color for client"}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          {/* Amount + VAT included */}
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

          {/* VAT live preview */}
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

          {/* Payment + ref */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{ar ? "طريقة الدفع" : "Payment Method"}</label>
              <select
                className={inputCls}
                value={form.payment_method}
                onChange={(e) => set("payment_method", e.target.value)}
              >
                {PAYMENT_METHODS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {ar ? p.ar : p.en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>
                {ar ? "رقم الفاتورة / المرجع" : "Invoice / Ref No."}
              </label>
              <input
                className={inputCls}
                value={form.ref_no}
                placeholder={ar ? "اختياري" : "Optional"}
                onChange={(e) => set("ref_no", e.target.value)}
              />
            </div>
          </div>

          {/* Employee (for income → who did it / commissions) */}
          {employees.length > 0 && (
            <div>
              <label className={labelCls}>
                {ar ? "الموظفة (اختياري)" : "Employee (optional)"}
              </label>
              <select
                className={inputCls}
                value={form.employee_id}
                onChange={(e) => set("employee_id", e.target.value)}
              >
                <option value="">{ar ? "بدون" : "None"}</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={labelCls}>{ar ? "ملاحظات" : "Notes"}</label>
            <textarea
              className={inputCls}
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50"
          >
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
