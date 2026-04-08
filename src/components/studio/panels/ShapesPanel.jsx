import React, { useState, useCallback } from "react";
import { Copy, Trash2, Eye, EyeOff, ArrowUp, ArrowDown } from "lucide-react";
import StudioColorPicker from "../StudioColorPicker";
import FiltersPanel from "./FiltersPanel";
import BlendModesPanel from "./BlendModesPanel";

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
          <StudioColorPicker label={isRtl ? "لون التعبئة" : "Fill Color"} value={selected.fillColor} onChange={(v) => update("fillColor", v)} />
          <StudioColorPicker label={isRtl ? "لون الحدود" : "Border Color"} value={selected.borderColor} onChange={(v) => update("borderColor", v)} />

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

          <button onClick={() => onDuplicate(selected.id)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-700 hover:bg-indigo-600 text-slate-300 hover:text-white transition">
            <Copy className="w-3.5 h-3.5" />
            {isRtl ? "نسخ الشكل (Ctrl+D)" : "Duplicate (Ctrl+D)"}
          </button>

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