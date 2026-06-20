import React, { useRef, useState, useLayoutEffect } from "react";

// Renders the Features Showcase on the canvas: optional logo + title + subtitle
// above a grid of feature CARDS (emoji icon + title + short description) +
// bilingual (ar / en / both) + configurable columns + auto-fit (shrinks so the
// whole grid stays inside the canvas instead of overflowing).
export default function FeaturesOverlay({ features, selected, isExporting, cW, cH, onStartDrag }) {
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);

  const accent = features.accent || "#7c3aed";
  const textCol = features.textColor || "#1e1b3a";
  const cardBg = features.cardBg || "#ffffff";
  const bg = features.bgColor || "#ffffff";
  const fw = features.width || 82;
  const fs = features.fontScale || 1;
  const u = (cW / 100) * fs;   // font unit (scales with fontScale)
  const sp = cW / 100;          // spacing unit
  const lang = features.lang || "ar";
  const both = lang === "both";
  const useEn = lang === "en";
  const cols = features.columns || 2;
  const cards = features.cards || [];

  // Auto-fit: measure the natural (un-scaled) height and shrink to the canvas.
  useLayoutEffect(() => {
    if (features.autoFit === false) { if (scale !== 1) setScale(1); return; }
    const el = innerRef.current; if (!el) return;
    const natH = el.offsetHeight;
    const maxH = (cH || cW) * 0.94;
    const next = natH > maxH ? maxH / natH : 1;
    if (Math.abs(next - scale) > 0.004) setScale(next);
  });

  const titleTxt = useEn ? (features.titleEn || features.title) : features.title;
  const subTxt = useEn ? (features.subtitleEn || features.subtitle) : features.subtitle;
  const footTxt = useEn ? (features.footerEn || features.footer) : features.footer;

  const cardTitle = (c) => (useEn ? (c.titleEn || c.title) : c.title) || "";
  const cardDesc = (c) => (useEn ? (c.descEn || c.desc) : c.desc) || "";

  return (
    <div
      onMouseDown={onStartDrag}
      style={{
        position: "absolute",
        left: `${features.x ?? 50}%`, top: `${features.y ?? 50}%`, width: `${fw}%`,
        transform: `translate(-50%, -50%) rotate(${features.rotation || 0}deg) scale(${scale})`,
        transformOrigin: "center center",
        cursor: "grab",
        outline: selected && !isExporting ? `${Math.max(2, sp * 0.4)}px dashed #818cf8` : "none",
        outlineOffset: `${sp}px`,
        fontFamily: features.fontFamily || "Tajawal",
        direction: "rtl",
        zIndex: 30,
      }}
    >
      <div ref={innerRef} style={{
        background: bg, borderRadius: `${sp * 3}px`, padding: `${sp * 4}px ${sp * 4.5}px`,
        border: `${Math.max(1, sp * 0.25)}px solid ${accent}22`,
        boxShadow: `0 ${sp * 0.6}px ${sp * 3}px rgba(0,0,0,0.12)`,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "relative", zIndex: 1 }}>
          {features.showLogo && features.logoUrl ? (
            <div style={{ textAlign: "center", marginBottom: `${sp * 2}px` }}>
              <img src={features.logoUrl} alt="" crossOrigin="anonymous"
                style={{ width: `${features.logoSize || 22}%`, maxHeight: `${u * 18}px`, objectFit: "contain", display: "inline-block" }} />
            </div>
          ) : null}
          {(titleTxt || subTxt) ? (
            <div style={{ textAlign: "center", marginBottom: `${sp * 2.6}px` }}>
              {titleTxt ? <div style={{ color: accent, fontWeight: 800, fontSize: `${u * 5.5}px`, lineHeight: 1.15 }}>{titleTxt}</div> : null}
              {both && features.titleEn ? <div style={{ color: accent, opacity: 0.6, fontSize: `${u * 3}px`, marginTop: `${sp * 0.6}px` }}>{features.titleEn}</div> : null}
              {subTxt ? <div style={{ marginTop: `${sp * 1.2}px`, color: textCol, opacity: 0.75, fontWeight: 600, fontSize: `${u * 3}px` }}>{subTxt}</div> : null}
              <div style={{ height: `${Math.max(1, sp * 0.3)}px`, background: `${accent}33`, marginTop: `${sp * 2}px` }} />
            </div>
          ) : null}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: `${sp * 2.4}px` }}>
            {cards.map((c, i) => (
              <div key={i} style={{
                background: cardBg, borderRadius: `${sp * 2.2}px`,
                border: `${Math.max(1, sp * 0.25)}px solid ${accent}22`,
                boxShadow: `0 ${sp * 0.4}px ${sp * 1.6}px rgba(0,0,0,0.08)`,
                padding: `${sp * 2.6}px ${sp * 2.4}px`,
                display: "flex", flexDirection: "column", gap: `${sp * 0.8}px`,
              }}>
                {c.icon ? <div style={{ fontSize: `${u * 5.5}px`, lineHeight: 1 }}>{c.icon}</div> : null}
                <div style={{ color: textCol, fontWeight: 800, fontSize: `${u * 3.4}px`, lineHeight: 1.2 }}>{cardTitle(c)}</div>
                {both && c.titleEn ? <div style={{ color: textCol, opacity: 0.55, fontSize: `${u * 2.3}px`, direction: "ltr", textAlign: "right" }}>{c.titleEn}</div> : null}
                {cardDesc(c) ? <div style={{ color: textCol, opacity: 0.7, fontSize: `${u * 2.5}px`, lineHeight: 1.3 }}>{cardDesc(c)}</div> : null}
              </div>
            ))}
          </div>
          {footTxt ? <div style={{ textAlign: "center", marginTop: `${sp * 2.4}px`, color: textCol, opacity: 0.8, fontSize: `${u * 2.4}px` }}>{footTxt}</div> : null}
        </div>
      </div>
    </div>
  );
}
