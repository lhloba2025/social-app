import React from "react";
import { Eye, EyeOff, Copy, Trash2 } from "lucide-react";
import StudioColorPicker from "../StudioColorPicker";

// ─── Highlighter / Marker shapes ───────────────────────────────────────────
const BRUSH_HIGHLIGHTS = [
  { type: "hl_wide",    labelAr: "هايلايتر عريض",   labelEn: "Wide Marker" },
  { type: "hl_thin",    labelAr: "هايلايتر رفيع",    labelEn: "Thin Marker" },
  { type: "hl_angled",  labelAr: "هايلايتر مائل",    labelEn: "Angled Marker" },
  { type: "hl_double",  labelAr: "هايلايتر مزدوج",   labelEn: "Double Marker" },
  { type: "hl_wave",    labelAr: "هايلايتر متموج",   labelEn: "Wavy Marker" },
  { type: "hl_rough",   labelAr: "هايلايتر خشن",     labelEn: "Rough Marker" },
  { type: "hl_curve",   labelAr: "تسطير منحني",      labelEn: "Curved Underline" },
  { type: "hl_scribble",labelAr: "خطوط عشوائية",    labelEn: "Scribble Lines" },
];

// ─── Hand-drawn circles ─────────────────────────────────────────────────────
const BRUSH_CIRCLES = [
  { type: "hc_simple",  labelAr: "دائرة بسيطة",      labelEn: "Simple Circle" },
  { type: "hc_ellipse", labelAr: "بيضاوي نظيف",      labelEn: "Clean Oval" },
  { type: "hc_oval",    labelAr: "بيضاوي",            labelEn: "Oval" },
  { type: "hc_open",    labelAr: "بيضاوي مفتوح",      labelEn: "Open Oval" },
  { type: "hc_double",  labelAr: "دائرة مضاعفة",     labelEn: "Double Circle" },
  { type: "hc_scribble",labelAr: "دائرة عشوائية",    labelEn: "Scribble Circle" },
  { type: "hc_tight",   labelAr: "دائرة ضيقة",       labelEn: "Tight Circle" },
  { type: "hc_loose",   labelAr: "دائرة فضفاضة",     labelEn: "Loose Circle" },
  { type: "hc_dotted",  labelAr: "دائرة مع نقاط",    labelEn: "Dotted Circle" },
  { type: "hc_wavy",    labelAr: "بيضاوي مموج",      labelEn: "Wavy Oval" },
];

// ─── Other hand-drawn shapes ────────────────────────────────────────────────
const HAND_SHAPES = [
  { type: "underline",  labelAr: "تسطير",   labelEn: "Underline",  icon: "___" },
  { type: "arrow",      labelAr: "سهم",      labelEn: "Arrow",      icon: "→" },
  { type: "checkmark",  labelAr: "صح",       labelEn: "Check",      icon: "✓" },
  { type: "cross",      labelAr: "إكس",      labelEn: "Cross",      icon: "✕" },
  { type: "star",       labelAr: "نجمة",     labelEn: "Star",       icon: "☆" },
  { type: "bracket",    labelAr: "قوس",      labelEn: "Bracket",    icon: "[ ]" },
];

