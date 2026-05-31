import React, { useRef, useEffect, useState, useCallback } from "react";
import { ICON_MAP } from "./lucideIcons";
import { SOCIAL_ICONS } from "./socialIcons";
import { DOODLE_STICKERS } from "./doodleStickers";
import { SAUDI_MAP_PATH, SAUDI_REGIONS } from "./data/saudiMapPath";
import { generateSvgBackground } from "./svgBackgrounds";
import { findPlatform } from "./data/socialPlatforms.jsx";

function buildBg(bg) {
  if (!bg) return "#1e293b";
  if (bg.mode === "svgDesign") {
    const layers = bg.svgLayers;
    if (layers && layers.length > 0) return layers[0].bgColor || "#09071f";
    return bg.bgColor || "#09071f";
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

function colorSocialSvg(svgContent, color) {
  if (!svgContent || !color) return svgContent;
  // Replace fill + stroke attributes but preserve "none"
  return svgContent
    .replace(/fill="none"/g, "FILL_NONE_PLACEHOLDER")
    .replace(/stroke="none"/g, "STROKE_NONE_PLACEHOLDER")
    .replace(/fill="[^"]*"/g, `fill="${color}"`)
    .replace(/stroke="[^"]*"/g, `stroke="${color}"`)
    .replace(/FILL_NONE_PLACEHOLDER/g, 'fill="none"')
    .replace(/STROKE_NONE_PLACEHOLDER/g, 'stroke="none"');
}

function gradientSocialSvg(svgContent, gradId, c1, c2, angle) {
  if (!svgContent) return svgContent;
  const rad = (angle - 90) * Math.PI / 180;
  const x1 = (0.5 - 0.5 * Math.sin(rad)).toFixed(3);
  const y1 = (0.5 + 0.5 * Math.cos(rad)).toFixed(3);
  const x2 = (0.5 + 0.5 * Math.sin(rad)).toFixed(3);
  const y2 = (0.5 - 0.5 * Math.cos(rad)).toFixed(3);
  const gradDef = `<defs><linearGradient id="${gradId}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" gradientUnits="objectBoundingBox"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs>`;
  const withDefs = svgContent.includes("<defs>")
    ? svgContent.replace("<defs>", `<defs><linearGradient id="${gradId}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" gradientUnits="objectBoundingBox"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient>`)
    : svgContent.replace(/<svg([^>]*)>/, `<svg$1>${gradDef}`);
  return withDefs
    .replace(/fill="none"/g, "FILL_NONE_PLACEHOLDER")
    .replace(/stroke="none"/g, "STROKE_NONE_PLACEHOLDER")
    .replace(/fill="[^"]*"/g, `fill="url(#${gradId})"`)
    .replace(/stroke="[^"]*"/g, `stroke="url(#${gradId})"`)
    .replace(/FILL_NONE_PLACEHOLDER/g, 'fill="none"')
    .replace(/STROKE_NONE_PLACEHOLDER/g, 'stroke="none"');
}

function stripInlineStyles(html) {
  // Only strip font-family (layer prop controls it); keep font-size for per-selection sizing
  return html.replace(/font-family\s*:\s*[^;}"]+;?\s*/gi, "");
}

function applyBgOpacity(color, opacity) {
  if (!color || color === "transparent" || opacity === undefined || opacity === 1) return color;
  const hex = color.replace("#", "");
  if (hex.length !== 6) return color;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
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

function ShapeElement({ shape, scale, isSelected, selectedRegion, onSelectRegion }) {
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

  // Inner shadow — uses inset box-shadow. Outer shadow combined when enabled.
  const buildBoxShadow = () => {
    const parts = [];
    if (shape.innerShadow?.enabled) {
      const ix = (shape.innerShadow.x ?? 0) * scale;
      const iy = (shape.innerShadow.y ?? 4) * scale;
      const ib = (shape.innerShadow.blur ?? 8) * scale;
      const is = (shape.innerShadow.spread ?? 0) * scale;
      const ic = shape.innerShadow.color || "rgba(0,0,0,0.5)";
      parts.push(`inset ${ix}px ${iy}px ${ib}px ${is}px ${ic}`);
    }
    if (shape.outerShadow?.enabled) {
      const ox = (shape.outerShadow.x ?? 0) * scale;
      const oy = (shape.outerShadow.y ?? 6) * scale;
      const ob = (shape.outerShadow.blur ?? 12) * scale;
      const os = (shape.outerShadow.spread ?? 0) * scale;
      const oc = shape.outerShadow.color || "rgba(0,0,0,0.4)";
      parts.push(`${ox}px ${oy}px ${ob}px ${os}px ${oc}`);
    }
    return parts.length > 0 ? parts.join(", ") : undefined;
  };

  const baseStyle = {
    width: "100%", height: "100%",
    background: fillValue,
    filter: shape.blur > 0 ? `blur(${shape.blur}px)` : undefined,
    border: !noFillShapes.includes(shape.shapeType) && shape.borderWidth > 0 ? `${(shape.borderWidth || 0) * scale}px solid ${shape.borderColor || "#ffffff"}` : "none",
    borderRadius: shape.shapeType === "circle" ? "50%" : (shape.shapeType === "ellipse" ? "50%" : `${(shape.borderRadius || 0) * scale}px`),
    boxShadow: buildBoxShadow(),
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

  // ── Path-based shapes (wavy / professional photo-frame friendly) ──
  /** @type {Record<string, string>} */
  const PATH_SHAPES = {
    blob:          "M50,5 C70,8 88,22 88,45 C92,65 78,85 60,90 C40,95 18,88 12,68 C8,48 18,28 32,15 C40,8 45,5 50,5 Z",
    wave_shape:    "M0,15 Q25,0 50,15 T100,15 L100,85 Q75,100 50,85 T0,85 Z",
    cloud:         "M22,72 C5,72 0,52 18,46 C15,28 38,22 42,40 C48,18 75,22 70,42 C88,40 95,62 80,72 L22,72 Z",
    heart:         "M50,90 C20,68 5,42 25,22 C40,12 50,28 50,38 C50,28 60,12 75,22 C95,42 80,68 50,90 Z",
    splash:        "M50,5 L60,22 L78,15 L72,33 L90,32 L80,48 L95,55 L78,60 L88,76 L72,74 L75,92 L58,82 L50,95 L42,82 L25,92 L28,74 L12,76 L22,60 L5,55 L20,48 L10,32 L28,33 L22,15 L40,22 Z",
    petal:         "M50,5 Q88,40 50,95 Q12,40 50,5 Z",
    flower:        "M50,12 C62,8 72,22 65,35 C80,30 88,48 75,55 C82,68 65,78 55,68 C58,82 38,82 42,68 C32,78 18,68 25,55 C12,48 20,30 35,35 C28,22 38,8 50,12 Z",
    arch_top:      "M5,95 L5,42 Q5,5 50,5 Q95,5 95,42 L95,95 Z",
    tag:           "M5,30 L25,5 L95,5 L95,95 L25,95 L5,70 Z",
    shield:        "M50,5 L90,15 L90,55 Q90,85 50,95 Q10,85 10,55 L10,15 Z",
    ticket:        "M5,5 L95,5 L95,40 Q88,50 95,60 L95,95 L5,95 L5,60 Q12,50 5,40 Z",
    stadium:       "M30,5 L70,5 Q95,5 95,50 Q95,95 70,95 L30,95 Q5,95 5,50 Q5,5 30,5 Z",
    chevron_shape: "M5,5 L65,5 L95,50 L65,95 L5,95 L30,50 Z",
    burst:         "M50,3 L58,18 L73,8 L75,25 L92,22 L86,38 L99,48 L86,58 L92,75 L75,72 L73,89 L58,80 L50,97 L42,80 L27,89 L25,72 L8,75 L14,58 L1,48 L14,38 L8,22 L25,25 L27,8 L42,18 Z",
    octagon:       "M30,5 L70,5 L95,30 L95,70 L70,95 L30,95 L5,70 L5,30 Z",
    // Note stickers
    sticky_note:   "M5,5 L95,5 L95,80 L80,95 L5,95 Z",
    speech_bubble: "M15,10 L85,10 Q95,10 95,25 L95,65 Q95,80 85,80 L40,80 L25,97 L28,80 L15,80 Q5,80 5,65 L5,25 Q5,10 15,10 Z",
    thought_bubble:"M30,15 C18,10 8,22 18,32 C5,38 8,55 22,55 C18,68 35,72 42,62 C50,72 70,70 70,58 C82,60 90,48 82,40 C92,30 80,18 70,25 C65,12 45,10 30,15 Z",
    torn_paper:    "M5,15 L15,8 L25,16 L40,9 L55,17 L70,10 L82,18 L95,12 L95,85 L88,93 L75,86 L60,93 L48,85 L35,93 L20,86 L8,93 Z",
    index_card:    "M5,5 Q5,2 8,2 L92,2 Q95,2 95,5 L95,95 Q95,98 92,98 L8,98 Q5,98 5,95 Z",
    note_tape:     "M10,15 L90,15 L90,95 L10,95 Z",
    note_pin:      "M10,20 L90,20 L90,95 L10,95 Z",
    // Country / region maps — simplified hand-traced paths approximating real borders.
    // Not GIS-accurate but recognizable for graphic design use.
    // Saudi Arabia: NW Aqaba tail, north Jordan/Iraq border, NE Kuwait corner,
    // east Persian Gulf with Qatar peninsula notch, SE Empty Quarter inward,
    // south Yemen border, west Red Sea coast.
    saudi_map:     SAUDI_MAP_PATH,
    // GCC region: Saudi shape extended east+south to include UAE, Oman, omitting Yemen.
    gcc_map:       "M 8 22 L 12 15 L 17 10 L 24 6 L 33 4 L 44 4 L 54 5 L 63 7 L 71 12 L 77 19 L 81 27 L 81 33 L 80 36 L 83 38 L 86 36 L 90 38 L 89 44 L 85 46 L 82 47 L 86 49 L 91 51 L 95 56 L 96 64 L 94 73 L 89 81 L 81 86 L 73 83 L 65 80 L 56 82 L 47 84 L 38 87 L 32 86 L 28 80 L 25 72 L 22 62 L 19 51 L 15 39 L 11 27 Z",
    // Arabian Peninsula: full peninsula including Yemen and Oman, broader bottom.
    arabia_map:    "M 6 18 L 11 11 L 18 6 L 28 3 L 42 2 L 56 3 L 67 6 L 75 12 L 81 20 L 84 28 L 84 34 L 81 38 L 78 42 L 81 44 L 87 45 L 92 49 L 95 56 L 96 64 L 94 73 L 91 81 L 86 87 L 78 92 L 68 94 L 56 95 L 44 95 L 34 93 L 27 89 L 22 82 L 19 73 L 16 62 L 13 50 L 10 38 L 7 26 Z",
  };

  // ── Device mockups (iPhone, iPad, laptop, browser, TV, monitor, watch, car, t-shirt) ──
  // Screen-area overlay: each mockup's screen rect in % of the wrapper (the wrapper is the
  // shape's positioned container). We render the user's image as a NATIVE HTML <img> here
  // — much higher quality than embedding a bitmap in SVG via <pattern>/<image>, which
  // gets rasterized and distorted by preserveAspectRatio="none" on the parent SVG.
  const SCREEN_RECTS = {
    phone_mockup:    { x: 31,    y: 11,   w: 38, h: 78, br: "11.84% / 4.49%" },
    tablet_mockup:   { x: 12,    y: 12,   w: 76, h: 76, br: "2.63% / 1.97%"  },
    laptop_mockup:   { x: 10.5,  y: 10.5, w: 79, h: 53, br: "0.76% / 1.13%"  },
    browser_window:  { x: 4,     y: 21,   w: 92, h: 71, br: "0"              },
    monitor_mockup:  { x: 6,     y: 8,    w: 88, h: 58, br: "1.7% / 2.59%"   },
    tv_mockup:       { x: 5,     y: 8,    w: 90, h: 70, br: "0.89% / 1.14%"  },
    watch_mockup:    { x: 36,    y: 34,   w: 28, h: 32, br: "10.7% / 9.4%"   },
    tshirt_mockup:   { x: 34,    y: 38,   w: 32, h: 40, br: "0"              },
  };

  if (["phone_mockup", "tablet_mockup", "laptop_mockup", "browser_window",
       "monitor_mockup", "tv_mockup", "watch_mockup", "car_side", "tshirt_mockup"].includes(shape.shapeType)) {
    const bezel = shape.bezelColor || "#1e293b";
    const screenBg = shape.fillColor || "#ffffff";
    const screenFill = screenBg; // SVG always uses solid color — image is overlaid as HTML <img>
    const imgDef = null; // pattern no longer used
    const sc = (shape.imageScale || 100) / 100;
    const ox = shape.imageOffsetX || 0;
    const oy = shape.imageOffsetY || 0;
    const screenRect = SCREEN_RECTS[shape.shapeType];

    // Native HTML img overlay — full bitmap quality, html2canvas captures it directly
    const screenImage = (shape.fillImage && screenRect) ? (
      <div
        key={`screen-${shape.id}`}
        style={{
          position: "absolute",
          left: `${screenRect.x}%`,
          top: `${screenRect.y}%`,
          width: `${screenRect.w}%`,
          height: `${screenRect.h}%`,
          overflow: "hidden",
          borderRadius: screenRect.br,
          pointerEvents: "none",
        }}
      >
        <img
          src={shape.fillImage}
          crossOrigin="anonymous"
          draggable={false}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `${50 + ox}% ${50 + oy}%`,
            transform: sc !== 1 ? `scale(${sc})` : undefined,
            display: "block",
          }}
        />
      </div>
    ) : null;

    // Wrap helper — combines the SVG chrome with the HTML img overlay above it
    const wrap = (svg) => <>{svg}{screenImage}</>;

    if (shape.shapeType === "phone_mockup") {
      // iPhone — body, titanium frame, dynamic island, drop shadow
      return wrap(
        <svg {...commonSvgProps}>
          <defs>
            {imgDef}
            <linearGradient id={`phone-frame-${shape.id}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="50%" stopColor={bezel} />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          {/* drop shadow under phone */}
          <ellipse cx="50" cy="97" rx="22" ry="1.2" fill="rgba(0,0,0,0.4)" />
          {/* outer titanium body */}
          <rect x="28" y="2" width="44" height="96" rx="8" ry="6" fill={`url(#phone-frame-${shape.id})`} />
          {/* inner bezel ring */}
          <rect x="29.5" y="3.5" width="41" height="93" rx="7" ry="5" fill="#000000" />
          {/* screen */}
          <rect x="31" y="11" width="38" height="78" rx="4.5" ry="3.5" fill={screenFill} />
          {/* dynamic island */}
          <rect x="42" y="5" width="16" height="3.8" rx="1.9" ry="1.9" fill="#000000" />
          <circle cx="55.5" cy="6.9" r="0.6" fill="rgba(80,100,140,0.5)" />
          <circle cx="44.5" cy="6.9" r="0.4" fill="rgba(120,140,180,0.4)" />
          {/* screen sheen */}
          <rect x="31" y="11" width="38" height="14" rx="4.5" ry="3.5" fill="rgba(255,255,255,0.04)" />
          {/* side buttons - left silence + volume */}
          <rect x="27.3" y="18" width="0.8" height="3" rx="0.3" fill={bezel} />
          <rect x="27.3" y="26" width="0.8" height="6" rx="0.3" fill={bezel} />
          <rect x="27.3" y="34" width="0.8" height="6" rx="0.3" fill={bezel} />
          {/* side button - right power */}
          <rect x="71.9" y="26" width="0.8" height="9" rx="0.3" fill={bezel} />
          {/* metallic highlight on left edge */}
          <rect x="28" y="2" width="0.5" height="96" fill="rgba(255,255,255,0.2)" />
          <rect x="71.5" y="2" width="0.5" height="96" fill="rgba(0,0,0,0.4)" />
        </svg>
      );
    }

    if (shape.shapeType === "tablet_mockup") {
      // iPad with realistic chrome, drop shadow, screen sheen
      return wrap(
        <svg {...commonSvgProps}>
          <defs>
            {imgDef}
            <linearGradient id={`tab-frame-${shape.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="100%" stopColor={bezel} />
            </linearGradient>
          </defs>
          {/* drop shadow */}
          <ellipse cx="50" cy="94" rx="40" ry="1.5" fill="rgba(0,0,0,0.35)" />
          {/* outer body */}
          <rect x="8" y="8" width="84" height="84" rx="5" ry="4" fill={`url(#tab-frame-${shape.id})`} />
          {/* inner black bezel */}
          <rect x="9.5" y="9.5" width="81" height="81" rx="4" ry="3" fill="#000000" />
          {/* screen */}
          <rect x="12" y="12" width="76" height="76" rx="2" ry="1.5" fill={screenFill} />
          {/* camera */}
          <circle cx="50" cy="10.7" r="0.9" fill="#000000" />
          <circle cx="50" cy="10.7" r="0.5" fill="rgba(120,140,180,0.5)" />
          {/* screen sheen top */}
          <rect x="12" y="12" width="76" height="14" rx="2" ry="1.5" fill="rgba(255,255,255,0.04)" />
          {/* edge highlights */}
          <rect x="8" y="8" width="0.5" height="84" fill="rgba(255,255,255,0.2)" />
          <rect x="91.5" y="8" width="0.5" height="84" fill="rgba(0,0,0,0.4)" />
        </svg>
      );
    }

    if (shape.shapeType === "laptop_mockup") {
      // MacBook with aluminum body, visible keyboard, trackpad, drop shadow
      const aluTop = "#cbd5e1";
      const aluMid = "#94a3b8";
      const aluDark = "#64748b";
      const isDark = bezel !== "#1e293b" && bezel !== "#000000" ? false : true;
      return wrap(
        <svg {...commonSvgProps}>
          <defs>
            {imgDef}
            <linearGradient id={`alu-${shape.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={aluTop} />
              <stop offset="50%" stopColor={aluMid} />
              <stop offset="100%" stopColor={aluDark} />
            </linearGradient>
            <linearGradient id={`base-${shape.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={aluMid} />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <linearGradient id={`screen-bezel-${shape.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>

          {/* drop shadow under whole laptop */}
          <ellipse cx="50" cy="92" rx="49" ry="2.5" fill="rgba(0,0,0,0.35)" />
          <ellipse cx="50" cy="93" rx="46" ry="1.5" fill="rgba(0,0,0,0.25)" />

          {/* screen back panel */}
          <rect x="7" y="6" width="86" height="60" rx="2.5" ry="2" fill={`url(#alu-${shape.id})`} />
          {/* screen front bezel */}
          <rect x="7.8" y="6.8" width="84.4" height="58.4" rx="2" ry="1.6" fill={`url(#screen-bezel-${shape.id})`} />
          {/* screen content area */}
          <rect x="9.5" y="9" width="81" height="55" rx="0.6" ry="0.6" fill={screenFill} />
          {/* camera notch & dot */}
          <rect x="46" y="6.8" width="8" height="2" rx="1" ry="1" fill="#000000" />
          <circle cx="50" cy="7.8" r="0.5" fill="rgba(180,200,220,0.45)" />
          {/* screen reflection sheen — top */}
          <rect x="9.5" y="9" width="81" height="6" rx="0.6" ry="0.6" fill="rgba(255,255,255,0.06)" />

          {/* keyboard base body (trapezoid for perspective) */}
          <path d="M 2 66 L 98 66 L 95 84 L 5 84 Z" fill={`url(#base-${shape.id})`} />
          {/* hinge dark line */}
          <rect x="2" y="66" width="96" height="0.8" fill="#0f172a" opacity="0.7" />
          {/* keyboard well — slightly inset darker rectangle */}
          <path d="M 9 68 L 91 68 L 89.5 78 L 10.5 78 Z" fill="#1e293b" opacity="0.3" />
          {/* keyboard rows */}
          {[0, 1, 2, 3].map(row => {
            const y = 69 + row * 2.3;
            const inset = 0.18 * row;
            return Array.from({ length: 14 - row }, (_, k) => {
              const totalKeys = 14 - row;
              const startX = 12 + inset;
              const keyW = (76 - inset * 2) / totalKeys;
              return (
                <rect key={`${row}-${k}`}
                  x={startX + k * keyW + 0.3}
                  y={y}
                  width={keyW - 0.6}
                  height={1.7}
                  rx={0.25}
                  ry={0.25}
                  fill="#0f172a"
                  opacity="0.55"
                />
              );
            });
          }).flat()}
          {/* trackpad */}
          <rect x="34" y="79" width="32" height="3.8" rx="0.6" ry="0.6" fill="#0f172a" opacity="0.35" />
          {/* base front notch (where lid lifts) */}
          <path d="M 47 84 Q 50 86 53 84 Z" fill="#0f172a" opacity="0.45" />
          {/* highlight on base top */}
          <rect x="2" y="66.3" width="96" height="0.6" fill="rgba(255,255,255,0.35)" />
        </svg>
      );
    }

    if (shape.shapeType === "browser_window") {
      // Browser — body 4-96 X, 8-92 Y; address bar 4-96 X, 8-22; content 4-96 X, 22-92
      return wrap(
        <svg {...commonSvgProps}>
          <defs>{imgDef}</defs>
          {/* shadow */}
          <rect x="5" y="10" width="92" height="84" rx="3" ry="2" fill="rgba(0,0,0,0.18)" />
          {/* outer body */}
          <rect x="4" y="8" width="92" height="84" rx="3" ry="2" fill={bezel} />
          {/* address bar */}
          <rect x="4" y="8" width="92" height="13" rx="3" ry="2" fill={bezel} />
          <rect x="4" y="14" width="92" height="7" fill={bezel} />
          {/* traffic lights */}
          <circle cx="9" cy="14.5" r="1.6" fill="#ef4444" />
          <circle cx="14" cy="14.5" r="1.6" fill="#eab308" />
          <circle cx="19" cy="14.5" r="1.6" fill="#22c55e" />
          {/* url bar */}
          <rect x="30" y="11.5" width="55" height="6" rx="1.5" ry="1.5" fill="#ffffff" opacity="0.85" />
          {/* content area */}
          <rect x="4" y="21" width="92" height="71" fill={screenFill} />
        </svg>
      );
    }

    if (shape.shapeType === "monitor_mockup") {
      // iMac-style standalone monitor with stand
      return wrap(
        <svg {...commonSvgProps}>
          <defs>
            {imgDef}
            <linearGradient id={`mon-body-${shape.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="100%" stopColor={bezel} />
            </linearGradient>
            <linearGradient id={`mon-stand-${shape.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>
          {/* monitor body */}
          <rect x="4" y="6" width="92" height="64" rx="3" ry="2" fill={`url(#mon-body-${shape.id})`} />
          {/* screen content */}
          <rect x="6" y="8" width="88" height="58" rx="1.5" ry="1.5" fill={screenFill} />
          {/* camera dot */}
          <circle cx="50" cy="7.2" r="0.4" fill="rgba(120,150,200,0.5)" />
          {/* logo notch (bottom of body) */}
          <rect x="46" y="66" width="8" height="3" fill={bezel} />
          {/* stand neck */}
          <path d="M 46 70 L 54 70 L 56 84 L 44 84 Z" fill={`url(#mon-stand-${shape.id})`} />
          {/* stand base */}
          <ellipse cx="50" cy="86" rx="22" ry="2.5" fill={`url(#mon-stand-${shape.id})`} />
          <rect x="28" y="83" width="44" height="3" rx="1.5" fill={`url(#mon-stand-${shape.id})`} />
          {/* shadow */}
          <ellipse cx="50" cy="92" rx="32" ry="1.6" fill="rgba(0,0,0,0.32)" />
        </svg>
      );
    }

    if (shape.shapeType === "tv_mockup") {
      // Modern TV with thin bezels and small stand
      return wrap(
        <svg {...commonSvgProps}>
          <defs>
            {imgDef}
            <linearGradient id={`tv-body-${shape.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="100%" stopColor={bezel} />
            </linearGradient>
          </defs>
          {/* TV body */}
          <rect x="3" y="6" width="94" height="74" rx="2" ry="1.5" fill={`url(#tv-body-${shape.id})`} />
          {/* screen */}
          <rect x="5" y="8" width="90" height="70" rx="0.8" ry="0.8" fill={screenFill} />
          {/* brand dot bottom */}
          <circle cx="50" cy="79.5" r="0.4" fill="rgba(255,255,255,0.4)" />
          {/* stand legs */}
          <path d="M 30 80 L 38 92 L 36 94 L 26 82 Z" fill={bezel} />
          <path d="M 70 80 L 62 92 L 64 94 L 74 82 Z" fill={bezel} />
          {/* shadow */}
          <ellipse cx="50" cy="96" rx="38" ry="1.3" fill="rgba(0,0,0,0.32)" />
        </svg>
      );
    }

    if (shape.shapeType === "watch_mockup") {
      // Apple Watch with band
      const bandColor = shape.fillColor || "#ec4899";
      return wrap(
        <svg {...commonSvgProps}>
          <defs>
            {imgDef}
            <linearGradient id={`watch-body-${shape.id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="100%" stopColor={bezel} />
            </linearGradient>
          </defs>
          {/* top band */}
          <path d="M 38 8 Q 38 4 42 4 L 58 4 Q 62 4 62 8 L 64 32 L 36 32 Z" fill={bandColor} />
          {/* band shadow line */}
          <line x1="36" y1="32" x2="64" y2="32" stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" />
          {/* watch body (titanium frame) */}
          <rect x="32" y="30" width="36" height="40" rx="6" ry="6" fill={`url(#watch-body-${shape.id})`} />
          {/* inner bezel */}
          <rect x="34" y="32" width="32" height="36" rx="4.5" ry="4.5" fill="#000000" />
          {/* screen */}
          <rect x="36" y="34" width="28" height="32" rx="3" ry="3" fill={screenFill} />
          {/* digital crown */}
          <rect x="69" y="42" width="3" height="6" rx="1" fill="#94a3b8" />
          <line x1="70.5" y1="42" x2="70.5" y2="48" stroke="rgba(0,0,0,0.4)" strokeWidth="0.3" />
          {/* side button */}
          <rect x="69" y="54" width="2.5" height="4" rx="0.6" fill="#64748b" />
          {/* bottom band */}
          <path d="M 36 68 L 64 68 L 62 92 Q 62 96 58 96 L 42 96 Q 38 96 38 92 Z" fill={bandColor} />
          <line x1="36" y1="68" x2="64" y2="68" stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" />
          {/* shadow */}
          <ellipse cx="50" cy="98" rx="14" ry="1" fill="rgba(0,0,0,0.3)" />
        </svg>
      );
    }

    if (shape.shapeType === "car_side") {
      // Sedan side profile — body color = shape.fillColor (changeable)
      const bodyColor = shape.fillColor || "#1e293b";
      const wheelColor = "#0f172a";
      const wheelRim = "#cbd5e1";
      const windowColor = shape.fillImage ? screenFill : "rgba(56, 189, 248, 0.85)";
      return wrap(
        <svg {...commonSvgProps}>
          <defs>
            {imgDef}
            <linearGradient id={`car-body-${shape.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={bodyColor} />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id={`car-glass-${shape.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
              <stop offset="100%" stopColor="rgba(56,189,248,0.8)" />
            </linearGradient>
          </defs>
          {/* shadow under car */}
          <ellipse cx="50" cy="83" rx="44" ry="2" fill="rgba(0,0,0,0.4)" />
          {/* main body */}
          <path d="M 4 68 L 12 56 Q 18 44 32 42 L 38 36 Q 42 33 50 33 L 60 33 Q 66 33 70 38 L 76 50 L 92 54 Q 96 56 96 60 L 96 70 Q 96 74 92 74 L 8 74 Q 4 74 4 70 Z" fill={`url(#car-body-${shape.id})`} />
          {/* window */}
          {shape.fillImage ? (
            <path d="M 30 42 L 40 36 Q 43 34 49 34 L 60 34 Q 64 34 67 38 L 72 50 L 30 50 Z" fill={windowColor} stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" />
          ) : (
            <>
              <path d="M 30 42 L 40 36 Q 43 34 49 34 L 60 34 Q 64 34 67 38 L 72 50 L 30 50 Z" fill={`url(#car-glass-${shape.id})`} />
              <line x1="50" y1="34" x2="50" y2="50" stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" />
            </>
          )}
          {/* door line */}
          <line x1="50" y1="50" x2="50" y2="73" stroke="rgba(0,0,0,0.3)" strokeWidth="0.6" />
          {/* door handle */}
          <rect x="55" y="58" width="4" height="1" rx="0.5" fill="rgba(0,0,0,0.5)" />
          <rect x="40" y="58" width="4" height="1" rx="0.5" fill="rgba(0,0,0,0.5)" />
          {/* headlight */}
          <ellipse cx="91" cy="62" rx="3" ry="1.5" fill="rgba(255,255,200,0.85)" />
          {/* taillight */}
          <rect x="5" y="60" width="3" height="3" rx="0.5" fill="rgba(220,38,38,0.85)" />
          {/* wheels */}
          <circle cx="26" cy="76" r="9" fill={wheelColor} />
          <circle cx="26" cy="76" r="5.5" fill={wheelRim} />
          <circle cx="26" cy="76" r="2" fill={wheelColor} />
          <circle cx="74" cy="76" r="9" fill={wheelColor} />
          <circle cx="74" cy="76" r="5.5" fill={wheelRim} />
          <circle cx="74" cy="76" r="2" fill={wheelColor} />
          {/* wheel arches */}
          <path d="M 17 70 Q 26 60 35 70" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="0.6" />
          <path d="M 65 70 Q 74 60 83 70" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="0.6" />
          {/* body highlight */}
          <path d="M 12 56 Q 50 52 88 56" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" />
        </svg>
      );
    }

    if (shape.shapeType === "tshirt_mockup") {
      // T-shirt — body color = shape.fillColor; design area in chest = fillImage
      const tshirtColor = shape.fillColor || "#ffffff";
      return wrap(
        <svg {...commonSvgProps}>
          <defs>
            {imgDef}
            <linearGradient id={`tshirt-shade-${shape.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
            </linearGradient>
          </defs>
          {/* shadow */}
          <ellipse cx="50" cy="96" rx="35" ry="1.4" fill="rgba(0,0,0,0.3)" />
          {/* shirt body */}
          <path d="M 25 18 L 38 12 Q 50 22 62 12 L 75 18 L 90 28 L 80 42 L 72 38 L 72 92 Q 72 95 69 95 L 31 95 Q 28 95 28 92 L 28 38 L 20 42 L 10 28 Z" fill={tshirtColor} stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" strokeLinejoin="round" />
          {/* shading overlay */}
          <path d="M 25 18 L 38 12 Q 50 22 62 12 L 75 18 L 90 28 L 80 42 L 72 38 L 72 92 Q 72 95 69 95 L 31 95 Q 28 95 28 92 L 28 38 L 20 42 L 10 28 Z" fill={`url(#tshirt-shade-${shape.id})`} />
          {/* collar */}
          <path d="M 38 12 Q 50 22 62 12 Q 58 18 50 19 Q 42 18 38 12 Z" fill="rgba(0,0,0,0.18)" />
          {/* sleeve seams */}
          <path d="M 28 38 Q 25 38 22 36" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="0.6" />
          <path d="M 72 38 Q 75 38 78 36" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="0.6" />
          {/* design area (chest) — only shown when fillImage uploaded */}
          {shape.fillImage && (
            <rect x="34" y="38" width="32" height="40" fill={screenFill} />
          )}
        </svg>
      );
    }
  }

  // Custom freehand-drawn shapes use shape.pathData directly; preset shapes use the lookup
  const customPathD = (shape.shapeType === "custom_path" && shape.pathData) ? shape.pathData : null;
  // ── Multi-region Saudi Arabia map — each region colorable / image-fillable ──
  if (shape.shapeType === "saudi_regions") {
    const styles = shape.regionStyles || {};
    const defaultFill = shape.fillColor || "#cbd5e1";
    return (
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: "visible" }}>
        <defs>
          {SAUDI_REGIONS.map((r) => {
            const st = styles[r.id];
            if (!st?.image) return null;
            const sc = (st.imageScale || 100) / 100;
            const ps = 1 / sc;
            return (
              <pattern key={r.id} id={`region-img-${shape.id}-${r.id}`} patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox" width="1" height="1">
                <image href={st.image} x={(1 - ps) / 2} y={(1 - ps) / 2} width={ps} height={ps} preserveAspectRatio="xMidYMid slice" />
              </pattern>
            );
          })}
        </defs>
        {SAUDI_REGIONS.map((r) => {
          const st = styles[r.id] || {};
          const fill = st.image ? `url(#region-img-${shape.id}-${r.id})` : (st.fill || defaultFill);
          const isRegionSel = selectedRegion === r.id;
          return (
            <path
              key={r.id}
              d={r.d}
              fill={fill}
              stroke={isRegionSel ? "#6366f1" : (shape.borderColor || "#ffffff")}
              strokeWidth={isRegionSel ? 1.4 : (shape.borderWidth || 0.5)}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              style={{ cursor: "pointer", transition: "fill 0.15s" }}
              onMouseDown={() => {
                // select this region; let the event bubble so the shape itself
                // is still selected and draggable as usual
                if (onSelectRegion) onSelectRegion(r.id);
              }}
            >
              <title>{r.nameAr} — {r.nameEn}</title>
            </path>
          );
        })}
      </svg>
    );
  }

  if (PATH_SHAPES[shape.shapeType] || customPathD) {
    const pathD = customPathD || PATH_SHAPES[shape.shapeType];
    const imgPatternId = `imgpat-${shape.id}`;
    const sc = (shape.imageScale || 100) / 100;
    const ox = (shape.imageOffsetX || 0) / 100;
    const oy = (shape.imageOffsetY || 0) / 100;
    const patSize = 1 / sc;
    const patX = (1 - patSize) / 2 + ox;
    const patY = (1 - patSize) / 2 + oy;
    const svgFillVal = shape.fillImage
      ? `url(#${imgPatternId})`
      : (isGradient ? `url(#${svgGradId})` : isStripes ? `url(#${svgPatternId})` : solidColor);
    return (
      <svg {...commonSvgProps}>
        <defs>
          {shape.fillImage && (
            <pattern id={imgPatternId} patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox" width="1" height="1">
              <image href={shape.fillImage} x={patX} y={patY} width={patSize} height={patSize} preserveAspectRatio="xMidYMid slice" />
            </pattern>
          )}
          {isGradient && !shape.fillImage && (
            <linearGradient id={svgGradId} x1={gx1} y1={gy1} x2={gx2} y2={gy2} gradientUnits="objectBoundingBox">
              <stop offset="0%" stopColor={shape.gradientColor1 || "#8b5cf6"} />
              <stop offset="100%" stopColor={shape.gradientColor2 || "#ec4899"} />
            </linearGradient>
          )}
          {isStripes && !shape.fillImage && (
            <pattern id={svgPatternId} x="0" y="0" width={stripeSize * 2} height={stripeSize * 2} patternUnits="userSpaceOnUse" patternTransform={`rotate(${stripeAngle - 45})`}>
              <rect width={stripeSize * 2} height={stripeSize * 2} fill={stripeBg} />
              <rect width={stripeSize} height={stripeSize * 2} fill={stripeColor} />
            </pattern>
          )}
          {shape.blur > 0 && (
            <filter id={svgBlurId}><feGaussianBlur stdDeviation={shape.blur * 0.5} /></filter>
          )}
        </defs>
        <path
          d={pathD}
          fill={svgFillVal}
          stroke={shape.borderColor}
          strokeWidth={shape.borderWidth || 0}
          filter={shape.blur > 0 && !shape.fillImage ? `url(#${svgBlurId})` : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Tag eyelet hole — drawn after fill so it punches through visually */}
        {shape.shapeType === "tag" && (
          <circle cx="20" cy="50" r="5" fill={shape.fillImage ? "#0f172a" : (shape.borderColor || "#0f172a")} />
        )}
        {/* Sticky note — folded corner overlay */}
        {shape.shapeType === "sticky_note" && (
          <polygon points="80,95 95,80 80,80" fill="rgba(0,0,0,0.18)" />
        )}
        {/* Index card — horizontal lines drawn over fill */}
        {shape.shapeType === "index_card" && !shape.fillImage && (
          <>
            <line x1="5" y1="25" x2="95" y2="25" stroke="rgba(220,38,38,0.55)" strokeWidth="1.5" />
            {[40, 55, 70, 85].map(y => (
              <line key={y} x1="12" y1={y} x2="88" y2={y} stroke="rgba(59,130,246,0.4)" strokeWidth="0.8" />
            ))}
          </>
        )}
        {/* Tape note — tape strips at top corners */}
        {shape.shapeType === "note_tape" && (
          <>
            <polygon points="0,5 28,2 22,18 -2,12" fill="rgba(250,204,21,0.5)" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
            <polygon points="100,5 72,2 78,18 102,12" fill="rgba(250,204,21,0.5)" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
          </>
        )}
        {/* Pinned note — thumbtack at top-center */}
        {shape.shapeType === "note_pin" && (
          <>
            <line x1="50" y1="20" x2="50" y2="30" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" />
            <circle cx="50" cy="15" r="7" fill="#dc2626" stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
            <circle cx="48" cy="13" r="2.5" fill="rgba(255,255,255,0.5)" />
          </>
        )}
      </svg>
    );
  }

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
  groups = [], onMoveGroup, frames = [], language,
  drawMode = false, onAddShape, onExitDrawMode, onConvertSelectedShape,
  showGrid = false, showRulers = false, onContextMenu,
  selectedRegion, onSelectRegion,
  // Social contact box — single live editable overlay (see GreetingCardsPage
  // for the same shape). `onUpdateSocialBox(patch)` partially mutates state.
  socialBox, onUpdateSocialBox,
  offers, onUpdateOffers,
}) {
  // Helper that wraps any element's right-click — uses parent handler if provided
  const ctxHandler = (id, type) => onContextMenu ? (e) => onContextMenu(e, id, type) : undefined;
  const containerRefLocal = useRef(null);
  const containerRef = containerRefProp || containerRefLocal;
  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const rotateRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [guides, setGuides] = useState({ v: [], h: [] });

  // Freehand drawing state — only active when drawMode prop is true
  const [drawPoints, setDrawPoints] = useState([]);
  const [suggestedShape, setSuggestedShape] = useState(null);
  const isDrawingRef = useRef(false);

  // ── Shape recognition: analyze user's freehand strokes and suggest a clean shape ──
  // Returns null or { shape, confidence, params } where params override the drawn shape's
  // x/y/width/height/shapeType/etc. Handles circle, ellipse, rect, line.
  function recognizeShape(pts) {
    if (!pts || pts.length < 3) return null;
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const bw = maxX - minX;
    const bh = maxY - minY;
    if (bw < 3 && bh < 3) return null;

    const start = pts[0];
    const end = pts[pts.length - 1];
    const startEndDist = Math.hypot(end.x - start.x, end.y - start.y);
    const closed = startEndDist < Math.max(bw, bh) * 0.25;

    // 1) LINE — check first because it can fool other detectors
    if (!closed) {
      const lineLen = Math.hypot(bw, bh);
      if (lineLen > 6) {
        let maxPerpDist = 0;
        const dx = end.x - start.x, dy = end.y - start.y;
        for (const p of pts) {
          const dist = Math.abs(dx * (start.y - p.y) - (start.x - p.x) * dy) / (lineLen || 1);
          if (dist > maxPerpDist) maxPerpDist = dist;
        }
        if (maxPerpDist < lineLen * 0.06) {
          return {
            shape: "line",
            confidence: 1 - (maxPerpDist / lineLen) * 10,
            params: {
              shapeType: "line",
              x: Math.min(start.x, end.x),
              y: Math.min(start.y, end.y),
              width: Math.max(2, Math.abs(dx)),
              height: Math.max(0.5, Math.abs(dy)) || 0.5,
              borderWidth: 2,
              fillColor: "#8b5cf6",
            },
          };
        }
      }
    }

    if (!closed) return null;

    // 2) CIRCLE / ELLIPSE — distances from centroid
    const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
    const distances = pts.map(p => Math.hypot(p.x - cx, p.y - cy));
    const avgR = distances.reduce((a, b) => a + b, 0) / distances.length;
    const variance = distances.reduce((s, d) => s + (d - avgR) ** 2, 0) / distances.length;
    const stdDev = Math.sqrt(variance);
    const normStdDev = avgR > 0 ? stdDev / avgR : 1;
    const aspectRatio = bw / Math.max(0.001, bh);

    if (normStdDev < 0.18 && Math.abs(aspectRatio - 1) < 0.25) {
      // Perfect circle
      const r = (bw + bh) / 4;
      return {
        shape: "circle",
        confidence: 1 - normStdDev * 4,
        params: {
          shapeType: "circle",
          x: cx - r,
          y: cy - r,
          width: r * 2,
          height: r * 2,
        },
      };
    }

    // 3) RECTANGLE — points cluster near bounding box edges
    let maxEdgeDist = 0, totalEdgeDist = 0;
    for (const p of pts) {
      const dl = p.x - minX;
      const dr = maxX - p.x;
      const dt = p.y - minY;
      const db = maxY - p.y;
      const minD = Math.min(dl, dr, dt, db);
      if (minD > maxEdgeDist) maxEdgeDist = minD;
      totalEdgeDist += minD;
    }
    const avgEdgeDist = totalEdgeDist / pts.length;
    const minDim = Math.min(bw, bh);
    if (minDim > 5 && avgEdgeDist / minDim < 0.07 && maxEdgeDist / minDim < 0.18) {
      return {
        shape: "rect",
        confidence: 1 - (avgEdgeDist / minDim) * 10,
        params: {
          shapeType: "rect",
          x: minX,
          y: minY,
          width: bw,
          height: bh,
        },
      };
    }

    // 4) ELLIPSE — closed, smooth-ish, but not a circle
    if (normStdDev < 0.35) {
      return {
        shape: "ellipse",
        confidence: 1 - normStdDev * 2,
        params: {
          shapeType: "ellipse",
          x: minX,
          y: minY,
          width: bw,
          height: bh,
        },
      };
    }

    return null;
  }

  const startFreehandDraw = useCallback((e) => {
    if (!drawMode || !containerRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    isDrawingRef.current = true;
    setDrawPoints([{ x, y }]);
  }, [drawMode, containerRef]);

  useEffect(() => {
    if (!drawMode) return;
    const onMove = (e) => {
      if (!isDrawingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setDrawPoints(prev => {
        const last = prev[prev.length - 1];
        if (last) {
          const dx = x - last.x;
          const dy = y - last.y;
          if (Math.sqrt(dx * dx + dy * dy) < 0.4) return prev; // throttle
        }
        return [...prev, { x, y }];
      });
    };
    const onUp = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      setDrawPoints(currentPts => {
        if (currentPts.length < 3) return [];
        // Compute bounding box in canvas-% coords
        const xs = currentPts.map(p => p.x);
        const ys = currentPts.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const width = Math.max(2, maxX - minX);
        const height = Math.max(2, maxY - minY);
        // Auto-close if endpoint is near startpoint (~within 8% of bounding box)
        const startP = currentPts[0];
        const endP = currentPts[currentPts.length - 1];
        const closeDist = Math.sqrt((endP.x - startP.x) ** 2 + (endP.y - startP.y) ** 2);
        const shouldClose = closeDist < Math.min(width, height) * 0.25;
        // Normalize to 0..100 viewBox of the new shape
        let pathD = currentPts.map((p, i) => {
          const lx = ((p.x - minX) / width) * 100;
          const ly = ((p.y - minY) / height) * 100;
          return `${i === 0 ? "M" : "L"} ${lx.toFixed(1)} ${ly.toFixed(1)}`;
        }).join(" ");
        if (shouldClose) pathD += " Z";
        // Run shape recognition on the raw points (in canvas-% coords)
        const recognized = recognizeShape(currentPts);
        // Add as a new shape via parent callback
        if (onAddShape) {
          onAddShape({
            shapeType: "custom_path",
            pathData: pathD,
            isClosed: shouldClose,
            x: minX,
            y: minY,
            width,
            height,
          });
        }
        // Store suggestion for the just-added shape (if confident enough)
        if (recognized && recognized.confidence > 0.55) {
          setSuggestedShape(recognized);
        } else {
          setSuggestedShape(null);
        }
        return [];
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drawMode, onAddShape, containerRef]);

  // Exit draw mode with Escape key
  useEffect(() => {
    if (!drawMode) return;
    const onKey = (e) => {
      if (e.key === "Escape" && onExitDrawMode) onExitDrawMode();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawMode, onExitDrawMode]);

  // Auto-dismiss shape suggestion after 8s
  useEffect(() => {
    if (!suggestedShape) return;
    const t = setTimeout(() => setSuggestedShape(null), 8000);
    return () => clearTimeout(t);
  }, [suggestedShape]);

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

  const startRotate = useCallback((e, id, type, currentRotation) => {
    e.stopPropagation();
    e.preventDefault();
    // Find the wrapper element containing this shape (use parent of the handle)
    const handle = e.currentTarget;
    const wrapper = handle.parentElement; // the shape's positioned wrapper
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    // Center of rotated bounding box = center of unrotated shape (rotation is around center)
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // Initial mouse angle from center (clockwise from 12 o'clock = 0°)
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const startMouseAngle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    rotateRef.current = { id, type, centerX, centerY, startMouseAngle, startRotation: currentRotation };
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
        else if (type === "social") onUpdateSocialBox?.({ x: newX, y: newY });
        else if (type === "offers") onUpdateOffers?.({ x: newX, y: newY });
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
        let dx = ((e.clientX - startMX) / containerW) * 100;
        let dy = ((e.clientY - startMY) / containerH) * 100;
        let newW = Math.max(2, startW + dx);
        let newH = Math.max(2, startH + dy);

        // Lock aspect ratio with Shift
        if (e.shiftKey && startW > 0 && startH > 0) {
          const ratio = startW / startH;
          // Use the larger delta direction
          if (Math.abs(dx) > Math.abs(dy)) {
            newH = newW / ratio;
          } else {
            newW = newH * ratio;
          }
          newW = Math.max(2, newW);
          newH = Math.max(2, newH);
        }

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
      // Rotation — drag handle to rotate around shape center
      if (rotateRef.current) {
        const { id, type, centerX, centerY, startMouseAngle, startRotation } = rotateRef.current;
        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const currentMouseAngle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
        let newRotation = startRotation + (currentMouseAngle - startMouseAngle);
        if (e.shiftKey) newRotation = Math.round(newRotation / 15) * 15;
        while (newRotation > 180) newRotation -= 360;
        while (newRotation < -180) newRotation += 360;
        const updateFn = type === "shape" ? onUpdateShape : (type === "image" ? onUpdateImage : (type === "logo" ? onUpdateLogo : onUpdateText));
        updateFn(id, { rotation: Math.round(newRotation) });
      }
    };
    const onUp = () => { dragRef.current = null; resizeRef.current = null; rotateRef.current = null; setGuides({ v: [], h: [] }); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [onUpdateShape, onUpdateImage, onUpdateLogo, onUpdateText, groups, textLayers, shapes, images, logos]);

  function renderFrame(frame) {
    const result = renderFrameInner(frame);
    if (!result) return null;
    const ofX = frame.offsetX ?? 0;
    const ofY = frame.offsetY ?? 0;
    const sc = frame.scale ?? 1;
    if (ofX === 0 && ofY === 0 && sc === 1) return result;
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 500, transform: `translate(${ofX}%, ${ofY}%) scale(${sc})`, transformOrigin: "center center" }}>
        {result}
      </div>
    );
  }

  function renderFrameInner(frame) {
    if (!frame || !frame.presetId || frame.presetId === "none") return null;
    const fg = frame.gradient || {};
    const useGrad = !!fg.enabled;
    const c1 = fg.color1 || "#8b5cf6";
    const c2 = fg.color2 || "#ec4899";
    const fAngle = fg.angle ?? 135;
    const gradStr = `linear-gradient(${fAngle}deg, ${c1}, ${c2})`;
    const c = useGrad ? c1 : (frame.color || "#c9a227");
    const op = frame.opacity ?? 1;
    const p = `${frame.padding ?? 4}%`;
    const t = frame.thickness ?? 3;
    const base = { position: "absolute", pointerEvents: "none", zIndex: 500, opacity: op };

    const box = (inset, border, extra = {}) => {
      const gradExtra = useGrad ? { borderImage: `${gradStr} 1`, borderImageSlice: 1 } : {};
      return <div key={inset} style={{ ...base, top: inset, left: inset, right: inset, bottom: inset, border, ...extra, ...gradExtra }} />;
    };

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
      const filmBg = useGrad ? gradStr : c;
      return (
        <>
          <div style={{ ...base, top: 0, left: 0, right: 0, height: `${t * 4}px`, background: filmBg, display: "flex", alignItems: "center", gap: "2px", padding: "0 4px" }}>{dots}</div>
          <div style={{ ...base, bottom: 0, left: 0, right: 0, height: `${t * 4}px`, background: filmBg, display: "flex", alignItems: "center", gap: "2px", padding: "0 4px" }}>{dots}</div>
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
      const cornerStroke = useGrad ? `url(#frame-grad-${frame.id})` : c;
      const cornerFill = useGrad ? `url(#frame-grad-${frame.id})` : c;
      const rad = (fAngle - 90) * Math.PI / 180;
      const ggx1 = (0.5 - 0.5 * Math.sin(rad)).toFixed(3);
      const ggy1 = (0.5 + 0.5 * Math.cos(rad)).toFixed(3);
      const ggx2 = (0.5 + 0.5 * Math.sin(rad)).toFixed(3);
      const ggy2 = (0.5 - 0.5 * Math.cos(rad)).toFixed(3);
      return (
        <>
          {useGrad && (
            <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden="true">
              <defs>
                <linearGradient id={`frame-grad-${frame.id}`} x1={ggx1} y1={ggy1} x2={ggx2} y2={ggy2} gradientUnits="objectBoundingBox">
                  <stop offset="0%" stopColor={c1} />
                  <stop offset="100%" stopColor={c2} />
                </linearGradient>
              </defs>
            </svg>
          )}
          {positions.map((pos, i) => (
            <svg key={i} width={sz} height={sz} viewBox="0 0 40 40"
              style={{ ...base, ...pos, overflow: "visible" }}>
              <path d={`M 38 2 L 2 2 L 2 38`} stroke={cornerStroke} strokeWidth={t * 0.8} fill="none"
                transform={`rotate(${pos.rot} 20 20)`} />
              <path d={`M 28 2 L 2 2 L 2 28`} stroke={cornerStroke} strokeWidth={t * 0.3} fill="none" opacity="0.6"
                transform={`rotate(${pos.rot} 20 20)`} />
              <circle cx="2" cy="2" r={t * 0.6} fill={cornerFill} transform={`rotate(${pos.rot} 20 20)`} />
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
      const ig = img.iconGradient;
      const color = img.iconColor || socialIcon.color;
      const socialGradId = `soc-grad-${img.id}`;
      const coloredSvg = ig?.enabled
        ? gradientSocialSvg(socialIcon.svg, socialGradId, ig.color1 || "#8b5cf6", ig.color2 || "#ec4899", ig.angle ?? 135)
        : colorSocialSvg(socialIcon.svg, color);
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
          onContextMenu={ctxHandler(img.id, type)}
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

    // Handle doodle stickers (hand-drawn decorative elements)
    if (img.isDoodle) {
      const doodle = DOODLE_STICKERS[img.doodleKey];
      const isSelected = selectedId === img.id;
      const w = img.width || 15;
      const h = img.height || 15;
      if (!doodle) return null;
      const dg = img.iconGradient;
      const color = img.iconColor || doodle.color;
      const doodleGradId = `doodle-grad-${img.id}`;
      const coloredSvg = dg?.enabled
        ? gradientSocialSvg(doodle.svg, doodleGradId, dg.color1 || "#8b5cf6", dg.color2 || "#ec4899", dg.angle ?? 135)
        : colorSocialSvg(doodle.svg, color);
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
            zIndex: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseDown={(e) => { if (!img.locked) onSelect(img.id, type, e); startDrag(e, img.id, type, img.x || 10, img.y || 10, img.locked); }}
          onContextMenu={ctxHandler(img.id, type)}
        >
          <div
            style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
            dangerouslySetInnerHTML={{ __html: coloredSvg.replace('<svg ', '<svg width="100%" height="100%" preserveAspectRatio="none" style="display:block;overflow:visible" ') }}
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
          onContextMenu={ctxHandler(img.id, type)}
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
          onContextMenu={ctxHandler(img.id, type)}
        >
          {Icon && (() => {
            const useGrad = img.iconGradient?.enabled;
            const strokeVal = useGrad ? `url(#icon-grad-${img.id})` : (img.iconColor || "#ffffff");
            return (
              <Icon
                width="100%"
                height="100%"
                color={strokeVal}
                stroke={strokeVal}
                strokeWidth={2}
                style={{ display: "block", color: strokeVal }}
              />
            );
          })()}
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
          onContextMenu={ctxHandler(img.id, type)}
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
          onContextMenu={ctxHandler(img.id, type)}
      >
        {img.isSvg && img.svgContent ? (
          <div style={{ width: "100%", height: "100%", borderRadius: `${img.borderRadius || 0}px`, overflow: "hidden" }}>
            <img
              src={"data:image/svg+xml;charset=utf-8," + encodeURIComponent(colorSvgContent(img.svgContent, img.logoColor || img.svgColor))}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            />
          </div>
        ) : (() => {
          const filterParts = [];
          if (img.blur) filterParts.push(`blur(${img.blur}px)`);
          if (img.brightness !== undefined && img.brightness !== 100) filterParts.push(`brightness(${img.brightness}%)`);
          if (img.contrast !== undefined && img.contrast !== 100) filterParts.push(`contrast(${img.contrast}%)`);
          if (img.saturate !== undefined && img.saturate !== 100) filterParts.push(`saturate(${img.saturate}%)`);
          if (img.hue) filterParts.push(`hue-rotate(${img.hue}deg)`);
          if (img.grayscale) filterParts.push(`grayscale(${img.grayscale}%)`);
          if (img.sepia) filterParts.push(`sepia(${img.sepia}%)`);
          if (img.invert) filterParts.push(`invert(${img.invert}%)`);
          if (img.logoColor) filterParts.push(`url(#recolor-${img.id})`);
          if (img.dropShadow) filterParts.push("drop-shadow(0 4px 8px rgba(0,0,0,0.5))");
          const filterStr = filterParts.length > 0 ? filterParts.join(" ") : undefined;

          // crop: clip-path inset based on cropTop/cropRight/cropBottom/cropLeft (% values)
          const ct = img.cropTop ?? 0, cr = img.cropRight ?? 0, cb = img.cropBottom ?? 0, cl = img.cropLeft ?? 0;
          const hasCrop = (ct + cr + cb + cl) > 0;
          const clipPath = hasCrop ? `inset(${ct}% ${cr}% ${cb}% ${cl}%)` : undefined;

          return (
            <div style={{ width: "100%", height: "100%", borderRadius: `${img.borderRadius || 0}px`, overflow: "hidden" }}>
              <img
                src={src}
                alt=""
                crossOrigin="anonymous"
                style={{
                  width: "100%", height: "100%",
                  objectFit: img.objectFit || "contain",
                  objectPosition: img.objectPosition || "center",
                  filter: filterStr,
                  clipPath,
                  WebkitClipPath: clipPath,
                  pointerEvents: "none",
                  display: "block",
                }}
              />
            </div>
          );
        })()}
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

  // Build CSS for gradient text layers — injected via <style> so !important overrides
  // all inline color styles inside richHtml spans (which inline styles cannot do)
  const gradientTextCss = textLayers
    .filter(l => l.textGradient?.enabled)
    .map(l => {
      const tg = l.textGradient;
      const angle = tg.angle ?? 135;
      const c1 = tg.color1 || "#8b5cf6";
      const c2 = tg.color2 || "#ec4899";
      return `
        .tg-${l.id} {
          background: linear-gradient(${angle}deg, ${c1}, ${c2}) !important;
          -webkit-background-clip: text !important;
          background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          color: transparent !important;
        }
        .tg-${l.id} * {
          -webkit-text-fill-color: transparent !important;
          color: transparent !important;
          background: none !important;
          -webkit-background-clip: unset !important;
          background-clip: unset !important;
        }
      `;
    }).join("");

  // Build SVG gradient defs for Lucide icons with gradient enabled
  const lucideGradientItems = [...images, ...logos].filter(
    img => img.isLucideIcon && img.iconGradient?.enabled
  );

  return (
    <>
    <style>{`[data-studio-canvas] *::selection { background: transparent !important; }${gradientTextCss}`}</style>
    {lucideGradientItems.length > 0 && (
      <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
        <defs>
          {lucideGradientItems.map(img => {
            const ig = img.iconGradient;
            const iAngle = ig.angle ?? 135;
            const ic1 = ig.color1 || "#8b5cf6";
            const ic2 = ig.color2 || "#ec4899";
            const rad = (iAngle - 90) * Math.PI / 180;
            const gx1 = (0.5 - 0.5 * Math.sin(rad)).toFixed(3);
            const gy1 = (0.5 + 0.5 * Math.cos(rad)).toFixed(3);
            const gx2 = (0.5 + 0.5 * Math.sin(rad)).toFixed(3);
            const gy2 = (0.5 - 0.5 * Math.cos(rad)).toFixed(3);
            return (
              <linearGradient key={img.id} id={`icon-grad-${img.id}`} x1={gx1} y1={gy1} x2={gx2} y2={gy2} gradientUnits="objectBoundingBox">
                <stop offset="0%" stopColor={ic1} />
                <stop offset="100%" stopColor={ic2} />
              </linearGradient>
            );
          })}
        </defs>
      </svg>
    )}
    <div
      data-studio-canvas
      ref={containerRef}
      onMouseDown={drawMode ? startFreehandDraw : undefined}
      style={{
        position: "relative",
        width: "100%",
        paddingBottom: `${(size.height / size.width) * 100}%`,
        overflow: "hidden",
        borderRadius: 8,
        cursor: drawMode ? "crosshair" : "default",
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

      {/* SVG Design Background — supports multiple layers */}
      {bg?.mode === "svgDesign" && (() => {
        const layers = bg.svgLayers && bg.svgLayers.length > 0
          ? bg.svgLayers
          : [{ svgType: bg.svgType || "swoosh", bgColor: bg.bgColor || "#09071f",
               color1: bg.color1 || "#4c1d95", color2: bg.color2 || "#7c3aed",
               size: bg.size ?? 50, position: bg.position ?? 65, angle: bg.angle ?? 0,
               offsetX: 0, offsetY: 0, layerOpacity: 1, blur: bg.blur || 0, id: "legacy" }];
        return layers.map((layer, i) => (
          <div
            key={layer.id || i}
            dangerouslySetInnerHTML={{ __html: generateSvgBackground({ ...layer, uid: `canvas${i}`, transparentBg: i > 0 }) }}
            style={{
              position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
              pointerEvents: "none",
              transform: (layer.offsetX || layer.offsetY) ? `translate(${layer.offsetX || 0}%, ${layer.offsetY || 0}%)` : undefined,
              opacity: i === 0 ? 1 : (layer.layerOpacity ?? 0.85),
              filter: layer.blur ? `blur(${layer.blur}px)` : (i === 0 && bgFilter ? bgFilter : undefined),
            }}
          />
        ));
      })()}

      {/* Background blur layer (non-image modes only) — slightly oversized so blurred edges don't show transparent gaps */}
      {bgFilter && bg?.mode !== "image" && bg?.mode !== "svgDesign" && <div style={{ position: "absolute", inset: "-20px", ...bgStyle, filter: bgFilter, pointerEvents: "none" }} />}

      {/* Background image overlay */}
      {bg?.mode === "image" && bg?.imageUrl && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: `rgba(0,0,0,${1 - (bg.imageOpacity ?? 1)})`, pointerEvents: "none" }} />
      )}

      {/* Grid lines - hidden during export and when grid is off */}
      {!isExporting && showGrid && (
        <>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px)", backgroundSize: "10% 10%", pointerEvents: "none", zIndex: 199 }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.20) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.20) 1px, transparent 1px)", backgroundSize: "50% 50%", pointerEvents: "none", zIndex: 199 }} />
        </>
      )}

      {/* Ruler ticks - top + left edges */}
      {!isExporting && showRulers && (
        <>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 16, background: "rgba(15,23,42,0.85)", pointerEvents: "none", zIndex: 198, color: "#94a3b8", fontSize: 9 }}>
            {Array.from({ length: 11 }).map((_, i) => (
              <div key={i} style={{ position: "absolute", left: `${i * 10}%`, top: 0, bottom: 0, width: 1, background: "rgba(148,163,184,0.5)" }}>
                <span style={{ position: "absolute", top: 1, left: 2, fontSize: 8 }}>{i * 10}</span>
              </div>
            ))}
          </div>
          <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 16, background: "rgba(15,23,42,0.85)", pointerEvents: "none", zIndex: 198, color: "#94a3b8", fontSize: 9 }}>
            {Array.from({ length: 11 }).map((_, i) => (
              <div key={i} style={{ position: "absolute", top: `${i * 10}%`, left: 0, right: 0, height: 1, background: "rgba(148,163,184,0.5)" }}>
                <span style={{ position: "absolute", left: 1, top: 1, fontSize: 8 }}>{i * 10}</span>
              </div>
            ))}
          </div>
        </>
      )}

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
                  // 3D extrude — stack chained drop-shadows along an angle to fake depth.
                  // CAPPED at 12 layers because each chained drop-shadow forces a full
                  // re-rasterization of the element. Beyond this the browser hangs on
                  // complex shapes (paths with many vertices + text + image).
                  (shape.threeD?.enabled && shape.threeD.depth > 0) ? (() => {
                    const requested = shape.threeD.depth;
                    const numLayers = Math.min(12, requested);
                    const stepSize = requested / numLayers; // visual depth scales even when capped
                    const angle = shape.threeD.angle ?? 135;
                    const rad = (angle * Math.PI) / 180;
                    const dx = Math.cos(rad);
                    const dy = Math.sin(rad);
                    const col = shape.threeD.color || "#1e1b4b";
                    return Array.from({ length: numLayers }, (_, i) => {
                      const offset = (i + 1) * stepSize;
                      return `drop-shadow(${(dx * offset).toFixed(2)}px ${(dy * offset).toFixed(2)}px 0 ${col})`;
                    }).join(" ");
                  })() : "",
                ].filter(Boolean).join(" ") || undefined,
              }}
              onMouseDown={(e) => { if (!shape.locked) onSelect(shape.id, "shape", e); startDrag(e, shape.id, "shape", shape.x || 10, shape.y || 10, shape.locked); }}
              onContextMenu={ctxHandler(shape.id, "shape")}
            >
              <ShapeElement shape={shape} scale={scale} isSelected={isSelected} selectedRegion={selectedRegion} onSelectRegion={onSelectRegion} />
              {/* Text overlay — rotates with the shape via the parent wrapper transform */}
              {shape.text && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: shape.textVAlign === "top" ? "flex-start" : (shape.textVAlign === "bottom" ? "flex-end" : "center"),
                    justifyContent: shape.textAlign === "left" ? "flex-start" : (shape.textAlign === "right" ? "flex-end" : "center"),
                    padding: `${shape.textPadding ?? 8}%`,
                    pointerEvents: "none",
                    color: shape.textColor || "#ffffff",
                    fontFamily: shape.textFontFamily || "Tajawal",
                    fontSize: `${(shape.textFontSize || 24) * scale}px`,
                    fontWeight: shape.textBold ? "bold" : "normal",
                    fontStyle: shape.textItalic ? "italic" : "normal",
                    textAlign: shape.textAlign || "center",
                    lineHeight: shape.textLineHeight ?? 1.2,
                    letterSpacing: shape.textLetterSpacing ? `${shape.textLetterSpacing}px` : undefined,
                    textShadow: shape.textShadow ? "1px 1px 3px rgba(0,0,0,0.45)" : undefined,
                    direction: "rtl",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    overflow: "hidden",
                    textTransform: shape.textUppercase ? "uppercase" : undefined,
                  }}
                >
                  {shape.text}
                </div>
              )}
              {isSelected && !isExporting && (
                <>
                  {/* Rotation handle (above the shape, drag to rotate) */}
                  <div
                    style={{
                      position: "absolute",
                      top: -32,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 22,
                      height: 22,
                      background: "#818cf8",
                      borderRadius: "50%",
                      border: "2px solid white",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                      cursor: "grab",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: 13,
                      fontWeight: "bold",
                      userSelect: "none",
                      zIndex: 100,
                    }}
                    title="اسحب لتدوير الشكل (Shift للتثبيت كل 15°)"
                    onMouseDown={(e) => startRotate(e, shape.id, "shape", shape.rotation || 0)}
                  >
                    ↻
                  </div>
                  {/* Connector line from handle to shape */}
                  <div
                    style={{
                      position: "absolute",
                      top: -10,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 2,
                      height: 10,
                      background: "#818cf8",
                      pointerEvents: "none",
                      zIndex: 99,
                    }}
                  />
                  {/* Resize handle (bottom-right) */}
                  <div
                    style={{ position: "absolute", bottom: -6, right: -6, width: 12, height: 12, background: "#818cf8", borderRadius: 2, cursor: "se-resize" }}
                    onMouseDown={(e) => { e.stopPropagation(); startResize(e, shape.id, "shape", shape.width || 20, shape.height || 15); }}
                  />
                </>
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
          const tg = layer.textGradient;
          const ts = layer.textShadowEffect;
          const to = layer.textOutline;

          // Text style — gradient is applied via CSS class (not inline) to allow !important overrides
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
            WebkitTextStroke: to?.enabled && to?.width ? `${to.width}px ${to.color || "#000000"}` : undefined,
          };

          // Only apply filter when non-trivial — filter breaks background-clip:text
          const filterParts = [
            (layer.blur || 0) > 0 ? `blur(${layer.blur}px)` : "",
            layer.brightness && layer.brightness !== 100 ? `brightness(${layer.brightness}%)` : "",
            layer.glow ? `drop-shadow(0 0 ${layer.glow}px rgba(255,255,255,0.7))` : "",
          ].filter(Boolean);
          // Never apply filter when gradient is on (Chrome: filter breaks background-clip:text)
          const filterStr = (!tg?.enabled && filterParts.length > 0) ? filterParts.join(" ") : undefined;

          const buildTextShadow = () => {
            const parts = [];
            if (layer.shadow) parts.push(`${2 * scale}px ${2 * scale}px ${4 * scale}px rgba(0,0,0,0.8)`);
            if (layer.dropShadow) parts.push(`0 ${4 * scale}px ${8 * scale}px rgba(0,0,0,0.6)`);
            if (ts?.enabled) {
              const sx = (ts.shadowX ?? 2) * scale;
              const sy = (ts.shadowY ?? 2) * scale;
              const sb = (ts.shadowBlur ?? 4) * scale;
              parts.push(`${sx}px ${sy}px ${sb}px ${ts.shadowColor || "#000000"}`);
            }
            return parts.length > 0 ? parts.join(", ") : "none";
          };

          const richHtmlStr = layer.richHtml
            ? stripInlineStyles(layer.richHtml).replace(/<div(\s[^>]*)?>/gi, "<span$1>").replace(/<\/div>/gi, "</span>")
            : null;

          const renderInner = () => {
            const content = richHtmlStr
              ? <span style={{ lineHeight: "inherit" }} dangerouslySetInnerHTML={{ __html: richHtmlStr }} />
              : (layer.text || "نص");

            if (layer.bgColor && layer.bgColor !== "transparent") {
              return (
                <span style={{ backgroundColor: applyBgOpacity(layer.bgColor, layer.bgOpacity ?? 1), padding: "0 2px", borderRadius: "3px", display: "inline" }}>
                  {content}
                </span>
              );
            }
            return content;
          };

          // Curved text via SVG textPath — when curve.enabled
          const curveOn = layer.curve?.enabled;
          const curveAngle = Number.isFinite(layer.curve?.angle) ? layer.curve.angle : 180;

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
              onContextMenu={ctxHandler(layer.id, "text")}
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
              {curveOn && !isEditing ? (() => {
                const text = layer.richHtml
                  ? (() => { const d = document.createElement("div"); d.innerHTML = layer.richHtml; return d.textContent || d.innerText || ""; })()
                  : (layer.text || "نص");
                const fontSizePx = (layer.fontSize || 24) * scale;
                const w = 600;
                const cx = w / 2;
                const arcAngle = Math.max(20, Math.min(340, curveAngle));
                const radians = arcAngle * Math.PI / 180;
                const radius = Math.max(60, (text.length * fontSizePx * 1.1) / radians);
                const dy = radius;
                const sweep = arcAngle > 0 ? 1 : 0;
                const startX = cx - radius * Math.sin(radians / 2);
                const endX = cx + radius * Math.sin(radians / 2);
                const arcDip = radius - radius * Math.cos(radians / 2);
                const startY = dy + arcDip;
                const endY = startY;
                const yTop = arcAngle >= 360 ? 0 : Math.max(0, dy - 4);
                const svgH = (radius + arcDip + fontSizePx * 1.5) * 2;
                const pathD = `M ${startX} ${startY} A ${radius} ${radius} 0 ${arcAngle > 180 ? 1 : 0} ${sweep} ${endX} ${endY}`;
                return (
                  <svg
                    viewBox={`0 ${yTop} ${w} ${svgH}`}
                    width="100%"
                    style={{
                      display: "block",
                      overflow: "visible",
                      opacity: layer.opacity ?? 1,
                      filter: filterStr,
                      mixBlendMode: layer.blendMode || "normal",
                    }}
                  >
                    <path id={`curve-path-${layer.id}`} d={pathD} fill="none" />
                    <text
                      style={{
                        fontFamily: layer.fontFamily || "Tajawal",
                        fontSize: fontSizePx,
                        fontWeight: layer.bold ? "bold" : "normal",
                        fontStyle: layer.italic ? "italic" : "normal",
                        fill: layer.color || "#ffffff",
                        letterSpacing: layer.letterSpacing ? `${layer.letterSpacing}px` : undefined,
                      }}
                    >
                      <textPath href={`#curve-path-${layer.id}`} startOffset="50%" textAnchor="middle">
                        {text}
                      </textPath>
                    </text>
                  </svg>
                );
              })() : (
              /* Display div — gradient is applied via CSS class injected in <style> tag above
                  (not inline style) so !important rules override richHtml inline colors */
              <div
                className={tg?.enabled ? `tg-${layer.id}` : ""}
                style={{
                  ...textStyle,
                  opacity: isEditing ? 0 : (layer.opacity ?? 1),
                  filter: filterStr,
                  textShadow: buildTextShadow(),
                  mixBlendMode: layer.blendMode || "normal",
                  display: "block",
                  pointerEvents: "none",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                }}
              >
                {renderInner()}
              </div>
              )}

              {/* Textarea overlay — only shown while double-click editing, never captured by html2canvas on export */}
              {isEditing && (
                <textarea
                  autoFocus
                  spellCheck={true}
                  lang={language === "ar" ? "ar" : "en"}
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

        {/* ── Offers / pricing block overlay ─────────────────────────────
            Self-contained, draggable price list. Rendered inside canvasRef so
            html-to-image exports it automatically. */}
        {offers?.show && offers.items?.length > 0 && (() => {
          const isOffSel = selectedId === "__offers" && selectedType === "offers";
          const accent = offers.accent || "#b76e79";
          const textCol = offers.textColor || "#5b2333";
          const rowBg = offers.rowBg || "#ffffff";
          const cur = offers.currency || "ريال";
          const fw = (offers.width || 72);
          // Size everything relative to the canvas width so it's readable in
          // both the preview and the (much larger) export. `u` = 1% of canvas.
          const cW = containerRef.current?.getBoundingClientRect().width || 400;
          const fs = offers.fontScale || 1;
          const u = (cW / 100) * fs;
          const sp = cW / 100; // spacing unit (not font-scaled)
          return (
            <div
              onMouseDown={(e) => { e.stopPropagation(); onSelect?.("__offers", "offers"); startDrag(e, "__offers", "offers", offers.x ?? 50, offers.y ?? 55, false); }}
              style={{
                position: "absolute",
                left: `${offers.x ?? 50}%`,
                top: `${offers.y ?? 55}%`,
                width: `${fw}%`,
                transform: `translate(-50%, -50%) rotate(${offers.rotation || 0}deg)`,
                cursor: "grab",
                outline: isOffSel && !isExporting ? `${Math.max(2, sp * 0.4)}px dashed #818cf8` : "none",
                outlineOffset: `${sp}px`,
                fontFamily: offers.fontFamily || "Tajawal",
                direction: "rtl",
                zIndex: 30,
              }}
            >
              {/* Title + subtitle */}
              {(offers.title || offers.subtitle) && (
                <div style={{ textAlign: "center", marginBottom: `${sp * 2.2}px` }}>
                  {offers.title && (
                    <div style={{ color: accent, fontWeight: 800, fontSize: `${u * 6}px`, lineHeight: 1.15 }}>{offers.title}</div>
                  )}
                  {offers.subtitle && (
                    <div style={{ display: "inline-block", marginTop: `${sp * 1.6}px`, background: accent, color: "#fff", fontWeight: 700, fontSize: `${u * 3.4}px`, padding: `${sp * 1.2}px ${sp * 4}px`, borderRadius: `${sp * 40}px` }}>{offers.subtitle}</div>
                  )}
                </div>
              )}
              {/* Rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: `${sp * 1.6}px` }}>
                {offers.items.map((it, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: rowBg, borderRadius: `${sp * 2.5}px`,
                    padding: `${sp * 2.6}px ${sp * 3.4}px`,
                    boxShadow: `0 ${sp * 0.4}px ${sp * 1.6}px rgba(0,0,0,0.10)`,
                  }}>
                    <span style={{ color: textCol, fontWeight: 700, fontSize: `${u * 3.6}px`, flex: 1, textAlign: "right" }}>{it.service}</span>
                    {offers.showOld !== false && it.oldPrice ? (
                      <span style={{ color: "#9ca3af", fontSize: `${u * 2.6}px`, margin: `0 ${sp * 2.5}px`, whiteSpace: "nowrap" }}>
                        بدلاً من <span style={{ textDecoration: "line-through" }}>{it.oldPrice} {cur}</span>
                      </span>
                    ) : null}
                    <span style={{ color: accent, fontWeight: 800, fontSize: `${u * 4}px`, whiteSpace: "nowrap", borderInlineStart: `${Math.max(1, sp * 0.3)}px solid ${accent}40`, paddingInlineStart: `${sp * 2.5}px` }}>{it.price} {cur}</span>
                  </div>
                ))}
              </div>
              {offers.footer && (
                <div style={{ textAlign: "center", marginTop: `${sp * 2}px`, color: textCol, opacity: 0.85, fontSize: `${u * 2.6}px` }}>{offers.footer}</div>
              )}
            </div>
          );
        })()}

        {/* ── Social contact box overlay ─────────────────────────────────
            One per design. Rendered INSIDE canvasRef so html-to-image
            picks it up during export automatically (no separate export
            pipeline needed). Layout math mirrors GreetingCardsPage so
            the two pages produce visually identical boxes. */}
        {socialBox?.show && socialBox.items?.length > 0 && (() => {
          const containerW = containerRef.current?.getBoundingClientRect().width || 400;
          const iconPxPreview = (socialBox.iconSize / 100) * containerW;
          const fontPxPreview = iconPxPreview * 0.55;
          const gap = (socialBox.spacing / 100) * iconPxPreview;
          const padding = (socialBox.bgPadding / 100) * iconPxPreview;
          const radius = (socialBox.bgRadius / 100) * iconPxPreview;
          // Hide chips with empty handles only when labels are on; an
          // icons-only box should still show all chips even with empty
          // handle fields.
          const items = socialBox.items.filter((it) => (it.handle || "").trim() || !socialBox.showLabels);
          if (items.length === 0) return null;
          const isHorizontal = socialBox.layout === "horizontal";
          const isGrid = socialBox.layout === "grid";
          // Background — solid colour or two-stop gradient.
          let bgValue = "transparent";
          if (socialBox.bgEnabled) {
            if (socialBox.bgMode === "gradient") {
              bgValue = `linear-gradient(${socialBox.bgGradAngle || 135}deg, ${socialBox.bgColor}, ${socialBox.bgGradColor2 || "#1e293b"})`;
            } else {
              const hex = socialBox.bgColor || "#000000";
              const r = parseInt(hex.slice(1, 3), 16);
              const g = parseInt(hex.slice(3, 5), 16);
              const b = parseInt(hex.slice(5, 7), 16);
              bgValue = `rgba(${r}, ${g}, ${b}, ${socialBox.bgOpacity ?? 1})`;
            }
          }
          const isSelected = selectedId === "__social" && selectedType === "social";
          return (
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                onSelect?.("__social", "social");
                startDrag(e, "__social", "social", socialBox.x, socialBox.y, false);
              }}
              style={{
                position: "absolute",
                left: `${socialBox.x}%`,
                top: `${socialBox.y}%`,
                transform: `translate(-50%, -50%) rotate(${socialBox.rotation || 0}deg)`,
                padding: `${padding}px`,
                borderRadius: `${radius}px`,
                background: bgValue,
                cursor: "grab",
                userSelect: "none",
                outline: isExporting
                  ? "none"
                  : isSelected ? "2px dashed rgba(34,211,238,0.9)" : "1px dashed rgba(34,211,238,0.3)",
                outlineOffset: "2px",
                display: isGrid ? "grid" : "flex",
                flexDirection: isHorizontal ? "row" : "column",
                gridTemplateColumns: isGrid ? "1fr 1fr" : undefined,
                gap: `${gap}px`,
                alignItems: isHorizontal ? "center" : "stretch",
                fontFamily: socialBox.fontFamily,
                color: socialBox.textColor,
                zIndex: 100,
              }}
            >
              {items.map((item) => {
                const platform = findPlatform(item.platform);
                if (!platform) return null;
                const bg = socialBox.colorMode === "mono"    ? socialBox.monoColor
                         : socialBox.colorMode === "outline" ? "transparent"
                         :                                     platform.brandColor;
                const fg = socialBox.colorMode === "outline" ? platform.brandColor : "#ffffff";
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: `${iconPxPreview * 0.35}px`,
                      pointerEvents: "none",
                    }}
                  >
                    <div
                      style={{ width: `${iconPxPreview}px`, height: `${iconPxPreview}px`, flexShrink: 0 }}
                      dangerouslySetInnerHTML={{ __html: platform.svg(bg, fg) }}
                    />
                    {socialBox.showLabels && item.handle && (
                      // dir="ltr" forces LTR ordering — handles like
                      // "@username" and phone numbers don't BiDi-reorder
                      // when the parent document is RTL.
                      <span dir="ltr" style={{
                        fontSize: `${fontPxPreview}px`,
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        color: socialBox.textColor,
                        unicodeBidi: "isolate",
                      }}>
                        {item.handle}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Frame overlays — one per frame */}
      {frames.map((f, i) => <React.Fragment key={f.id || i}>{renderFrame(f)}</React.Fragment>)}

      {/* Freehand drawing live preview */}
      {drawMode && drawPoints.length > 0 && (
        <svg
          style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 999 }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path
            d={drawPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ")}
            stroke="#8b5cf6"
            strokeWidth="0.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="rgba(139,92,246,0.18)"
            vectorEffect="non-scaling-stroke"
            style={{ strokeWidth: "3px" }}
          />
        </svg>
      )}

      {/* Draw mode indicator banner */}
      {drawMode && (
        <div style={{
          position: "absolute",
          top: 8,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(139,92,246,0.95)",
          color: "white",
          padding: "6px 14px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: "bold",
          pointerEvents: "none",
          zIndex: 1000,
          boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
          whiteSpace: "nowrap",
        }}>
          ✏️ {language === "ar" ? "وضع الرسم نشط — ارسم بالماوس | ESC للخروج" : "Draw mode — drag to draw | ESC to exit"}
        </div>
      )}

      {/* Shape recognition suggestion popup */}
      {suggestedShape && (() => {
        const SHAPE_LABELS = {
          circle:   { ar: "دائرة",     en: "Circle",    icon: "⭕" },
          ellipse:  { ar: "بيضاوي",    en: "Ellipse",   icon: "🥚" },
          rect:     { ar: "مستطيل",    en: "Rectangle", icon: "▭" },
          line:     { ar: "خط مستقيم", en: "Line",      icon: "─" },
        };
        const info = SHAPE_LABELS[suggestedShape.shape] || { ar: suggestedShape.shape, en: suggestedShape.shape, icon: "✨" };
        const isAr = language === "ar";
        const accept = () => {
          if (onConvertSelectedShape) onConvertSelectedShape(suggestedShape.params);
          setSuggestedShape(null);
        };
        const reject = () => setSuggestedShape(null);
        return (
          <div style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            background: "white",
            color: "#1e293b",
            padding: "10px 14px",
            borderRadius: 14,
            fontSize: 13,
            zIndex: 1002,
            boxShadow: "0 6px 24px rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            border: "2px solid #8b5cf6",
            animation: "fadeIn 0.2s",
          }}>
            <span style={{ fontSize: 18 }}>{info.icon}</span>
            <span style={{ fontWeight: 600 }}>
              {isAr ? "هل تقصد رسم" : "Did you mean a"} <span style={{ color: "#7c3aed" }}>{isAr ? info.ar : info.en}</span>{isAr ? "؟" : "?"}
            </span>
            <button
              onClick={accept}
              style={{
                background: "#7c3aed",
                color: "white",
                border: "none",
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {isAr ? "✓ تحويل" : "✓ Convert"}
            </button>
            <button
              onClick={reject}
              style={{
                background: "#e2e8f0",
                color: "#475569",
                border: "none",
                padding: "6px 10px",
                borderRadius: 8,
                fontSize: 12,
                cursor: "pointer",
              }}
              title={isAr ? "إبقاء الرسمة الأصلية" : "Keep my drawing"}
            >
              ✕
            </button>
          </div>
        );
      })()}
    </div>
    </>
  );
}