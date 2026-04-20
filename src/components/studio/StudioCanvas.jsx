import React, { useRef, useEffect, useState, useCallback } from "react";
import { ICON_MAP } from "./lucideIcons";
import { SOCIAL_ICONS } from "./socialIcons";
import { SVG_BACKGROUNDS } from "./svgBackgrounds";

function buildBg(bg) {
  if (!bg) return "#1e293b";
  if (bg.mode === "svgDesign") {
    const d = SVG_BACKGROUNDS.find(x => x.id === bg.svgDesignId);
    return d ? "#09071f" : "#1e293b";
  }
  if (bg.mode === "color") {
    const color = bg.color || "#1e293b";
    const opacity = bg.opacity ?? 1;
    if (opacity === 1) return color;
    // Convert hex to rgba
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  if (bg.mode === "gradient") {
    if (bg.gradientPreset && !bg.gradientStops) return bg.gradientPreset;
    const stops = bg.gradientStops || [{ color: "#667eea", position: 0, opacity: 1 }, { color: "#764ba2", position: 100, opacity: 1 }];
    const stopsStr = stops.map((s) => {
      const opacity = s.opacity ?? 1;
      if (opacity === 1) return `${s.color} ${s.position}%`;
      const r = parseInt(s.color.slice(1, 3), 16);
      const g = parseInt(s.color.slice(3, 5), 16);
      const b = parseInt(s.color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity}) ${s.position}%`;
    }).join(", ");
    if (bg.gradientType === "radial") return `radial-gradient(circle at ${bg.radialPosition || "center"}, ${stopsStr})`;
    return `linear-gradient(${bg.gradientAngle || 135}deg, ${stopsStr})`;
  }
  return "#1e293b";
}

function colorSvgContent(svgContent, color) {
  if (!svgContent || !color) return svgContent;
  return svgContent
    .replace(/fill="(?!none)[^"]*"/g, `fill="${color}"`)
    .replace(/fill:(?!none)[^;"}]*/g, `fill:${color}`);
}

function stripInlineStyles(html) {
  // Remove inline font-size and font-family so layer props control sizing/font uniformly on canvas
  return html
    .replace(/font-size\s*:\s*[^;}"]+;?\s*/gi, "")
    .replace(/font-family\s*:\s*[^;}"]+;?\s*/gi, "");
}

function hexToRgb01(hex) {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  return { r, g, b };
}

function PhoneFrame({ color = "#1e293b", children, scale }) {
  return (
    <div className="relative" style={{ display: "inline-block" }}>
      <div
        style={{
          position: "absolute", inset: `-${6 * scale}px`, borderRadius: `${16 * scale}px`,
          border: `${5 * scale}px solid ${color}`,
          boxShadow: `0 0 0 ${2 * scale}px #00000044`,
          pointerEvents: "none", zIndex: 10,
        }}
      >
        <div style={{ position: "absolute", top: `${8 * scale}px`, left: "50%", transform: "translateX(-50%)", width: `${12 * scale}px`, height: `${12 * scale}px`, borderRadius: "50%", backgroundColor: color, opacity: 0.5 }} />
        <div style={{ position: "absolute", bottom: `${6 * scale}px`, left: "50%", transform: "translateX(-50%)", width: `${20 * scale}px`, height: `${6 * scale}px`, borderRadius: `${3 * scale}px`, backgroundColor: color, opacity: 0.5 }} />
      </div>
      {children}
    </div>
  );
}

