import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { INCOME_CATEGORIES } from "@/utils/financeUtils";

const emptyForm = () => ({
  name: "",
  price: "",
  vat_included: false,
  category: "service",
  active: true,
});

export default function ServiceModal({
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
            price: String(initial.price ?? ""),
            vat_included: initial.vat_included === true || initial.vat_included === 1,
            category: initial.category || "service",
            active: initial.active !== false,
          }
        : emptyForm()
    );
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSave = form.name.trim() && Number(form.price) > 0 && !saving;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name: form.name.trim(),
      price: Number(form.price) || 0,
      vat_included: form.vat_included,
      category: form.category || "service",
      active: form.active,
    });
  };

  const labelCls = "block text-xs font-bold text-gray-600 mb-1.5";
  const inputCls =
    "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition";

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
        dir={ar ? "rtl" : "ltr"}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-gray-900 font-extrabold text-lg">
            {initial
              ? ar ? "تعديل خدمة" : "Edit Service"
              : ar ? "إضافة خدمة" : "Add Service"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>{ar ? "اسم الخدمة" : "Service Name"}</label>
            <input
              className={inputCls}
              value={form.name}
              placeholder={ar ? "مثال: صبغة شعر" : "e.g. Hair color"}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{ar ? "السعر (ر.س)" : "Price (SAR)"}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                value={form.price}
                placeholder="0.00"
                onChange={(e) => set("price", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>{ar ? "التصنيف" : "Category"}</label>
              <select className={inputCls} value={form.category} onChange={(e) => set("category", e.target.value)}>
                {INCOME_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{ar ? c.ar : c.en}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.vat_included}
              onChange={(e) => set("vat_included", e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-600"
            />
            {ar ? "السعر شامل الضريبة" : "Price includes VAT"}
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => set("active", e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-600"
            />
            {ar ? "مُتاحة" : "Active"}
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
