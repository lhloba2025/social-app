import React, { useState } from "react";

function genId() { return Math.random().toString(36).slice(2, 9); }

// ─── تعريف القوالب الجاهزة ────────────────────────────────────────────────────
const TEMPLATES = [
  // ─── انستقرام عروض ────────────────────────────────────────────────────────
  {
    id: "offer-1",
    nameAr: "عرض تخفيض",
    category: "عروض",
    preview: { bg: "linear-gradient(135deg,#7c3aed,#2563eb)", text: "50%" },
    data: {
      bg: { mode: "gradient", gradientAngle: 135, gradientStops: [{ color: "#7c3aed", position: 0, opacity: 1 }, { color: "#2563eb", position: 100, opacity: 1 }] },
      textLayers: [
        { id: genId(), text: "عرض محدود", x: 50, y: 25, fontSize: 36, fontFamily: "Tajawal", color: "#ffffff", bold: true, italic: false, align: "center", shadow: true, opacity: 1, visible: true, bgColor: "", lineHeight: 1.4, rotation: 0, blur: 0, brightness: 100, textWidth: 80 },
        { id: genId(), text: "خصم 50%", x: 50, y: 45, fontSize: 72, fontFamily: "Cairo", color: "#fbbf24", bold: true, italic: false, align: "center", shadow: true, opacity: 1, visible: true, bgColor: "", lineHeight: 1.2, rotation: 0, blur: 0, brightness: 100, textWidth: 80 },
        { id: genId(), text: "على جميع المنتجات", x: 50, y: 65, fontSize: 28, fontFamily: "Tajawal", color: "#e2e8f0", bold: false, italic: false, align: "center", shadow: false, opacity: 1, visible: true, bgColor: "", lineHeight: 1.4, rotation: 0, blur: 0, brightness: 100, textWidth: 80 },
        { id: genId(), text: "اطلب الآن!", x: 50, y: 82, fontSize: 22, fontFamily: "Tajawal", color: "#ffffff", bold: true, italic: false, align: "center", shadow: false, opacity: 1, visible: true, bgColor: "#7c3aed", lineHeight: 1.6, rotation: 0, blur: 0, brightness: 100, textWidth: 40 },
      ],
      shapes: [
        { id: genId(), shapeType: "circle", x: 3, y: 3, width: 15, height: 15, fillColor: "#ffffff15", borderColor: "#ffffff", borderWidth: 0, opacity: 0.3, visible: true, rotation: 0, borderRadius: 0 },
        { id: genId(), shapeType: "circle", x: 80, y: 70, width: 20, height: 20, fillColor: "#ffffff10", borderColor: "#ffffff", borderWidth: 0, opacity: 0.2, visible: true, rotation: 0, borderRadius: 0 },
      ],
      images: [], logos: [], groups: [],
    },
  },
  {
    id: "offer-2",
    nameAr: "إطلاق منتج",
    category: "عروض",
    preview: { bg: "linear-gradient(135deg,#0f172a,#1e3a5f)", text: "جديد" },
    data: {
      bg: { mode: "gradient", gradientAngle: 180, gradientStops: [{ color: "#0f172a", position: 0, opacity: 1 }, { color: "#1e3a5f", position: 100, opacity: 1 }] },
      textLayers: [
        { id: genId(), text: "وصل حديثاً", x: 50, y: 20, fontSize: 24, fontFamily: "Readex Pro", color: "#60a5fa", bold: false, italic: false, align: "center", shadow: false, opacity: 1, visible: true, bgColor: "", lineHeight: 1.4, rotation: 0, blur: 0, brightness: 100, textWidth: 70 },
        { id: genId(), text: "اسم المنتج الجديد", x: 50, y: 42, fontSize: 48, fontFamily: "Cairo", color: "#ffffff", bold: true, italic: false, align: "center", shadow: true, opacity: 1, visible: true, bgColor: "", lineHeight: 1.2, rotation: 0, blur: 0, brightness: 100, textWidth: 85 },
        { id: genId(), text: "أحدث الابتكارات في متناول يدك", x: 50, y: 62, fontSize: 22, fontFamily: "Tajawal", color: "#94a3b8", bold: false, italic: false, align: "center", shadow: false, opacity: 1, visible: true, bgColor: "", lineHeight: 1.5, rotation: 0, blur: 0, brightness: 100, textWidth: 80 },
        { id: genId(), text: "اكتشف الآن ←", x: 50, y: 80, fontSize: 20, fontFamily: "Tajawal", color: "#60a5fa", bold: true, italic: false, align: "center", shadow: false, opacity: 1, visible: true, bgColor: "#1d4ed8", lineHeight: 1.8, rotation: 0, blur: 0, brightness: 100, textWidth: 40 },
      ],
      shapes: [
        { id: genId(), shapeType: "line", x: 25, y: 32, width: 50, height: 1, fillColor: "#3b82f6", borderColor: "#3b82f6", borderWidth: 1, opacity: 0.5, visible: true, rotation: 0, borderRadius: 0 },
      ],
      images: [], logos: [], groups: [],
    },
  },

  // ─── اقتباسات تحفيزية ───────────────────────────────────────────────────────
  {
    id: "quote-1",
    nameAr: "اقتباس تحفيزي",
    category: "اقتباسات",
    preview: { bg: "linear-gradient(135deg,#1e293b,#334155)", text: '"..."' },
    data: {
      bg: { mode: "gradient", gradientAngle: 135, gradientStops: [{ color: "#1e293b", position: 0, opacity: 1 }, { color: "#334155", position: 100, opacity: 1 }] },
      textLayers: [
        { id: genId(), text: '"', x: 12, y: 20, fontSize: 80, fontFamily: "Amiri", color: "#8b5cf6", bold: false, italic: false, align: "center", shadow: false, opacity: 0.6, visible: true, bgColor: "", lineHeight: 1, rotation: 0, blur: 0, brightness: 100, textWidth: 15 },
        { id: genId(), text: "النجاح ليس نهاية الطريق،\nالفشل ليس قاتلاً،\nالشجاعة للمتابعة هي ما يهم.", x: 50, y: 42, fontSize: 28, fontFamily: "El Messiri", color: "#f1f5f9", bold: false, italic: false, align: "center", shadow: false, opacity: 1, visible: true, bgColor: "", lineHeight: 1.7, rotation: 0, blur: 0, brightness: 100, textWidth: 80 },
        { id: genId(), text: "— ونستون تشرشل", x: 50, y: 78, fontSize: 18, fontFamily: "Tajawal", color: "#8b5cf6", bold: false, italic: true, align: "center", shadow: false, opacity: 1, visible: true, bgColor: "", lineHeight: 1.4, rotation: 0, blur: 0, brightness: 100, textWidth: 60 },
      ],
      shapes: [
        { id: genId(), shapeType: "line", x: 30, y: 73, width: 40, height: 1, fillColor: "#8b5cf6", borderColor: "#8b5cf6", borderWidth: 1, opacity: 0.4, visible: true, rotation: 0, borderRadius: 0 },
      ],
      images: [], logos: [], groups: [],
    },
  },
  {
    id: "quote-2",
    nameAr: "اقتباس ذهبي",
    category: "اقتباسات",
    preview: { bg: "#1a1a1a", text: "✨" },
    data: {
      bg: { mode: "color", color: "#1a1a1a" },
      textLayers: [
        { id: genId(), text: "✨", x: 50, y: 18, fontSize: 40, fontFamily: "Tajawal", color: "#fbbf24", bold: false, italic: false, align: "center", shadow: false, opacity: 1, visible: true, bgColor: "", lineHeight: 1, rotation: 0, blur: 0, brightness: 100, textWidth: 20 },
        { id: genId(), text: "كل إنجاز عظيم\nبدأ بقرار واحد شجاع", x: 50, y: 45, fontSize: 34, fontFamily: "Lalezar", color: "#fbbf24", bold: false, italic: false, align: "center", shadow: false, opacity: 1, visible: true, bgColor: "", lineHeight: 1.5, rotation: 0, blur: 0, brightness: 100, textWidth: 82 },
        { id: genId(), text: "اليوم هو اليوم المناسب", x: 50, y: 78, fontSize: 18, fontFamily: "Cairo", color: "#a16207", bold: false, italic: false, align: "center", shadow: false, opacity: 1, visible: true, bgColor: "", lineHeight: 1.4, rotation: 0, blur: 0, brightness: 100, textWidth: 70 },
      ],
      shapes: [],
      images: [], logos: [], groups: [],
    },
  },

  // ─── إعلانات ─────────────────────────────────────────────────────────────
  {
    id: "ad-1",
    nameAr: "إعلان خدمة",
    category: "إعلانات",
    preview: { bg: "linear-gradient(135deg,#059669,#0d9488)", text: "✓" },
    data: {
      bg: { mode: "gradient", gradientAngle: 135, gradientStops: [{ color: "#059669", position: 0, opacity: 1 }, { color: "#0d9488", position: 100, opacity: 1 }] },
      textLayers: [
        { id: genId(), text: "اسم شركتك", x: 50, y: 15, fontSize: 20, fontFamily: "Readex Pro", color: "#d1fae5", bold: false, italic: false, align: "center", shadow: false, opacity: 1, visible: true, bgColor: "", lineHeight: 1.4, rotation: 0, blur: 0, brightness: 100, textWidth: 60 },
        { id: genId(), text: "نقدم لك\nأفضل الخدمات", x: 50, y: 38, fontSize: 44, fontFamily: "Cairo", color: "#ffffff", bold: true, italic: false, align: "center", shadow: true, opacity: 1, visible: true, bgColor: "", lineHeight: 1.3, rotation: 0, blur: 0, brightness: 100, textWidth: 85 },
        { id: genId(), text: "✓ جودة عالية   ✓ سرعة في التنفيذ   ✓ ضمان", x: 50, y: 65, fontSize: 18, fontFamily: "Tajawal", color: "#ecfdf5", bold: false, italic: false, align: "center", shadow: false, opacity: 1, visible: true, bgColor: "", lineHeight: 1.6, rotation: 0, blur: 0, brightness: 100, textWidth: 85 },
        { id: genId(), text: "تواصل معنا الآن", x: 50, y: 82, fontSize: 20, fontFamily: "Tajawal", color: "#059669", bold: true, italic: false, align: "center", shadow: false, opacity: 1, visible: true, bgColor: "#ffffff", lineHeight: 1.8, rotation: 0, blur: 0, brightness: 100, textWidth: 45 },
      ],
      shapes: [
        { id: genId(), shapeType: "line", x: 20, y: 26, width: 60, height: 1, fillColor: "#ffffff", borderColor: "#ffffff", borderWidth: 1, opacity: 0.3, visible: true, rotation: 0, borderRadius: 0 },
      ],
      images: [], logos: [], groups: [],
    },
  },

  // ─── ستوري ──────────────────────────────────────────────────────────────
  {
    id: "story-1",
    nameAr: "ستوري ترحيب",
    category: "ستوري",
    preview: { bg: "linear-gradient(180deg,#7c3aed,#ec4899)", text: "👋" },
    data: {
      bg: { mode: "gradient", gradientAngle: 180, gradientStops: [{ color: "#7c3aed", position: 0, opacity: 1 }, { color: "#ec4899", position: 100, opacity: 1 }] },
      textLayers: [
        { id: genId(), text: "👋", x: 50, y: 22, fontSize: 60, fontFamily: "Tajawal", color: "#ffffff", bold: false, italic: false, align: "center", shadow: false, opacity: 1, visible: true, bgColor: "", lineHeight: 1, rotation: 0, blur: 0, brightness: 100, textWidth: 30 },
        { id: genId(), text: "مرحباً بكم!", x: 50, y: 40, fontSize: 52, fontFamily: "Lalezar", color: "#ffffff", bold: false, italic: false, align: "center", shadow: true, opacity: 1, visible: true, bgColor: "", lineHeight: 1.3, rotation: 0, blur: 0, brightness: 100, textWidth: 85 },
        { id: genId(), text: "نسعد بمتابعتكم واهتمامكم الكريم\nشكراً لكم من القلب", x: 50, y: 60, fontSize: 24, fontFamily: "Tajawal", color: "#fce7f3", bold: false, italic: false, align: "center", shadow: false, opacity: 1, visible: true, bgColor: "", lineHeight: 1.6, rotation: 0, blur: 0, brightness: 100, textWidth: 80 },
        { id: genId(), text: "@اسم_حسابك", x: 50, y: 82, fontSize: 20, fontFamily: "Cairo", color: "#ffffff", bold: false, italic: false, align: "center", shadow: false, opacity: 0.8, visible: true, bgColor: "", lineHeight: 1.4, rotation: 0, blur: 0, brightness: 100, textWidth: 60 },
      ],
      shapes: [],
      images: [], logos: [], groups: [],
    },
  },

  // ─── أحداث ──────────────────────────────────────────────────────────────
  {
    id: "event-1",
    nameAr: "دعوة لحدث",
    category: "أحداث",
    preview: { bg: "linear-gradient(135deg,#1e1b4b,#312e81)", text: "📅" },
    data: {
      bg: { mode: "gradient", gradientAngle: 135, gradientStops: [{ color: "#1e1b4b", position: 0, opacity: 1 }, { color: "#312e81", position: 100, opacity: 1 }] },
      textLayers: [
        { id: genId(), text: "أنت مدعو إلى", x: 50, y: 18, fontSize: 22, fontFamily: "Readex Pro", color: "#a5b4fc", bold: false, italic: false, align: "center", shadow: false, opacity: 1, visible: true, bgColor: "", lineHeight: 1.4, rotation: 0, blur: 0, brightness: 100, textWidth: 70 },
        { id: genId(), text: "اسم الحدث\nأو الفعالية", x: 50, y: 40, fontSize: 46, fontFamily: "Cairo", color: "#ffffff", bold: true, italic: false, align: "center", shadow: true, opacity: 1, visible: true, bgColor: "", lineHeight: 1.25, rotation: 0, blur: 0, brightness: 100, textWidth: 85 },
        { id: genId(), text: "📅 التاريخ: 1 يناير 2026", x: 50, y: 64, fontSize: 20, fontFamily: "Tajawal", color: "#c7d2fe", bold: false, italic: false, align: "center", shadow: false, opacity: 1, visible: true, bgColor: "", lineHeight: 1.5, rotation: 0, blur: 0, brightness: 100, textWidth: 75 },
        { id: genId(), text: "📍 المكان: اسم المكان", x: 50, y: 73, fontSize: 20, fontFamily: "Tajawal", color: "#c7d2fe", bold: false, italic: false, align: "center", shadow: false, opacity: 1, visible: true, bgColor: "", lineHeight: 1.5, rotation: 0, blur: 0, brightness: 100, textWidth: 75 },
        { id: genId(), text: "سجّل الآن", x: 50, y: 86, fontSize: 20, fontFamily: "Cairo", color: "#1e1b4b", bold: true, italic: false, align: "center", shadow: false, opacity: 1, visible: true, bgColor: "#a5b4fc", lineHeight: 1.8, rotation: 0, blur: 0, brightness: 100, textWidth: 40 },
      ],
      shapes: [
        { id: genId(), shapeType: "line", x: 20, y: 30, width: 60, height: 1, fillColor: "#818cf8", borderColor: "#818cf8", borderWidth: 1, opacity: 0.5, visible: true, rotation: 0, borderRadius: 0 },
        { id: genId(), shapeType: "line", x: 20, y: 58, width: 60, height: 1, fillColor: "#818cf8", borderColor: "#818cf8", borderWidth: 1, opacity: 0.5, visible: true, rotation: 0, borderRadius: 0 },
      ],
      images: [], logos: [], groups: [],
    },
  },

  // ─── منتجات ──────────────────────────────────────────────────────────────
  {
    id: "product-1",
    nameAr: "بطاقة منتج",
    category: "منتجات",
    preview: { bg: "linear-gradient(135deg,#f8fafc,#e2e8f0)", text: "🛍" },
    data: {
      bg: { mode: "gradient", gradientAngle: 160, gradientStops: [{ color: "#f8fafc", position: 0, opacity: 1 }, { color: "#e2e8f0", position: 100, opacity: 1 }] },
      textLayers: [
        { id: genId(), text: "اسم المنتج", x: 50, y: 72, fontSize: 32, fontFamily: "Cairo", color: "#1e293b", bold: true, italic: false, align: "center", shadow: false, opacity: 1, visible: true, bgColor: "", lineHeight: 1.3, rotation: 0, blur: 0, brightness: 100, textWidth: 80 },
        { id: genId(), text: "وصف مختصر للمنتج أو الميزات الرئيسية", x: 50, y: 83, fontSize: 18, fontFamily: "Tajawal", color: "#64748b", bold: false, italic: false, align: "center", shadow: false, opacity: 1, visible: true, bgColor: "", lineHeight: 1.4, rotation: 0, blur: 0, brightness: 100, textWidth: 80 },
        { id: genId(), text: "السعر: 99 ريال", x: 50, y: 92, fontSize: 22, fontFamily: "Readex Pro", color: "#0ea5e9", bold: true, italic: false, align: "center", shadow: false, opacity: 1, visible: true, bgColor: "", lineHeight: 1.4, rotation: 0, blur: 0, brightness: 100, textWidth: 60 },
      ],
      shapes: [
        { id: genId(), shapeType: "rectangle", x: 5, y: 5, width: 90, height: 60, fillColor: "#dbeafe", borderColor: "#93c5fd", borderWidth: 1, opacity: 0.5, visible: true, rotation: 0, borderRadius: 8 },
      ],
      images: [], logos: [], groups: [],
    },
  },
];