// Creates an SVG path for a polygon with rounded corners
function roundedPolygonPath(pts, r) {
  if (r === 0) {
    return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") + "Z";
  }
  const n = pts.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const curr = pts[i];
    const next = pts[(i + 1) % n];

    const v1 = [prev[0] - curr[0], prev[1] - curr[1]];
    const v2 = [next[0] - curr[0], next[1] - curr[1]];
    const len1 = Math.sqrt(v1[0] ** 2 + v1[1] ** 2);
    const len2 = Math.sqrt(v2[0] ** 2 + v2[1] ** 2);
    const rad = Math.min(r, len1 / 2, len2 / 2);

    const p1 = [curr[0] + v1[0] / len1 * rad, curr[1] + v1[1] / len1 * rad];
    const p2 = [curr[0] + v2[0] / len2 * rad, curr[1] + v2[1] / len2 * rad];

    if (i === 0) d += `M${p1[0].toFixed(2)},${p1[1].toFixed(2)}`;
    else d += `L${p1[0].toFixed(2)},${p1[1].toFixed(2)}`;
    d += ` Q${curr[0]},${curr[1]} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d + "Z";
}

function ShapeElement({ shape, scale, isSelected }) {
  const w = (shape.width / 100) * 100;
  const h = (shape.height / 100) * 100;
  const noFillShapes = ["line", "triangle", "diamond", "star", "pentagon", "hexagon", "arrow"];

  // Build fill string: solid color, CSS gradient, or stripes
  const isGradient = shape.fillMode === "gradient";
  const isStripes = shape.fillMode === "stripes";
  const solidColor = shape.fillColor || "#8b5cf6";
  const gradientCss = `linear-gradient(${shape.gradientAngle ?? 135}deg, ${shape.gradientColor1 || "#8b5cf6"}, ${shape.gradientColor2 || "#ec4899"})`;
  const stripeSize = shape.stripeWidth ?? 10;
  const stripeAngle = shape.stripeAngle ?? 45;
  const stripeColor = shape.stripeColor || "#ffffff";
  const stripeBg = shape.stripeBg || "#8b5cf6";
  // repeating-linear-gradient for CSS stripes
  const stripesCss = `repeating-linear-gradient(${stripeAngle}deg, ${stripeColor} 0px, ${stripeColor} ${stripeSize}px, ${stripeBg} ${stripeSize}px, ${stripeBg} ${stripeSize * 2}px)`;
  const fillValue = noFillShapes.includes(shape.shapeType) ? "transparent" : (isGradient ? gradientCss : isStripes ? stripesCss : solidColor);

  // SVG gradient coords from CSS angle (0°=top, 90°=right)
  const svgGradId = `grad-${shape.id}`;
  const svgBlurId = `blur-${shape.id}`;
  const svgPatternId = `stripes-${shape.id}`;
  const angleRad = ((shape.gradientAngle ?? 135) - 90) * Math.PI / 180;
  const gx1 = (0.5 - 0.5 * Math.sin(angleRad)).toFixed(3);
  const gy1 = (0.5 + 0.5 * Math.cos(angleRad)).toFixed(3);
  const gx2 = (0.5 + 0.5 * Math.sin(angleRad)).toFixed(3);
  const gy2 = (0.5 - 0.5 * Math.cos(angleRad)).toFixed(3);

  const baseStyle = {
    width: "100%", height: "100%",
    background: fillValue,
    filter: shape.blur > 0 ? `blur(${shape.blur}px)` : undefined,
    border: !noFillShapes.includes(shape.shapeType) && shape.borderWidth > 0 ? `${(shape.borderWidth || 0) * scale}px solid ${shape.borderColor || "#ffffff"}` : "none",
    borderRadius: shape.shapeType === "circle" ? "50%" : (shape.shapeType === "ellipse" ? "50%" : `${(shape.borderRadius || 0) * scale}px`),
  };

  const commonSvgProps = {
    width: "100%",
    height: "100%",
    viewBox: "0 0 100 100",
    preserveAspectRatio: "none",
  };

  if (shape.shapeType === "line") {
    return <div style={{ ...baseStyle, height: `${(shape.borderWidth || 2) * scale}px`, backgroundColor: shape.fillColor || "#ffffff", borderRadius: 2 }} />;
  }

  // ── Decorative shapes ──────────────────────────────────────────────────────
  const decoId = `deco-grad-${shape.id}`;
  const decoBlurId = `deco-blur-${shape.id}`;
  const decoColor = solidColor;
  const decoColor2 = isGradient ? (shape.gradientColor2 || "#ec4899") : solidColor;

  const decoSvgDefs = (
    <defs>
      {isGradient && (
        <linearGradient id={decoId} x1={gx1} y1={gy1} x2={gx2} y2={gy2} gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor={decoColor} />
          <stop offset="100%" stopColor={decoColor2} />
        </linearGradient>
      )}
      {shape.blur > 0 && <filter id={decoBlurId}><feGaussianBlur stdDeviation={shape.blur * 0.5} /></filter>}
    </defs>
  );
  const decoFill = isGradient ? `url(#${decoId})` : decoColor;
  const decoStroke = isGradient ? `url(#${decoId})` : decoColor;
  const decoOpacity = shape.opacity ?? 1;
  const decoFilter = shape.blur > 0 ? `url(#${decoBlurId})` : undefined;

  if (shape.shapeType === "chain") {
    const linkCount = 8;
    const links = Array.from({ length: linkCount }, (_, i) => {
      const cx = (i + 0.5) * (100 / linkCount);
      return i % 2 === 0
        ? <ellipse key={i} cx={cx} cy={50} rx={100 / linkCount * 0.42} ry={30} fill="none" stroke={decoStroke} strokeWidth={shape.borderWidth || 4} filter={decoFilter} />
        : <ellipse key={i} cx={cx} cy={50} rx={100 / linkCount * 0.42} ry={30} fill="none" stroke={decoStroke} strokeWidth={shape.borderWidth || 4} filter={decoFilter} transform={`rotate(90,${cx},50)`} />;
    });
    return <svg {...commonSvgProps}>{decoSvgDefs}{links}</svg>;
  }

  if (shape.shapeType === "ring_chain") {
    const count = 6;
    const rings = Array.from({ length: count }, (_, i) => {
      const cx = (i + 0.5) * (100 / count);
      return <circle key={i} cx={cx} cy={50} r={100 / count * 0.42} fill="none" stroke={decoStroke} strokeWidth={shape.borderWidth || 4} filter={decoFilter} />;
    });
    return <svg {...commonSvgProps}>{decoSvgDefs}{rings}</svg>;
  }

  if (shape.shapeType === "rope") {
    return (
      <svg {...commonSvgProps}>
        {decoSvgDefs}
        <path d="M0,35 C15,10 30,60 50,35 C70,10 85,60 100,35" fill="none" stroke={decoStroke} strokeWidth={shape.borderWidth || 5} strokeLinecap="round" filter={decoFilter} />
        <path d="M0,65 C15,90 30,40 50,65 C70,90 85,40 100,65" fill="none" stroke={decoStroke} strokeWidth={shape.borderWidth || 5} strokeLinecap="round" filter={decoFilter} />
      </svg>
    );
  }

  if (shape.shapeType === "arc_ribbon") {
    return (
      <svg {...commonSvgProps}>
        {decoSvgDefs}
        <path d="M2,90 Q50,5 98,90 L98,75 Q50,20 2,75 Z" fill={decoFill} filter={decoFilter} />
      </svg>
    );
  }

  if (shape.shapeType === "wave_ribbon") {
    return (
      <svg {...commonSvgProps}>
        {decoSvgDefs}
        <path d="M0,55 C20,20 35,70 50,40 C65,10 80,70 100,40 L100,60 C80,90 65,30 50,60 C35,90 20,40 0,75 Z" fill={decoFill} filter={decoFilter} />
      </svg>
    );
  }

  if (shape.shapeType === "dots_line") {
    const count = 9;
    const dots = Array.from({ length: count }, (_, i) => {
      const cx = (i + 0.5) * (100 / count);
      return <circle key={i} cx={cx} cy={50} r={100 / count * 0.38} fill={decoFill} filter={decoFilter} />;
    });
    return <svg {...commonSvgProps}>{decoSvgDefs}{dots}</svg>;
  }

  if (shape.shapeType === "zigzag") {
    const pts = Array.from({ length: 9 }, (_, i) => `${i * 12.5},${i % 2 === 0 ? 80 : 20}`).join(" ");
    return (
      <svg {...commonSvgProps}>
        {decoSvgDefs}
        <polyline points={pts} fill="none" stroke={decoStroke} strokeWidth={shape.borderWidth || 5} strokeLinecap="round" strokeLinejoin="round" filter={decoFilter} />
      </svg>
    );
  }

  if (shape.shapeType === "crescent") {
    return (
      <svg {...commonSvgProps}>
        {decoSvgDefs}
        <path d="M50,5 A45,45 0 1 1 50,95 A30,30 0 1 0 50,5 Z" fill={decoFill} filter={decoFilter} />
      </svg>
    );
  }
  // ── end decorative shapes ──────────────────────────────────────────────────

  if (["triangle", "diamond", "star", "pentagon", "hexagon", "arrow"].includes(shape.shapeType)) {
    let points;
    if (shape.shapeType === "triangle") points = [[50, 2], [98, 98], [2, 98]];
    else if (shape.shapeType === "diamond") points = [[50, 2], [98, 50], [50, 98], [2, 50]];
    else if (shape.shapeType === "star") points = [[50, 5], [61, 35], [92, 35], [67, 57], [79, 91], [50, 68], [21, 91], [33, 57], [8, 35], [39, 35]];
    else if (shape.shapeType === "pentagon") points = [[50, 2], [98, 38], [80, 98], [20, 98], [2, 38]];
    else if (shape.shapeType === "hexagon") points = [[50, 2], [93, 25], [93, 75], [50, 98], [7, 75], [7, 25]];

    if (points) {
      const r = Math.min(shape.borderRadius || 0, 20);
      const pathD = shape.shapeType === "arrow"
        ? "M20,50 L80,50 M65,35 L80,50 L65,65"
        : roundedPolygonPath(points, r);
      const clipId = `clip-${shape.id}`;

      // Image fill for polygon shapes via SVG clipPath
      if (shape.fillImage && shape.shapeType !== "arrow") {
        const scale = (shape.imageScale || 100) / 100;
        const ox = shape.imageOffsetX || 0;
        const oy = shape.imageOffsetY || 0;
        const imgSize = 100 / scale;
        const imgX = (100 - imgSize) / 2 + ox;
        const imgY = (100 - imgSize) / 2 + oy;
        return (
          <svg {...commonSvgProps}>
            <defs>
              <clipPath id={clipId}><path d={pathD} /></clipPath>
            </defs>
            <image
              href={shape.fillImage}
              x={imgX} y={imgY}
              width={imgSize} height={imgSize}
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#${clipId})`}
            />
            {shape.borderWidth > 0 && (
              <path d={pathD} fill="none" stroke={shape.borderColor} strokeWidth={shape.borderWidth || 0} strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        );
      }

      const svgFill = shape.shapeType === "arrow" ? "none" : (isGradient ? `url(#${svgGradId})` : isStripes ? `url(#${svgPatternId})` : solidColor);
      return (
        <svg {...commonSvgProps}>
          <defs>
            {isGradient && (
              <linearGradient id={svgGradId} x1={gx1} y1={gy1} x2={gx2} y2={gy2} gradientUnits="objectBoundingBox">
                <stop offset="0%" stopColor={shape.gradientColor1 || "#8b5cf6"} />
                <stop offset="100%" stopColor={shape.gradientColor2 || "#ec4899"} />
              </linearGradient>
            )}
            {isStripes && (
              <pattern id={svgPatternId} x="0" y="0" width={stripeSize * 2} height={stripeSize * 2} patternUnits="userSpaceOnUse" patternTransform={`rotate(${stripeAngle - 45})`}>
                <rect width={stripeSize * 2} height={stripeSize * 2} fill={stripeBg} />
                <rect width={stripeSize} height={stripeSize * 2} fill={stripeColor} />
              </pattern>
            )}
            {shape.blur > 0 && (
              <filter id={svgBlurId}>
                <feGaussianBlur stdDeviation={shape.blur * 0.5} />
              </filter>
            )}
          </defs>
          <path
            d={pathD}
            fill={svgFill}
            stroke={shape.borderColor}
            strokeWidth={shape.borderWidth || (shape.shapeType === "arrow" ? 2 : 0)}
            filter={shape.blur > 0 ? `url(#${svgBlurId})` : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }
  }

  // Image fill for simple div shapes (rect, circle, ellipse, rounded)
  if (shape.fillImage) {
    const scale = (shape.imageScale || 100) / 100;
    const ox = 50 + (shape.imageOffsetX || 0);
    const oy = 50 + (shape.imageOffsetY || 0);
    return (
      <div style={{
        width: "100%", height: "100%",
        opacity: shape.opacity ?? 1,
        borderRadius: shape.shapeType === "circle" ? "50%" : (shape.shapeType === "ellipse" ? "50%" : `${(shape.borderRadius || 0) * (shape._scale || 1)}px`),
        overflow: "hidden",
        backgroundImage: `url(${shape.fillImage})`,
        backgroundSize: `${scale * 100}%`,
        backgroundPosition: `${ox}% ${oy}%`,
        backgroundRepeat: "no-repeat",
        border: shape.borderWidth > 0 ? `${shape.borderWidth}px solid ${shape.borderColor || "#ffffff"}` : "none",
      }} />
    );
  }

  return <div style={baseStyle} />;
}

// ─── Smart Guides helper (خارج المكوّن لأنها دالة خالصة) ─────────────────────
const SNAP_THRESHOLD = 1.5; // percent

function computeSnapGuides(id, type, newX, newY, textLayers, shapes, images, logos) {
  let dragW = 20, dragH = 15, isTextEl = type === "text";
  if (type === "text") {
    const el = textLayers.find(l => l.id === id);
    if (el) { dragW = el.textWidth || 30; dragH = 15; }
  } else if (type === "shape") {
    const el = shapes.find(s => s.id === id);
    if (el) { dragW = el.width || 20; dragH = el.height || 15; }
  } else if (type === "image") {
    const el = images.find(i => i.id === id);
    if (el) { dragW = el.width || 20; dragH = el.height || 20; }
  } else if (type === "logo") {
    const el = logos.find(l => l.id === id);
    if (el) { dragW = el.width || 20; dragH = el.height || 15; }
  }

  const candidateXs = [0, 50, 100];
  const candidateYs = [0, 50, 100];

  const addBounds = (el, elType) => {
    if (el.id === id || el.visible === false) return;
    const x = el.x || 0, y = el.y || 0;
    if (elType === "text") {
      const w = el.textWidth || 30;
      candidateXs.push(x - w / 2, x, x + w / 2);
      candidateYs.push(y - 7.5, y, y + 7.5);
    } else {
      const w = el.width || 20, h = el.height || 15;
      candidateXs.push(x, x + w / 2, x + w);
      candidateYs.push(y, y + h / 2, y + h);
    }
  };
  textLayers.forEach(l => addBounds(l, "text"));
  shapes.forEach(s => addBounds(s, "shape"));
  images.forEach(i => addBounds(i, "image"));
  logos.forEach(l => addBounds(l, "logo"));

  const dragXs = isTextEl
    ? [newX - dragW / 2, newX, newX + dragW / 2]
    : [newX, newX + dragW / 2, newX + dragW];
  const dragYs = isTextEl
    ? [newY - dragH / 2, newY, newY + dragH / 2]
    : [newY, newY + dragH / 2, newY + dragH];

  let bestSnapX = null, bestSnapY = null;
  let minDx = SNAP_THRESHOLD, minDy = SNAP_THRESHOLD;

  [...new Set(candidateXs)].forEach(cx => {
    dragXs.forEach((dx, i) => {
      const d = Math.abs(dx - cx);
      if (d < minDx) {
        minDx = d;
        const offsets = isTextEl ? [-dragW / 2, 0, dragW / 2] : [0, dragW / 2, dragW];
        bestSnapX = { guide: cx, newX: cx - offsets[i] };
      }
    });
  });
  [...new Set(candidateYs)].forEach(cy => {
    dragYs.forEach((dy, i) => {
      const d = Math.abs(dy - cy);
      if (d < minDy) {
        minDy = d;
        const offsets = isTextEl ? [-dragH / 2, 0, dragH / 2] : [0, dragH / 2, dragH];
        bestSnapY = { guide: cy, newY: cy - offsets[i] };
      }
    });
  });

  const vGuides = [], hGuides = [];
  let snapX = newX, snapY = newY;
  if (bestSnapX) { snapX = bestSnapX.newX; vGuides.push(bestSnapX.guide); }
  if (bestSnapY) { snapY = bestSnapY.newY; hGuides.push(bestSnapY.guide); }
  return { snapX, snapY, vGuides, hGuides };
}

export default function StudioCanvas({
  canvasRef, containerRef: containerRefProp, size, bg, shapes, images, logos, textLayers,
  selectedId, selectedType, onSelect, onUpdateShape, onUpdateImage, onUpdateLogo, onUpdateText, scale, isExporting,
  groups = [], onMoveGroup, frames = [], language
}) {
  const containerRefLocal = useRef(null);
  const containerRef = containerRefProp || containerRefLocal;
  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [guides, setGuides] = useState({ v: [], h: [] });

  const startDrag = useCallback((e, id, type, currentX, currentY, locked) => {
    if (locked) return;
    e.stopPropagation();
    const startMX = e.clientX;
    const startMY = e.clientY;
    const startX = currentX;
    const startY = currentY;
    dragRef.current = { id, type, startMX, startMY, startX, startY, lastX: currentX, lastY: currentY };
  }, []);

  const startResize = useCallback((e, id, type, currentW, currentH) => {
    e.stopPropagation();
    const startMX = e.clientX;
    const startMY = e.clientY;
    resizeRef.current = { id, type, startMX, startMY, startW: currentW, startH: currentH };
  }, []);

  useEffect(() => {
    let lastUpdateTime = 0;
    const MIN_UPDATE_INTERVAL = 16; // ~60fps, أقل من هذا = تخطي التحديث

    const onMove = (e) => {
      const container = containerRef.current;
      if (!container) return;
      const containerW = container.clientWidth;
      const containerH = container.clientHeight;

      const now = Date.now();
      if (now - lastUpdateTime < MIN_UPDATE_INTERVAL) return;
      lastUpdateTime = now;

      if (dragRef.current) {
        const { id, type, startMX, startMY, startX, startY } = dragRef.current;
        const totalDx = ((e.clientX - startMX) / containerW) * 100;
        const totalDy = ((e.clientY - startMY) / containerH) * 100;
        let newX = Math.max(-50, Math.min(150, startX + totalDx));
        let newY = Math.max(-50, Math.min(150, startY + totalDy));

        // ─── Smart Guides & Snap ───────────────────────────────────────
        if (type !== "group") {
          const { snapX, snapY, vGuides, hGuides } = computeSnapGuides(
            id, type, newX, newY, textLayers, shapes, images, logos
          );
          newX = snapX; newY = snapY;
          setGuides({ v: vGuides, h: hGuides });
        }
        // ──────────────────────────────────────────────────────────────

        if (type === "shape") onUpdateShape(id, { x: newX, y: newY });
        else if (type === "image") onUpdateImage(id, { x: newX, y: newY });
        else if (type === "logo") onUpdateLogo(id, { x: newX, y: newY });
        else if (type === "text") onUpdateText(id, { x: newX, y: newY });
        else if (type === "group") {
          const group = groups.find(g => g.id === id);
          if (group) {
            group.elements.forEach(({ elemId, elemType }) => {
              let el = null;
              if (elemType === "text") el = textLayers.find(l => l.id === elemId);
              else if (elemType === "shape") el = shapes.find(s => s.id === elemId);
              else if (elemType === "image") el = images.find(i => i.id === elemId);
              else if (elemType === "logo") el = logos.find(l => l.id === elemId);
              if (el) {
                const updateFn = elemType === "text" ? onUpdateText : (elemType === "shape" ? onUpdateShape : (elemType === "image" ? onUpdateImage : onUpdateLogo));
                updateFn(elemId, { x: Math.max(-50, Math.min(150, (el.x || 0) + totalDx)), y: Math.max(-50, Math.min(150, (el.y || 0) + totalDy)) });
              }
            });
          }
        }
      }

      if (resizeRef.current) {
        const { id, type, startMX, startMY, startW, startH } = resizeRef.current;
        const dx = ((e.clientX - startMX) / containerW) * 100;
        const dy = ((e.clientY - startMY) / containerH) * 100;
        const newW = Math.max(2, startW + dx);
        const newH = Math.max(2, startH + dy);

        if (type === "shape") onUpdateShape(id, { width: newW, height: newH });
        else if (type === "image") onUpdateImage(id, { width: newW, height: newH });
        else if (type === "logo") onUpdateLogo(id, { width: newW, height: newH });
        else if (type === "text") onUpdateText(id, { textWidth: Math.max(10, startW + dx * 2) });
        else if (type === "group") {
          const group = groups.find(g => g.id === id);
          if (group) {
            const bounds = getGroupBounds(group);
            const centerX = bounds.x + bounds.w / 2;
            const centerY = bounds.y + bounds.h / 2;
            const scaleX = newW / startW;
            const scaleY = newH / startH;
            const avgScale = (scaleX + scaleY) / 2;

            group.elements.forEach(({ elemId, elemType }) => {
              let el = null;
              if (elemType === "text") el = textLayers.find(l => l.id === elemId);
              else if (elemType === "shape") el = shapes.find(s => s.id === elemId);
              else if (elemType === "image") el = images.find(i => i.id === elemId);
              else if (elemType === "logo") el = logos.find(l => l.id === elemId);
              if (el) {
                const elCenterX = (el.x || 0) + (el.width || 20) / 2;
                const elCenterY = (el.y || 0) + (el.height || 15) / 2;
                const newElCenterX = centerX + (elCenterX - centerX) * avgScale;
                const newElCenterY = centerY + (elCenterY - centerY) * avgScale;
                const newX = newElCenterX - (el.width || 20) * avgScale / 2;
                const newY = newElCenterY - (el.height || 15) * avgScale / 2;

                if (elemType === "text") onUpdateText(elemId, { x: newX, y: newY, textWidth: Math.max(10, (el.textWidth || 90) * avgScale) });
                else {
                  const updateFn = elemType === "shape" ? onUpdateShape : (elemType === "image" ? onUpdateImage : onUpdateLogo);
                  updateFn(elemId, { x: newX, y: newY, width: Math.max(2, (el.width || 20) * avgScale), height: Math.max(2, (el.height || 15) * avgScale) });
                }
              }
            });
          }
        }
      }
    };
    const onUp = () => { dragRef.current = null; resizeRef.current = null; setGuides({ v: [], h: [] }); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [onUpdateShape, onUpdateImage, onUpdateLogo, onUpdateText, groups, textLayers, shapes, images, logos]);

  function renderFrame(frame) {
    if (!frame || !frame.presetId || frame.presetId === "none") return null;
    const c = frame.color || "#c9a227";
    const op = frame.opacity ?? 1;
    const p = `${frame.padding ?? 4}%`;
    const t = frame.thickness ?? 3;
    const base = { position: "absolute", pointerEvents: "none", zIndex: 500, opacity: op };

    const box = (inset, border, extra = {}) => (
      <div key={inset} style={{ ...base, top: inset, left: inset, right: inset, bottom: inset, border, ...extra }} />
    );

    if (frame.presetId === "single") return box(p, `${t}px solid ${c}`);
    if (frame.presetId === "double") {
      const p2 = `${(frame.padding ?? 4) + (t / 3) + 1.5}%`;
      return <>{box(p, `${Math.max(1, t - 1)}px solid ${c}`)}{box(p2, `${t + 1}px solid ${c}`)}</>;
    }
    if (frame.presetId === "triple") {
      const p2 = `${(frame.padding ?? 4) + 1.5}%`;
      const p3 = `${(frame.padding ?? 4) + 3}%`;
      return <>{box(p, `1px solid ${c}`)}{box(p2, `${t + 1}px solid ${c}`)}{box(p3, `1px solid ${c}`)}</>;
    }
    if (frame.presetId === "classic") {
      const p2 = `${(frame.padding ?? 4) + 2}%`;
      return <>{box(p, `${t * 2}px solid ${c}`)}{box(p2, `1px solid ${c}`)}</>;
    }
    if (frame.presetId === "glow") return box(p, `${t}px solid ${c}`, { boxShadow: `0 0 ${t * 4}px ${c}80, 0 0 ${t * 8}px ${c}40` });
    if (frame.presetId === "thick_glow") return box(p, `${t * 2}px solid ${c}`, { boxShadow: `0 0 ${t * 6}px ${c}, 0 0 ${t * 12}px ${c}60, inset 0 0 ${t * 4}px rgba(0,0,0,0.4)` });
    if (frame.presetId === "rounded") return box(p, `${t}px solid ${c}`, { borderRadius: "2%" });
    if (frame.presetId === "dashed") return box(p, `${t}px dashed ${c}`);
    if (frame.presetId === "film") {
      const dots = [...Array(8)].map((_, i) => (
        <div key={i} style={{ flex: 1, height: `${t * 2}px`, background: "#000", borderRadius: 1 }} />
      ));
      return (
        <>
          <div style={{ ...base, top: 0, left: 0, right: 0, height: `${t * 4}px`, background: c, display: "flex", alignItems: "center", gap: "2px", padding: "0 4px" }}>{dots}</div>
          <div style={{ ...base, bottom: 0, left: 0, right: 0, height: `${t * 4}px`, background: c, display: "flex", alignItems: "center", gap: "2px", padding: "0 4px" }}>{dots}</div>
        </>
      );
    }
    if (frame.presetId === "corners" || frame.presetId === "corners_only") {
      const sz = `${Math.max(4, (frame.padding ?? 4) * 4)}%`;
      const positions = [
        { top: p, left: p, rot: 0 },
        { top: p, right: p, rot: 90 },
        { bottom: p, right: p, rot: 180 },
        { bottom: p, left: p, rot: 270 },
      ];
      return (
        <>
          {positions.map((pos, i) => (
            <svg key={i} width={sz} height={sz} viewBox="0 0 40 40"
              style={{ ...base, ...pos, overflow: "visible" }}>
              <path d={`M 38 2 L 2 2 L 2 38`} stroke={c} strokeWidth={t * 0.8} fill="none"
                transform={`rotate(${pos.rot} 20 20)`} />
              <path d={`M 28 2 L 2 2 L 2 28`} stroke={c} strokeWidth={t * 0.3} fill="none" opacity="0.6"
                transform={`rotate(${pos.rot} 20 20)`} />
              <circle cx="2" cy="2" r={t * 0.6} fill={c} transform={`rotate(${pos.rot} 20 20)`} />
            </svg>
          ))}
          {frame.presetId === "corners" && box(`${(frame.padding ?? 4) + 1}%`, `0.5px solid ${c}40`)}
        </>
      );
    }
    return null;
  }

  const bgStyle = bg?.mode === "image" && bg?.imageUrl
    ? { backgroundImage: `url(${bg.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: buildBg(bg) };

  const bgFilter = bg?.blur ? `blur(${bg.blur}px)` : undefined;

  const getGroupBounds = (group) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    group.elements.forEach(({ elemId, elemType }) => {
      let el = null;
      if (elemType === "text") el = textLayers.find(l => l.id === elemId);
      else if (elemType === "shape") el = shapes.find(s => s.id === elemId);
      else if (elemType === "image") el = images.find(i => i.id === elemId);
      else if (elemType === "logo") el = logos.find(l => l.id === elemId);
      if (el) {
        const x = el.x || 0;
        const y = el.y || 0;
        const w = el.width || 20;
        const h = el.height || 15;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
      }
    });
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  };

  const renderImageEl = (img, type) => {
    const onUpdateFn = type === "logo" ? onUpdateLogo : onUpdateImage;
    
    // Handle social media icons
    if (img.isSocialIcon) {
      const socialIcon = SOCIAL_ICONS[img.socialIconKey];
      const isSelected = selectedId === img.id;
      const w = img.width || 12;
      const h = img.height || 12;
      if (!socialIcon) return null;
      // Replace fill color - handle both fill="currentColor" and any existing fill
      const color = img.iconColor || socialIcon.color;
      const coloredSvg = socialIcon.svg
        .replace(/fill="currentColor"/g, `fill="${color}"`)
        .replace(/fill="[^"]*"/g, `fill="${color}"`);
      return (
        <div
          key={img.id}
          style={{
            position: "absolute",
            left: `${img.x || 10}%`,
            top: `${img.y || 10}%`,
            width: `${w}%`,
            height: `${h}%`,
            transform: `rotate(${img.rotation || 0}deg)`,
            opacity: img.opacity ?? 1,
            cursor: img.locked ? "default" : "grab",
            outline: isSelected && !isExporting ? `${2 * scale}px dashed #818cf8` : "none",
            outlineOffset: `${2 * scale}px`,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseDown={(e) => { if (!img.locked) onSelect(img.id, type, e); startDrag(e, img.id, type, img.x || 10, img.y || 10, img.locked); }}
        >
          <div
            style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
            dangerouslySetInnerHTML={{ __html: coloredSvg.replace('<svg ', '<svg width="100%" height="100%" style="display:block" ') }}
          />
          {isSelected && !isExporting && (
            <div
              style={{ position: "absolute", bottom: -6, right: -6, width: 12, height: 12, background: "#818cf8", borderRadius: 2, cursor: "se-resize" }}
              onMouseDown={(e) => { e.stopPropagation(); startResize(e, img.id, type, w, h); }}
            />
          )}
        </div>
      );
    }

    // Handle hand-drawn shapes
    if (img.isHandDrawn && img.svgContent) {
      const isSelected = selectedId === img.id;
      const w = img.width || 25;
      const h = img.height || 25;
      return (
        <div
          key={img.id}
          style={{
            position: "absolute",
            left: `${img.x || 30}%`,
            top: `${img.y || 40}%`,
            width: `${w}%`,
            height: `${h}%`,
            transform: `rotate(${img.rotation || 0}deg)`,
            opacity: img.opacity ?? 1,
            cursor: img.locked ? "default" : "grab",
            outline: isSelected && !isExporting ? `${2 * scale}px dashed #818cf8` : "none",
            outlineOffset: `${2 * scale}px`,
            zIndex: 25,
          }}
          onMouseDown={(e) => { if (!img.locked) onSelect(img.id, type); startDrag(e, img.id, type, img.x || 30, img.y || 40, img.locked); }}
        >
          <div
            style={{ width: "100%", height: "100%" }}
            dangerouslySetInnerHTML={{ __html: img.svgContent.replace('<svg ', '<svg width="100%" height="100%" style="display:block;overflow:visible" ') }}
          />
          {isSelected && !isExporting && (
            <div
              style={{ position: "absolute", bottom: -6, right: -6, width: 12, height: 12, background: "#818cf8", borderRadius: 2, cursor: "se-resize" }}
              onMouseDown={(e) => { e.stopPropagation(); startResize(e, img.id, type, w, h); }}
            />
          )}
        </div>
      );
    }

    // Handle Lucide icon elements
    if (img.isLucideIcon) {
      const Icon = ICON_MAP[img.iconName];
      const isSelected = selectedId === img.id;
      const w = img.width || 12;
      const h = img.height || 12;
      return (
        <div
          key={img.id}
          style={{
            position: "absolute",
            left: `${img.x || 10}%`,
            top: `${img.y || 10}%`,
            width: `${w}%`,
            height: `${h}%`,
            transform: `rotate(${img.rotation || 0}deg)`,
            opacity: img.opacity ?? 1,
            cursor: img.locked ? "default" : "grab",
            outline: isSelected && !isExporting ? `${2 * scale}px dashed #818cf8` : "none",
            outlineOffset: `${2 * scale}px`,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseDown={(e) => { if (!img.locked) onSelect(img.id, type, e); startDrag(e, img.id, type, img.x || 10, img.y || 10, img.locked); }}
        >
          {Icon && (
            <Icon
              width="100%"
              height="100%"
              color={img.iconColor || "#ffffff"}
              strokeWidth={2}
              style={{ display: "block" }}
            />
          )}
          {isSelected && !isExporting && (
            <div
              style={{ position: "absolute", bottom: -6, right: -6, width: 12, height: 12, background: "#818cf8", borderRadius: 2, cursor: "se-resize" }}
              onMouseDown={(e) => { e.stopPropagation(); startResize(e, img.id, type, w, h); }}
            />
          )}
        </div>
      );
    }

    // Handle symbols and text icons (like currencies)
    if (img.isSymbol || img.isText) {
      const isSelected = selectedId === img.id;
      const w = img.width || 15;
      const h = img.height || 15;
      const textColor = img.textColor || "#ffffff";
      const fontSize = `${(w / 100) * size.width * scale}px`;
      
      // Convert hex to RGB for filter calculations
      const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 255, g: 255, b: 255 };
      };
      
      const rgb = hexToRgb(textColor);
      const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
      
      return (
        <div
          key={img.id}
          style={{
            position: "absolute",
            left: `${img.x || 10}%`,
            top: `${img.y || 10}%`,
            width: `${w}%`,
            height: `${h}%`,
            transform: `rotate(${img.rotation || 0}deg)`,
            opacity: img.opacity ?? 1,
            cursor: img.locked ? "default" : "grab",
            outline: isSelected && !isExporting ? `${2 * scale}px dashed #818cf8` : "none",
            outlineOffset: `${2 * scale}px`,
            zIndex: 20,
            mixBlendMode: img.blendMode || "normal",
          }}
          onMouseDown={(e) => { if (!img.locked) onSelect(img.id, type, e); startDrag(e, img.id, type, img.x || 10, img.y || 10, img.locked); }}
        >
          <div style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: fontSize,
            color: textColor,
            fontWeight: "bold",
          }}>
            {img.text}
          </div>
          {isSelected && !isExporting && (
            <div
              style={{ position: "absolute", bottom: -6, right: -6, width: 12, height: 12, background: "#818cf8", borderRadius: 2, cursor: "se-resize" }}
              onMouseDown={(e) => { e.stopPropagation(); startResize(e, img.id, type, w, h); }}
            />
          )}
        </div>
      );
    }

    let src = img._exportUrl || img.url;
    if (img.isSvg && img.svgContent && img.svgColor) {
      src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(colorSvgContent(img.svgContent, img.svgColor));
    }
    const isSelected = selectedId === img.id;
    const w = img.width || 20;
    const h = img.height || 20;

    const imgEl = (
      <div
        key={img.id}
        style={{
          position: "absolute",
          left: `${img.x || 10}%`,
          top: `${img.y || 10}%`,
          width: `${w}%`,
          height: `${h}%`,
          transform: `rotate(${img.rotation || 0}deg)`,
          opacity: img.opacity ?? 1,
          cursor: "grab",
          outline: isSelected && !isExporting ? `${2 * scale}px dashed #818cf8` : "none",
           outlineOffset: `${2 * scale}px`,
           zIndex: type === "logo" ? 20 : 10,
           mixBlendMode: img.blendMode || "normal",
          }}
          onMouseDown={(e) => { if (!img.locked) onSelect(img.id, type, e); startDrag(e, img.id, type, img.x || 10, img.y || 10, img.locked); }}
      >
        {img.isSvg && img.svgContent ? (
          <div style={{ width: "100%", height: "100%", borderRadius: `${img.borderRadius || 0}px`, overflow: "hidden" }}>
            <img
              src={"data:image/svg+xml;charset=utf-8," + encodeURIComponent(colorSvgContent(img.svgContent, img.logoColor || img.svgColor))}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            />
          </div>
        ) : (
          <div style={{ width: "100%", height: "100%", borderRadius: `${img.borderRadius || 0}px`, overflow: "hidden" }}>
            <img
              src={src}
              alt=""
              crossOrigin="anonymous"
              style={{
                width: "100%", height: "100%",
                objectFit: "contain",
                filter: `blur(${img.blur || 0}px)${img.logoColor ? ` url(#recolor-${img.id})` : ""}${img.dropShadow ? " drop-shadow(0 4px 8px rgba(0,0,0,0.5))" : ""}`,
                pointerEvents: "none",
                display: "block",
              }}
            />
          </div>
        )}
        {isSelected && !isExporting && (
          <div
            style={{
              position: "absolute", bottom: -6, right: -6,
              width: 12, height: 12,
              background: "#818cf8", borderRadius: 2, cursor: "se-resize",
            }}
            onMouseDown={(e) => { e.stopPropagation(); startResize(e, img.id, type, w, h); }}
          />
        )}
      </div>
    );

    if (img.phoneFrame && type === "image") {
      return (
        <div key={img.id} style={{ position: "absolute", left: `${img.x || 10}%`, top: `${img.y || 10}%`, width: `${w}%`, height: `${h}%`, zIndex: 10 }}>
          <PhoneFrame color={img.phoneFrameColor || "#1e293b"} scale={scale}>
            <img src={src} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: `${img.borderRadius || 0}%` }} />
          </PhoneFrame>
        </div>
      );
    }
    return imgEl;
  };

  return (
    <>
    <style>{`[data-studio-canvas] *::selection { background: transparent !important; }`}</style>
    <div
      data-studio-canvas
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        paddingBottom: `${(size.height / size.width) * 100}%`,
        overflow: "hidden",
        borderRadius: 8,
        cursor: "default",
        ...(bg?.mode === "image" ? {} : bgFilter ? {} : bgStyle),
      }}
    >
      {/* Background image as <img> — html2canvas captures <img> elements reliably; CSS backgroundImage is often missed */}
      {bg?.mode === "image" && bg?.imageUrl && (
        <img
          src={bg.imageUrl}
          crossOrigin="anonymous"
          style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            objectFit: "cover", objectPosition: "center",
            filter: bgFilter || undefined,
            pointerEvents: "none",
          }}
        />
      )}

      {/* SVG Design Background */}
      {bg?.mode === "svgDesign" && bg?.svgDesignId && (() => {
        const design = SVG_BACKGROUNDS.find(d => d.id === bg.svgDesignId);
        return design ? (
          <div
            dangerouslySetInnerHTML={{ __html: design.svg }}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none",
              filter: bgFilter || undefined }}
          />
        ) : null;
      })()}

      {/* Background blur layer (non-image modes only) — slightly oversized so blurred edges don't show transparent gaps */}
      {bgFilter && bg?.mode !== "image" && bg?.mode !== "svgDesign" && <div style={{ position: "absolute", inset: "-20px", ...bgStyle, filter: bgFilter, pointerEvents: "none" }} />}

      {/* Background image overlay */}
      {bg?.mode === "image" && bg?.imageUrl && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: `rgba(0,0,0,${1 - (bg.imageOpacity ?? 1)})`, pointerEvents: "none" }} />
      )}

      {/* Grid lines - hidden during export */}
      {!isExporting && <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "10% 10%", pointerEvents: "none" }} />}
      {!isExporting && <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "50% 50%", pointerEvents: "none" }} />}

      {/* Smart Guides - خطوط المحاذاة الذكية */}
      {!isExporting && guides.v.map(gx => (
        <div key={`vg-${gx}`} style={{ position: "absolute", left: `${gx}%`, top: 0, bottom: 0, width: 1, background: "#f43f5e", pointerEvents: "none", zIndex: 200, opacity: 0.9 }} />
      ))}
      {!isExporting && guides.h.map(gy => (
        <div key={`hg-${gy}`} style={{ position: "absolute", top: `${gy}%`, left: 0, right: 0, height: 1, background: "#f43f5e", pointerEvents: "none", zIndex: 200, opacity: 0.9 }} />
      ))}

      <div ref={canvasRef} style={{ position: "absolute", inset: 0, overflow: "hidden" }} onMouseDown={(e) => { if (e.target === e.currentTarget) onSelect(null, null); }}>
        {/* SVG filters for direct logo recoloring */}
        <svg style={{ position: "absolute", width: 0, height: 0 }}>
          <defs>
            {logos.filter(l => l.logoColor).map(logo => {
              const { r, g, b } = hexToRgb01(logo.logoColor);
              return (
                <filter key={logo.id} id={`recolor-${logo.id}`} colorInterpolationFilters="sRGB">
                  <feColorMatrix type="matrix" values={`0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  0 0 0 1 0`} />
                </filter>
              );
            })}
          </defs>
        </svg>

        {/* Groups */}
        {groups.map((group) => {
          const bounds = getGroupBounds(group);
          const isSelected = selectedId === group.id && selectedType === "group";
          if (bounds.w === Infinity) return null;
          return (
            <div
              key={group.id}
              style={{
                position: "absolute",
                left: `${bounds.x}%`,
                top: `${bounds.y}%`,
                width: `${bounds.w}%`,
                height: `${bounds.h}%`,
                outline: isSelected ? `${2 * scale}px dashed #10b981` : "none",
                outlineOffset: `${2 * scale}px`,
                cursor: isSelected ? "grab" : "pointer",
                zIndex: isSelected ? 50 : 0,
                pointerEvents: "auto",
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onSelect(group.id, "group", e);
                startDrag(e, group.id, "group", bounds.x, bounds.y);
              }}
            >
              {isSelected && !isExporting && (
                <div
                  style={{
                    position: "absolute",
                    bottom: `-${8 * scale}px`,
                    right: `-${8 * scale}px`,
                    width: `${12 * scale}px`,
                    height: `${12 * scale}px`,
                    background: "#10b981",
                    borderRadius: 2,
                    cursor: "se-resize",
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startResize(e, group.id, "group", bounds.w, bounds.h);
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Shapes */}
        {shapes.filter(s => s.visible !== false).map((shape) => {
          const isSelected = selectedId === shape.id;
          return (
            <div
              key={shape.id}
              style={{
                position: "absolute",
                left: `${shape.x || 10}%`,
                top: `${shape.y || 10}%`,
                width: `${shape.width || 20}%`,
                height: `${shape.height || 15}%`,
                perspective: (shape.rotateX || shape.rotateY) ? `${shape.perspective ?? 800}px` : undefined,
                transform: [
                  `rotate(${shape.rotation || 0}deg)`,
                  shape.skewX ? `skewX(${shape.skewX}deg)` : "",
                  shape.skewY ? `skewY(${shape.skewY}deg)` : "",
                  shape.rotateX ? `rotateX(${shape.rotateX}deg)` : "",
                  shape.rotateY ? `rotateY(${shape.rotateY}deg)` : "",
                ].filter(Boolean).join(" "),
                transformStyle: (shape.rotateX || shape.rotateY) ? "preserve-3d" : undefined,
                opacity: shape.opacity ?? 1,
                cursor: "grab",
                outline: isSelected && !isExporting ? `${2 * scale}px dashed #818cf8` : "none",
                outlineOffset: `${2 * scale}px`,
                zIndex: isSelected ? 15 : 5,
                mixBlendMode: shape.blendMode || "normal",
                filter: [
                  (shape.shadowX || shape.shadowY || shape.shadowBlur) ? `drop-shadow(${shape.shadowX || 0}px ${shape.shadowY || 0}px ${shape.shadowBlur || 0}px rgba(0,0,0,0.5))` : "",
                  shape.glow ? `drop-shadow(0 0 ${shape.glow}px rgba(255,255,255,0.5))` : "",
                ].filter(Boolean).join(" ") || undefined,
              }}
              onMouseDown={(e) => { if (!shape.locked) onSelect(shape.id, "shape", e); startDrag(e, shape.id, "shape", shape.x || 10, shape.y || 10, shape.locked); }}
            >
              <ShapeElement shape={shape} scale={scale} isSelected={isSelected} />
              {isSelected && !isExporting && (
                <div
                  style={{ position: "absolute", bottom: -6, right: -6, width: 12, height: 12, background: "#818cf8", borderRadius: 2, cursor: "se-resize" }}
                  onMouseDown={(e) => { e.stopPropagation(); startResize(e, shape.id, "shape", shape.width || 20, shape.height || 15); }}
                />
              )}
            </div>
          );
        })}

        {/* Images */}
        {images.filter(i => i.visible !== false).map((img) => renderImageEl(img, "image"))}

        {/* Logos */}
        {logos.filter(l => l.visible !== false).map((logo) => renderImageEl(logo, "logo"))}

        {/* Text layers */}
        {textLayers.filter(t => t.visible !== false).map((layer) => {
          const isSelected = selectedId === layer.id;
          const isEditing = editingId === layer.id;
          const fs = (layer.fontSize || 24) * scale;
          const textStyle = {
            fontSize: fs,
            fontFamily: layer.fontFamily || "Tajawal",
            fontWeight: layer.bold ? "bold" : "normal",
            fontStyle: layer.italic ? "italic" : "normal",
            color: layer.color || "#ffffff",
            textAlign: layer.align || "center",
            lineHeight: layer.lineHeight || 1.4,
            letterSpacing: layer.letterSpacing ? `${layer.letterSpacing}px` : undefined,
            direction: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            overflowWrap: "break-word",
            width: "100%",
            boxSizing: "border-box",
          };
          return (
            <div
              key={layer.id}
              style={{
                position: "absolute",
                left: `${layer.x || 50}%`,
                top: `${layer.y || 50}%`,
                transform: `translate(-50%, -50%)${layer.rotation ? ` rotate(${layer.rotation}deg)` : ""}`,
                width: layer.textWidth ? `${layer.textWidth}%` : "90%",
                maxWidth: layer.textWidth ? `${layer.textWidth}%` : "90%",
                zIndex: 30,
                cursor: isEditing ? "text" : "grab",
                outline: isSelected && !isExporting && !isEditing ? `${2 * scale}px dashed #818cf8` : "none",
                outlineOffset: `${2 * scale}px`,
                userSelect: "none",
                WebkitUserSelect: "none",
              }}
              onMouseDown={(e) => { if (!isEditing) { if (!layer.locked) onSelect(layer.id, "text", e); startDrag(e, layer.id, "text", layer.x || 50, layer.y || 50, layer.locked); } }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (layer.locked) return;
                const plain = layer.richHtml
                  ? (() => { const d = document.createElement("div"); d.innerHTML = layer.richHtml; return d.textContent || d.innerText || ""; })()
                  : (layer.text || "");
                setEditingId(layer.id);
                setEditingText(plain);
              }}
            >
              {/* Display div — hidden while editing so textarea shows in its place */}
              <div style={{
                ...textStyle,
                opacity: isEditing ? 0 : (layer.opacity ?? 1),
                filter: `blur(${layer.blur || 0}px) brightness(${layer.brightness || 100}%)${layer.glow ? ` drop-shadow(0 0 ${layer.glow}px rgba(255,255,255,0.5))` : ""}`,
                textShadow: layer.shadow ? `${2 * scale}px ${2 * scale}px ${4 * scale}px rgba(0,0,0,0.8)` : (layer.dropShadow ? `0 ${4 * scale}px ${8 * scale}px rgba(0,0,0,0.6)` : "none"),
                mixBlendMode: layer.blendMode || "normal",
                display: "block",
                pointerEvents: "none",
                userSelect: "none",
                WebkitUserSelect: "none",
              }}>
                {layer.bgColor ? (
                  <span style={{ backgroundColor: layer.bgColor, padding: "0 2px", borderRadius: "3px", display: "inline" }}>
                    {layer.richHtml
                      ? <span style={{ lineHeight: "inherit" }} dangerouslySetInnerHTML={{ __html: stripInlineStyles(layer.richHtml).replace(/<div(\s[^>]*)?>/gi, "<span$1>").replace(/<\/div>/gi, "</span>") }} />
                      : (layer.text || "نص")
                    }
                  </span>
                ) : (
                  layer.richHtml
                    ? <span style={{ lineHeight: "inherit", display: "block", width: "100%" }} dangerouslySetInnerHTML={{ __html: stripInlineStyles(layer.richHtml).replace(/<div(\s[^>]*)?>/gi, "<span$1>").replace(/<\/div>/gi, "</span>") }} />
                    : (layer.text || "نص")
                )}
              </div>

              {/* Textarea overlay — only shown while double-click editing, never captured by html2canvas on export */}
              {isEditing && (
                <textarea
                  autoFocus
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onBlur={() => {
                    onUpdateText(layer.id, { text: editingText, richHtml: "" });
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") { setEditingId(null); }
                  }}
                  style={{
                    ...textStyle,
                    position: "absolute",
                    inset: 0,
                    height: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    resize: "none",
                    padding: 0,
                    margin: 0,
                    overflow: "hidden",
                    caretColor: layer.color || "#ffffff",
                    zIndex: 50,
                    userSelect: "text",
                    WebkitUserSelect: "text",
                  }}
                />
              )}

              {isSelected && !isExporting && !isEditing && (
                <div
                  style={{ position: "absolute", bottom: -6, right: -6, width: 12, height: 12, background: "#818cf8", borderRadius: 2, cursor: "se-resize" }}
                  onMouseDown={(e) => { e.stopPropagation(); startResize(e, layer.id, "text", layer.textWidth || 90, 0); }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Frame overlays — one per frame */}
      {frames.map((f, i) => <React.Fragment key={f.id || i}>{renderFrame(f)}</React.Fragment>)}
    </div>
    </>
  );
}