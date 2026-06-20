import React, { useState, useMemo } from "react";
import {
  Plus, Pencil, Trash2, Beaker, Clock, UserCog, Building2, Target,
  TrendingUp, Wallet, Save, Send, X, Layers, Calculator, RotateCcw,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localApi } from "@/api/localClient";
import MaterialModal from "@/components/accounting/MaterialModal";
import { formatMoney, round2 } from "@/utils/financeUtils";

const MAT = localApi.entities.FinanceMaterial;
const PSV = localApi.entities.FinancePricedService;
const SVC = localApi.entities.FinanceService;

// Labor-rate assumption: a typical monthly salary covers ~26 working days × 8h
// = 208 working hours/month. So an employee's hourly cost = base_salary / 208.
const HOURS_PER_MONTH = 208;

// Palette for the build-up / proportion bar.
const C_MATERIAL = "#6366f1"; // var(--hv-primary) family — indigo
const C_LABOR = "#fb7185";    // var(--hv-secondary) family — coral
const C_OVERHEAD = "#f59e0b"; // amber
const C_PROFIT = "#10b981";   // emerald

const emptyCalc = () => ({
  id: null,
  name: "",
  duration_min: "",
  laborMode: "manual", // "manual" | "employee"
  employee_id: "",
  hourly_rate: "",
  lines: [], // { materialId, name, unit, costPerUnit, qty }
  overhead_pct: "30",
  margin_pct: "50",
});

