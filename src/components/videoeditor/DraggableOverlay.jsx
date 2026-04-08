import React, { useRef, useState, useCallback } from "react";

// A single draggable overlay item (text, sticker, shape)
function DraggableItem({ item, isSelected, onSelect, onMove, onDelete, containerRef, children }) {
  const dragStart = useRef(null);

  const handleMouseDown = (e) => {
    e.stopPropagation();
    onSelect(item.id);
    const container = containerRef.current?.getBoundingClientRect();
    if (!container) return;
    dragStart.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: item.x,
      origY: item.y,
      containerW: container.width,
      containerH: container.height,
    };

    const onMove_ = (me) => {
      if (!dragStart.current) return;
      const dx = ((me.clientX - dragStart.current.startX) / dragStart.current.containerW) * 100;
      const dy = ((me.clientY - dragStart.current.startY) / dragStart.current.containerH) * 100;
      const newX = Math.max(2, Math.min(98, dragStart.current.origX + dx));
      const newY = Math.max(2, Math.min(98, dragStart.current.origY + dy));
      onMove(item.id, newX, newY);
    };
    const onUp_ = () => {
      dragStart.current = null;
      window.removeEventListener("mousemove", onMove_);
      window.removeEventListener("mouseup", onUp_);
    };
    window.addEventListener("mousemove", onMove_);
    window.addEventListener("mouseup", onUp_);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`absolute group cursor-move ${isSelected ? "ring-2 ring-[#00d4d4] ring-offset-1 ring-offset-transparent rounded" : ""}`}
      style={{ left: `${item.x}%`, top: `${item.y}%`, transform: "translate(-50%,-50%)", userSelect: "none", zIndex: isSelected ? 30 : 20 }}
    >
      {children}
      {isSelected && (
        <button
          onMouseDown={e => { e.stopPropagation(); onDelete(item.id); }}
          className="absolute -top-3 -right-3 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center hover:bg-red-400 z-40"
        >✕</button>
      )}
    </div>
  );
}

export default function DraggableOverlay({
  textLayers, setTextLayers,
  elements, setElements,
  activeCaption,
  containerRef,
}) {
  const [selectedId, setSelectedId] = useState(null);

  const handleContainerClick = useCallback(() => setSelectedId(null), []);

  const moveItem = useCallback((id, x, y) => {
    setTextLayers(p => p.map(t => t.id === id ? { ...t, x, y } : t));
    setElements(p => p.map(el => el.id === id ? { ...el, x, y } : el));
  }, [setTextLayers, setElements]);

  const deleteText = (id) => setTextLayers(p => p.filter(t => t.id !== id));
  const deleteElement = (id) => setElements(p => p.filter(el => el.id !== id));

  return (
    <div className="absolute inset-0" onClick={handleContainerClick}>
      {textLayers.map(t => (
        <DraggableItem
          key={t.id} item={t}
          isSelected={selectedId === t.id}
          onSelect={setSelectedId}
          onMove={moveItem}
          onDelete={deleteText}
          containerRef={containerRef}
        >
          <div style={{
            fontFamily: t.font, fontSize: `${t.fontSize * 0.5}px`, color: t.color,
            fontWeight: t.bold ? "bold" : "normal", fontStyle: t.italic ? "italic" : "normal",
            textAlign: t.align, background: t.bg && t.bg !== "transparent" ? t.bg : "transparent",
            padding: t.bg && t.bg !== "transparent" ? "2px 8px" : "0", borderRadius: 4,
            textShadow: "0 2px 4px rgba(0,0,0,0.8)", whiteSpace: "nowrap",
          }}>
            {t.text}
          </div>
        </DraggableItem>
      ))}

      {elements.map(el => (
        <DraggableItem
          key={el.id} item={el}
          isSelected={selectedId === el.id}
          onSelect={setSelectedId}
          onMove={moveItem}
          onDelete={deleteElement}
          containerRef={containerRef}
        >
          {el.type === "sticker" ? (
            <span style={{ fontSize: 40, lineHeight: 1 }}>{el.emoji}</span>
          ) : (
            <svg width="48" height="48" viewBox="0 0 24 24" style={{ color: el.color || "#00d4d4", display: "block" }}>
              {el.shape === "rect" && <rect x="2" y="2" width="20" height="20" rx="2" fill="currentColor"/>}
              {el.shape === "circle" && <circle cx="12" cy="12" r="10" fill="currentColor"/>}
              {el.shape === "triangle" && <polygon points="12 2 22 22 2 22" fill="currentColor"/>}
              {el.shape === "star" && <polygon points="12 2 15 9 22 9 16 14 18 21 12 17 6 21 8 14 2 9 9 9" fill="currentColor"/>}
              {el.shape === "heart" && <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="currentColor"/>}
              {el.shape === "diamond" && <polygon points="12 2 22 12 12 22 2 12" fill="currentColor"/>}
              {el.shape === "arrow" && <><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2"/><polyline points="12 5 19 12 12 19" stroke="currentColor" strokeWidth="2" fill="none"/></>}
              {el.shape === "line" && <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="3"/>}
            </svg>
          )}
        </DraggableItem>
      ))}

      {activeCaption && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 text-white text-sm font-medium rounded-lg max-w-xs text-center pointer-events-none">
          {activeCaption.text}
        </div>
      )}
    </div>
  );
}