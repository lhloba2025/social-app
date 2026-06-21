import React, { useState, useEffect, useMemo } from "react";
import { X, Package, Scissors } from "lucide-react";
import { formatMoney, round2 } from "@/utils/financeUtils";

// Package types — purely a label staff recognise (no effect on the math).
const PACK_TYPES = [
  { key: "علبة", ar: "علبة", en: "Box" },
  { key: "أنبوب", ar: "أنبوب", en: "Tube" },
  { key: "زجاجة", ar: "زجاجة", en: "Bottle" },
  { key: "كيس", ar: "كيس", en: "Bag" },
  { key: "عبوة", ar: "عبوة", en: "Pack" },
  { key: "قطعة", ar: "قطعة", en: "Piece" },
];

const emptyForm = () => ({
  name: "",
  unit: "علبة",
  package_cost: "",
  services_per_package: "",
});

export default function MaterialModal({
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
            unit: initial.unit || "علبة",
            package_cost: String(initial.package_cost ?? ""),
            services_per_package: String(initial.services_per_package ?? ""),
          }
        : emptyForm()
    );
  }, [isOpen, initial]);

  // The whole point: cost of ONE service = package price ÷ how many services it covers.
  const costPerService = useMemo(() => {
    const c = Number(form.package_cost) || 0;
    const n = Number(form.services_per_package) || 0;
    return n > 0 ? round2(c / n) : 0;
  }, [form]);

  if (!isOpen) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSave =
    form.name.trim() &&
    Number(form.package_cost) > 0 &&
    Number(form.services_per_package) > 0 &&
    !saving;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name: form.name.trim(),
      unit: form.unit.trim() || "علبة",
      package_cost: round2(Number(form.package_cost) || 0),
      services_per_package: Number(form.services_per_package) || 0,
      cost_per_unit: costPerService, // ← what the pricing engine reads, per service
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
              ? ar ? "تعديل مادة" : "Edit Material"
              : ar ? "إضافة مادة" : "Add Material"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className={labelCls}>{ar ? "اسم المادة" : "Material Name"}</label>
            <input
              className={inputCls}
              value={form.name}
              placeholder={ar ? "مثال: صبغة شعر" : "e.g. Hair dye"}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          {/* Package type (cosmetic label) */}
          <div>
            <label className={labelCls}>{ar ? "نوع العبوة" : "Package type"}</label>
            <div className="flex flex-wrap gap-1.5">
              {PACK_TYPES.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => set("unit", p.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                    form.unit === p.key
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  {ar ? p.ar : p.en}
                </button>
              ))}
            </div>
          </div>

          {/* The two simple questions */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>
                <span className="inline-flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" />
                  {ar ? `سعر ${form.unit || "العلبة"} كاملة` : "Package price"}
                </span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                value={form.package_cost}
                placeholder="0.00"
                onChange={(e) => set("package_cost", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>
                <span className="inline-flex items-center gap-1">
                  <Scissors className="w-3.5 h-3.5" />
                  {ar ? "تكفي كم خدمة؟" : "Covers how many services?"}
                </span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                className={inputCls}
                value={form.services_per_package}
                placeholder={ar ? "مثال: 10" : "e.g. 10"}
                onChange={(e) => set("services_per_package", e.target.value)}
              />
            </div>
          </div>

          <p className="text-[11px] text-gray-400 -mt-1">
            {ar
              ? "اكتبي سعر العبوة وكم خدمة تقريبًا تطلع منها — والنظام يحسب تكلفة الخدمة الواحدة."
              : "Enter the package price and how many services it makes — we compute the per-service cost."}
          </p>

          {/* Live result — the per-service cost, big and clear */}
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-l from-indigo-50 to-rose-50 border border-indigo-100 px-4 py-3.5">
            <span className="text-xs font-extrabold text-indigo-700">
              {ar ? "تكلفة الخدمة الواحدة" : "Cost per service"}
            </span>
            <span className="font-black text-xl text-indigo-700">{formatMoney(costPerService, ar)}</span>
          </div>
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
