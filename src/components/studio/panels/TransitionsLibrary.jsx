import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Trash2, Play } from "lucide-react";

export default function TransitionsLibrary({ transitions, onAddTransition, onDeleteTransition, onUpdateTransition, timeline, language }) {
  const isRtl = language === "ar";
  const [selectedTransition, setSelectedTransition] = useState(null);
  const [previewDuration, setPreviewDuration] = useState(0.5);
  const [transitionDelay, setTransitionDelay] = useState(0);
  const [previewingId, setPreviewingId] = useState(null);
  const previewRef = useRef(null);

  const TRANSITION_TYPES = [
    { 
      id: "fade", 
      nameAr: "تلاشي", 
      nameEn: "Fade",
      desc: isRtl ? "تلاشي سلس" : "Smooth fade",
      icon: "✨",
      css: "opacity: 0 → opacity: 1"
    },
    { 
      id: "slideLeft", 
      nameAr: "انزلاق يسار", 
      nameEn: "Slide Left",
      desc: isRtl ? "انزلاق من اليمين" : "Slide from right",
      icon: "←",
      css: "translateX: 100% → 0"
    },
    { 
      id: "slideRight", 
      nameAr: "انزلاق يمين", 
      nameEn: "Slide Right",
      desc: isRtl ? "انزلاق من اليسار" : "Slide from left",
      icon: "→",
      css: "translateX: -100% → 0"
    },
    { 
      id: "slideUp", 
      nameAr: "انزلاق أعلى", 
      nameEn: "Slide Up",
      desc: isRtl ? "انزلاق من الأسفل" : "Slide from bottom",
      icon: "↑",
      css: "translateY: 100% → 0"
    },
    { 
      id: "slideDown", 
      nameAr: "انزلاق أسفل", 
      nameEn: "Slide Down",
      desc: isRtl ? "انزلاق من الأعلى" : "Slide from top",
      icon: "↓",
      css: "translateY: -100% → 0"
    },
    { 
      id: "zoom", 
      nameAr: "تكبير", 
      nameEn: "Zoom",
      desc: isRtl ? "تكبير سريع" : "Quick zoom",
      icon: "🔍",
      css: "scale: 0 → 1"
    },
    { 
      id: "blur", 
      nameAr: "ضبابي", 
      nameEn: "Blur",
      desc: isRtl ? "ضبابية متدرجة" : "Gradual blur",
      icon: "🌫️",
      css: "blur: 10px → 0"
    },
    { 
      id: "wipeLeft", 
      nameAr: "مسح يسار", 
      nameEn: "Wipe Left",
      desc: isRtl ? "مسح من اليمين" : "Wipe from right",
      icon: "⊳",
      css: "clipPath effect"
    },
    { 
      id: "wipeRight", 
      nameAr: "مسح يمين", 
      nameEn: "Wipe Right",
      desc: isRtl ? "مسح من اليسار" : "Wipe from left",
      icon: "⊲",
      css: "clipPath effect"
    },
    { 
      id: "crossfade", 
      nameAr: "تلاشي متقاطع", 
      nameEn: "Crossfade",
      desc: isRtl ? "تلاشي متقاطع ناعم" : "Smooth crossfade",
      icon: "⚡",
      css: "opacity blend"
    },
    { 
      id: "dip", 
      nameAr: "غوص للأسود", 
      nameEn: "Dip to Black",
      desc: isRtl ? "غطس للأسود" : "Dip to black",
      icon: "⚫",
      css: "fade to black"
    },
    { 
      id: "circleOpen", 
      nameAr: "دائرة مفتوحة", 
      nameEn: "Circle Open",
      desc: isRtl ? "فتح دائري" : "Circle reveal",
      icon: "⭕",
      css: "circular mask"
    },
  ];

  const getTransitionPreview = (transitionId) => {
    const previewStyles = {
      fade: { animation: `fadeTransition ${previewDuration}s ease-in-out infinite` },
      slideLeft: { animation: `slideLeftTransition ${previewDuration}s ease-in-out infinite` },
      slideRight: { animation: `slideRightTransition ${previewDuration}s ease-in-out infinite` },
      slideUp: { animation: `slideUpTransition ${previewDuration}s ease-in-out infinite` },
      slideDown: { animation: `slideDownTransition ${previewDuration}s ease-in-out infinite` },
      zoom: { animation: `zoomTransition ${previewDuration}s ease-in-out infinite` },
      blur: { animation: `blurTransition ${previewDuration}s ease-in-out infinite` },
      crossfade: { animation: `crossfadeTransition ${previewDuration}s ease-in-out infinite` },
    };
    return previewStyles[transitionId] || {};
  };

  const handleAddTransition = (transitionType) => {
    onAddTransition({
      id: Math.random().toString(36).slice(2, 9),
      type: transitionType,
      duration: previewDuration,
      delay: transitionDelay,
      position: timeline?.currentTime || 0,
    });
    setTransitionDelay(0);
  };

  return (
    <div className="space-y-4">
      {/* الفترة الزمنية للانتقال */}
      <div className="bg-slate-800 p-3 rounded-lg space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-300 flex justify-between mb-2">
            <span>{isRtl ? "مدة الانتقال" : "Transition Duration"}</span>
            <span className="text-indigo-400">{(previewDuration * 1000).toFixed(0)}ms</span>
          </label>
          <Slider
            value={[previewDuration]}
            onValueChange={(val) => setPreviewDuration(val[0])}
            min={0.1}
            max={2}
            step={0.1}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 flex justify-between mb-2">
            <span>{isRtl ? "التأخير" : "Delay"}</span>
            <span className="text-cyan-400">{(transitionDelay * 1000).toFixed(0)}ms</span>
          </label>
          <Slider
            value={[transitionDelay]}
            onValueChange={(val) => setTransitionDelay(Math.max(0, val[0]))}
            min={0}
            max={2}
            step={0.1}
          />
        </div>
      </div>

      {/* شبكة الانتقالات مع معاينة */}
      <div className="grid grid-cols-2 gap-2">
        {TRANSITION_TYPES.map((trans) => (
          <div
            key={trans.id}
            onClick={() => setSelectedTransition(trans.id)}
            className={`p-3 rounded-lg cursor-pointer border-2 transition ${
              selectedTransition === trans.id
                ? "border-indigo-500 bg-indigo-600/20"
                : "border-slate-700 bg-slate-700/50 hover:border-slate-600"
            }`}
          >
            {/* معاينة بصرية صغيرة */}
            <div className="w-full h-16 bg-slate-900/50 rounded mb-2 flex items-center justify-center border border-slate-600/50 overflow-hidden relative">
              <div
                className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg"
                style={previewingId === trans.id ? getTransitionPreview(trans.id) : {}}
              />
              <style>{`
                @keyframes fadeTransition {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.2; }
                }
                @keyframes slideLeftTransition {
                  0%, 100% { transform: translateX(0); }
                  50% { transform: translateX(-100%); }
                }
                @keyframes slideRightTransition {
                  0%, 100% { transform: translateX(0); }
                  50% { transform: translateX(100%); }
                }
                @keyframes slideUpTransition {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-100%); }
                }
                @keyframes slideDownTransition {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(100%); }
                }
                @keyframes zoomTransition {
                  0%, 100% { transform: scale(1); }
                  50% { transform: scale(0.5); }
                }
                @keyframes blurTransition {
                  0%, 100% { filter: blur(0px); }
                  50% { filter: blur(10px); }
                }
                @keyframes crossfadeTransition {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.3; }
                }
              `}</style>
            </div>

            <div className="text-xl mb-2">{trans.icon}</div>
            <p className="text-sm font-semibold text-white">{isRtl ? trans.nameAr : trans.nameEn}</p>
            <p className="text-xs text-slate-400 mt-1">{trans.desc}</p>
            
            <div className="flex gap-1 mt-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewingId(previewingId === trans.id ? null : trans.id);
                }}
                size="sm"
                variant="outline"
                className="flex-1 text-xs h-7"
              >
                <Play className="w-3 h-3" />
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddTransition(trans.id);
                }}
                size="sm"
                className="flex-1 text-xs h-7 bg-indigo-600 hover:bg-indigo-500"
              >
                {isRtl ? "إضافة" : "Add"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* قائمة الانتقالات المضافة بتفاصيل محسّنة */}
      {transitions.length > 0 && (
        <div className="border-t border-slate-700 pt-4 space-y-3">
          <h4 className="text-xs font-semibold text-slate-300">
            {isRtl ? "الانتقالات المضافة" : "Applied Transitions"} ({transitions.length})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {transitions.map((trans, idx) => {
              const transType = TRANSITION_TYPES.find(t => t.id === trans.type);
              return (
                <div
                  key={trans.id}
                  className="bg-slate-700/50 border border-slate-600 p-2 rounded text-xs hover:bg-slate-700/70 transition group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{transType?.icon}</span>
                      <div>
                        <p className="font-semibold text-white">{idx + 1}. {isRtl ? transType?.nameAr : transType?.nameEn}</p>
                        <p className="text-slate-400">{(trans.duration * 1000).toFixed(0)}ms {trans.delay ? `• ${isRtl ? "تأخير" : "Delay"}: ${(trans.delay * 1000).toFixed(0)}ms` : ""}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition"
                      onClick={() => onDeleteTransition(trans.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-slate-500 text-xs mb-1">{isRtl ? "المدة" : "Duration"}</p>
                      <input
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.1"
                        value={trans.duration}
                        onChange={(e) =>
                          onUpdateTransition(trans.id, { duration: parseFloat(e.target.value) })
                        }
                        className="w-full h-1.5 rounded"
                      />
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-1">{isRtl ? "التأخير" : "Delay"}</p>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={trans.delay}
                        onChange={(e) =>
                          onUpdateTransition(trans.id, { delay: parseFloat(e.target.value) })
                        }
                        className="w-full h-1.5 rounded"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewingId(previewingId === trans.id ? null : trans.id);
                        }}
                        size="sm"
                        variant="outline"
                        className="w-full h-6 text-xs"
                      >
                        {isRtl ? "معاينة" : "Preview"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* تلميح */}
      <div className="text-xs text-slate-400 p-2 bg-slate-800/30 rounded">
        {isRtl 
          ? "💡 اسحب الانتقال إلى Timeline لتحديد موقعه بين المقاطع"
          : "💡 Drag transitions to timeline to position between clips"
        }
      </div>
    </div>
  );
}