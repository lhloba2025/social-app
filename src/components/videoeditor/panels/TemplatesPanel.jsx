import React, { useState } from "react";

const CATEGORIES = ["الكل", "سوشيال ميديا", "إعلانات", "تعليمي", "رياضة", "موضة"];

const TEMPLATES = [
  {
    id: 1, name: "ريلز انستقرام", category: "سوشيال ميديا", duration: "0:30",
    color: "#ff6b6b", ratio: "9:16", emoji: "📱",
    textLayers: [
      { id: 1, text: "عنوان رئيسي", font: "Cairo", fontSize: 40, color: "#ffffff", bold: true, italic: false, align: "center", bg: "transparent", x: 50, y: 30 },
      { id: 2, text: "تابعونا للمزيد 🔥", font: "Cairo", fontSize: 22, color: "#ffdd57", bold: false, italic: false, align: "center", bg: "transparent", x: 50, y: 75 },
    ]
  },
  {
    id: 2, name: "إعلان منتج", category: "إعلانات", duration: "0:15",
    color: "#4ecdc4", ratio: "16:9", emoji: "🛍️",
    textLayers: [
      { id: 1, text: "عرض حصري!", font: "Tajawal", fontSize: 44, color: "#fff", bold: true, italic: false, align: "center", bg: "#e63946", x: 50, y: 25 },
      { id: 2, text: "خصم 50%", font: "Tajawal", fontSize: 60, color: "#ffdd57", bold: true, italic: false, align: "center", bg: "transparent", x: 50, y: 50 },
      { id: 3, text: "اطلب الآن", font: "Tajawal", fontSize: 28, color: "#fff", bold: false, italic: false, align: "center", bg: "transparent", x: 50, y: 75 },
    ]
  },
  {
    id: 3, name: "فيديو تعليمي", category: "تعليمي", duration: "1:00",
    color: "#a8dadc", ratio: "16:9", emoji: "📚",
    textLayers: [
      { id: 1, text: "درس اليوم", font: "Cairo", fontSize: 36, color: "#1d3557", bold: true, italic: false, align: "center", bg: "#a8dadc", x: 50, y: 20 },
      { id: 2, text: "اكتب موضوع الدرس هنا", font: "Cairo", fontSize: 28, color: "#fff", bold: false, italic: false, align: "center", bg: "transparent", x: 50, y: 55 },
    ]
  },
  {
    id: 4, name: "تيك توك ترند", category: "سوشيال ميديا", duration: "0:15",
    color: "#ff0050", ratio: "9:16", emoji: "🎵",
    textLayers: [
      { id: 1, text: "اكتشف السر! 👀", font: "Cairo", fontSize: 38, color: "#ffffff", bold: true, italic: false, align: "center", bg: "transparent", x: 50, y: 20 },
      { id: 2, text: "#ترند", font: "Cairo", fontSize: 24, color: "#00f2ea", bold: false, italic: false, align: "center", bg: "transparent", x: 50, y: 80 },
    ]
  },
  {
    id: 5, name: "أبطولة رياضية", category: "رياضة", duration: "0:30",
    color: "#f77f00", ratio: "16:9", emoji: "⚽",
    textLayers: [
      { id: 1, text: "مباشر الآن", font: "Oswald", fontSize: 48, color: "#fff", bold: true, italic: false, align: "center", bg: "#d62828", x: 50, y: 20 },
      { id: 2, text: "الفريق الأول VS الفريق الثاني", font: "Oswald", fontSize: 30, color: "#ffdd57", bold: true, italic: false, align: "center", bg: "transparent", x: 50, y: 55 },
    ]
  },
  {
    id: 6, name: "عرض أزياء", category: "موضة", duration: "0:45",
    color: "#c77dff", ratio: "9:16", emoji: "👗",
    textLayers: [
      { id: 1, text: "كولكشن جديد", font: "Montserrat", fontSize: 36, color: "#fff", bold: false, italic: true, align: "center", bg: "transparent", x: 50, y: 15 },
      { id: 2, text: "Spring 2026", font: "Montserrat", fontSize: 28, color: "#ffcad4", bold: false, italic: false, align: "center", bg: "transparent", x: 50, y: 80 },
    ]
  },
  {
    id: 7, name: "خبر عاجل", category: "إعلانات", duration: "0:20",
    color: "#e63946", ratio: "16:9", emoji: "📢",
    textLayers: [
      { id: 1, text: "⚡ خبر عاجل", font: "Cairo", fontSize: 42, color: "#fff", bold: true, italic: false, align: "center", bg: "#e63946", x: 50, y: 20 },
      { id: 2, text: "اكتب تفاصيل الخبر هنا", font: "Cairo", fontSize: 26, color: "#fff", bold: false, italic: false, align: "center", bg: "transparent", x: 50, y: 55 },
    ]
  },
  {
    id: 8, name: "يوتيوب إنترو", category: "سوشيال ميديا", duration: "0:10",
    color: "#ff0000", ratio: "16:9", emoji: "▶️",
    textLayers: [
      { id: 1, text: "اسم القناة", font: "Cairo", fontSize: 52, color: "#ffffff", bold: true, italic: false, align: "center", bg: "transparent", x: 50, y: 40 },
      { id: 2, text: "اشترك الآن 🔔", font: "Cairo", fontSize: 24, color: "#ffdd57", bold: false, italic: false, align: "center", bg: "transparent", x: 50, y: 70 },
    ]
  },
];

export default function TemplatesPanel({ onApplyTemplate }) {
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [applied, setApplied] = useState(null);

  const filtered = activeCategory === "الكل"
    ? TEMPLATES
    : TEMPLATES.filter(t => t.category === activeCategory);

  const handleApply = (template) => {
    onApplyTemplate?.(template.textLayers);
    setApplied(template.id);
    setTimeout(() => setApplied(null), 1500);
  };

  return (
    <div className="flex flex-col gap-3 p-3 text-white">
      {/* Category filter */}
      <div className="flex flex-wrap gap-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition
              ${activeCategory === cat
                ? "bg-[#00d4d4] text-black"
                : "bg-[#252525] text-[#888] hover:text-white border border-[#333]"}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Templates grid */}
      <div className="grid grid-cols-2 gap-2">
        {filtered.map(template => (
          <button
            key={template.id}
            onClick={() => handleApply(template)}
            className={`relative flex flex-col rounded-xl overflow-hidden border transition group
              ${applied === template.id
                ? "border-[#00d4d4] scale-95"
                : "border-[#333] hover:border-[#00d4d4]/50"}`}
          >
            {/* Preview */}
            <div
              className="flex flex-col items-center justify-center gap-1 py-5"
              style={{ background: `linear-gradient(135deg, ${template.color}33, ${template.color}11)` }}
            >
              <span className="text-3xl">{template.emoji}</span>
              <span className="text-[8px] text-[#888]">{template.ratio}</span>
            </div>

            {/* Info */}
            <div className="bg-[#1e1e1e] px-2 py-1.5 text-left">
              <p className="text-[11px] font-semibold text-white truncate">{template.name}</p>
              <p className="text-[9px] text-[#666]">{template.duration} · {template.category}</p>
            </div>

            {/* Applied badge */}
            {applied === template.id && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
                <span className="text-[#00d4d4] font-bold text-xs">✓ تم التطبيق</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}