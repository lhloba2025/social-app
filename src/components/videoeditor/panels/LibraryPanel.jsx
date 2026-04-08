import React, { useState } from "react";

const LIBRARY_ITEMS = {
  icons: [
    { id: 1, name: "نجمة", emoji: "⭐", category: "أيقونات" },
    { id: 2, name: "قلب", emoji: "❤️", category: "أيقونات" },
    { id: 3, name: "نار", emoji: "🔥", category: "أيقونات" },
    { id: 4, name: "موسيقى", emoji: "🎵", category: "أيقونات" },
    { id: 5, name: "تعليق", emoji: "💬", category: "أيقونات" },
    { id: 6, name: "تاج", emoji: "👑", category: "أيقونات" },
    { id: 7, name: "ماسة", emoji: "💎", category: "أيقونات" },
    { id: 8, name: "صاروخ", emoji: "🚀", category: "أيقونات" },
  ],
  music: [
    { id: 101, name: "موسيقى خلفية هادئة", duration: "2:15", category: "موسيقى", bpm: 80 },
    { id: 102, name: "إيقاع حيوي", duration: "1:45", category: "موسيقى", bpm: 120 },
    { id: 103, name: "موسيقى سينمائية", duration: "3:00", category: "موسيقى", bpm: 90 },
    { id: 104, name: "بوب حديث", duration: "2:30", category: "موسيقى", bpm: 110 },
    { id: 105, name: "موسيقى هيب هوب", duration: "2:45", category: "موسيقى", bpm: 95 },
    { id: 106, name: "موسيقى إلكترونية", duration: "3:15", category: "موسيقى", bpm: 128 },
  ],
  textTemplates: [
    { id: 201, name: "عنوان درامي", text: "عنوانك هنا", style: "bold", category: "نصوص" },
    { id: 202, name: "عنوان فرعي", text: "النص الفرعي", style: "italic", category: "نصوص" },
    { id: 203, name: "استدعاء للعمل", text: "انقر الآن", style: "bold", category: "نصوص", color: "#ff6b6b" },
    { id: 204, name: "اقتباس", text: "اقتباس مشهور هنا", style: "italic", category: "نصوص" },
    { id: 205, name: "كاتب", text: "بواسطة الكاتب", style: "normal", category: "نصوص", fontSize: 14 },
  ],
};

const CATEGORIES = ["الكل", "أيقونات", "موسيقى", "نصوص"];

export default function LibraryPanel({ onAddIcon, onAddMusic, onAddText }) {
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [searchTerm, setSearchTerm] = useState("");

  const allItems = [...LIBRARY_ITEMS.icons, ...LIBRARY_ITEMS.music, ...LIBRARY_ITEMS.textTemplates];
  const filtered = allItems.filter(item => {
    const matchesCategory = activeCategory === "الكل" || item.category === activeCategory;
    const matchesSearch = item.name.includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-3 p-3 text-sm text-white h-full">
      {/* Search */}
      <input
        type="text"
        placeholder="ابحث في المكتبة..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="w-full bg-[#252525] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#00d4d4] text-white placeholder-[#555]"
      />

      {/* Category Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition ${
              activeCategory === cat
                ? "bg-[#00d4d4] text-black"
                : "bg-[#252525] text-[#888] hover:text-white border border-[#333]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 gap-2">
          {filtered.map(item => (
            <div
              key={item.id}
              className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-[#252525] border border-[#333] hover:border-[#00d4d4] transition cursor-pointer group"
              onClick={() => {
                if (item.category === "أيقونات") onAddIcon?.(item);
                else if (item.category === "موسيقى") onAddMusic?.(item);
                else if (item.category === "نصوص") onAddText?.(item);
              }}
            >
              {item.emoji && <span className="text-2xl">{item.emoji}</span>}
              {item.duration && <span className="text-[9px] text-[#888]">{item.duration}</span>}
              <span className="text-[9px] text-center text-[#aaa] group-hover:text-[#00d4d4] transition leading-tight">
                {item.name}
              </span>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-[#555]">
            <span className="text-2xl">🔍</span>
            <span className="text-xs">لم يتم العثور على عناصر</span>
          </div>
        )}
      </div>
    </div>
  );
}