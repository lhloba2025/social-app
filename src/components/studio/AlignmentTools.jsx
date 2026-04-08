import React, { useState } from "react";
import { AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical, Maximize2, Grid3x3 } from "lucide-react";

export default function AlignmentTools({ selectedElements, onAlign, language, multiSelectedCount = 0, onGroup, selectedGroupId, onUngroup }) {
  const isRtl = language === "ar";
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(10);

  if (!selectedElements && !selectedGroupId) {
    return null;
  }

  // محاذاة أفقية
  const alignLeft = () => {
    const minX = Math.min(...selectedElements.map(el => el.x || 0));
    selectedElements.forEach(el => onAlign(el.id, el.type, { x: minX }));
  };

  const alignCenter = () => {
    const avgX = selectedElements.reduce((sum, el) => sum + (el.x || 0), 0) / selectedElements.length;
    selectedElements.forEach(el => onAlign(el.id, el.type, { x: avgX }));
  };

  const alignRight = () => {
    const maxX = Math.max(...selectedElements.map(el => (el.x || 0) + (el.width || 20)));
    selectedElements.forEach(el => {
      const newX = maxX - (el.width || 20);
      onAlign(el.id, el.type, { x: newX });
    });
  };

  // محاذاة عمودية
  const alignTop = () => {
    const minY = Math.min(...selectedElements.map(el => el.y || 0));
    selectedElements.forEach(el => onAlign(el.id, el.type, { y: minY }));
  };

  const alignMiddle = () => {
    const avgY = selectedElements.reduce((sum, el) => sum + (el.y || 0), 0) / selectedElements.length;
    selectedElements.forEach(el => onAlign(el.id, el.type, { y: avgY }));
  };

  const alignBottom = () => {
    const maxY = Math.max(...selectedElements.map(el => (el.y || 0) + (el.height || 15)));
    selectedElements.forEach(el => {
      const newY = maxY - (el.height || 15);
      onAlign(el.id, el.type, { y: newY });
    });
  };

  // توزيع متساوي أفقي
  const distributeHorizontal = () => {
    const sorted = [...selectedElements].sort((a, b) => (a.x || 0) - (b.x || 0));
    if (sorted.length < 3) return;

    const firstX = sorted[0].x || 0;
    const lastX = sorted[sorted.length - 1].x || 0;
    const totalSpace = lastX - firstX;
    const gaps = sorted.length - 1;
    const gap = gaps > 0 ? totalSpace / gaps : 0;

    sorted.forEach((el, idx) => {
      const newX = firstX + gap * idx;
      onAlign(el.id, el.type, { x: newX });
    });
  };

  // توزيع متساوي عمودي
  const distributeVertical = () => {
    const sorted = [...selectedElements].sort((a, b) => (a.y || 0) - (b.y || 0));
    if (sorted.length < 3) return;

    const firstY = sorted[0].y || 0;
    const lastY = sorted[sorted.length - 1].y || 0;
    const totalSpace = lastY - firstY;
    const gaps = sorted.length - 1;
    const gap = gaps > 0 ? totalSpace / gaps : 0;

    sorted.forEach((el, idx) => {
      const newY = firstY + gap * idx;
      onAlign(el.id, el.type, { y: newY });
    });
  };

  // توزيع متساوي بفراغات متساوية أفقياً
  const distributeHorizontalSpaced = () => {
    const sorted = [...selectedElements].sort((a, b) => (a.x || 0) - (b.x || 0));
    if (sorted.length < 3) return;

    const totalWidth = sorted.reduce((sum, el) => sum + (el.width || 20), 0);
    const firstX = sorted[0].x || 0;
    const lastX = sorted[sorted.length - 1].x || 0;
    const totalSpace = lastX + (sorted[sorted.length - 1].width || 20) - firstX;
    const availableSpace = totalSpace - totalWidth;
    const gaps = sorted.length - 1;
    const gap = gaps > 0 ? availableSpace / gaps : 0;

    let currentX = firstX;
    sorted.forEach((el) => {
      onAlign(el.id, el.type, { x: currentX });
      currentX += (el.width || 20) + gap;
    });
  };

  // توزيع متساوي بفراغات متساوية عمودياً
  const distributeVerticalSpaced = () => {
    const sorted = [...selectedElements].sort((a, b) => (a.y || 0) - (b.y || 0));
    if (sorted.length < 3) return;

    const totalHeight = sorted.reduce((sum, el) => sum + (el.height || 15), 0);
    const firstY = sorted[0].y || 0;
    const lastY = sorted[sorted.length - 1].y || 0;
    const totalSpace = lastY + (sorted[sorted.length - 1].height || 15) - firstY;
    const availableSpace = totalSpace - totalHeight;
    const gaps = sorted.length - 1;
    const gap = gaps > 0 ? availableSpace / gaps : 0;

    let currentY = firstY;
    sorted.forEach((el) => {
      onAlign(el.id, el.type, { y: currentY });
      currentY += (el.height || 15) + gap;
    });
  };

  return (
    <div className="bg-slate-700/50 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-slate-300 font-semibold text-sm">{isRtl ? "🎯 أدوات المحاذاة" : "🎯 Alignment Tools"}</p>
        <span className="text-indigo-400 text-xs font-bold">{selectedElements.length} {isRtl ? "محدد" : "selected"}</span>
      </div>

      {/* Horizontal Alignment */}
      <div className="space-y-1.5">
        <p className="text-slate-400 text-xs font-semibold">{isRtl ? "محاذاة أفقية" : "Horizontal Align"}</p>
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={alignLeft}
            className="p-2 rounded bg-slate-600 hover:bg-indigo-600 transition text-white"
            title={isRtl ? "محاذاة يسار" : "Align Left"}
          >
            <AlignLeft className="w-4 h-4 mx-auto" />
          </button>
          <button
            onClick={alignCenter}
            className="p-2 rounded bg-slate-600 hover:bg-indigo-600 transition text-white"
            title={isRtl ? "محاذاة منتصف" : "Align Center"}
          >
            <AlignCenter className="w-4 h-4 mx-auto" />
          </button>
          <button
            onClick={alignRight}
            className="p-2 rounded bg-slate-600 hover:bg-indigo-600 transition text-white"
            title={isRtl ? "محاذاة يمين" : "Align Right"}
          >
            <AlignRight className="w-4 h-4 mx-auto" />
          </button>
        </div>
      </div>

      {/* Vertical Alignment */}
      <div className="space-y-1.5">
        <p className="text-slate-400 text-xs font-semibold">{isRtl ? "محاذاة عمودية" : "Vertical Align"}</p>
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={alignTop}
            className="p-2 rounded bg-slate-600 hover:bg-indigo-600 transition text-white"
            title={isRtl ? "محاذاة أعلى" : "Align Top"}
          >
            <AlignStartVertical className="w-4 h-4 mx-auto" />
          </button>
          <button
            onClick={alignMiddle}
            className="p-2 rounded bg-slate-600 hover:bg-indigo-600 transition text-white"
            title={isRtl ? "محاذاة منتصف" : "Align Middle"}
          >
            <AlignCenterVertical className="w-4 h-4 mx-auto" />
          </button>
          <button
            onClick={alignBottom}
            className="p-2 rounded bg-slate-600 hover:bg-indigo-600 transition text-white"
            title={isRtl ? "محاذاة أسفل" : "Align Bottom"}
          >
            <AlignEndVertical className="w-4 h-4 mx-auto" />
          </button>
        </div>
      </div>

      {/* Distribution */}
      <div className="space-y-1.5">
        <p className="text-slate-400 text-xs font-semibold">{isRtl ? "توزيع متساوي" : "Distribution"}</p>
        <div className="space-y-1">
          <button
            onClick={distributeHorizontal}
            disabled={selectedElements.length < 3}
            className="w-full py-1.5 px-2 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-30 transition text-white text-xs font-semibold"
            title={isRtl ? "توزيع متساوي أفقياً" : "Distribute Horizontally"}
          >
            {isRtl ? "↔ توزيع أفقي" : "↔ Distribute H"}
          </button>
          <button
            onClick={distributeVertical}
            disabled={selectedElements.length < 3}
            className="w-full py-1.5 px-2 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-30 transition text-white text-xs font-semibold"
            title={isRtl ? "توزيع متساوي عمودياً" : "Distribute Vertically"}
          >
            {isRtl ? "↕ توزيع عمودي" : "↕ Distribute V"}
          </button>
          <button
            onClick={distributeHorizontalSpaced}
            disabled={selectedElements.length < 3}
            className="w-full py-1.5 px-2 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-30 transition text-white text-xs font-semibold"
            title={isRtl ? "توزيع متساوي مع فراغات" : "Distribute with Spacing"}
          >
            {isRtl ? "⟷ أفقي مع فراغات" : "⟷ H-Spaced"}
          </button>
          <button
            onClick={distributeVerticalSpaced}
            disabled={selectedElements.length < 3}
            className="w-full py-1.5 px-2 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-30 transition text-white text-xs font-semibold"
            title={isRtl ? "توزيع متساوي مع فراغات عمودية" : "Distribute with Spacing Vertical"}
          >
            {isRtl ? "⟺ عمودي مع فراغات" : "⟺ V-Spaced"}
          </button>
        </div>
      </div>

      {/* Snap to Grid */}
      <div className="space-y-2 border-t border-slate-600 pt-2">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-slate-300 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.checked)}
              className="w-3 h-3 accent-indigo-500 cursor-pointer"
            />
            <Grid3x3 className="w-3.5 h-3.5" />
            {isRtl ? "الشبكة المغناطيسية" : "Snap to Grid"}
          </label>
        </div>
        {snapToGrid && (
          <div className="flex items-center gap-2">
            <label className="text-slate-400 text-xs">{isRtl ? "حجم الشبكة" : "Grid Size"}</label>
            <input
              type="number"
              min="5"
              max="50"
              value={gridSize}
              onChange={(e) => setGridSize(parseInt(e.target.value))}
              className="w-16 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-xs"
            />
            <span className="text-slate-500 text-xs">%</span>
          </div>
        )}
      </div>

      {/* Grouping */}
      {multiSelectedCount >= 2 && !selectedGroupId && (
        <div className="space-y-2 border-t border-slate-600 pt-2">
          <button
            onClick={onGroup}
            className="w-full py-2 px-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
            title={isRtl ? "تجميع العناصر المحددة" : "Group selected elements"}
          >
            📦 {isRtl ? "تجميع العناصر" : "Group Elements"}
          </button>
        </div>
      )}

      {selectedGroupId && (
        <div className="space-y-2 border-t border-slate-600 pt-2">
          <p className="text-slate-300 text-xs font-semibold">{isRtl ? "🎯 المجموعة المحددة" : "🎯 Group Selected"}</p>
          <button
            onClick={() => onUngroup(selectedGroupId)}
            className="w-full py-2 px-2 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition"
            title={isRtl ? "فك تجميع العناصر" : "Ungroup elements"}
          >
            🔓 {isRtl ? "فك التجميع" : "Ungroup"}
          </button>
        </div>
      )}

      {/* Info */}
      <p className="text-slate-500 text-[10px]">
        {selectedGroupId 
          ? (isRtl ? "💡 اختر مجموعة لتحريكها معاً" : "💡 Group moves as one unit")
          : (isRtl ? "💡 اختر عدة عناصر لاستخدام أدوات المحاذاة" : "💡 Select multiple elements to use alignment tools")
        }
      </p>
    </div>
  );
}