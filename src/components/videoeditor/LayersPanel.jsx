import React, { useState } from "react";

export default function LayersPanel({ textLayers, elements, onUpdateLayer, onChangeZIndex, onChangeRotation }) {
  const allItems = [
    ...textLayers.map(t => ({ ...t, type: "text", typeName: "نص" })),
    ...elements.map(e => ({ ...e, type: "shape", typeName: e.type === "sticker" ? "ستيكر" : "شكل" })),
  ].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

  return (
    <div className="w-56 bg-[#1e1e1e] border-l border-[#2a2a2a] flex flex-col flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#2a2a2a] flex-shrink-0">
        <span className="text-[11px] font-bold text-[#aaa] uppercase tracking-wider">📚 الطبقات</span>
      </div>

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {allItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-[#555] text-xs">
            <span>لا توجد عناصر</span>
          </div>
        ) : (
          allItems.map((item, idx) => (
            <div
              key={item.id}
              className="bg-[#252525] border border-[#333] rounded-lg p-2.5 flex flex-col gap-2 hover:border-[#00d4d4] transition"
            >
              {/* Layer Header */}
              <div className="flex items-center gap-2">
                <span className="text-xs">{item.type === "text" ? "📝" : item.type === "shape" ? "🔷" : "😀"}</span>
                <span className="text-xs text-white flex-1 truncate">{item.name || item.text || `${item.typeName} ${idx}`}</span>
              </div>

              {/* Z-Index Controls */}
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-[#666]">طبقة</span>
                <button
                  onClick={() => onChangeZIndex?.(item.id, (item.zIndex || 0) + 1)}
                  className="flex-1 px-1.5 py-1 rounded bg-[#2a2a2a] hover:bg-[#333] text-[9px] text-[#888] transition border border-[#333]"
                  title="أحضر للمقدمة"
                >
                  ↑ أمام
                </button>
                <button
                  onClick={() => onChangeZIndex?.(item.id, (item.zIndex || 0) - 1)}
                  className="flex-1 px-1.5 py-1 rounded bg-[#2a2a2a] hover:bg-[#333] text-[9px] text-[#888] transition border border-[#333]"
                  title="أرسل للخلف"
                >
                  ↓ خلف
                </button>
              </div>

              {/* Rotation Control */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-[#666]">دوران</span>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={item.rotation || 0}
                    onChange={e => onChangeRotation?.(item.id, parseFloat(e.target.value))}
                    className="flex-1 h-1 accent-[#00d4d4] cursor-pointer"
                  />
                  <span className="text-[9px] text-[#00d4d4] w-10">{(item.rotation || 0).toFixed(0)}°</span>
                </div>
              </div>

              {/* Visibility Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  defaultChecked={item.visible !== false}
                  onChange={e => onUpdateLayer?.(item.id, { visible: e.target.checked })}
                  className="w-4 h-4 rounded cursor-pointer accent-[#00d4d4]"
                />
                <span className="text-[9px] text-[#888]">مرئي</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}