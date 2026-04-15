import React, { useState, useCallback, useRef } from "react";
import { Copy, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, Upload, X, Loader2 } from "lucide-react";
import StudioColorPicker from "../StudioColorPicker";
import FiltersPanel from "./FiltersPanel";
import BlendModesPanel from "./BlendModesPanel";
import { uploadFile } from "@/api/localClient";

const SHAPE_TYPES = [
  { id: "rect", labelAr: "مستطيل", labelEn: "Rectangle" },
  { id: "circle", labelAr: "دائرة", labelEn: "Circle" },
  { id: "line", labelAr: "خط", labelEn: "Line" },
  { id: "triangle", labelAr: "مثلث", labelEn: "Triangle" },
  { id: "diamond", labelAr: "معين", labelEn: "Diamond" },
  { id: "star", labelAr: "نجمة", labelEn: "Star" },
  { id: "hexagon", labelAr: "سداسي", labelEn: "Hexagon" },
  { id: "pentagon", labelAr: "خماسي", labelEn: "Pentagon" },
  { id: "arrow", labelAr: "سهم", labelEn: "Arrow" },
  { id: "ellipse", labelAr: "بيضاوي", labelEn: "Ellipse" },
  { id: "rounded", labelAr: "مستطيل مستدير", labelEn: "Rounded" },
];

