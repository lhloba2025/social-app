import React, { useState } from "react";
import { SIZES, RATIO_GROUPS } from "./sizes";
import { Sparkles, Globe, Home, Plus, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LetterheadForm from "./LetterheadForm";

// The handful of sizes most people reach for — shown big at the top so the
// common case is one click instead of scanning a whole page.
const POPULAR = ["instagram-post", "instagram-story", "instagram-portrait", "youtube-thumb", "custom"];

const RATIO_DIM = {
  "1:1": "w-9 h-9", "9:16": "w-6 h-10", "4:5": "w-8 h-10",
  "16:9": "w-11 h-6", "Wide": "w-12 h-3.5", "Other": "w-11 h-7", "A4": "w-12 h-3",
};

function RatioShape({ ratio, big }) {
  const base = RATIO_DIM[ratio] || "w-8 h-8";
  return (
    <div
      className={`${base} rounded-md mx-auto ${big ? "mb-3" : "mb-2"}`}
      style={{ background: "linear-gradient(135deg,#6366f1,#fb7185)", opacity: 0.92 }}
    />
  );
}

export default function SizeSelector({ onSelect, language, setLanguage }) {
  const isRtl = language === "ar";
  const [customW, setCustomW] = useState(1080);
  const [customH, setCustomH] = useState(1080);
  const [letterheadSize, setLetterheadSize] = useState(null);
  const navigate = useNavigate();

  const handleSelect = (size) => {
    if (size.isLetterhead) setLetterheadSize(size);
    else if (size.isCustom) onSelect({ ...size, width: customW, height: customH });
    else onSelect(size);
  };

  const byId = (id) => SIZES.find((s) => s.id === id);
  const popular = POPULAR.map(byId).filter(Boolean);

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="h-full overflow-y-auto hv-app-bg" style={{ color: "var(--hv-text)" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b px-5 md:px-8 py-3 flex items-center justify-between"
           style={{ borderColor: "var(--hv-border)" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} title={isRtl ? "الرئيسية" : "Home"}
                  className="w-9 h-9 rounded-lg flex items-center justify-center hv-btn-ghost !p-0">
            <Home className="w-5 h-5" />
          </button>
          <div className="hv-icon-tile !w-9 !h-9 !rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base leading-tight">{isRtl ? "منشئ التصاميم" : "Design Studio"}</h1>
            <p className="text-xs" style={{ color: "var(--hv-text-soft)" }}>{isRtl ? "اختر مقاس التصميم" : "Choose a canvas size"}</p>
          </div>
        </div>
        <button onClick={() => setLanguage(language === "ar" ? "en" : "ar")} className="hv-btn hv-btn-ghost">
          <Globe className="w-4 h-4" /> {language === "ar" ? "EN" : "AR"}
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-5 md:px-8 py-8">
        <h2 className="text-2xl font-extrabold mb-1 text-center">{isRtl ? "اختر مقاس التصميم" : "Select Canvas Size"}</h2>
        <p className="text-center mb-8" style={{ color: "var(--hv-text-soft)" }}>
          {isRtl ? "اختر من الأكثر استخداماً وادخل المحرّر مباشرة — تقدر تغيّره لاحقاً" : "Pick a popular size and jump straight in — you can change it later"}
        </p>

        {/* Popular quick row */}
        <div className="mb-9">
          <p className="hv-overline mb-3">{isRtl ? "الأكثر استخداماً" : "Most used"}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {popular.map((size) => (
              <button key={size.id} onClick={() => !size.isCustom && handleSelect(size)}
                      className="hv-card hv-card-hover p-5 text-center cursor-pointer">
                <RatioShape ratio={size.ratio} big />
                <p className="text-sm font-extrabold leading-tight">{isRtl ? size.nameAr : size.nameEn}</p>
                {!size.isCustom
                  ? <p className="text-xs mt-1" style={{ color: "var(--hv-text-faint)" }}>{size.width}×{size.height}</p>
                  : <span className="hv-chip mt-2 inline-flex"><Plus className="w-3 h-3" />{isRtl ? "مقاس حر" : "Custom"}</span>}
                {size.isCustom && (
                  <div className="mt-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <input type="number" value={customW} onChange={(e) => setCustomW(parseInt(e.target.value) || 1080)}
                             className="hv-input !py-1 !px-1 text-xs text-center" placeholder="W" />
                      <span className="text-xs self-center" style={{ color: "var(--hv-text-faint)" }}>×</span>
                      <input type="number" value={customH} onChange={(e) => setCustomH(parseInt(e.target.value) || 1080)}
                             className="hv-input !py-1 !px-1 text-xs text-center" placeholder="H" />
                    </div>
                    <button onClick={() => handleSelect(size)} className="hv-btn hv-btn-primary w-full !py-1.5 text-xs">
                      <Check className="w-3.5 h-3.5" /> {isRtl ? "اختر" : "Select"}
                    </button>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* All sizes grouped */}
        <p className="hv-overline mb-4">{isRtl ? "كل المقاسات" : "All sizes"}</p>
        {RATIO_GROUPS.map((ratio) => {
          const group = SIZES.filter((s) => s.ratio === ratio && !POPULAR.includes(s.id));
          if (!group.length) return null;
          return (
            <div key={ratio} className="mb-7">
              <h3 className="text-xs font-extrabold uppercase tracking-wider mb-3 pb-2 border-b"
                  style={{ color: "var(--hv-primary)", borderColor: "var(--hv-border)" }}>
                {ratio}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {group.map((size) => (
                  <div key={size.id} onClick={() => !size.isCustom && handleSelect(size)}
                       className="hv-card hv-card-hover p-3.5 cursor-pointer text-center">
                    <RatioShape ratio={ratio} />
                    <p className="text-sm font-bold leading-tight">{isRtl ? size.nameAr : size.nameEn}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--hv-text-soft)" }}>{size.platform}</p>
                    {!size.isCustom && <p className="text-[11px] mt-0.5" style={{ color: "var(--hv-text-faint)" }}>{size.width}×{size.height}</p>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {letterheadSize && (
        <LetterheadForm
          isRtl={isRtl}
          size={letterheadSize}
          onCancel={() => setLetterheadSize(null)}
          onDone={(dataUrl) => { const s = letterheadSize; setLetterheadSize(null); onSelect(s, dataUrl); }}
        />
      )}
    </div>
  );
}