export default function PricingTab({ ar, employees = [] }) {
  const qc = useQueryClient();
  const [calc, setCalc] = useState(emptyCalc());
  const [matModal, setMatModal] = useState({ open: false, initial: null });
  const [addingLine, setAddingLine] = useState(false);

  const { data: materials = [] } = useQuery({
    queryKey: ["fin-materials"],
    queryFn: () => MAT.list("-created_date"),
  });
  const { data: priced = [] } = useQuery({
    queryKey: ["fin-priced-services"],
    queryFn: () => PSV.list("-created_date"),
  });

  // ── Material mutations ─────────────────────────────────────────────────────
  const saveMat = useMutation({
    mutationFn: (payload) =>
      matModal.initial ? MAT.update(matModal.initial.id, payload) : MAT.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fin-materials"] });
      setMatModal({ open: false, initial: null });
    },
  });
  const delMat = useMutation({
    mutationFn: (id) => MAT.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fin-materials"] }),
  });

  // ── Priced-service mutations ───────────────────────────────────────────────
  const savePriced = useMutation({
    mutationFn: (payload) =>
      calc.id ? PSV.update(calc.id, payload) : PSV.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fin-priced-services"] });
      window.alert(ar ? "تم حفظ التسعيرة." : "Pricing saved.");
    },
  });
  const delPriced = useMutation({
    mutationFn: (id) => PSV.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fin-priced-services"] }),
  });
  const pushToCatalog = useMutation({
    mutationFn: async ({ name, price }) => {
      const existing = await SVC.list("-created_date");
      const match = (existing || []).find((s) => (s.name || "").trim() === name.trim());
      const payload = { name, price, vat_included: false, category: "service", active: true };
      return match ? SVC.update(match.id, payload) : SVC.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fin-services"] });
      window.alert(ar ? "تمت إضافة السعر إلى كتالوج الخدمات." : "Price sent to the services catalog.");
    },
  });

  // ── Derive hourly rate from a selected employee ────────────────────────────
  const selectedEmp = employees.find((e) => String(e.id) === String(calc.employee_id));
  const employeeHourly = selectedEmp
    ? round2((Number(selectedEmp.base_salary) || 0) / HOURS_PER_MONTH)
    : 0;
  const hourlyRate = calc.laborMode === "employee"
    ? employeeHourly
    : round2(Number(calc.hourly_rate) || 0);

  // ── Live computation ───────────────────────────────────────────────────────
  const m = useMemo(() => {
    const materialCost = round2(
      calc.lines.reduce((s, l) => s + (Number(l.costPerUnit) || 0) * (Number(l.qty) || 0), 0)
    );
    const durationMin = Number(calc.duration_min) || 0;
    const laborCost = round2(hourlyRate * (durationMin / 60));
    const directCost = round2(materialCost + laborCost);
    const overheadPct = Number(calc.overhead_pct) || 0;
    const overheadCost = round2(directCost * (overheadPct / 100));
    const totalCost = round2(directCost + overheadCost);
    const marginPct = Number(calc.margin_pct) || 0;
    const suggestedPrice = marginPct < 100
      ? round2(totalCost / (1 - marginPct / 100))
      : totalCost;
    const grossProfit = round2(suggestedPrice - directCost);
    const netProfit = round2(suggestedPrice - totalCost);
    const actualMarginPct = suggestedPrice > 0 ? round2((netProfit / suggestedPrice) * 100) : 0;
    return {
      materialCost, laborCost, directCost, overheadPct, overheadCost,
      totalCost, marginPct, suggestedPrice, grossProfit, netProfit, actualMarginPct,
    };
  }, [calc, hourlyRate]);

  const set = (k, v) => setCalc((c) => ({ ...c, [k]: v }));

  const addLine = (mat) => {
    setCalc((c) => ({
      ...c,
      lines: [
        ...c.lines,
        { materialId: mat.id, name: mat.name, unit: mat.unit, costPerUnit: Number(mat.cost_per_unit) || 0, qty: 1 },
      ],
    }));
    setAddingLine(false);
  };
  const setLineQty = (i, qty) =>
    setCalc((c) => ({ ...c, lines: c.lines.map((l, j) => (j === i ? { ...l, qty } : l)) }));
  const removeLine = (i) =>
    setCalc((c) => ({ ...c, lines: c.lines.filter((_, j) => j !== i) }));

  const loadPriced = (p) => {
    const lines = (() => { try { return JSON.parse(p.materials_json || "[]"); } catch { return []; } })();
    setCalc({
      id: p.id,
      name: p.name || "",
      duration_min: String(p.duration_min ?? ""),
      laborMode: "manual",
      employee_id: "",
      hourly_rate: String(p.hourly_rate ?? ""),
      lines: Array.isArray(lines) ? lines : [],
      overhead_pct: String(p.overhead_pct ?? "30"),
      margin_pct: String(p.margin_pct ?? "50"),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = () => {
    if (!calc.name.trim()) {
      window.alert(ar ? "اكتب اسم الخدمة أولاً." : "Enter a service name first.");
      return;
    }
    savePriced.mutate({
      name: calc.name.trim(),
      duration_min: Number(calc.duration_min) || 0,
      hourly_rate: hourlyRate,
      overhead_pct: Number(calc.overhead_pct) || 0,
      margin_pct: Number(calc.margin_pct) || 0,
      materials_json: JSON.stringify(calc.lines),
      suggested_price: m.suggestedPrice,
    });
  };

  const labelCls = "block text-xs font-bold text-gray-600 mb-1.5";
  const inputCls =
    "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition";

  return (
    <div className="space-y-6">
      {/* ───────────────────────── A) Materials catalog ───────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-extrabold text-gray-900 flex items-center gap-2">
            <Beaker className="w-5 h-5 text-indigo-600" />
            {ar ? "كتالوج المواد" : "Materials Catalog"}
          </h3>
          <button
            onClick={() => setMatModal({ open: true, initial: null })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            {ar ? "إضافة مادة" : "Add Material"}
          </button>
        </div>
        {materials.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">
            {ar ? "لا توجد مواد بعد. أضِف المواد لتستخدمها في تسعير خدماتك." : "No materials yet."}
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {materials.map((mat) => (
              <div key={mat.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-bold text-gray-800 text-sm truncate">{mat.name}</p>
                  <p className="text-[11px] text-gray-500">
                    {formatMoney(mat.cost_per_unit, ar)}
                    <span className="mx-1">/</span>
                    {mat.unit || (ar ? "وحدة" : "unit")}
                  </p>
                </div>
                <div className="flex gap-0.5 flex-shrink-0">
                  <button onClick={() => setMatModal({ open: true, initial: mat })} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => delMat.mutate(mat.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ───────────────────────── B) Pricing calculator ───────────────────── */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* INPUTS */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-gray-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-indigo-600" />
              {ar ? "تسعير الخدمة" : "Service Pricing"}
            </h3>
            {(calc.id || calc.name) && (
              <button
                onClick={() => setCalc(emptyCalc())}
                className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-indigo-600"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {ar ? "تسعيرة جديدة" : "New"}
              </button>
            )}
          </div>

          {/* Name + duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>{ar ? "اسم الخدمة" : "Service Name"}</label>
              <input
                className={inputCls}
                value={calc.name}
                placeholder={ar ? "مثال: صبغة وقص" : "e.g. Color & cut"}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {ar ? "مدة الخدمة (بالدقائق)" : "Duration (minutes)"}
                </span>
              </label>
              <input
                type="number" min="0" step="1"
                className={inputCls}
                value={calc.duration_min}
                placeholder="0"
                onChange={(e) => set("duration_min", e.target.value)}
              />
            </div>
          </div>

          {/* Labor */}
          <div>
            <label className={labelCls}>
              <span className="inline-flex items-center gap-1">
                <UserCog className="w-3.5 h-3.5" />
                {ar ? "العمالة" : "Labor"}
              </span>
            </label>
            <div className="flex gap-2 bg-gray-50 rounded-xl p-1 mb-2">
              <button
                type="button"
                onClick={() => set("laborMode", "manual")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${calc.laborMode === "manual" ? "bg-white text-indigo-600 shadow" : "text-gray-500"}`}
              >
                {ar ? "أجرة الساعة يدويًا" : "Manual hourly"}
              </button>
              <button
                type="button"
                onClick={() => set("laborMode", "employee")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${calc.laborMode === "employee" ? "bg-white text-indigo-600 shadow" : "text-gray-500"}`}
              >
                {ar ? "من راتب موظفة" : "From employee"}
              </button>
            </div>
            {calc.laborMode === "employee" ? (
              <select className={inputCls} value={calc.employee_id} onChange={(e) => set("employee_id", e.target.value)}>
                <option value="">{ar ? "اختر موظفة…" : "Select employee…"}</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="number" min="0" step="0.01"
                className={inputCls}
                value={calc.hourly_rate}
                placeholder={ar ? "أجرة الساعة" : "Hourly rate"}
                onChange={(e) => set("hourly_rate", e.target.value)}
              />
            )}
            <div className="mt-1.5 text-[11px] text-gray-500 flex items-center justify-between">
              <span>
                {calc.laborMode === "employee"
                  ? (ar ? "تُحتسب من الراتب الشهري ÷ 208 ساعة" : "From monthly salary ÷ 208h")
                  : (ar ? "أجرة الساعة المُدخلة" : "Entered hourly rate")}
              </span>
              <span className="font-bold text-gray-700">
                {formatMoney(hourlyRate, ar)} / {ar ? "ساعة" : "hr"}
              </span>
            </div>
          </div>

          {/* Materials used */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-600 inline-flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                {ar ? "المواد المستخدمة" : "Materials used"}
              </label>
              <button
                type="button"
                onClick={() => setAddingLine((v) => !v)}
                className="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {ar ? "أضف مادة" : "Add material"}
              </button>
            </div>

            {addingLine && (
              <div className="mb-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-2">
                {materials.length === 0 ? (
                  <p className="text-[11px] text-gray-500 px-1 py-1">
                    {ar ? "أضِف موادًا إلى الكتالوج أولاً." : "Add materials to the catalog first."}
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto flex flex-col gap-1">
                    {materials.map((mat) => (
                      <button
                        key={mat.id}
                        onClick={() => addLine(mat)}
                        className="flex items-center justify-between text-start px-2.5 py-1.5 rounded-lg hover:bg-white text-sm"
                      >
                        <span className="font-bold text-gray-700">{mat.name}</span>
                        <span className="text-[11px] text-gray-500">{formatMoney(mat.cost_per_unit, ar)}/{mat.unit}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {calc.lines.length === 0 ? (
              <p className="text-[11px] text-gray-400 px-1">{ar ? "لا مواد مضافة." : "No materials added."}</p>
            ) : (
              <div className="space-y-1.5">
                {calc.lines.map((l, i) => {
                  const lineCost = round2((Number(l.costPerUnit) || 0) * (Number(l.qty) || 0));
                  return (
                    <div key={i} className="flex items-center gap-2 rounded-xl border border-gray-100 px-2.5 py-2">
                      <span className="flex-1 min-w-0 text-sm font-bold text-gray-700 truncate">{l.name}</span>
                      <input
                        type="number" min="0" step="0.01"
                        value={l.qty}
                        onChange={(e) => setLineQty(i, e.target.value)}
                        className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-xs text-center outline-none focus:border-indigo-400"
                      />
                      <span className="text-[11px] text-gray-400 w-8">{l.unit}</span>
                      <span className="text-xs font-bold text-gray-700 w-20 text-end whitespace-nowrap">{formatMoney(lineCost, ar)}</span>
                      <button onClick={() => removeLine(i)} className="p-1 rounded-lg text-gray-300 hover:text-rose-600 hover:bg-rose-50">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between px-2.5 pt-1">
                  <span className="text-[11px] font-bold text-gray-500">{ar ? "إجمالي المواد" : "Material cost"}</span>
                  <span className="text-sm font-extrabold text-indigo-600">{formatMoney(m.materialCost, ar)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Overhead + margin */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>
                <span className="inline-flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {ar ? "مصاريف غير مباشرة %" : "Overhead %"}
                </span>
              </label>
              <input
                type="number" min="0" step="1"
                className={inputCls}
                value={calc.overhead_pct}
                onChange={(e) => set("overhead_pct", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>
                <span className="inline-flex items-center gap-1">
                  <Target className="w-3.5 h-3.5" />
                  {ar ? "هامش الربح المستهدف %" : "Target margin %"}
                </span>
              </label>
              <input
                type="number" min="0" max="99" step="1"
                className={inputCls}
                value={calc.margin_pct}
                onChange={(e) => set("margin_pct", e.target.value)}
              />
            </div>
            <p className="col-span-2 text-[11px] text-gray-400 -mt-1">
              {ar
                ? "المصاريف غير المباشرة تغطي الإيجار والكهرباء والتسويق والمصاريف العامة."
                : "Overhead covers rent, utilities, marketing and general costs."}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={savePriced.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {ar ? "احفظ التسعيرة" : "Save pricing"}
            </button>
            <button
              onClick={() => {
                if (!calc.name.trim()) { window.alert(ar ? "اكتب اسم الخدمة أولاً." : "Enter a name first."); return; }
                pushToCatalog.mutate({ name: calc.name.trim(), price: m.suggestedPrice });
              }}
              disabled={pushToCatalog.isPending || m.suggestedPrice <= 0}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 font-bold text-sm hover:bg-indigo-100 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {ar ? "أرسل السعر لكتالوج الخدمات" : "Send to catalog"}
            </button>
          </div>
        </section>

        {/* VISUAL */}
        <section className="space-y-4">
          <PriceBuildUp ar={ar} m={m} />
          <ProportionBar ar={ar} m={m} />
          <MetricsRow ar={ar} m={m} />
        </section>
      </div>

      {/* ───────────────────── Saved priced services ──────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="font-extrabold text-gray-900 flex items-center gap-2 mb-3">
          <Wallet className="w-5 h-5 text-indigo-600" />
          {ar ? "التسعيرات المحفوظة" : "Saved Pricings"}
        </h3>
        {priced.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">
            {ar ? "لا توجد تسعيرات محفوظة بعد." : "No saved pricings yet."}
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {priced.map((p) => (
              <div key={p.id} className="rounded-2xl border border-gray-100 p-3.5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-extrabold text-gray-900 truncate">{p.name}</p>
                    <p className="text-[11px] text-gray-500">
                      {Number(p.duration_min) || 0} {ar ? "دقيقة" : "min"}
                      <span className="mx-1">·</span>
                      {ar ? "هامش" : "margin"} {Number(p.margin_pct) || 0}%
                    </p>
                  </div>
                  <div className="flex gap-0.5 flex-shrink-0">
                    <button onClick={() => loadPriced(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => delPriced.mutate(p.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline justify-between">
                  <span className="text-[11px] font-bold text-gray-500">{ar ? "السعر المقترح" : "Suggested"}</span>
                  <span className="font-extrabold text-lg text-indigo-600">{formatMoney(p.suggested_price, ar)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <MaterialModal
        isOpen={matModal.open}
        initial={matModal.initial}
        ar={ar}
        saving={saveMat.isPending}
        onClose={() => setMatModal({ open: false, initial: null })}
        onSave={(p) => saveMat.mutate(p)}
      />
    </div>
  );
}

// ── The cost → price build-up (waterfall) ─────────────────────────────────────
function PriceBuildUp({ ar, m }) {
  const Step = ({ icon, label, value, color, subtotal, hero, dim }) => (
    <div className="relative ps-7">
      {/* connector */}
      <span className="absolute top-0 bottom-0 start-[10px] w-px bg-gray-200" aria-hidden />
      <span
        className="absolute start-[5px] top-[14px] w-2.5 h-2.5 rounded-full ring-2 ring-white"
        style={{ background: color }}
        aria-hidden
      />
      <div
        className={`flex items-center justify-between rounded-xl px-3 py-2.5 mb-2 ${
          hero ? "text-white shadow-lg" : subtotal ? "bg-gray-50 border border-gray-100" : "bg-white border border-gray-100"
        }`}
        style={hero ? { background: "linear-gradient(135deg, #6366f1 0%, #fb7185 100%)" } : undefined}
      >
        <span className={`flex items-center gap-2 ${hero ? "font-extrabold" : subtotal ? "font-extrabold text-gray-800" : dim ? "text-gray-500" : "text-gray-700 font-bold"} text-sm`}>
          <span className="text-base leading-none">{icon}</span>
          {label}
        </span>
        <span className={hero ? "font-black text-2xl" : subtotal ? "font-extrabold text-gray-900" : "font-bold text-gray-800"}>
          {formatMoney(value, ar)}
        </span>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <h4 className="font-extrabold text-gray-900 text-sm mb-3">{ar ? "تركيب السعر" : "Price build-up"}</h4>
      <Step icon="🧴" label={ar ? "تكلفة المواد" : "Material cost"} value={m.materialCost} color={C_MATERIAL} />
      <Step icon="👩‍🔧" label={ar ? "تكلفة العمالة" : "Labor cost"} value={m.laborCost} color={C_LABOR} />
      <Step icon="⊜" label={ar ? "التكلفة المباشرة" : "Direct cost"} value={m.directCost} color="#475569" subtotal />
      <Step icon="🏢" label={`${ar ? "مصاريف غير مباشرة" : "Overhead"} (${m.overheadPct}%)`} value={m.overheadCost} color={C_OVERHEAD} />
      <Step icon="💰" label={ar ? "إجمالي التكلفة" : "Total cost"} value={m.totalCost} color="#334155" subtotal />
      <Step icon="📈" label={ar ? "الربح" : "Profit"} value={m.netProfit} color={C_PROFIT} />
      <Step icon="🎯" label={ar ? "السعر المقترح" : "Suggested price"} value={m.suggestedPrice} color="#4f46e5" hero />
    </div>
  );
}

// ── Horizontal stacked proportion bar ────────────────────────────────────────
function ProportionBar({ ar, m }) {
  const price = m.suggestedPrice > 0 ? m.suggestedPrice : 1;
  const segs = [
    { label: ar ? "مواد" : "Materials", value: m.materialCost, color: C_MATERIAL },
    { label: ar ? "عمالة" : "Labor", value: m.laborCost, color: C_LABOR },
    { label: ar ? "غير مباشرة" : "Overhead", value: m.overheadCost, color: C_OVERHEAD },
    { label: ar ? "ربح" : "Profit", value: Math.max(0, m.netProfit), color: C_PROFIT },
  ];
  const pct = (v) => round2((v / price) * 100);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <h4 className="font-extrabold text-gray-900 text-sm mb-3">{ar ? "مكوّنات السعر" : "Price composition"}</h4>
      <div className="flex w-full h-5 rounded-full overflow-hidden bg-gray-100">
        {segs.map((s, i) => {
          const w = m.suggestedPrice > 0 ? pct(s.value) : 0;
          if (w <= 0) return null;
          return <div key={i} style={{ width: `${w}%`, background: s.color }} title={`${s.label} ${w}%`} />;
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {segs.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-[11px] text-gray-600 font-bold">{s.label}</span>
            <span className="text-[11px] text-gray-400 ms-auto">{pct(s.value)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Small metrics row ─────────────────────────────────────────────────────────
function MetricsRow({ ar, m }) {
  const Cell = ({ label, value, color }) => (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-center">
      <p className="text-[10px] font-bold text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-extrabold" style={{ color }}>{value}</p>
    </div>
  );
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      <Cell label={ar ? "التكلفة المباشرة" : "Direct cost"} value={formatMoney(m.directCost, ar)} color="#475569" />
      <Cell label={ar ? "غير المباشرة" : "Overhead"} value={formatMoney(m.overheadCost, ar)} color={C_OVERHEAD} />
      <Cell label={ar ? "الربح الإجمالي" : "Gross profit"} value={formatMoney(m.grossProfit, ar)} color={C_PROFIT} />
      <Cell label={ar ? "صافي الربح" : "Net profit"} value={formatMoney(m.netProfit, ar)} color={C_PROFIT} />
      <Cell label={ar ? "الهامش الفعلي" : "Actual margin"} value={`${m.actualMarginPct}%`} color="#4f46e5" />
      <Cell label={ar ? "السعر المقترح" : "Suggested"} value={formatMoney(m.suggestedPrice, ar)} color="#4f46e5" />
    </div>
  );
}
