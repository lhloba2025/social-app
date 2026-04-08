import React, { useState } from "react";
import { SIZES, RATIO_GROUPS } from "./sizes";
import { Sparkles, Globe } from "lucide-react";

function RatioShape({ ratio }) {
  const styles = {
    "1:1": "w-10 h-10",
    "9:16": "w-6 h-10",
    "4:5": "w-7 h-10",
    "16:9": "w-10 h-6",
    "Wide": "w-12 h-4",
    "Other": "w-10 h-7",
  };
  return (
    <div className={`${styles[ratio] || "w-8 h-8"} border-2 border-indigo-400 rounded bg-indigo-500/20 mx-auto mb-2`} />
  );
}

export default function SizeSelector({ onSelect, language, setLanguage }) {
  const isRtl = language === "ar";
  const [customW, setCustomW] = useState(1080);
  const [customH, setCustomH] = useState(1080);

  const handleSelect = (size) => {
    if (size.isCustom) {
      onSelect({ ...size, width: customW, height: customH });
    } else {
      onSelect(size);
    }
  };

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-slate-700 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">
              {isRtl ? "منشئ التصاميم" : "Design Studio"}
            </h1>
            <p className="text-xs text-slate-400">{isRtl ? "اختر مقاس التصميم" : "Choose a canvas size"}</p>
          </div>
        </div>
        <button
          onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm transition"
        >
          <Globe className="w-4 h-4" />
          {language === "ar" ? "EN" : "AR"}
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold mb-2 text-center">
          {isRtl ? "اختر مقاس التصميم" : "Select Canvas Size"}
        </h2>
        <p className="text-slate-400 text-center mb-10">
          {isRtl ? "يمكنك تغيير المقاس لاحقاً من المحرر" : "You can change the size later in the editor"}
        </p>

        {RATIO_GROUPS.map((ratio) => {
          const group = SIZES.filter((s) => s.ratio === ratio);
          return (
            <div key={ratio} className="mb-8">
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">
                {ratio}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {group.map((size) => (
                  <div
                    key={size.id}
                    onClick={() => !size.isCustom && handleSelect(size)}
                    className="bg-slate-800 border border-slate-700 hover:border-indigo-500 rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-750 hover:shadow-lg hover:shadow-indigo-500/10 text-center group"
                  >
                    <RatioShape ratio={ratio} />
                    <p className="text-sm font-semibold text-white group-hover:text-indigo-300 transition leading-tight">
                      {isRtl ? size.nameAr : size.nameEn}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{size.platform}</p>
                    {!size.isCustom && (
                      <p className="text-xs text-slate-500 mt-1">{size.width}×{size.height}</p>
                    )}
                    {size.isCustom && (
                      <div className="mt-2 space-y-1" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <input
                            type="number"
                            value={customW}
                            onChange={(e) => setCustomW(parseInt(e.target.value) || 1080)}
                            className="w-full bg-slate-700 text-xs text-center rounded px-1 py-1 text-white border border-slate-600"
                            placeholder="W"
                          />
                          <span className="text-slate-400 text-xs self-center">×</span>
                          <input
                            type="number"
                            value={customH}
                            onChange={(e) => setCustomH(parseInt(e.target.value) || 1080)}
                            className="w-full bg-slate-700 text-xs text-center rounded px-1 py-1 text-white border border-slate-600"
                            placeholder="H"
                          />
                        </div>
                        <button
                          onClick={() => handleSelect(size)}
                          className="w-full text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded px-2 py-1 transition"
                        >
                          {isRtl ? "اختر" : "Select"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}