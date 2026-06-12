import React, { useRef, useState, useLayoutEffect } from "react";

// Renders the Services Menu on the canvas: sections + per-item icons + bilingual
// (ar / en / both) + 4 style presets + 1-2 columns + auto-fit (shrinks so the
// whole menu stays inside the canvas instead of overflowing).
export default function MenuOverlay({ menu, selected, isExporting, cW, cH, onStartDrag }) {
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);

  const accent = menu.accent || "#7c3aed";
  const textCol = menu.textColor || "#1e1b3a";
  const bg = menu.bgColor || "#ffffff";
  const cur = menu.currency || "ريال";
  const fw = menu.width || 70;
  const fs = menu.fontScale || 1;
  const u = (cW / 100) * fs;   // font unit (scales with fontScale)
  const sp = cW / 100;          // spacing unit
  const lang = menu.lang || "ar";
  const both = lang === "both";
  const useEn = lang === "en";
  const style = menu.style || "classic";
  const isLuxe = style === "luxe", isModern = style === "modern", isMinimal = style === "minimal";

  // Migrate the old flat `items` shape into a single untitled section.
  const sections = (menu.sections && menu.sections.length)
    ? menu.sections
    : (menu.items ? [{ title: "", titleEn: "", items: menu.items }] : []);

  // Auto-fit: measure the natural (un-scaled) height and shrink to the canvas.
  useLayoutEffect(() => {
    if (menu.autoFit === false) { if (scale !== 1) setScale(1); return; }
    const el = innerRef.current; if (!el) return;
    const natH = el.offsetHeight;
    const maxH = (cH || cW) * 0.94;
    const next = natH > maxH ? maxH / natH : 1;
    if (Math.abs(next - scale) > 0.004) setScale(next);
  });

  const nameTxt = (it) => (useEn ? (it.nameEn || it.name) : it.name) || "";
  const cardBg = (isModern || isMinimal) ? "transparent" : bg;
  const cardBorder = isLuxe ? `${Math.max(1.5, sp * 0.5)}px double ${accent}` : ((isModern || isMinimal) ? "none" : `${Math.max(1, sp * 0.25)}px solid ${accent}22`);
  const cardPad = isMinimal ? `${sp * 2}px ${sp * 1}px` : `${sp * 4}px ${sp * 4.5}px`;

  const renderItem = (it, i) => (
    <div key={i} style={{ breakInside: "avoid", WebkitColumnBreakInside: "avoid" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: `${sp * 1.2}px` }}>
        {it.icon ? <span style={{ fontSize: `${u * 3.2}px`, lineHeight: 1 }}>{it.icon}</span> : null}
        <span style={{ color: textCol, fontWeight: 700, fontSize: `${u * 3.4}px`, whiteSpace: "nowrap" }}>{nameTxt(it)}</span>
        <span style={{ flex: 1, alignSelf: "flex-end", marginBottom: `${u * 0.9}px`, borderBottom: (menu.showDots !== false && !isModern) ? `${Math.max(1, sp * 0.3)}px dotted ${textCol}66` : "none" }} />
        <span style={{ color: accent, fontWeight: 800, fontSize: `${u * 3.6}px`, whiteSpace: "nowrap" }}>{it.price} {cur}</span>
      </div>
      {both && it.nameEn ? <div style={{ color: textCol, opacity: 0.55, fontSize: `${u * 2.3}px`, marginInlineStart: it.icon ? `${u * 4.4}px` : 0, direction: "ltr", textAlign: "right" }}>{it.nameEn}</div> : null}
      {it.desc ? <div style={{ color: textCol, opacity: 0.6, fontSize: `${u * 2.3}px`, marginInlineStart: it.icon ? `${u * 4.4}px` : 0 }}>{it.desc}</div> : null}
    </div>
  );

  const renderSection = (sec, si) => {
    const secTitle = useEn ? (sec.titleEn || sec.title) : sec.title;
    return (
      <div key={si} style={{ breakInside: "avoid", WebkitColumnBreakInside: "avoid", marginBottom: `${sp * 2.4}px` }}>
        {secTitle ? (
          <div style={{ marginBottom: `${sp * 1.4}px` }}>
            <div style={isModern
              ? { background: accent, color: "#fff", padding: `${sp * 0.9}px ${sp * 2.6}px`, borderRadius: `${sp * 2}px`, display: "inline-block", fontWeight: 800, fontSize: `${u * 3.6}px` }
              : { fontWeight: 800, fontSize: `${u * 3.8}px`, color: accent }}>
              {secTitle}
              {both && sec.titleEn && !isModern ? <span style={{ opacity: 0.55, fontSize: `${u * 2.6}px`, marginInlineStart: `${sp * 1.5}px` }}>{sec.titleEn}</span> : null}
            </div>
            {!isModern && <div style={{ height: `${Math.max(1, sp * 0.3)}px`, background: `${accent}40`, marginTop: `${sp * 1}px` }} />}
          </div>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: `${sp * 1.8}px` }}>
          {(sec.items || []).map(renderItem)}
        </div>
      </div>
    );
  };

  const titleTxt = useEn ? (menu.titleEn || menu.title) : menu.title;
  const subTxt = useEn ? (menu.subtitleEn || menu.subtitle) : menu.subtitle;
  const footTxt = useEn ? (menu.footerEn || menu.footer) : menu.footer;

  return (
    <div
      onMouseDown={onStartDrag}
      style={{
        position: "absolute",
        left: `${menu.x ?? 50}%`, top: `${menu.y ?? 50}%`, width: `${fw}%`,
        transform: `translate(-50%, -50%) rotate(${menu.rotation || 0}deg) scale(${scale})`,
        transformOrigin: "center center",
        cursor: "grab",
        outline: selected && !isExporting ? `${Math.max(2, sp * 0.4)}px dashed #818cf8` : "none",
        outlineOffset: `${sp}px`,
        fontFamily: menu.fontFamily || "Tajawal",
        direction: "rtl",
        zIndex: 30,
      }}
    >
      <div ref={innerRef} style={{
        background: cardBg, borderRadius: `${sp * 3}px`, padding: cardPad, border: cardBorder,
        boxShadow: (isModern || isMinimal) ? "none" : `0 ${sp * 0.6}px ${sp * 3}px rgba(0,0,0,0.12)`,
        outline: isLuxe ? `${Math.max(1, sp * 0.2)}px solid ${accent}` : "none",
        outlineOffset: isLuxe ? `-${sp * 1.4}px` : 0,
      }}>
        {(titleTxt || subTxt) ? (
          <div style={{ textAlign: "center", marginBottom: `${sp * 2.6}px` }}>
            {titleTxt ? <div style={{ color: accent, fontWeight: 800, fontSize: `${u * 5.5}px`, lineHeight: 1.15, letterSpacing: isLuxe ? `${sp * 0.4}px` : 0 }}>{titleTxt}</div> : null}
            {both && menu.titleEn ? <div style={{ color: accent, opacity: 0.6, fontSize: `${u * 3}px`, marginTop: `${sp * 0.6}px` }}>{menu.titleEn}</div> : null}
            {subTxt ? <div style={{ display: "inline-block", marginTop: `${sp * 1.4}px`, background: accent, color: "#fff", fontWeight: 700, fontSize: `${u * 3}px`, padding: `${sp * 1}px ${sp * 3.5}px`, borderRadius: `${sp * 40}px` }}>{subTxt}</div> : null}
            {!isMinimal && <div style={{ height: `${Math.max(1, sp * 0.3)}px`, background: `${accent}33`, marginTop: `${sp * 2}px` }} />}
          </div>
        ) : null}
        <div style={menu.columns === 2 ? { columnCount: 2, columnGap: `${sp * 5}px` } : {}}>
          {sections.map(renderSection)}
        </div>
        {footTxt ? <div style={{ textAlign: "center", marginTop: `${sp * 2.4}px`, color: textCol, opacity: 0.8, fontSize: `${u * 2.4}px` }}>{footTxt}</div> : null}
      </div>
    </div>
  );
}
