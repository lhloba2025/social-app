import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Trash2 } from "lucide-react";

export default function EffectsLibrary({ effects, onApplyEffect, onRemoveEffect, language }) {
  const isRtl = language === "ar";
  const [selectedEffect, setSelectedEffect] = useState(null);
  const [effectIntensity, setEffectIntensity] = useState(100);

  const EFFECT_PRESETS = [
    {
      id: "highContrast",
      nameAr: "تباين عالي",
      nameEn: "High Contrast",
      icon: "⚫",
      filters: { contrast: 150, saturation: 110 },
      desc: "تباين عالي وألوان مشبعة"
    },
    {
      id: "blackAndWhite",
      nameAr: "أبيض وأسود",
      nameEn: "Black & White",
      icon: "⬛",
      filters: { grayscale: 100 },
      desc: "صورة بالأبيض والأسود"
    },
    {
      id: "sepia",
      nameAr: "سيبيا",
      nameEn: "Sepia",
      icon: "🟫",
      filters: { sepia: 100 },
      desc: "تأثير عتيق"
    },
    {
      id: "cinematic",
      nameAr: "سينمائي",
      nameEn: "Cinematic",
      icon: "🎬",
      filters: { brightness: 90, contrast: 120, saturation: 85 },
      desc: "مظهر سينمائي احترافي"
    },
    {
      id: "vivid",
      nameAr: "حي جداً",
      nameEn: "Vivid",
      icon: "🌈",
      filters: { saturation: 150, contrast: 110, brightness: 105 },
      desc: "ألوان حية ومشبعة جداً"
    },
    {
      id: "cool",
      nameAr: "بارد",
      nameEn: "Cool",
      icon: "❄️",
      filters: { brightness: 95, "hue-rotate": 200, saturation: 110 },
      desc: "درجات باردة من الألوان"
    },
    {
      id: "warm",
      nameAr: "دافئ",
      nameEn: "Warm",
      icon: "🔥",
      filters: { brightness: 105, "hue-rotate": 20, saturation: 120 },
      desc: "درجات دافئة من الألوان"
    },
    {
      id: "noir",
      nameAr: "نوار",
      nameEn: "Noir",
      icon: "🎭",
      filters: { grayscale: 100, contrast: 130, brightness: 85 },
      desc: "تأثير نوار درامي"
    },
    {
      id: "vintage",
      nameAr: "عتيق",
      nameEn: "Vintage",
      icon: "📹",
      filters: { sepia: 60, saturation: 80, brightness: 95, contrast: 110 },
      desc: "مظهر عتيق ومستعمل"
    },
    {
      id: "dreamy",
      nameAr: "حالم",
      nameEn: "Dreamy",
      icon: "💭",
      filters: { brightness: 115, saturation: 130, blur: 2 },
      desc: "تأثير حالم وناعم"
    },
    {
      id: "dramatic",
      nameAr: "درامي",
      nameEn: "Dramatic",
      icon: "⚡",
      filters: { contrast: 140, brightness: 85, saturation: 95 },
      desc: "مظهر درامي ومشدود"
    },
    {
      id: "loFi",
      nameAr: "لو فاي",
      nameEn: "Lo-Fi",
      icon: "📼",
      filters: { saturation: 120, contrast: 95, brightness: 90, grayscale: 10 },
      desc: "تأثير جودة منخفضة"
    },
  ];

  const handleApplyEffect = (effectId) => {
    const effect = EFFECT_PRESETS.find(e => e.id === effectId);
    if (effect) {
      onApplyEffect({
        id: Math.random().toString(36).slice(2, 9),
        type: effectId,
        intensity: effectIntensity,
        filters: effect.filters,
      });
      setSelectedEffect(null);
    }
  };

  const getEffectName = (effectId) => {
    return EFFECT_PRESETS.find(e => e.id === effectId)?.nameAr || "";
  };

  return (
    <div className="space-y-4">
      {/* مستوى الشدة */}
      <div className="bg-slate-800 p-3 rounded-lg">
        <label className="text-xs font-semibold text-slate-300 flex justify-between mb-2">
          <span>{isRtl ? "شدة التأثير" : "Effect Intensity"}</span>
          <span className="text-indigo-400">{effectIntensity}%</span>
        </label>
        <Slider
          value={[effectIntensity]}
          onValueChange={(val) => setEffectIntensity(val[0])}
          min={0}
          max={100}
          step={1}
        />
      </div>

      {/* شبكة التأثيرات */}
      <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
        {EFFECT_PRESETS.map((effect) => (
          <div
            key={effect.id}
            onClick={() => setSelectedEffect(effect.id)}
            className={`p-3 rounded-lg cursor-pointer border-2 transition ${
              selectedEffect === effect.id
                ? "border-indigo-500 bg-indigo-600/20"
                : "border-slate-700 bg-slate-700/50 hover:border-slate-600"
            }`}
          >
            <div className="text-2xl mb-2">{effect.icon}</div>
            <p className="text-sm font-semibold text-white">{isRtl ? effect.nameAr : effect.nameEn}</p>
            <p className="text-xs text-slate-400 mt-1">{isRtl ? effect.nameAr : effect.desc}</p>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleApplyEffect(effect.id);
              }}
              size="sm"
              className="w-full mt-2 text-xs bg-purple-600 hover:bg-purple-500"
            >
              {isRtl ? "تطبيق" : "Apply"}
            </Button>
          </div>
        ))}
      </div>

      {/* قائمة التأثيرات المطبقة */}
      {effects.length > 0 && (
        <div className="border-t border-slate-700 pt-4">
          <h4 className="text-xs font-semibold text-slate-300 mb-2">
            {isRtl ? "التأثيرات المطبقة" : "Applied Effects"}
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {effects.map((effect) => (
              <div
                key={effect.id}
                className="flex items-center justify-between bg-slate-700 p-2 rounded text-xs hover:bg-slate-600"
              >
                <div className="flex-1">
                  <p className="font-semibold">{isRtl ? getEffectName(effect.type) : effect.type}</p>
                  <p className="text-slate-400 text-xs">{isRtl ? "الشدة" : "Intensity"}: {effect.intensity}%</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                  onClick={() => onRemoveEffect(effect.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* تلميح */}
      <div className="text-xs text-slate-400 p-2 bg-slate-800/30 rounded">
        {isRtl 
          ? "💡 يمكن تطبيق عدة تأثيرات معاً - الترتيب مهم!"
          : "💡 Stack multiple effects - order matters!"
        }
      </div>
    </div>
  );
}