const CATEGORIES = ["الكل", ...new Set(TEMPLATES.map(t => t.category))];

// ─── مكوّن بطاقة القالب ────────────────────────────────────────────────────
function TemplateCard({ template, onApply }) {
  const { preview, nameAr } = template;
  return (
    <button
      onClick={() => onApply(template)}
      className="group w-full rounded-lg overflow-hidden border-2 border-transparent hover:border-indigo-500 transition-all"
    >
      <div
        className="w-full aspect-square flex items-center justify-center text-3xl font-bold text-white"
        style={{ background: preview.bg }}
      >
        {preview.text}
      </div>
      <div className="bg-slate-700 group-hover:bg-slate-600 px-2 py-1 text-xs text-slate-300 text-center transition">
        {nameAr}
      </div>
    </button>
  );
}

// ─── اللوحة الرئيسية ──────────────────────────────────────────────────────
export default function TemplatesPanel({ onApply, language }) {
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [confirmTemplate, setConfirmTemplate] = useState(null);

  const filtered = activeCategory === "الكل"
    ? TEMPLATES
    : TEMPLATES.filter(t => t.category === activeCategory);

  const handleApply = (template) => {
    setConfirmTemplate(template);
  };

  const confirmApply = () => {
    if (!confirmTemplate) return;
    // Deep copy to avoid mutation
    const data = JSON.parse(JSON.stringify(confirmTemplate.data));
    // Regenerate all IDs to avoid conflicts
    const regen = (arr) => arr.map(el => ({ ...el, id: genId() }));
    onApply({
      textLayers: regen(data.textLayers),
      shapes: regen(data.shapes),
      images: regen(data.images),
      logos: regen(data.logos),
      groups: data.groups,
      bg: data.bg,
    });
    setConfirmTemplate(null);
  };

  return (
    <div className="space-y-3">
      <p className="text-slate-400 text-xs">اختر قالباً جاهزاً وعدّل عليه</p>

      {/* فلتر الفئات */}
      <div className="flex flex-wrap gap-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-2 py-0.5 rounded text-xs font-semibold transition ${
              cat === activeCategory
                ? "bg-indigo-600 text-white"
                : "bg-slate-700 text-slate-400 hover:bg-slate-600"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* شبكة القوالب */}
      <div className="grid grid-cols-2 gap-2">
        {filtered.map(t => (
          <TemplateCard key={t.id} template={t} onApply={handleApply} />
        ))}
      </div>

      {/* مودال التأكيد */}
      {confirmTemplate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setConfirmTemplate(null)}>
          <div className="bg-slate-800 rounded-2xl p-5 w-72 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-2">تطبيق القالب</h3>
            <p className="text-slate-400 text-sm mb-4">
              سيتم استبدال محتوى الصفحة الحالية بقالب "<span className="text-white font-semibold">{confirmTemplate.nameAr}</span>". هل أنت متأكد؟
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmTemplate(null)} className="flex-1 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm transition">
                إلغاء
              </button>
              <button onClick={confirmApply} className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold transition">
                تطبيق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
