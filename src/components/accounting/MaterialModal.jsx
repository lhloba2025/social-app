import React, { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { formatMoney, round2 } from "@/utils/financeUtils";

const UNITS = [
  { key: "مل", ar: "مل", en: "ml" },
  { key: "مللتر", ar: "مللتر", en: "milliliter" },
  { key: "جرام", ar: "جرام", en: "gram" },
  { key: "كجم", ar: "كجم", en: "kg" },
  { key: "قطعة", ar: "قطعة", en: "piece" },
  { key: "متر", ar: "متر", en: "meter" },
  { key: "علبة", ar: "علبة", en: "box" },
];

const emptyForm = () => ({
  name: "",
  unit: "مل",
  mode: "direct", // "direct" = cost per unit, "package" = derive from package
  cost_per_unit: "",
  package_cost: "",
  package_size: "",
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
            unit: initial.unit || "مل",
            mode: "direct",
            cost_per_unit: String(initial.cost_per_unit ?? ""),
            package_cost: "",
            package_size: "",
          }
        : emptyForm()
    );
  }, [isOpen, initial]);

  // Derived unit cost: either the typed value, or packageCost / packageSize.
  const derivedCost = useMemo(() => {
    if (form.mode === "package") {
      const c = Number(form.package_cost) || 0;
      const s = Number(form.package_size) || 0;
      return s > 0 ? round2(c / s) : 0;
    }
    return round2(Number(form.cost_per_unit) || 0);
  }, [form]);

  if (!isOpen) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSave = form.name.trim() && derivedCost >= 0 && !saving &&
    (form.mode === "direct" ? Number(form.cost_per_unit) >= 0
      : Number(form.package_cost) > 0 && Number(form.package_size) > 0);

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name: form.name.trim(),
      unit: form.unit.trim() || "وحدة",
      cost_per_unit: derivedCost,
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
          <div>
            <label className={labelCls}>{ar ? "اسم المادة" : "Material Name"}</label>
            <input
              className={inputCls}
              value={form.name}
              placeholder={ar ? "مثال: صبغة شعر" : "e.g. Hair dye"}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div>
            <label className={labelCls}>{ar ? "وحدة القياس" : "Unit"}</label>
            <input
              className={inputCls}
              value={form.unit}
              list="material-units"
              placeholder={ar ? "مثال: مل" : "e.g. ml"}
              onChange={(e) => set("unit", e.target.value)}
            />
            <datalist id="material-units">
              {UNITS.map((u) => (
                <option key={u.key} value={ar ? u.ar : u.en} />
              ))}
            </datalist>
          </div>

          {/* Mode toggle: enter cost per unit directly, OR derive from a package. */}
          <div className="flex gap-2 bg-gray-50 rounded-xl p-1">
            <button
              type="button"
              onClick={() => set("mode", "direct")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                form.mode === "direct" ? "bg-white text-indigo-600 shadow" : "text-gray-500"
              }`}
            >
              {ar ? "تكلفة الوحدة مباشرة" : "Cost per unit"}
            </button>
            <button
              type="button"
              onClick={() => set("mode", "package")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                form.mode === "package" ? "bg-white text-indigo-600 shadow" : "text-gray-500"
              }`}
            >
              {ar ? "من سعر العبوة" : "From package"}
            </button>
          </div>

          {form.mode === "direct" ? (
            <div>
              <label className={labelCls}>
                {ar ? `تكلفة الوحدة (لكل ${form.unit || "وحدة"})` : `Cost per ${form.unit || "unit"}`}
              </label>
              <input
                type="number"
                min="0"
                step="0.0001"
                className={inputCls}
                value={form.cost_per_unit}
                placeholder="0.00"
                onChange={(e) => set("cost_per_unit", e.target.value)}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{ar ? "سعر العبوة" : "Package cost"}</label>
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
                  {ar ? `حجم العبوة (${form.unit || "وحدة"})` : `Package size (${form.unit || "unit"})`}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  className={inputCls}
                  value={form.package_size}
                  placeholder="0"
                  onChange={(e) => set("package_size", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Live derived unit cost preview */}
          <div className="flex items-center justify-between rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3">
            <span className="text-xs font-bold text-indigo-700">
              {ar ? `التكلفة لكل ${form.unit || "وحدة"}` : `Cost per ${form.unit || "unit"}`}
            </span>
            <span className="font-extrabold text-indigo-700">{formatMoney(derivedCost, ar)}</span>
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