// ───────────────────────────────────────────────────────────────────────────
// HIGHLIGHTER / MARKER SVGs – flat semi-transparent rectangles like a real marker
// ───────────────────────────────────────────────────────────────────────────
function generateHighlighterSvg(type, color, opacity) {
  const c = color || "#facc15";
  const op = opacity ?? 0.55;

  switch (type) {
    case "hl_wide":
      return `<svg viewBox="0 0 320 60" xmlns="http://www.w3.org/2000/svg">
        <g opacity="${op}">
          <path d="M4,10 C4,8 8,6 16,6 L304,6 C312,6 316,8 316,10 L316,50 C316,52 312,54 304,54 L16,54 C8,54 4,52 4,50 Z" fill="${c}"/>
          <path d="M4,10 L316,10" stroke="${c}" stroke-width="2" opacity="0.4"/>
          <path d="M4,50 L316,50" stroke="${c}" stroke-width="1" opacity="0.2"/>
          <path d="M8,28 C80,26 180,30 312,28" stroke="white" stroke-width="1.5" opacity="0.15" fill="none"/>
        </g>
      </svg>`;

    case "hl_thin":
      return `<svg viewBox="0 0 320 32" xmlns="http://www.w3.org/2000/svg">
        <g opacity="${op}">
          <path d="M3,4 C3,3 6,2 12,2 L308,2 C314,2 317,3 317,4 L317,28 C317,29 314,30 308,30 L12,30 C6,30 3,29 3,28 Z" fill="${c}"/>
          <path d="M6,14 C100,12 220,16 314,14" stroke="white" stroke-width="1" opacity="0.2" fill="none"/>
        </g>
      </svg>`;

    case "hl_angled":
      return `<svg viewBox="0 0 320 60" xmlns="http://www.w3.org/2000/svg">
        <g opacity="${op}">
          <path d="M18,6 L308,2 C314,2 318,4 316,8 L302,54 C300,58 294,58 288,56 L12,54 C6,54 2,52 4,48 Z" fill="${c}"/>
          <path d="M20,28 C120,24 220,30 300,26" stroke="white" stroke-width="1.5" opacity="0.18" fill="none"/>
        </g>
      </svg>`;

    case "hl_double":
      return `<svg viewBox="0 0 320 75" xmlns="http://www.w3.org/2000/svg">
        <g opacity="${op}">
          <path d="M4,6 L316,6 L316,30 L4,30 Z" fill="${c}"/>
          <path d="M4,44 L316,44 L316,68 L4,68 Z" fill="${c}" opacity="0.7"/>
          <path d="M8,18 C120,16 200,20 312,18" stroke="white" stroke-width="1" opacity="0.15" fill="none"/>
          <path d="M8,56 C120,54 200,58 312,56" stroke="white" stroke-width="1" opacity="0.12" fill="none"/>
        </g>
      </svg>`;

    case "hl_wave":
      return `<svg viewBox="0 0 320 55" xmlns="http://www.w3.org/2000/svg">
        <g opacity="${op}">
          <path d="M4,18 C40,10 80,6 120,10 C160,14 200,18 240,14 C270,11 295,8 316,10 L316,42 C295,44 270,47 240,46 C200,44 160,40 120,44 C80,48 40,46 4,42 Z" fill="${c}"/>
          <path d="M8,30 C60,26 120,32 180,28 C240,24 290,30 314,28" stroke="white" stroke-width="1" opacity="0.15" fill="none"/>
        </g>
      </svg>`;

    case "hl_rough":
      return `<svg viewBox="0 0 320 62" xmlns="http://www.w3.org/2000/svg">
        <g opacity="${op}">
          <path d="M6,14 C2,10 4,6 12,4 C50,2 120,0 180,2 C230,3 278,6 308,10 C316,12 318,16 314,20 C310,24 300,28 282,32 C254,38 218,44 180,48 C142,52 100,54 62,52 C36,50 16,46 8,40 C2,36 2,28 6,22 Z" fill="${c}"/>
          <path d="M10,8 C80,4 200,2 310,8" stroke="${c}" stroke-width="4" opacity="0.5" fill="none" stroke-linecap="round"/>
          <path d="M8,44 C80,50 200,52 312,46" stroke="${c}" stroke-width="3" opacity="0.4" fill="none" stroke-linecap="round"/>
        </g>
      </svg>`;

    case "hl_curve":
      return `<svg viewBox="0 0 320 80" xmlns="http://www.w3.org/2000/svg">
        <g opacity="${op}">
          <path d="M8,25 C60,15 160,12 280,28 C300,30 310,32 312,36 L312,42 C310,44 300,46 280,44 C160,30 60,32 8,42 Z" fill="${c}"/>
          <path d="M12,58 C80,50 200,48 308,62 C312,64 316,66 316,70 L316,74 C314,76 310,76 306,74 C200,62 80,64 12,72 Z" fill="${c}" opacity="0.7"/>
          <path d="M16,32 C120,25 220,28 300,38" stroke="white" stroke-width="1" opacity="0.2" fill="none"/>
        </g>
      </svg>`;

    case "hl_scribble":
      return `<svg viewBox="0 0 320 50" xmlns="http://www.w3.org/2000/svg">
        <g opacity="${op}">
          <path d="M10,18 C40,12 70,18 100,14 C130,10 160,18 190,15 C220,12 250,20 280,16 C295,14 305,16 310,18 L310,32 C305,34 295,36 280,34 C250,30 220,36 190,33 C160,30 130,36 100,33 C70,30 40,34 10,32 Z" fill="${c}"/>
          <path d="M15,22 C60,18 120,24 180,20 C240,16 290,26 310,24" stroke="white" stroke-width="1" opacity="0.18" fill="none"/>
          <path d="M12,26 C50,20 130,28 200,24 C260,20 300,28 312,26" stroke="white" stroke-width="0.8" opacity="0.15" fill="none"/>
        </g>
      </svg>`;

    default:
      return "";
  }
}