export default function ShapesPanel({ shapes, selectedId, onSelect, onAdd, onUpdate, onDelete, onDuplicate, onReorder, language }) {
  const isRtl = language === "ar";
  const selected = shapes.find((s) => s.id === selectedId);
  const update = (key, val) => { if (selected) onUpdate(selected.id, { [key]: val }); };
  const [multiSelected, setMultiSelected] = useState([]);
  const [uploadingFill, setUploadingFill] = useState(false);
  const fillImgRef = useRef();
  const [distributeGap, setDistributeGap] = useState(5);
  const [distributeDir, setDistributeDir] = useState("h"); // h or v

  const toggleMultiSelect = (id, e) => {
    e.stopPropagation();
    setMultiSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Get working set: multiSelected if any, else single selected, else all visible
  const getTargets = () => {
    if (multiSelected.length > 0) return shapes.filter(s => multiSelected.includes(s.id));
    if (selected) return [selected];
    return [];
  };

  // Center selected shapes
  const centerH = () => {
    getTargets().forEach(s => onUpdate(s.id, { x: 50 - (s.width || 20) / 2 }));
  };
  const centerV = () => {
    getTargets().forEach(s => onUpdate(s.id, { y: 50 - (s.height || 15) / 2 }));
  };

  // Move selected shape away from center by distributeGap amount
  const distributeH = () => {
    if (!selected) return;
    const currentX = selected.x || 50;
    const center = 50;
    const direction = currentX >= center ? 1 : -1;
    onUpdate(selected.id, { x: center + direction * distributeGap - (selected.width || 20) / 2 });
  };

  const distributeV = () => {
    if (!selected) return;
    const currentY = selected.y || 50;
    const center = 50;
    const direction = currentY >= center ? 1 : -1;
    onUpdate(selected.id, { y: center + direction * distributeGap - (selected.height || 15) / 2 });
  };

  const moveShapeUp = (id) => {
    const idx = shapes.findIndex(s => s.id === id);
    if (idx < shapes.length - 1 && onReorder) {
      const newArr = [...shapes];
      [newArr[idx], newArr[idx + 1]] = [newArr[idx + 1], newArr[idx]];
      onReorder(newArr);
    }
  };

  const moveShapeDown = (id) => {
    const idx = shapes.findIndex(s => s.id === id);
    if (idx > 0 && onReorder) {
      const newArr = [...shapes];
      [newArr[idx], newArr[idx - 1]] = [newArr[idx - 1], newArr[idx]];
      onReorder(newArr);
    }
  };

  const moveSelectedUp = () => {
    if (multiSelected.length === 0 || !onReorder) return;
    const newArr = [...shapes];
    multiSelected.forEach(id => {
      const idx = newArr.findIndex(s => s.id === id);
      if (idx < newArr.length - 1) {
        [newArr[idx], newArr[idx + 1]] = [newArr[idx + 1], newArr[idx]];
      }
    });
    onReorder(newArr);
  };

  const moveSelectedDown = () => {
    if (multiSelected.length === 0 || !onReorder) return;
    const newArr = [...shapes];
    [...multiSelected].reverse().forEach(id => {
      const idx = newArr.findIndex(s => s.id === id);
      if (idx > 0) {
        [newArr[idx], newArr[idx - 1]] = [newArr[idx - 1], newArr[idx]];
      }
    });
    onReorder(newArr);
  };

  return (
    <div className="space-y-3 text-xs">
      {/* Add shapes */}
      <div className="grid grid-cols-3 gap-1">
        {SHAPE_TYPES.map((st) => (
          <button
            key={st.id}
            onClick={() => onAdd(st.id)}
            className="flex flex-col items-center gap-1 p-2 rounded bg-slate-700 hover:bg-indigo-600 transition text-slate-300 hover:text-white"
          >
            <ShapeIcon type={st.id} />
            <span className="text-[10px]">{isRtl ? st.labelAr : st.labelEn}</span>
          </button>
        ))}
      </div>

      {/* Align & Distribute */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-slate-500">{isRtl ? "محاذاة وتوزيع" : "Align & Distribute"}</p>
          {multiSelected.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-indigo-400 text-[10px]">{multiSelected.length} {isRtl ? "محدد" : "selected"}</span>
              <button onClick={() => setMultiSelected([])} className="text-slate-400 hover:text-red-400 text-[10px]">✕</button>
            </div>
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={centerH} disabled={getTargets().length === 0}
            className="flex-1 py-1.5 rounded bg-slate-700 hover:bg-indigo-600 disabled:opacity-30 transition text-[10px] font-semibold">
            ⬌ {isRtl ? "أفقي" : "Ctr H"}
          </button>
          <button onClick={centerV} disabled={getTargets().length === 0}
            className="flex-1 py-1.5 rounded bg-slate-700 hover:bg-indigo-600 disabled:opacity-30 transition text-[10px] font-semibold">
            ⬍ {isRtl ? "عمودي" : "Ctr V"}
          </button>
          <button onClick={() => { centerH(); centerV(); }} disabled={getTargets().length === 0}
            className="flex-1 py-1.5 rounded bg-slate-700 hover:bg-indigo-600 disabled:opacity-30 transition text-[10px] font-semibold">
            ⊕ {isRtl ? "مركز" : "Both"}
          </button>
        </div>

        {/* Offset from center */}
        <div className="bg-slate-700/50 rounded-lg p-2 space-y-2">
          <label className="text-slate-300 font-semibold block">{isRtl ? "المسافة عن السنتر%" : "Offset from center %"}</label>
          <input
            type="number" min="0" max="200" value={distributeGap}
            onChange={(e) => setDistributeGap(parseFloat(e.target.value) || 0)}
            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white"
          />
          <div className="flex gap-1">
            <button
              onClick={distributeH}
              disabled={!selected}
              className="flex-1 py-2 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white text-[11px] font-bold transition"
            >
              ↔ {isRtl ? "أفقي" : "Horizontal"}
            </button>
            <button
              onClick={distributeV}
              disabled={!selected}
              className="flex-1 py-2 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white text-[11px] font-bold transition"
            >
              ↕ {isRtl ? "عمودي" : "Vertical"}
            </button>
          </div>
        </div>
      </div>

      {/* Multi-select layer controls */}
      {multiSelected.length > 0 && (
        <div className="bg-slate-700/50 rounded-lg p-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-indigo-400 text-xs font-semibold">{multiSelected.length} {isRtl ? "محدد" : "selected"}</span>
            <button onClick={() => setMultiSelected([])} className="text-slate-400 hover:text-red-400 text-xs">✕</button>
          </div>
          <div className="flex gap-1">
            <button onClick={moveSelectedUp} className="flex-1 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center justify-center gap-1">
              <ArrowUp className="w-3 h-3" /> {isRtl ? "أمام" : "Forward"}
            </button>
            <button onClick={moveSelectedDown} className="flex-1 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center justify-center gap-1">
              <ArrowDown className="w-3 h-3" /> {isRtl ? "خلف" : "Backward"}
            </button>
          </div>
        </div>
      )}

      {/* Shape list */}
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {shapes.map((s) => (
          <div
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition ${
              multiSelected.includes(s.id) ? "bg-purple-600/30 border border-purple-500/50" :
              s.id === selectedId ? "bg-indigo-600/30 border border-indigo-500/50" : "bg-slate-700 hover:bg-slate-600"
            }`}
          >
            <input
              type="checkbox"
              checked={multiSelected.includes(s.id)}
              onChange={(e) => toggleMultiSelect(s.id, e)}
              onClick={(e) => e.stopPropagation()}
              className="w-3 h-3 accent-purple-500 flex-shrink-0"
            />
            <ShapeIcon type={s.shapeType} size={12} />
            <span className="flex-1 text-slate-200">{isRtl ? SHAPE_TYPES.find(st => st.id === s.shapeType)?.labelAr : SHAPE_TYPES.find(st => st.id === s.shapeType)?.labelEn}</span>
            <button onClick={(e) => { e.stopPropagation(); onUpdate(s.id, { visible: !s.visible }); }} className="text-slate-400 hover:text-white">
              {s.visible !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDuplicate(s.id); }} className="text-slate-400 hover:text-white" title="Ctrl+D">
              <Copy className="w-3 h-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); moveShapeUp(s.id); }} className="text-slate-400 hover:text-white" title={isRtl ? "أمام" : "Bring Forward"}>
              <ArrowUp className="w-3 h-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); moveShapeDown(s.id); }} className="text-slate-400 hover:text-white" title={isRtl ? "خلف" : "Send Backward"}>
              <ArrowDown className="w-3 h-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(s.id); }} className="text-red-400 hover:text-red-300">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Selected shape settings */}
      {selected && (
        <div className="space-y-3 border-t border-slate-700 pt-3">
          {/* Fill: Solid / Gradient */}
          <div className="bg-slate-700/50 rounded-lg p-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold">{isRtl ? "نوع التعبئة" : "Fill Type"}</label>
              <div className="flex gap-1">
                <button
                  onClick={() => update("fillMode", "solid")}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition ${(!selected.fillMode || selected.fillMode === "solid") ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-400 hover:text-white"}`}
                >{isRtl ? "لون" : "Solid"}</button>
                <button
                  onClick={() => update("fillMode", "gradient")}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition ${selected.fillMode === "gradient" ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-400 hover:text-white"}`}
                >{isRtl ? "تدرج" : "Gradient"}</button>
                <button
                  onClick={() => update("fillMode", "stripes")}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition ${selected.fillMode === "stripes" ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-400 hover:text-white"}`}
                >{isRtl ? "خطوط" : "Stripes"}</button>
              </div>
            </div>

            {(!selected.fillMode || selected.fillMode === "solid") && (
              <StudioColorPicker label={isRtl ? "لون التعبئة" : "Fill Color"} value={selected.fillColor} onChange={(v) => update("fillColor", v)} />
            )}

            {selected.fillMode === "gradient" && (
              <>
                <StudioColorPicker label={isRtl ? "اللون الأول" : "Color 1"} value={selected.gradientColor1 || "#8b5cf6"} onChange={(v) => update("gradientColor1", v)} />
                <StudioColorPicker label={isRtl ? "اللون الثاني" : "Color 2"} value={selected.gradientColor2 || "#ec4899"} onChange={(v) => update("gradientColor2", v)} />
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400">{isRtl ? "زاوية التدرج" : "Gradient Angle"}</label>
                    <span className="text-indigo-400 font-bold">{selected.gradientAngle ?? 135}°</span>
                  </div>
                  <input type="range" min="0" max="360" value={selected.gradientAngle ?? 135}
                    onChange={(e) => update("gradientAngle", parseInt(e.target.value))} className="w-full accent-indigo-500" />
                  <div className="flex gap-1 mt-1">
                    {[0, 45, 90, 135, 180, 225, 270, 315].map(v => (
                      <button key={v} onClick={() => update("gradientAngle", v)}
                        className={`flex-1 py-1 rounded text-[9px] transition ${(selected.gradientAngle ?? 135) === v ? "bg-indigo-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-slate-400"}`}>
                        {v}°
                      </button>
                    ))}
                  </div>
                </div>
                {/* Gradient preview */}
                <div className="w-full h-6 rounded" style={{ background: `linear-gradient(${selected.gradientAngle ?? 135}deg, ${selected.gradientColor1 || "#8b5cf6"}, ${selected.gradientColor2 || "#ec4899"})` }} />
              </>
            )}

            {selected.fillMode === "stripes" && (() => {
              const sw = selected.stripeWidth ?? 10;
              const sa = selected.stripeAngle ?? 45;
              const sc = selected.stripeColor || "#ffffff";
              const sbg = selected.stripeBg || "#8b5cf6";
              const previewBg = `repeating-linear-gradient(${sa}deg, ${sc} 0px, ${sc} ${sw}px, ${sbg} ${sw}px, ${sbg} ${sw * 2}px)`;
              return (
                <>
                  <StudioColorPicker label={isRtl ? "لون الخط" : "Stripe Color"} value={sc} onChange={(v) => update("stripeColor", v)} />
                  <StudioColorPicker label={isRtl ? "لون الخلفية" : "Background Color"} value={sbg} onChange={(v) => update("stripeBg", v)} />
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-400">{isRtl ? "عرض الخط" : "Stripe Width"}</label>
                      <span className="text-indigo-400 font-bold">{sw}px</span>
                    </div>
                    <input type="range" min="2" max="40" step="1" value={sw}
                      onChange={(e) => update("stripeWidth", parseInt(e.target.value))} className="w-full accent-indigo-500" />
                    <div className="flex gap-1 mt-1">
                      {[4, 8, 12, 16, 24, 32].map(v => (
                        <button key={v} onClick={() => update("stripeWidth", v)}
                          className={`flex-1 py-1 rounded text-[10px] transition ${sw === v ? "bg-indigo-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-slate-400"}`}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-400">{isRtl ? "زاوية الخطوط" : "Stripe Angle"}</label>
                      <span className="text-indigo-400 font-bold">{sa}°</span>
                    </div>
                    <input type="range" min="0" max="180" step="5" value={sa}
                      onChange={(e) => update("stripeAngle", parseInt(e.target.value))} className="w-full accent-indigo-500" />
                    <div className="flex gap-1 mt-1">
                      {[0, 30, 45, 60, 90, 120, 135, 150].map(v => (
                        <button key={v} onClick={() => update("stripeAngle", v)}
                          className={`flex-1 py-1 rounded text-[9px] transition ${sa === v ? "bg-indigo-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-slate-400"}`}>
                          {v}°
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Stripes preview */}
                  <div className="w-full h-8 rounded border border-slate-600" style={{ background: previewBg }} />
                </>
              );
            })()}
          </div>

          <StudioColorPicker label={isRtl ? "لون الحدود" : "Border Color"} value={selected.borderColor} onChange={(v) => update("borderColor", v)} />

          {/* Blur effect */}
          <div className="bg-slate-700/50 rounded-lg p-2 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold">{isRtl ? "ضبابية" : "Blur"}</label>
              <span className="text-indigo-400 font-bold">{selected.blur || 0}px</span>
            </div>
            <input type="range" min="0" max="40" step="0.5" value={selected.blur || 0}
              onChange={(e) => update("blur", parseFloat(e.target.value))} className="w-full accent-indigo-500" />
            <div className="flex gap-1">
              {[0, 3, 6, 10, 15, 20].map(v => (
                <button key={v} onClick={() => update("blur", v)}
                  className={`flex-1 py-1 rounded text-[10px] transition ${(selected.blur || 0) === v ? "bg-indigo-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-slate-400"}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Border radius - for rect, triangle, diamond */}
          {(selected.shapeType === "rect" || selected.shapeType === "triangle" || selected.shapeType === "diamond") && (
            <div className="bg-slate-700/50 rounded-lg p-2 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-semibold">{isRtl ? "⬛ تدوير الحواف" : "⬛ Corner Radius"}</label>
                <span className="text-indigo-400 font-bold">{selected.borderRadius || 0}px</span>
              </div>
              <input type="range" min="0" max="200" step="1" value={selected.borderRadius || 0}
                onChange={(e) => update("borderRadius", parseInt(e.target.value))} className="w-full accent-indigo-500" />
              <div className="flex gap-1 mt-1">
                {[0, 8, 16, 32, 99, 200].map(v => (
                  <button key={v} onClick={() => update("borderRadius", v)}
                    className={`flex-1 py-1 rounded text-[10px] transition ${selected.borderRadius === v ? "bg-indigo-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-slate-400"}`}>
                    {v === 0 ? "■" : v === 200 ? "●" : v}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">{isRtl ? "سماكة الحدود" : "Border Width"}</label>
              <input type="number" min="0" value={selected.borderWidth || 0}
                onChange={(e) => update("borderWidth", parseInt(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">{isRtl ? "العرض%" : "Width%"}</label>
              <input type="number" value={Math.round(selected.width)} onChange={(e) => update("width", parseFloat(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">{isRtl ? "الارتفاع%" : "Height%"}</label>
              <input type="number" value={Math.round(selected.height)} onChange={(e) => update("height", parseFloat(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">X%</label>
              <input type="number" value={Math.round(selected.x)} onChange={(e) => update("x", parseFloat(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Y%</label>
              <input type="number" value={Math.round(selected.y)} onChange={(e) => update("y", parseFloat(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
            </div>
          </div>

          {/* Nudge arrows */}
          <div>
            <label className="text-slate-400 block mb-1">{isRtl ? "تحريك دقيق" : "Nudge"}</label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { label: "↑", key: "y", delta: -1 },
                { label: "↓", key: "y", delta: 1 },
                { label: "←", key: "x", delta: -1 },
                { label: "→", key: "x", delta: 1 },
              ].map(({ label, key, delta }) => (
                <button key={label} onClick={() => update(key, (selected[key] || 0) + delta)}
                  className="py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-white">{label}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">{isRtl ? "شفافية" : "Opacity"}</label>
              <input type="range" min="0" max="1" step="0.05" value={selected.opacity ?? 1}
                onChange={(e) => update("opacity", parseFloat(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">{isRtl ? "دوران" : "Rotation"}</label>
              <input type="number" value={selected.rotation || 0}
                onChange={(e) => update("rotation", parseInt(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" />
            </div>
          </div>

          {/* ── أشكال مرنة / Flex Transform ── */}
          <div className="bg-slate-700/50 rounded-lg p-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-indigo-300 font-bold text-xs">
                {isRtl ? "✦ أشكال مرنة" : "✦ Flex Transform"}
              </label>
              <button
                onClick={() => { update("skewX", 0); update("skewY", 0); update("rotateX", 0); update("rotateY", 0); update("perspective", 800); }}
                className="text-[10px] text-slate-400 hover:text-white bg-slate-700 px-2 py-0.5 rounded transition"
              >{isRtl ? "إعادة" : "Reset"}</button>
            </div>

            {/* Skew X */}
            <div>
              <div className="flex justify-between mb-0.5">
                <label className="text-slate-400 text-[11px]">{isRtl ? "ميل أفقي" : "Skew X"}</label>
                <span className="text-indigo-400 text-[11px] font-bold">{selected.skewX || 0}°</span>
              </div>
              <input type="range" min="-60" max="60" step="1" value={selected.skewX || 0}
                onChange={(e) => update("skewX", parseInt(e.target.value))} className="w-full accent-indigo-500" />
              <div className="flex gap-1 mt-1">
                {[-45, -30, -15, 0, 15, 30, 45].map(v => (
                  <button key={v} onClick={() => update("skewX", v)}
                    className={`flex-1 py-0.5 rounded text-[9px] transition ${(selected.skewX || 0) === v ? "bg-indigo-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-slate-400"}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Skew Y */}
            <div>
              <div className="flex justify-between mb-0.5">
                <label className="text-slate-400 text-[11px]">{isRtl ? "ميل عمودي" : "Skew Y"}</label>
                <span className="text-indigo-400 text-[11px] font-bold">{selected.skewY || 0}°</span>
              </div>
              <input type="range" min="-60" max="60" step="1" value={selected.skewY || 0}
                onChange={(e) => update("skewY", parseInt(e.target.value))} className="w-full accent-indigo-500" />
            </div>

            {/* 3D Rotate X */}
            <div>
              <div className="flex justify-between mb-0.5">
                <label className="text-slate-400 text-[11px]">{isRtl ? "3D أعلى/أسفل" : "3D Tilt X"}</label>
                <span className="text-indigo-400 text-[11px] font-bold">{selected.rotateX || 0}°</span>
              </div>
              <input type="range" min="-80" max="80" step="1" value={selected.rotateX || 0}
                onChange={(e) => update("rotateX", parseInt(e.target.value))} className="w-full accent-purple-500" />
            </div>

            {/* 3D Rotate Y */}
            <div>
              <div className="flex justify-between mb-0.5">
                <label className="text-slate-400 text-[11px]">{isRtl ? "3D يمين/يسار" : "3D Tilt Y"}</label>
                <span className="text-indigo-400 text-[11px] font-bold">{selected.rotateY || 0}°</span>
              </div>
              <input type="range" min="-80" max="80" step="1" value={selected.rotateY || 0}
                onChange={(e) => update("rotateY", parseInt(e.target.value))} className="w-full accent-purple-500" />
              <div className="flex gap-1 mt-1">
                {[-60, -40, -20, 0, 20, 40, 60].map(v => (
                  <button key={v} onClick={() => update("rotateY", v)}
                    className={`flex-1 py-0.5 rounded text-[9px] transition ${(selected.rotateY || 0) === v ? "bg-purple-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-slate-400"}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Perspective depth */}
            <div>
              <div className="flex justify-between mb-0.5">
                <label className="text-slate-400 text-[11px]">{isRtl ? "عمق المنظور" : "Perspective"}</label>
                <span className="text-indigo-400 text-[11px] font-bold">{selected.perspective ?? 800}px</span>
              </div>
              <input type="range" min="100" max="1500" step="50" value={selected.perspective ?? 800}
                onChange={(e) => update("perspective", parseInt(e.target.value))} className="w-full accent-indigo-400" />
              <div className="flex gap-1 mt-1">
                {[200, 400, 600, 800, 1200].map(v => (
                  <button key={v} onClick={() => update("perspective", v)}
                    className={`flex-1 py-0.5 rounded text-[9px] transition ${(selected.perspective ?? 800) === v ? "bg-indigo-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-slate-400"}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick presets */}
            <div>
              <label className="text-slate-500 text-[10px] block mb-1">{isRtl ? "قوالب سريعة" : "Quick Presets"}</label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { label: isRtl ? "مائل" : "Slant", skewX: -20, skewY: 0, rotateX: 0, rotateY: 0 },
                  { label: isRtl ? "متوازي" : "Para", skewX: -25, skewY: 0, rotateX: 0, rotateY: 0 },
                  { label: isRtl ? "3D يمين" : "3D →", skewX: 0, skewY: 0, rotateX: 0, rotateY: 40, perspective: 500 },
                  { label: isRtl ? "3D يسار" : "3D ←", skewX: 0, skewY: 0, rotateX: 0, rotateY: -40, perspective: 500 },
                  { label: isRtl ? "3D فوق" : "3D ↑", skewX: 0, skewY: 0, rotateX: -35, rotateY: 0, perspective: 500 },
                  { label: isRtl ? "مستوي" : "Flat", skewX: 0, skewY: 0, rotateX: 0, rotateY: 0, perspective: 800 },
                ].map(p => (
                  <button key={p.label}
                    onClick={() => { update("skewX", p.skewX); update("skewY", p.skewY); update("rotateX", p.rotateX); update("rotateY", p.rotateY); if (p.perspective) update("perspective", p.perspective); }}
                    className="py-1 rounded text-[10px] bg-slate-700 hover:bg-indigo-600 text-slate-300 hover:text-white transition">
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={() => onDuplicate(selected.id)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-700 hover:bg-indigo-600 text-slate-300 hover:text-white transition">
            <Copy className="w-3.5 h-3.5" />
            {isRtl ? "نسخ الشكل (Ctrl+D)" : "Duplicate (Ctrl+D)"}
          </button>

          {/* Image Fill inside shape */}
          {selected.shapeType !== "arrow" && selected.shapeType !== "line" && (
            <div className="bg-slate-700/50 rounded-lg p-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-semibold text-xs">
                  {isRtl ? "🖼️ صورة داخل الشكل" : "🖼️ Image Fill"}
                </label>
                {selected.fillImage && (
                  <button onClick={() => { update("fillImage", null); update("imageOffsetX", 0); update("imageOffsetY", 0); update("imageScale", 100); }}
                    className="text-red-400 hover:text-red-300 text-xs flex items-center gap-0.5">
                    <X className="w-3 h-3" /> {isRtl ? "إزالة" : "Remove"}
                  </button>
                )}
              </div>

              {selected.fillImage ? (
                <img src={selected.fillImage} alt="" className="w-full h-16 object-cover rounded" />
              ) : (
                <button
                  onClick={() => fillImgRef.current?.click()}
                  disabled={uploadingFill}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition disabled:opacity-50"
                >
                  {uploadingFill ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploadingFill ? (isRtl ? "جاري الرفع..." : "Uploading...") : (isRtl ? "رفع صورة" : "Upload Image")}
                </button>
              )}
              <input
                ref={fillImgRef} type="file" accept="image/*" className="hidden"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file || !selected) return;
                  setUploadingFill(true);
                  try {
                    const { file_url } = await uploadFile({ file });
                    update("fillImage", file_url);
                  } finally {
                    setUploadingFill(false);
                    e.target.value = "";
                  }
                }}
              />

              {selected.fillImage && (
                <>
                  <div>
                    <div className="flex justify-between text-slate-400 text-[10px] mb-0.5">
                      <span>{isRtl ? "حجم الصورة" : "Scale"}</span>
                      <span>{selected.imageScale || 100}%</span>
                    </div>
                    <input type="range" min="20" max="300" step="5" value={selected.imageScale || 100}
                      onChange={(e) => update("imageScale", parseInt(e.target.value))} className="w-full accent-indigo-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-400 text-[10px] mb-0.5">
                      <span>{isRtl ? "إزاحة أفقية" : "Offset X"}</span>
                      <span>{selected.imageOffsetX || 0}</span>
                    </div>
                    <input type="range" min="-50" max="50" step="1" value={selected.imageOffsetX || 0}
                      onChange={(e) => update("imageOffsetX", parseInt(e.target.value))} className="w-full accent-indigo-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-400 text-[10px] mb-0.5">
                      <span>{isRtl ? "إزاحة عمودية" : "Offset Y"}</span>
                      <span>{selected.imageOffsetY || 0}</span>
                    </div>
                    <input type="range" min="-50" max="50" step="1" value={selected.imageOffsetY || 0}
                      onChange={(e) => update("imageOffsetY", parseInt(e.target.value))} className="w-full accent-indigo-500" />
                  </div>
                  <button onClick={() => fillImgRef.current?.click()}
                    className="w-full flex items-center justify-center gap-1 py-1 rounded bg-slate-600 hover:bg-slate-500 text-xs text-slate-300 transition">
                    <Upload className="w-3 h-3" /> {isRtl ? "تغيير الصورة" : "Change Image"}
                  </button>
                </>
              )}
            </div>
          )}

          <FiltersPanel element={selected} onChange={(updated) => onUpdate(selected.id, updated)} language={language} />
          <BlendModesPanel element={selected} onChange={(updated) => onUpdate(selected.id, updated)} language={language} />
        </div>
      )}
    </div>
  );
}

function ShapeIcon({ type, size = 16 }) {
  const s = size;
  if (type === "rect") return <div style={{ width: s, height: s * 0.75, border: "2px solid currentColor", borderRadius: 2 }} />;
  if (type === "rounded") return <div style={{ width: s, height: s * 0.75, border: "2px solid currentColor", borderRadius: s / 3 }} />;
  if (type === "circle") return <div style={{ width: s, height: s, border: "2px solid currentColor", borderRadius: "50%" }} />;
  if (type === "ellipse") return <div style={{ width: s * 1.3, height: s * 0.7, border: "2px solid currentColor", borderRadius: "50%" }} />;
  if (type === "line") return <div style={{ width: s, height: 2, backgroundColor: "currentColor" }} />;
  if (type === "triangle") return (
    <svg width={s} height={s} viewBox="0 0 16 16"><polygon points="8,1 15,15 1,15" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
  );
  if (type === "diamond") return (
    <svg width={s} height={s} viewBox="0 0 16 16"><polygon points="8,1 15,8 8,15 1,8" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
  );
  if (type === "star") return (
    <svg width={s} height={s} viewBox="0 0 16 16"><polygon points="8,1 10,6 15,6 11,10 13,15 8,11 3,15 5,10 1,6 6,6" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
  );
  if (type === "pentagon") return (
    <svg width={s} height={s} viewBox="0 0 16 16"><polygon points="8,1 14,5 11,13 5,13 2,5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
  );
  if (type === "hexagon") return (
    <svg width={s} height={s} viewBox="0 0 16 16"><polygon points="4,2 12,2 15,8 12,14 4,14 1,8" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
  );
  if (type === "arrow") return (
    <svg width={s} height={s} viewBox="0 0 16 16"><path d="M2,8 L12,8 M10,6 L12,8 L10,10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );
  return null;
}