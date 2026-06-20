import React, { useState, useMemo } from "react";
import {
  Wallet, TrendingUp, TrendingDown, Receipt, Plus, Pencil, Trash2,
  Users, FileSpreadsheet, Landmark, PiggyBank, BadgePercent, Loader2,
  Repeat, Scissors, Printer, Power, PlayCircle, Calculator,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import * as XLSX from "xlsx";
import { localApi, postRecurringNow } from "@/api/localClient";
import TransactionModal from "@/components/accounting/TransactionModal";
import EmployeeModal from "@/components/accounting/EmployeeModal";
import RecurringModal from "@/components/accounting/RecurringModal";
import ServiceModal from "@/components/accounting/ServiceModal";
import PricingTab from "@/components/accounting/PricingTab";
import {
  formatMoney, summarize, inRange, categoryLabel, paymentLabel,
  categoriesFor, monthStartStr, todayStr, round2, quarterRange,
} from "@/utils/financeUtils";

const TX = localApi.entities.FinanceTransaction;
const EMP = localApi.entities.FinanceEmployee;
const REC = localApi.entities.FinanceRecurring;
const SVC = localApi.entities.FinanceService;
const PIE_COLORS = ["#6366f1", "#fb7185", "#22d3ee", "#34d399", "#f59e0b", "#a855f7", "#ef4444", "#14b8a6", "#64748b"];

export default function AccountingPage({ language }) {
  const ar = (language || localStorage.getItem("appLanguage") || "ar") === "ar";
  const qc = useQueryClient();
  const [tab, setTab] = useState("overview");
  const [from, setFrom] = useState(monthStartStr());
  const [to, setTo] = useState(todayStr());

  const [txModal, setTxModal] = useState({ open: false, initial: null });
  const [empModal, setEmpModal] = useState({ open: false, initial: null });
  const [recModal, setRecModal] = useState({ open: false, initial: null });
  const [svcModal, setSvcModal] = useState({ open: false, initial: null });

  const { data: allTx = [], isLoading: txLoading } = useQuery({
    queryKey: ["fin-transactions"],
    queryFn: () => TX.list("-txn_date"),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["fin-employees"],
    queryFn: () => EMP.list("-created_date"),
  });
  const { data: recurring = [] } = useQuery({
    queryKey: ["fin-recurring"],
    queryFn: () => REC.list("-created_date"),
  });
  const { data: services = [] } = useQuery({
    queryKey: ["fin-services"],
    queryFn: () => SVC.list("-created_date"),
  });

  const txInRange = useMemo(
    () => allTx.filter((t) => inRange(t, from, to)),
    [allTx, from, to]
  );
  const stats = useMemo(() => summarize(txInRange), [txInRange]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const saveTx = useMutation({
    mutationFn: (payload) =>
      txModal.initial ? TX.update(txModal.initial.id, payload) : TX.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fin-transactions"] });
      setTxModal({ open: false, initial: null });
    },
  });
  const delTx = useMutation({
    mutationFn: (id) => TX.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fin-transactions"] }),
  });
  const saveEmp = useMutation({
    mutationFn: (payload) =>
      empModal.initial ? EMP.update(empModal.initial.id, payload) : EMP.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fin-employees"] });
      setEmpModal({ open: false, initial: null });
    },
  });
  const delEmp = useMutation({
    mutationFn: (id) => EMP.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fin-employees"] }),
  });
  const saveRec = useMutation({
    mutationFn: (payload) =>
      recModal.initial ? REC.update(recModal.initial.id, payload) : REC.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fin-recurring"] });
      setRecModal({ open: false, initial: null });
    },
  });
  const delRec = useMutation({
    mutationFn: (id) => REC.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fin-recurring"] }),
  });
  const toggleRec = useMutation({
    mutationFn: ({ id, active }) => REC.update(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fin-recurring"] }),
  });
  const saveSvc = useMutation({
    mutationFn: (payload) =>
      svcModal.initial ? SVC.update(svcModal.initial.id, payload) : SVC.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fin-services"] });
      setSvcModal({ open: false, initial: null });
    },
  });
  const delSvc = useMutation({
    mutationFn: (id) => SVC.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fin-services"] }),
  });
  const postRec = useMutation({
    mutationFn: () => postRecurringNow(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["fin-transactions"] });
      qc.invalidateQueries({ queryKey: ["fin-recurring"] });
      qc.invalidateQueries({ queryKey: ["fin-employees"] });
      const n = res?.posted ?? 0;
      window.alert(
        ar
          ? (n > 0 ? `تم تسجيل ${n} حركة متكرّرة لهذا الشهر.` : "لا توجد متكرّرات مستحقة للتسجيل الآن.")
          : (n > 0 ? `Posted ${n} recurring transaction(s).` : "Nothing due to post right now.")
      );
    },
  });

  // ── Chart data ───────────────────────────────────────────────────────────
  const expenseByCat = useMemo(() => {
    const m = {};
    txInRange.filter((t) => t.type === "expense").forEach((t) => {
      const label = categoryLabel(t.category, "expense", ar);
      m[label] = (m[label] || 0) + (Number(t.amount) || 0);
    });
    return Object.entries(m).map(([name, value]) => ({ name, value: round2(value) }));
  }, [txInRange, ar]);

  const monthlyTrend = useMemo(() => {
    const m = {};
    allTx.forEach((t) => {
      const key = (t.txn_date || t.created_date || "").slice(0, 7);
      if (!key) return;
      if (!m[key]) m[key] = { month: key, income: 0, expense: 0 };
      if (t.type === "expense") m[key].expense += Number(t.amount) || 0;
      else m[key].income += Number(t.amount) || 0;
    });
    return Object.values(m)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6)
      .map((r) => ({ ...r, income: round2(r.income), expense: round2(r.expense) }));
  }, [allTx]);

  // ── Excel export ─────────────────────────────────────────────────────────
  const exportExcel = () => {
    const rows = txInRange.map((t) => ({
      [ar ? "التاريخ" : "Date"]: (t.txn_date || "").slice(0, 10),
      [ar ? "النوع" : "Type"]: t.type === "expense" ? (ar ? "مصروف" : "Expense") : (ar ? "إيراد" : "Income"),
      [ar ? "التصنيف" : "Category"]: categoryLabel(t.category, t.type, ar),
      [ar ? "الوصف" : "Description"]: t.description || "",
      [ar ? "الصافي" : "Net"]: t.amount,
      [ar ? "الضريبة" : "VAT"]: t.vat_amount,
      [ar ? "الإجمالي" : "Total"]: t.total,
      [ar ? "طريقة الدفع" : "Payment"]: paymentLabel(t.payment_method, ar),
      [ar ? "المرجع" : "Ref"]: t.ref_no || "",
      [ar ? "الموظفة" : "Employee"]: t.employee_name || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, ar ? "الحركات" : "Transactions");
    // Summary sheet
    const sumRows = [
      [ar ? "إجمالي الإيرادات" : "Total Income", stats.income],
      [ar ? "إجمالي المصروفات" : "Total Expenses", stats.expense],
      [ar ? "صافي الربح" : "Net Profit", stats.netProfit],
      [ar ? "ضريبة المخرجات" : "Output VAT", stats.outputVat],
      [ar ? "ضريبة المدخلات" : "Input VAT", stats.inputVat],
      [ar ? "صافي الضريبة المستحقة" : "Net VAT Due", stats.vatDue],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sumRows), ar ? "الملخص" : "Summary");
    XLSX.writeFile(wb, `accounting_${from}_${to}.xlsx`);
  };

  // ── UI bits ────────────────────────────────────────────────────────────────
  const Arrow = ar ? "→" : "←";
  const inputCls = "rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400";

  // Saudi Riyal glyph (⃁, U+20C1) used as an icon instead of a dollar sign.
  const RiyalIcon = ({ className = "" }) => (
    <span className={`inline-flex items-center justify-center ${className}`} style={{ fontWeight: 900, fontSize: 14, lineHeight: 1 }}>⃁</span>
  );

  const TABS = [
    { key: "overview", ar: "نظرة عامة", en: "Overview", Icon: Wallet },
    { key: "transactions", ar: "الحركات", en: "Transactions", Icon: RiyalIcon },
    { key: "payroll", ar: "الرواتب والعمولات", en: "Payroll", Icon: Users },
    { key: "recurring", ar: "المصروفات المتكرّرة", en: "Recurring", Icon: Repeat },
    { key: "services", ar: "الخدمات", en: "Services", Icon: Scissors },
    { key: "pricing", ar: "التسعير", en: "Pricing", Icon: Calculator },
    { key: "reports", ar: "التقارير الضريبية", en: "Tax Reports", Icon: Landmark },
  ];

  return (
    <div dir={ar ? "rtl" : "ltr"} className="hv-page hv-app-bg h-screen overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
              <Wallet className="w-6 h-6 text-indigo-600" />
              {ar ? "المحاسبة" : "Accounting"}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {ar
                ? "إدارة إيرادات ومصروفات الصالون والضريبة والأرباح"
                : "Manage salon revenue, expenses, VAT and profit"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold text-sm hover:bg-gray-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {ar ? "تصدير Excel" : "Export"}
            </button>
            <button
              onClick={() => setTxModal({ open: true, initial: null })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              {ar ? "حركة جديدة" : "New"}
            </button>
          </div>
        </div>

        {/* Date range */}
        <div className="flex flex-wrap items-center gap-2 mb-5 bg-white rounded-2xl border border-gray-100 p-3">
          <span className="text-xs font-bold text-gray-500">{ar ? "الفترة:" : "Period:"}</span>
          <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-gray-400">{Arrow}</span>
          <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
          <button
            onClick={() => { setFrom(monthStartStr()); setTo(todayStr()); }}
            className="text-xs font-bold text-indigo-600 hover:underline px-2"
          >
            {ar ? "هذا الشهر" : "This month"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto">
          {TABS.map(({ key, ar: a, en, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${
                tab === key
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {ar ? a : en}
            </button>
          ))}
        </div>

        {txLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <>
            {tab === "overview" && (
              <OverviewTab
                ar={ar} stats={stats} expenseByCat={expenseByCat}
                monthlyTrend={monthlyTrend} txCount={txInRange.length}
              />
            )}
            {tab === "transactions" && (
              <TransactionsTab
                ar={ar} rows={txInRange}
                onEdit={(t) => setTxModal({ open: true, initial: t })}
                onDelete={(id) => delTx.mutate(id)}
              />
            )}
            {tab === "payroll" && (
              <PayrollTab
                ar={ar} employees={employees} txInRange={txInRange}
                onAdd={() => setEmpModal({ open: true, initial: null })}
                onEdit={(e) => setEmpModal({ open: true, initial: e })}
                onDelete={(id) => delEmp.mutate(id)}
              />
            )}
            {tab === "recurring" && (
              <RecurringTab
                ar={ar} rows={recurring}
                onAdd={() => setRecModal({ open: true, initial: null })}
                onEdit={(r) => setRecModal({ open: true, initial: r })}
                onDelete={(id) => delRec.mutate(id)}
                onToggle={(r) => toggleRec.mutate({ id: r.id, active: !(r.active !== false) })}
                onPostNow={() => postRec.mutate()}
                posting={postRec.isPending}
              />
            )}
            {tab === "services" && (
              <ServicesTab
                ar={ar} rows={services}
                onAdd={() => setSvcModal({ open: true, initial: null })}
                onEdit={(s) => setSvcModal({ open: true, initial: s })}
                onDelete={(id) => delSvc.mutate(id)}
              />
            )}
            {tab === "pricing" && <PricingTab ar={ar} employees={employees} />}
            {tab === "reports" && <ReportsTab ar={ar} allTx={allTx} />}
          </>
        )}
      </div>

      <TransactionModal
        isOpen={txModal.open}
        initial={txModal.initial}
        employees={employees}
        services={services}
        ar={ar}
        saving={saveTx.isPending}
        onClose={() => setTxModal({ open: false, initial: null })}
        onSave={(p) => saveTx.mutate(p)}
      />
      <EmployeeModal
        isOpen={empModal.open}
        initial={empModal.initial}
        ar={ar}
        saving={saveEmp.isPending}
        onClose={() => setEmpModal({ open: false, initial: null })}
        onSave={(p) => saveEmp.mutate(p)}
      />
      <RecurringModal
        isOpen={recModal.open}
        initial={recModal.initial}
        ar={ar}
        saving={saveRec.isPending}
        onClose={() => setRecModal({ open: false, initial: null })}
        onSave={(p) => saveRec.mutate(p)}
      />
      <ServiceModal
        isOpen={svcModal.open}
        initial={svcModal.initial}
        ar={ar}
        saving={saveSvc.isPending}
        onClose={() => setSvcModal({ open: false, initial: null })}
        onSave={(p) => saveSvc.mutate(p)}
      />
    </div>
  );
}

// ── Overview ───────────────────────────────────────────────────────────────
function StatCard({ Icon, label, value, color, bg }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-500 font-bold mb-0.5 truncate">{label}</p>
        <p className="text-base font-extrabold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}

function OverviewTab({ ar, stats, expenseByCat, monthlyTrend, txCount }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard Icon={TrendingUp} label={ar ? "الإيرادات" : "Income"} value={formatMoney(stats.income, ar)} color="#059669" bg="#ecfdf5" />
        <StatCard Icon={TrendingDown} label={ar ? "المصروفات" : "Expenses"} value={formatMoney(stats.expense, ar)} color="#e11d48" bg="#fff1f2" />
        <StatCard Icon={PiggyBank} label={ar ? "صافي الربح" : "Net Profit"} value={formatMoney(stats.netProfit, ar)} color="#4f46e5" bg="#eef2ff" />
        <StatCard Icon={BadgePercent} label={ar ? "الضريبة المستحقة" : "VAT Due"} value={formatMoney(stats.vatDue, ar)} color="#d97706" bg="#fffbeb" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="font-bold text-gray-800 text-sm mb-3">{ar ? "الإيراد مقابل المصروف (آخر 6 أشهر)" : "Income vs Expense (last 6 months)"}</h3>
          {monthlyTrend.length === 0 ? (
            <Empty ar={ar} />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatMoney(v, ar)} />
                <Legend />
                <Bar dataKey="income" name={ar ? "إيراد" : "Income"} fill="#34d399" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name={ar ? "مصروف" : "Expense"} fill="#fb7185" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="font-bold text-gray-800 text-sm mb-3">{ar ? "توزيع المصروفات" : "Expense Breakdown"}</h3>
          {expenseByCat.length === 0 ? (
            <Empty ar={ar} />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={expenseByCat} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={(e) => e.name}>
                  {expenseByCat.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatMoney(v, ar)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        {ar ? `${txCount} حركة في الفترة المحددة` : `${txCount} transactions in selected period`}
      </p>
    </div>
  );
}

// ── Transactions list ────────────────────────────────────────────────────────
function TransactionsTab({ ar, rows, onEdit, onDelete }) {
  if (rows.length === 0) return <Empty ar={ar} big />;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs">
              <th className="text-start font-bold px-4 py-3">{ar ? "التاريخ" : "Date"}</th>
              <th className="text-start font-bold px-4 py-3">{ar ? "التصنيف" : "Category"}</th>
              <th className="text-start font-bold px-4 py-3 hidden sm:table-cell">{ar ? "الوصف" : "Description"}</th>
              <th className="text-start font-bold px-4 py-3">{ar ? "الإجمالي" : "Total"}</th>
              <th className="text-start font-bold px-4 py-3 hidden md:table-cell">{ar ? "الدفع" : "Payment"}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const expense = t.type === "expense";
              return (
                <tr key={t.id} className="border-t border-gray-50 hover:bg-gray-50/60">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{(t.txn_date || "").slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${expense ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                      {categoryLabel(t.category, t.type, ar)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell max-w-[220px] truncate">{t.description || "—"}</td>
                  <td className={`px-4 py-3 font-bold whitespace-nowrap ${expense ? "text-rose-600" : "text-emerald-600"}`}>
                    {expense ? "−" : "+"}{formatMoney(t.total, ar)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{paymentLabel(t.payment_method, ar)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => onEdit(t)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDelete(t.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Payroll ──────────────────────────────────────────────────────────────────
function PayrollTab({ ar, employees, txInRange, onAdd, onEdit, onDelete }) {
  // Commission base = income transactions attributed to each employee in range.
  const incomeByEmp = useMemo(() => {
    const m = {};
    txInRange.filter((t) => t.type === "income" && t.employee_id).forEach((t) => {
      m[t.employee_id] = (m[t.employee_id] || 0) + (Number(t.amount) || 0);
    });
    return m;
  }, [txInRange]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={onAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700">
          <Plus className="w-4 h-4" />
          {ar ? "إضافة موظفة" : "Add Employee"}
        </button>
      </div>
      {employees.length === 0 ? (
        <Empty ar={ar} big />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {employees.map((e) => {
            const base = Number(e.base_salary) || 0;
            const sales = incomeByEmp[e.id] || 0;
            const commission = round2(sales * ((Number(e.commission_rate) || 0) / 100));
            const payout = round2(base + commission);
            return (
              <div key={e.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-extrabold text-gray-900">{e.name}</p>
                    <p className="text-xs text-gray-500">{e.role || (ar ? "—" : "—")}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(e)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(e.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 text-sm">
                  <Row ar={ar} label={ar ? "الراتب الأساسي" : "Base"} value={formatMoney(base, ar)} />
                  <Row ar={ar} label={ar ? `مبيعات الفترة` : "Period sales"} value={formatMoney(sales, ar)} />
                  <Row ar={ar} label={ar ? `العمولة (${e.commission_rate || 0}%)` : `Commission (${e.commission_rate || 0}%)`} value={formatMoney(commission, ar)} />
                  <div className="border-t border-gray-100 pt-1.5 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500">{ar ? "المستحق" : "Payout"}</span>
                    <span className="font-extrabold text-indigo-600">{formatMoney(payout, ar)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-gray-400 text-center">
        {ar
          ? "العمولة تُحسب من الإيرادات المسجّلة باسم الموظفة ضمن الفترة المحددة."
          : "Commission is computed from income recorded under the employee within the selected period."}
      </p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-bold text-gray-800">{value}</span>
    </div>
  );
}

// ── Recurring expenses (المصروفات المتكرّرة) ──────────────────────────────────
function RecurringTab({ ar, rows, onAdd, onEdit, onDelete, onToggle, onPostNow, posting }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          onClick={onPostNow}
          disabled={posting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 font-bold text-sm hover:bg-indigo-100 disabled:opacity-50"
        >
          {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
          {ar ? "سجّل متكرّرات هذا الشهر الآن" : "Post this month's recurring now"}
        </button>
        <button onClick={onAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700">
          <Plus className="w-4 h-4" />
          {ar ? "إضافة مصروف متكرّر" : "Add Recurring"}
        </button>
      </div>

      {rows.length === 0 ? (
        <Empty ar={ar} big />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs">
                  <th className="text-start font-bold px-4 py-3">{ar ? "الاسم" : "Name"}</th>
                  <th className="text-start font-bold px-4 py-3">{ar ? "التصنيف" : "Category"}</th>
                  <th className="text-start font-bold px-4 py-3">{ar ? "الإجمالي" : "Total"}</th>
                  <th className="text-start font-bold px-4 py-3 hidden sm:table-cell">{ar ? "اليوم" : "Day"}</th>
                  <th className="text-start font-bold px-4 py-3 hidden md:table-cell">{ar ? "آخر تسجيل" : "Last posted"}</th>
                  <th className="text-start font-bold px-4 py-3">{ar ? "الحالة" : "Status"}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const active = r.active !== false;
                  return (
                    <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50/60">
                      <td className="px-4 py-3 font-bold text-gray-800">{r.name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600">
                          {categoryLabel(r.category, "expense", ar)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-rose-600 whitespace-nowrap">{formatMoney(r.total, ar)}</td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{r.day_of_month || 1}</td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{r.last_posted_month || "—"}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => onToggle(r)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${active ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}
                        >
                          <Power className="w-3 h-3" />
                          {active ? (ar ? "مُفعّل" : "Active") : (ar ? "موقوف" : "Paused")}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => onEdit(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => onDelete(r.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        {ar
          ? "تُسجَّل المصروفات المتكرّرة ورواتب الموظفات تلقائياً مرة واحدة كل شهر. يمكنك أيضاً تسجيلها يدوياً بالزر أعلاه."
          : "Recurring expenses and employee salaries are auto-posted once a month. You can also post them manually above."}
      </p>
    </div>
  );
}

// ── Services catalog (الخدمات) ────────────────────────────────────────────────
function ServicesTab({ ar, rows, onAdd, onEdit, onDelete }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={onAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700">
          <Plus className="w-4 h-4" />
          {ar ? "إضافة خدمة" : "Add Service"}
        </button>
      </div>
      {rows.length === 0 ? (
        <Empty ar={ar} big />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((s) => {
            const active = s.active !== false;
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-extrabold text-gray-900 truncate">{s.name}</p>
                    <p className="text-xs text-gray-500">{categoryLabel(s.category, "income", ar)}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(s.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-extrabold text-indigo-600">{formatMoney(s.price, ar)}</span>
                  <span className="text-[11px] font-bold text-gray-500">
                    {(s.vat_included === true || s.vat_included === 1)
                      ? (ar ? "شامل الضريبة" : "VAT incl.")
                      : (ar ? "+ ضريبة" : "+ VAT")}
                    {!active && (ar ? " · غير متاحة" : " · inactive")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-gray-400 text-center">
        {ar
          ? "تظهر هذه الخدمات في نافذة الحركة (إيراد) لتعبئة السعر والضريبة تلقائياً."
          : "These services appear in the income transaction modal to auto-fill price and VAT."}
      </p>
    </div>
  );
}

// ── Tax reports (KSA VAT) ────────────────────────────────────────────────────
const BUSINESS_NAME = "هوفيرا";

function ReportsTab({ ar, allTx }) {
  // The VAT return has its OWN period picker, defaulting to the current quarter,
  // independent of the page-level date range.
  const dq = useMemo(() => quarterRange(), []);
  const [rFrom, setRFrom] = useState(dq.from);
  const [rTo, setRTo] = useState(dq.to);

  const rows = useMemo(() => allTx.filter((t) => inRange(t, rFrom, rTo)), [allTx, rFrom, rTo]);
  const stats = useMemo(() => summarize(rows), [rows]);

  // Detailed P&L: revenue + expenses broken down by category (net amounts).
  const pnl = useMemo(() => {
    const inc = {}, exp = {};
    for (const t of rows) {
      const amt = Number(t.amount) || 0;
      if (t.type === "expense") exp[t.category] = (exp[t.category] || 0) + amt;
      else inc[t.category] = (inc[t.category] || 0) + amt;
    }
    const toArr = (obj, type) => Object.entries(obj)
      .map(([cat, amt]) => ({ cat, label: categoryLabel(cat, type, ar), amt: round2(amt) }))
      .sort((a, b) => b.amt - a.amt);
    return { income: toArr(inc, "income"), expense: toArr(exp, "expense") };
  }, [rows, ar]);

  const inputCls = "rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400";

  const line = (label, value, strong) => (
    <div className={`flex items-center justify-between px-4 py-3 ${strong ? "bg-gray-50 font-extrabold" : ""}`}>
      <span className={strong ? "text-gray-900" : "text-gray-600"}>{label}</span>
      <span className={strong ? "text-indigo-700" : "text-gray-800 font-bold"}>{value}</span>
    </div>
  );

  // Open a dedicated print window with a clean RTL ZATCA-style return and print.
  const printReport = () => {
    const row = (label, value, strong) =>
      `<tr class="${strong ? "strong" : ""}"><td class="lbl">${label}</td><td class="val">${value}</td></tr>`;
    const html = `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8" />
<title>${ar ? "إقرار ضريبة القيمة المضافة" : "VAT Return"} — ${rFrom} / ${rTo}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Tahoma, sans-serif; color:#1f2937; margin:0; padding:32px; }
  .head { text-align:center; border-bottom:3px solid #4f46e5; padding-bottom:16px; margin-bottom:24px; }
  .head h1 { margin:0 0 4px; font-size:22px; }
  .head .biz { font-size:18px; font-weight:800; color:#4f46e5; }
  .head .period { color:#6b7280; font-size:13px; margin-top:6px; }
  table { width:100%; border-collapse:collapse; margin-bottom:24px; }
  td { padding:12px 14px; border:1px solid #e5e7eb; font-size:14px; }
  td.lbl { color:#374151; }
  td.val { text-align:left; font-weight:700; white-space:nowrap; }
  tr.strong td { background:#eef2ff; font-weight:800; color:#3730a3; font-size:15px; }
  h2 { font-size:15px; margin:0 0 8px; }
  .note { color:#92400e; background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:12px 14px; font-size:12px; }
  @media print { body { padding:0; } }
</style></head>
<body>
  <div class="head">
    <div class="biz">${BUSINESS_NAME}</div>
    <h1>${ar ? "إقرار ضريبة القيمة المضافة" : "VAT Return Summary"}</h1>
    <div class="period">${ar ? "الفترة" : "Period"}: ${rFrom} ← ${rTo}</div>
  </div>

  <h2>${ar ? "ملخص الإقرار الضريبي" : "VAT Return"}</h2>
  <table>
    ${row(ar ? "المبيعات الخاضعة (الصافي)" : "Taxable sales (net)", formatMoney(stats.income, ar))}
    ${row(ar ? "ضريبة المخرجات (المحصّلة)" : "Output VAT", formatMoney(stats.outputVat, ar))}
    ${row(ar ? "المشتريات/المصروفات (الصافي)" : "Purchases (net)", formatMoney(stats.expense, ar))}
    ${row(ar ? "ضريبة المدخلات (المدفوعة)" : "Input VAT", formatMoney(stats.inputVat, ar))}
    ${row(ar ? "صافي الضريبة المستحقة للهيئة" : "Net VAT due", formatMoney(stats.vatDue, ar), true)}
  </table>

  <h2>${ar ? "قائمة الدخل (الأرباح والخسائر)" : "Profit & Loss"}</h2>
  <table>
    <tr><td class="lbl" style="font-weight:800;background:#ecfdf5">${ar ? "الإيرادات حسب الفئة" : "Revenue by category"}</td><td class="val" style="background:#ecfdf5"></td></tr>
    ${pnl.income.map((r) => row(r.label, formatMoney(r.amt, ar))).join("")}
    ${row(ar ? "إجمالي الإيرادات" : "Total revenue", formatMoney(stats.income, ar), true)}
    <tr><td class="lbl" style="font-weight:800;background:#fef2f2">${ar ? "المصروفات حسب الفئة" : "Expenses by category"}</td><td class="val" style="background:#fef2f2"></td></tr>
    ${pnl.expense.map((r) => row(r.label, formatMoney(r.amt, ar))).join("")}
    ${row(ar ? "إجمالي المصروفات" : "Total expenses", formatMoney(stats.expense, ar), true)}
    ${row(ar ? "صافي الربح" : "Net profit", formatMoney(stats.netProfit, ar), true)}
  </table>

  <p class="note">${ar
    ? "هذا التقرير استرشادي لمساعدتك على التنظيم، ولا يُغني عن مراجعة محاسب قانوني معتمد قبل تقديم الإقرار للهيئة (زاتكا)."
    : "This report is indicative only and does not replace review by a certified accountant before filing with ZATCA."}</p>

  <script>window.onload = function(){ window.print(); };</script>
</body></html>`;
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) { window.alert(ar ? "فضلاً اسمح بالنوافذ المنبثقة للطباعة." : "Please allow pop-ups to print."); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  // Export both reports (VAT return + categorised P&L) to an Excel workbook.
  const exportReportExcel = () => {
    const wb = XLSX.utils.book_new();
    const vat = [
      [ar ? "إقرار ضريبة القيمة المضافة" : "VAT Return", BUSINESS_NAME],
      [ar ? "الفترة" : "Period", `${rFrom} ← ${rTo}`],
      [],
      [ar ? "البند" : "Item", ar ? "المبلغ" : "Amount"],
      [ar ? "المبيعات الخاضعة (الصافي)" : "Taxable sales (net)", stats.income],
      [ar ? "ضريبة المخرجات" : "Output VAT", stats.outputVat],
      [ar ? "المشتريات/المصروفات (الصافي)" : "Purchases (net)", stats.expense],
      [ar ? "ضريبة المدخلات" : "Input VAT", stats.inputVat],
      [ar ? "صافي الضريبة المستحقة" : "Net VAT due", stats.vatDue],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(vat), ar ? "الإقرار الضريبي" : "VAT");
    const pl = [
      [ar ? "قائمة الدخل (الأرباح والخسائر)" : "Profit & Loss", BUSINESS_NAME],
      [ar ? "الفترة" : "Period", `${rFrom} ← ${rTo}`],
      [],
      [ar ? "الإيرادات حسب الفئة" : "Revenue by category", ""],
      ...pnl.income.map((r) => [r.label, r.amt]),
      [ar ? "إجمالي الإيرادات" : "Total revenue", stats.income],
      [],
      [ar ? "المصروفات حسب الفئة" : "Expenses by category", ""],
      ...pnl.expense.map((r) => [r.label, r.amt]),
      [ar ? "إجمالي المصروفات" : "Total expenses", stats.expense],
      [],
      [ar ? "صافي الربح" : "Net profit", stats.netProfit],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pl), ar ? "قائمة الدخل" : "P&L");
    XLSX.writeFile(wb, `reports_${rFrom}_${rTo}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Period picker (defaults to current quarter) + print */}
      <div className="flex flex-wrap items-center gap-2 bg-white rounded-2xl border border-gray-100 p-3">
        <span className="text-xs font-bold text-gray-500">{ar ? "فترة الإقرار:" : "Return period:"}</span>
        <input type="date" className={inputCls} value={rFrom} onChange={(e) => setRFrom(e.target.value)} />
        <span className="text-gray-400">{ar ? "←" : "→"}</span>
        <input type="date" className={inputCls} value={rTo} onChange={(e) => setRTo(e.target.value)} />
        <button
          onClick={() => { const q = quarterRange(); setRFrom(q.from); setRTo(q.to); }}
          className="text-xs font-bold text-indigo-600 hover:underline px-2"
        >
          {ar ? "هذا الربع" : "This quarter"}
        </button>
        <div className="ms-auto flex items-center gap-2">
          <button
            onClick={exportReportExcel}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {ar ? "تصدير إكسل" : "Excel"}
          </button>
          <button
            onClick={printReport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700"
          >
            <Printer className="w-4 h-4" />
            {ar ? "طباعة / PDF" : "Print / PDF"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-indigo-50">
          <h3 className="font-extrabold text-gray-900 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-indigo-600" />
            {ar ? `إقرار ضريبة القيمة المضافة — ${BUSINESS_NAME}` : "VAT Return Summary"}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{rFrom} → {rTo}</p>
        </div>
        <div className="divide-y divide-gray-50">
          {line(ar ? "المبيعات الخاضعة (الصافي)" : "Taxable sales (net)", formatMoney(stats.income, ar))}
          {line(ar ? "ضريبة المخرجات (المحصّلة)" : "Output VAT (collected)", formatMoney(stats.outputVat, ar))}
          {line(ar ? "المشتريات/المصروفات (الصافي)" : "Purchases (net)", formatMoney(stats.expense, ar))}
          {line(ar ? "ضريبة المدخلات (المدفوعة)" : "Input VAT (paid)", formatMoney(stats.inputVat, ar))}
          {line(ar ? "صافي الضريبة المستحقة للهيئة" : "Net VAT due to authority", formatMoney(stats.vatDue, ar), true)}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-extrabold text-gray-900">{ar ? "قائمة الدخل (الأرباح والخسائر)" : "Profit & Loss"}</h3>
        </div>
        <div className="divide-y divide-gray-50">
          <div className="px-4 py-2 text-[11px] font-extrabold text-emerald-700 bg-emerald-50">{ar ? "الإيرادات حسب الفئة" : "Revenue by category"}</div>
          {pnl.income.length === 0 && <div className="px-4 py-2 text-xs text-gray-400">{ar ? "لا إيرادات في الفترة" : "No revenue"}</div>}
          {pnl.income.map((r) => <React.Fragment key={`i-${r.cat}`}>{line(r.label, formatMoney(r.amt, ar))}</React.Fragment>)}
          {line(ar ? "إجمالي الإيرادات" : "Total revenue", formatMoney(stats.income, ar), true)}
          <div className="px-4 py-2 text-[11px] font-extrabold text-rose-700 bg-rose-50">{ar ? "المصروفات حسب الفئة" : "Expenses by category"}</div>
          {pnl.expense.length === 0 && <div className="px-4 py-2 text-xs text-gray-400">{ar ? "لا مصروفات في الفترة" : "No expenses"}</div>}
          {pnl.expense.map((r) => <React.Fragment key={`e-${r.cat}`}>{line(r.label, formatMoney(r.amt, ar))}</React.Fragment>)}
          {line(ar ? "إجمالي المصروفات" : "Total expenses", formatMoney(stats.expense, ar), true)}
          {line(ar ? "صافي الربح" : "Net profit", formatMoney(stats.netProfit, ar), true)}
        </div>
      </div>

      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
        {ar
          ? "⚠️ هذه التقارير استرشادية لمساعدتك على التنظيم، ولا تُغني عن مراجعة محاسب قانوني معتمد قبل تقديم الإقرار للهيئة (زاتكا)."
          : "⚠️ These reports are indicative only and do not replace review by a certified accountant before filing with ZATCA."}
      </p>
    </div>
  );
}

function Empty({ ar, big }) {
  return (
    <div className={`flex flex-col items-center justify-center text-gray-400 ${big ? "py-20" : "py-12"}`}>
      <Receipt className="w-8 h-8 mb-2 opacity-50" />
      <p className="text-sm">{ar ? "لا توجد بيانات بعد" : "No data yet"}</p>
    </div>
  );
}