// ───────────────────────────────────────────────────────────────────────────
// HAND-DRAWN CIRCLES – organic pen strokes
// ───────────────────────────────────────────────────────────────────────────
function generateHandCircleSvg(type, color, strokeWidth) {
  const c = color || "#ef4444";
  const sw = strokeWidth || 3;

  switch (type) {
    case "hc_ellipse":
      return `<svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="60" cy="40" rx="55" ry="35" 
          stroke="${c}" stroke-width="${sw}" fill="none"/>
      </svg>`;

    case "hc_simple":
      // Clean imperfect circle – like drawn quickly with a pen
      return `<svg viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M55,10 C78,8 98,24 102,48 C106,72 90,96 66,104 C42,112 16,98 8,74 C0,50 14,24 36,14 C44,10 55,10 56,10"
          stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>
      </svg>`;

    case "hc_oval":
      return `<svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M80,8 C110,6 142,20 150,42 C158,64 142,86 112,94 C82,102 46,94 26,74 C6,54 8,26 32,14 C46,7 66,6 80,8"
          stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>
      </svg>`;

    case "hc_open":
      return `<svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50,12 C70,8 110,6 140,20 C155,28 160,44 155,60 C148,80 130,92 100,96 C70,100 40,90 28,70 C18,54 16,36 24,22"
          stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>
      </svg>`;

    case "hc_double":
      return `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M60,8 C84,6 104,22 108,46 C112,70 96,94 72,102 C48,110 22,96 14,72 C6,48 20,22 44,12 C50,9 60,8 62,8"
          stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>
        <path d="M60,16 C80,14 98,28 100,50 C102,72 88,90 66,96 C44,102 24,90 18,68 C12,46 26,26 48,18 C53,16 60,16 61,16"
          stroke="${c}" stroke-width="${Math.max(1, sw - 1)}" fill="none" stroke-linecap="round" opacity="0.55"/>
      </svg>`;

    case "hc_scribble":
      // Multiple overlapping strokes – like someone circling something repeatedly
      return `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M60,6 C88,4 112,22 114,50 C116,78 96,104 68,110 C40,116 12,98 8,70 C4,42 22,14 50,8 C54,7 60,6 64,8 C70,10 68,14 64,12"
          stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>
        <path d="M64,12 C90,10 110,28 110,56 C110,84 90,106 62,108"
          stroke="${c}" stroke-width="${Math.max(1, sw - 1)}" fill="none" stroke-linecap="round" opacity="0.4"/>
      </svg>`;

    case "hc_tight":
      return `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50,6 C70,4 88,18 90,40 C92,62 76,82 54,86 C32,90 12,74 10,52 C8,30 24,10 46,6 C48,5 50,6 52,6"
          stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

    case "hc_loose":
      return `<svg viewBox="0 0 130 130" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M65,6 C95,2 120,22 124,52 C128,82 108,112 78,120 C48,128 16,110 8,80 C0,50 18,18 48,8 C54,6 65,6 68,8 C72,10 70,14 66,12 C62,10 58,8 56,10"
          stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>
      </svg>`;

    case "hc_dotted":
      return `<svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M45,15 C70,10 120,8 145,25 C160,35 162,65 145,80 C130,92 110,98 80,98 C50,98 30,88 18,70 C8,55 10,28 35,16 C50,10 60,12 45,15"
          stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

    case "hc_wavy":
      return `<svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M 20,30 
           Q 15,20 30,15 
           Q 50,10 70,15 
           Q 85,20 80,30 
           Q 85,35 88,45 
           Q 90,60 85,70 
           Q 82,78 70,82 
           Q 50,88 30,82 
           Q 18,78 15,70 
           Q 10,60 12,45 
           Q 15,35 20,30 Z"
        stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

    default:
      return "";
  }
}

// ───────────────────────────────────────────────────────────────────────────
// OTHER HAND SHAPES
// ───────────────────────────────────────────────────────────────────────────
function generateHandDrawnSvg(type, color, strokeWidth) {
  const sw = strokeWidth || 3;
  const c = color || "#ff4444";

  switch (type) {
    case "underline":
      return `<svg viewBox="0 0 200 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4,12 C40,8 80,16 120,10 C150,6 174,14 196,12"
          stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>
      </svg>`;

    case "arrow":
      return `<svg viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6,30 C30,28 70,32 96,30" stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>
        <path d="M82,16 C90,22 98,30 82,44" stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

    case "checkmark":
      return `<svg viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8,40 C18,52 30,64 38,72 C52,52 72,26 92,8"
          stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

    case "cross":
      return `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10,10 C28,28 52,54 70,70" stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>
        <path d="M70,10 C52,28 28,54 10,70" stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>
      </svg>`;

    case "star":
      return `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50,6 L61,37 L94,37 L68,56 L79,88 L50,69 L21,88 L32,56 L6,37 L39,37 Z"
          stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

    case "bracket":
      return `<svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20,8 C12,8 8,12 8,20 L8,60 C8,68 12,72 20,72" stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M100,8 C108,8 112,12 112,20 L112,60 C112,68 108,72 100,72" stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

    default:
      return "";
  }
}

// ───────────────────────────────────────────────────────────────────────────

const HIGHLIGHT_COLORS = [
  "#facc15", "#fde68a", "#fb923c", "#f87171", "#f472b6",
  "#a78bfa", "#60a5fa", "#34d399", "#ffffff", "#000000",
  "#1e3a5f", "#7c2d12", "#86efac", "#ff5722",
];

export default function HandDrawnPanel({ onAdd, selectedId, onSelect, onDelete, onDuplicate, drawings, onUpdate, language }) {
  const isRtl = language === "ar";

  const canvasDrawings = drawings?.filter(d => d.isHandDrawn) || [];
  const selected = drawings?.find((d) => d.id === selectedId && d.isHandDrawn);

  const getDrawLabel = (d) => {
    if (d.drawType?.startsWith("hl_")) return isRtl ? "هايلايتر" : "Marker";
    if (d.drawType?.startsWith("hc_")) return isRtl ? "دائرة" : "Circle";
    const found = [
      { type: "underline", ar: "تسطير", en: "Underline" },
      { type: "arrow", ar: "سهم", en: "Arrow" },
      { type: "checkmark", ar: "صح", en: "Check" },
      { type: "cross", ar: "إكس", en: "Cross" },
      { type: "star", ar: "نجمة", en: "Star" },
      { type: "bracket", ar: "قوس", en: "Bracket" },
    ].find(s => s.type === d.drawType);
    return found ? (isRtl ? found.ar : found.en) : (isRtl ? "رسم" : "Drawing");
  };

  const isHighlighter = selected?.drawType?.startsWith("hl_");
  const isCircle = selected?.drawType?.startsWith("hc_");

  const updateHighlighter = (key, val) => {
    if (!selected) return;
    const newColor = key === "strokeColor" ? val : (selected.strokeColor || "#facc15");
    const newOpacity = key === "brushOpacity" ? val : (selected.brushOpacity ?? 0.55);
    onUpdate(selected.id, { [key]: val, svgContent: generateHighlighterSvg(selected.drawType, newColor, newOpacity) });
  };

  const updateShape = (key, val) => {
    if (!selected) return;
    const newColor = key === "strokeColor" ? val : (selected.strokeColor || "#ef4444");
    const newSw = key === "strokeWidth" ? val : (selected.strokeWidth || 3);
    let newSvg;
    if (isCircle) {
      newSvg = generateHandCircleSvg(selected.drawType, newColor, newSw);
    } else {
      newSvg = generateHandDrawnSvg(selected.drawType, newColor, newSw);
    }
    onUpdate(selected.id, { [key]: val, svgContent: newSvg });
  };

  const handleAddHighlighter = (type) => {
    const color = "#facc15";
    const op = 0.55;
    const isLong = type === "hl_wide" || type === "hl_wave" || type === "hl_rough";
    const isDouble = type === "hl_double";
    onAdd({
      isHandDrawn: true,
      drawType: type,
      strokeColor: color,
      brushOpacity: op,
      svgContent: generateHighlighterSvg(type, color, op),
      isSvg: false,
      width: isLong ? 70 : 55,
      height: isDouble ? 20 : isLong ? 12 : 10,
      x: 15,
      y: 42,
      opacity: 1,
    });
  };

  const handleAddCircle = (type) => {
    const color = "#ef4444";
    const sw = 3;
    const dims = type === "hc_ellipse" ? { w: 50, h: 27 } : (type === "hc_wavy" ? { w: 45, h: 28 } : (type === "hc_oval" ? { w: 40, h: 25 } : { w: 30, h: 30 }));
    onAdd({
      isHandDrawn: true,
      drawType: type,
      strokeColor: color,
      strokeWidth: sw,
      svgContent: generateHandCircleSvg(type, color, sw),
      isSvg: false,
      width: dims.w,
      height: dims.h,
      x: 30,
      y: 33,
      opacity: 1,
    });
  };

  const handleAdd = (type) => {
    const color = "#ef4444";
    const sw = 3;
    const svg = generateHandDrawnSvg(type, color, sw);
    const dims = {
      underline: { w: 50, h: 6 },
      arrow: { w: 35, h: 18 },
      checkmark: { w: 22, h: 18 },
      cross: { w: 18, h: 18 },
      star: { w: 22, h: 22 },
      bracket: { w: 30, h: 22 },
    }[type] || { w: 25, h: 25 };
    onAdd({
      isHandDrawn: true,
      drawType: type,
      strokeColor: color,
      strokeWidth: sw,
      svgContent: svg,
      isSvg: false,
      width: dims.w,
      height: dims.h,
      x: 30,
      y: 40,
      opacity: 1,
    });
  };

  return (
    <div className="space-y-3 text-xs">

      {/* Canvas drawings list */}
      {canvasDrawings.length > 0 && (
        <div className="space-y-1">
          <p className="text-slate-400 font-semibold">{isRtl ? "🖌️ رسوماتك في الكانفاس" : "🖌️ Your Canvas Drawings"}</p>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {canvasDrawings.map((d) => (
              <div
                key={d.id}
                onClick={() => onSelect(d.id, "image")}
                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition ${
                  d.id === selectedId ? "bg-indigo-600/30 border border-indigo-500/50" : "bg-slate-700 hover:bg-slate-600"
                }`}
              >
                <span className="flex-1 truncate text-slate-200">{getDrawLabel(d)}</span>
                <button onClick={(e) => { e.stopPropagation(); onUpdate(d.id, { visible: d.visible === false ? true : false }); }} className="text-slate-400 hover:text-white">
                  {d.visible !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDuplicate(d.id); }} className="text-slate-400 hover:text-white">
                  <Copy className="w-3 h-3" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(d.id); }} className="text-red-400 hover:text-red-300">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Highlighters ── */}
      <h3 className="text-slate-400 font-semibold">{isRtl ? "🖊️ هايلايتر / ماركر" : "🖊️ Highlighter / Marker"}</h3>
      <p className="text-slate-500 text-[10px]">{isRtl ? "ضع خلف النص لتسليط الضوء عليه" : "Place behind text to highlight it"}</p>
      <div className="grid grid-cols-2 gap-2">
        {BRUSH_HIGHLIGHTS.map((shape) => (
          <button
            key={shape.type}
            onClick={() => handleAddHighlighter(shape.type)}
            className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-yellow-400 transition overflow-hidden"
          >
            <div
              className="w-full h-8 flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: generateHighlighterSvg(shape.type, "#facc15", 0.7).replace('<svg ', '<svg width="100%" height="100%" style="display:block" ') }}
            />
            <span className="text-[9px] text-slate-300">{isRtl ? shape.labelAr : shape.labelEn}</span>
          </button>
        ))}
      </div>

      {/* ── Hand Circles ── */}
      <h3 className="text-slate-400 font-semibold pt-1">{isRtl ? "⭕ دوائر يدوية" : "⭕ Hand Circles"}</h3>
      <p className="text-slate-500 text-[10px]">{isRtl ? "أحِط النص بدائرة مرسومة باليد" : "Surround text with a hand-drawn circle"}</p>
      <div className="grid grid-cols-3 gap-2">
        {BRUSH_CIRCLES.map((shape) => (
          <button
            key={shape.type}
            onClick={() => handleAddCircle(shape.type)}
            className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-red-400 transition overflow-hidden"
          >
            <div
              className="w-full h-10 flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: generateHandCircleSvg(shape.type, "#ef4444", 3).replace('<svg ', '<svg width="100%" height="100%" style="display:block" ') }}
            />
            <span className="text-[9px] text-slate-300">{isRtl ? shape.labelAr : shape.labelEn}</span>
          </button>
        ))}
      </div>

      {/* ── Other Shapes ── */}
      <h3 className="text-slate-400 font-semibold pt-1">{isRtl ? "✏️ رموز يدوية" : "✏️ Hand Symbols"}</h3>
      <div className="grid grid-cols-3 gap-2">
        {HAND_SHAPES.map((shape) => (
          <button
            key={shape.type}
            onClick={() => handleAdd(shape.type)}
            className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-700 hover:bg-indigo-600 transition text-slate-300 hover:text-white"
          >
            <span className="text-lg">{shape.icon}</span>
            <span className="text-[9px]">{isRtl ? shape.labelAr : shape.labelEn}</span>
          </button>
        ))}
      </div>

      {/* ── Edit selected ── */}
      {selected && (
        <div className="space-y-3 border-t border-slate-700 pt-3">
          <p className="text-slate-400 font-semibold">{isRtl ? "✏️ تعديل العنصر" : "✏️ Edit Element"}</p>

          {isHighlighter ? (
            <>
              <StudioColorPicker
                label={isRtl ? "🎨 لون التضليل" : "🎨 Highlight Color"}
                value={selected.strokeColor || "#facc15"}
                onChange={(v) => updateHighlighter("strokeColor", v)}
              />
              <div className="flex flex-wrap gap-1.5">
                {HIGHLIGHT_COLORS.map(c => (
                  <button key={c} onClick={() => updateHighlighter("strokeColor", c)}
                    style={{ background: c, border: selected.strokeColor === c ? "2px solid #818cf8" : "1px solid #475569" }}
                    className="w-6 h-6 rounded hover:scale-110 transition" />
                ))}
              </div>
              <div>
                <label className="text-slate-400 block mb-1">{isRtl ? "شفافية التضليل" : "Opacity"}: {Math.round((selected.brushOpacity ?? 0.55) * 100)}%</label>
                <input type="range" min="0.1" max="0.95" step="0.05" value={selected.brushOpacity ?? 0.55}
                  onChange={(e) => updateHighlighter("brushOpacity", parseFloat(e.target.value))} className="w-full" />
              </div>
            </>
          ) : (
            <>
              <StudioColorPicker
                label={isRtl ? "🎨 لون الخط" : "🎨 Stroke Color"}
                value={selected.strokeColor || "#ef4444"}
                onChange={(v) => updateShape("strokeColor", v)}
              />
              <div className="flex flex-wrap gap-1.5">
                {HIGHLIGHT_COLORS.map(c => (
                  <button key={c} onClick={() => updateShape("strokeColor", c)}
                    style={{ background: c, border: selected.strokeColor === c ? "2px solid #818cf8" : "1px solid #475569" }}
                    className="w-6 h-6 rounded hover:scale-110 transition" />
                ))}
              </div>
              <div>
                <label className="text-slate-400 block mb-1">{isRtl ? "سماكة الخط" : "Stroke Width"}: {selected.strokeWidth || 3}</label>
                <input type="range" min="1" max="80" step="1" value={selected.strokeWidth || 3}
                  onChange={(e) => updateShape("strokeWidth", parseFloat(e.target.value))} className="w-full" />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">{isRtl ? "العرض%" : "Width%"}</label>
              <input type="number" value={Math.round(selected.width || 25)}
                onChange={(e) => onUpdate(selected.id, { width: parseFloat(e.target.value) })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">{isRtl ? "الارتفاع%" : "Height%"}</label>
              <input type="number" value={Math.round(selected.height || 25)}
                onChange={(e) => onUpdate(selected.id, { height: parseFloat(e.target.value) })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">X%</label>
              <input type="number" value={Math.round(selected.x || 0)}
                onChange={(e) => onUpdate(selected.id, { x: parseFloat(e.target.value) })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Y%</label>
              <input type="number" value={Math.round(selected.y || 0)}
                onChange={(e) => onUpdate(selected.id, { y: parseFloat(e.target.value) })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">{isRtl ? "دوران" : "Rotation"}</label>
            <input type="number" value={selected.rotation || 0}
              onChange={(e) => onUpdate(selected.id, { rotation: parseInt(e.target.value) })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">{isRtl ? "شفافية" : "Opacity"}</label>
            <input type="range" min="0" max="1" step="0.05" value={selected.opacity ?? 1}
              onChange={(e) => onUpdate(selected.id, { opacity: parseFloat(e.target.value) })} className="w-full" />
          </div>
        </div>
      )}
    </div>
  );
}