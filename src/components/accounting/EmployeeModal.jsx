import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

const emptyForm = () => ({
  name: "",
  role: "",
  phone: "",
  base_salary: "",
  commission_rate: "",
  active: true,
  notes: "",
});

export default function EmployeeModal({
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
            role: initial.role || "",
            phone: initial.phone || "",
            base_salary: String(initial.base_salary ?? ""),
            commission_rate: String(initial.commission_rate ?? ""),
            active: initial.active !== false,
            notes: initial.notes || "",
          }
        : emptyForm()
    );
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSave = form.name.trim() && !saving;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name: form.name.trim(),
      role: form.role.trim(),
      phone: form.phone.trim(),
      base_salary: Number(form.base_salary) || 0,
      commission_rate: Number(form.commission_rate) || 0,
      active: form.active,
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
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
        dir={ar ? "rtl" : "ltr"}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-gray-900 font-extrabold text-lg">
            {initial
              ? ar ? "تعديل موظفة" : "Edit Employee"
              : ar ? "إضافة موظفة" : "Add Employee"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>{ar ? "الاسم" : "Name"}</label>
            <input
              className={inputCls}
              value={form.name}
              placeholder={ar ? "اسم الموظفة" : "Employee name"}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{ar ? "المسمى الوظيفي" : "Role"}</label>
              <input
                className={inputCls}
                value={form.role}
                placeholder={ar ? "كوافيرة / مكياج" : "Stylist / Makeup"}
                onChange={(e) => set("role", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>{ar ? "الجوال" : "Phone"}</label>
              <input
                className={inputCls}
                value={form.phone}
                placeholder="05xxxxxxxx"
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{ar ? "الراتب الأساسي (ر.س)" : "Base Salary"}</label>
              <input
                type="number"
                min="0"
                step="50"
                className={inputCls}
                value={form.base_salary}
                placeholder="0"
                onChange={(e) => set("base_salary", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>{ar ? "نسبة العمولة %" : "Commission %"}</label>
              <input
                type="number"
                min="0"
                step="1"
                className={inputCls}
                value={form.commission_rate}
                placeholder="0"
                onChange={(e) => set("commission_rate", e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => set("active", e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-600"
            />
            {ar ? "على رأس العمل" : "Active"}
          </label>

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
