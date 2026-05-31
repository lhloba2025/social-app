// GreetingCardsPage — bulk personalised greeting cards (Mail Merge).
// The user uploads:
//   1) a template image (card background)
//   2) an Excel/CSV with a list of names
// They configure how the name is drawn (font, size, colour, alignment, position),
// preview each card, then download all cards as a single ZIP.

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Upload, Download, Loader2, Type, Image as ImageIcon, ChevronLeft, ChevronRight, Trash2, FileSpreadsheet, Maximize2, Copy, Crop } from "lucide-react";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { normalizeImageFile, isHeic, shrinkBlobToLimit } from "@/utils/imageConvert";
import { fetchImageByUrl } from "@/api/localClient";

// ── IndexedDB cards library — much bigger quota than localStorage ──
// localStorage caps at ~5MB which fills up after one or two designs that
// include a phone-photo template. IndexedDB usually gives us 50MB+.
const IDB_NAME = "greeting_cards_db";
const IDB_STORE = "cards";

function openCardsDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAllCards() {
  try {
    const db = await openCardsDB();
    return await new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });
  } catch { return []; }
}

async function idbSaveCard(card) {
  const db = await openCardsDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(card);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

async function idbDeleteCard(id) {
  const db = await openCardsDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

// One-time migration: copy any legacy localStorage cards into IDB then clear them
async function migrateLegacyCards() {
  try {
    const legacy = JSON.parse(localStorage.getItem("greeting_cards_library_v1") || "[]");
    if (!Array.isArray(legacy) || legacy.length === 0) return;
    for (const c of legacy) {
      try { await idbSaveCard(c); } catch { /* ignore individual failures */ }
    }
    localStorage.removeItem("greeting_cards_library_v1");
  } catch { /* ignore */ }
}
import { SIZES } from "@/components/studio/sizes";
import { STOCK_ILLUSTRATIONS, VINTAGE_PALETTE, BG_GRADIENT_PRESETS, REAL_IMAGE_CATEGORIES, googleImagesUrl } from "@/components/studio/data/stockIllustrations.jsx";
import { TEXT_ORNAMENTS, TEXT_ORNAMENT_LIST } from "@/components/studio/data/textOrnaments.jsx";
import { CALLIGRAPHIC_MARKS } from "@/components/studio/data/calligraphicMarks.jsx";
import { ARABIC_LETTER_SHAPES } from "@/components/studio/data/arabicLetterShapes.jsx";
import { SOCIAL_PLATFORMS, findPlatform } from "@/components/studio/data/socialPlatforms.jsx";
import { applyProfileTo, saveSocialProfile } from "@/utils/socialProfileStore";

// Unified lookup — stock illustrations + calligraphy marks + Arabic letter
// shapes all share the same `stockObjects` state but live in separate
// arrays so the UI can group them in separate galleries. This array
// flattens them for any code path that just needs "find a def by id".
const ALL_STOCK_DEFS = [...STOCK_ILLUSTRATIONS, ...CALLIGRAPHIC_MARKS, ...ARABIC_LETTER_SHAPES];

// ─────────────────────────────────────────────────────────────────────────────
// Perspective ("screen fit") math — used to drop an image exactly onto a phone
// screen by dragging its 4 corners. The SAME homography drives the live preview
// (CSS matrix3d) and the canvas export (triangle-mesh warp), so what you see is
// what gets exported.
// Corners order everywhere: [TL, TR, BR, BL].
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_SCREEN_CORNERS = [
  { x: 0.34, y: 0.30 }, { x: 0.66, y: 0.30 },
  { x: 0.66, y: 0.70 }, { x: 0.34, y: 0.70 },
];

function _adj(m) {
  return [
    m[4]*m[8]-m[5]*m[7], m[2]*m[7]-m[1]*m[8], m[1]*m[5]-m[2]*m[4],
    m[5]*m[6]-m[3]*m[8], m[0]*m[8]-m[2]*m[6], m[2]*m[3]-m[0]*m[5],
    m[3]*m[7]-m[4]*m[6], m[1]*m[6]-m[0]*m[7], m[0]*m[4]-m[1]*m[3],
  ];
}
function _mulMM(a, b) {
  const c = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    let s = 0; for (let k = 0; k < 3; k++) s += a[3*i+k]*b[3*k+j];
    c[3*i+j] = s;
  }
  return c;
}
function _mulMV(m, v) {
  return [
    m[0]*v[0]+m[1]*v[1]+m[2]*v[2],
    m[3]*v[0]+m[4]*v[1]+m[5]*v[2],
    m[6]*v[0]+m[7]*v[1]+m[8]*v[2],
  ];
}
function _basisToPoints(p) { // p = [[x,y]×4]
  const m = [p[0][0], p[1][0], p[2][0], p[0][1], p[1][1], p[2][1], 1, 1, 1];
  const v = _mulMV(_adj(m), [p[3][0], p[3][1], 1]);
  return _mulMM(m, [v[0],0,0, 0,v[1],0, 0,0,v[2]]);
}
// Homography mapping src quad -> dst quad (each [[x,y]×4] in TL,TR,BR,BL order).
function homography(src, dst) {
  return _mulMM(_basisToPoints(dst), _adj(_basisToPoints(src)));
}
// CSS matrix3d string mapping the rect (0,0)-(w,h) onto dst corners (px).
function cssMatrix3d(w, h, dst) {
  const t = homography([[0,0],[w,0],[w,h],[0,h]], dst.map(c => [c.x, c.y]));
  for (let i = 0; i < 9; i++) t[i] /= t[8];
  const m = [t[0],t[3],0,t[6], t[1],t[4],0,t[7], 0,0,1,0, t[2],t[5],0,t[8]];
  return `matrix3d(${m.join(",")})`;
}
// Draw `img` onto ctx warped so the unit square maps to dst corners (px),
// using a triangle mesh for smooth perspective. Caller sets alpha/clip if needed.
function drawImagePerspective(ctx, img, dst, subdiv = 18) {
  const H = homography([[0,0],[1,0],[1,1],[0,1]], dst.map(c => [c.x, c.y]));
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const proj = (u, v) => {
    const w = H[6]*u + H[7]*v + H[8];
    return { x: (H[0]*u + H[1]*v + H[2]) / w, y: (H[3]*u + H[4]*v + H[5]) / w };
  };
  const tri = (sa, sb, sc, da, db, dc) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(da.x, da.y); ctx.lineTo(db.x, db.y); ctx.lineTo(dc.x, dc.y); ctx.closePath();
    ctx.clip();
    const denom = sa.x*(sc.y - sb.y) - sb.x*sc.y + sc.x*sb.y + (sb.x - sc.x)*sa.y;
    if (denom !== 0) {
      const a = -(sa.y*(dc.x - db.x) - sb.y*dc.x + sc.y*db.x + (sb.y - sc.y)*da.x) / denom;
      const b =  (sb.y*dc.y + sa.y*(db.y - dc.y) - sc.y*db.y + (sc.y - sb.y)*da.y) / denom;
      const c =  (sa.x*(dc.x - db.x) - sb.x*dc.x + sc.x*db.x + (sb.x - sc.x)*da.x) / denom;
      const d = -(sb.x*dc.y + sa.x*(db.y - dc.y) - sc.x*db.y + (sc.x - sb.x)*da.y) / denom;
      const e =  (sa.x*(sc.y*db.x - sb.y*dc.x) + sa.y*(sb.x*dc.x - sc.x*db.x) + (sc.x*sb.y - sb.x*sc.y)*da.x) / denom;
      const f =  (sa.x*(sc.y*db.y - sb.y*dc.y) + sa.y*(sb.x*dc.y - sc.x*db.y) + (sc.x*sb.y - sb.x*sc.y)*da.y) / denom;
      ctx.transform(a, b, c, d, e, f);
      ctx.drawImage(img, 0, 0);
    }
    ctx.restore();
  };
  for (let i = 0; i < subdiv; i++) {
    for (let j = 0; j < subdiv; j++) {
      const u0 = i/subdiv, u1 = (i+1)/subdiv, v0 = j/subdiv, v1 = (j+1)/subdiv;
      const sa = { x: u0*iw, y: v0*ih }, sb = { x: u1*iw, y: v0*ih },
            sc = { x: u1*iw, y: v1*ih }, sd = { x: u0*iw, y: v1*ih };
      const da = proj(u0,v0), db = proj(u1,v0), dc = proj(u1,v1), dd = proj(u0,v1);
      tri(sa, sb, sc, da, db, dc);
      tri(sa, sc, sd, da, dc, dd);
    }
  }
}

// Fonts available for the name overlay
// Grouped so the picker shows decorative Arabic calligraphy fonts first —
// these are what people reach for when writing "عيد مبارك"، "مبروك", etc.
const FONTS = [
  // ── 🌙 خطوط الزخرفة والمناسبات (Decorative Arabic for Eid / weddings / celebrations) ──
  { name: "Aref Ruqaa Ink", label: "🌙 رقعة حبر — للمناسبات" },
  { name: "Aref Ruqaa",     label: "🌙 رقعة عارف" },
  { name: "Mirza",          label: "🌙 ميرزا — كاليجرافي" },
  { name: "Aladin",         label: "🌙 علاء الدين — مزخرف" },
  { name: "Gulzar",         label: "🌙 گلزار — نسخ مزخرف" },
  { name: "Rakkas",         label: "🌙 رقاص — عرض" },
  { name: "Marhey",         label: "🌙 مرحى — أنيق" },
  { name: "Lalezar",        label: "🌙 لالهزار — عرض ضخم" },
  { name: "Jomhuria",       label: "🌙 جمهورية — عريض كبير" },
  { name: "Vibes",          label: "🌙 Vibes — ديواني" },
  { name: "Reem Kufi Fun",  label: "🌙 ريم كوفي مرح" },
  { name: "Cairo Play",     label: "🌙 القاهرة بلاي" },
  { name: "Katibeh",        label: "🌙 كاتبة — رقعة" },
  { name: "Lemonada",       label: "🌙 ليمونادا" },
  { name: "Markazi Text",   label: "🌙 مركزي — نسخ" },
  { name: "Scheherazade New", label: "🌙 شهرزاد — تقليدي" },
  // ── 📜 خطوط كلاسيكية ──
  { name: "Amiri",          label: "📜 أميري" },
  { name: "Amiri Quran",    label: "📜 أميري قرآن" },
  { name: "Reem Kufi",      label: "📜 ريم كوفي" },
  { name: "El Messiri",     label: "📜 المسيري" },
  { name: "Noto Naskh Arabic", label: "📜 نوتو نسخ" },
  { name: "Noto Kufi Arabic",  label: "📜 نوتو كوفي" },
  // ── 🅰️ خطوط حديثة ──
  { name: "Tajawal",        label: "🅰️ تجوال" },
  { name: "Cairo",          label: "🅰️ القاهرة" },
  { name: "Almarai",        label: "🅰️ المراعي" },
  { name: "Readex Pro",     label: "🅰️ ريدكس برو" },
  { name: "IBM Plex Sans Arabic", label: "🅰️ IBM بلكس" },
  { name: "Changa",         label: "🅰️ تشانجا" },
  // ── ✍️ خطوط يدوية لاتينية ──
  { name: "Caveat",         label: "✍️ Caveat" },
  { name: "Pacifico",       label: "✍️ Pacifico" },
  { name: "Great Vibes",    label: "✍️ Great Vibes" },
  { name: "Dancing Script", label: "✍️ Dancing Script" },
  { name: "Sacramento",     label: "✍️ Sacramento" },
  // ── 🅰️ خطوط لاتينية ──
  { name: "Arial",          label: "Arial" },
  { name: "Georgia",        label: "Georgia" },
];

const QUICK_COLORS = ["#ffffff", "#000000", "#d4af37", "#1e293b", "#dc2626", "#16a34a", "#3b82f6", "#7c3aed", "#ec4899", "#f59e0b"];

/**
 * Font picker with **live hover preview**.
 * As the user moves over a font in the list the parent's font state changes
 * immediately so the canvas re-renders with that font; clicking commits the
 * choice. Closing without clicking reverts to the originally selected font.
 */
function FontPicker({ value, onChange, fonts, isRtl }) {
  const [open, setOpen] = React.useState(false);
  const committedRef = React.useRef(value);
  const ref = React.useRef(null);

  // Remember the value as it was when the dropdown opened — so we can revert
  // if the user dismisses without picking anything.
  React.useEffect(() => {
    if (open) committedRef.current = value;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Click outside / Esc → revert (cancel preview)
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (!ref.current?.contains(e.target)) {
        if (value !== committedRef.current) onChange(committedRef.current);
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (value !== committedRef.current) onChange(committedRef.current);
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, value, onChange]);

  const current = fonts.find((f) => f.name === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ fontFamily: value }}
        className="w-full flex items-center justify-between gap-2 bg-slate-800 border border-slate-700 hover:border-indigo-500 rounded px-2 py-1.5 text-sm text-white text-start transition"
      >
        <span className="truncate">{current?.label || value}</span>
        <span className="text-slate-400 text-xs flex-shrink-0">▾</span>
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 max-h-72 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1"
          style={{ width: "max(100%, 240px)", [isRtl ? "right" : "left"]: 0 }}
          onMouseLeave={() => {
            // Restore the committed value when the cursor leaves the dropdown
            // — keeps the canvas honest until they actually click a font.
            if (value !== committedRef.current) onChange(committedRef.current);
          }}
        >
          {fonts.map((f) => (
            <button
              key={f.name}
              type="button"
              style={{ fontFamily: f.name }}
              onMouseEnter={() => { if (f.name !== value) onChange(f.name); }}
              onClick={() => {
                onChange(f.name);
                committedRef.current = f.name;
                setOpen(false);
              }}
              className={`w-full px-3 py-1.5 text-sm text-start transition ${
                f.name === value ? "bg-indigo-600 text-white" : "text-slate-200 hover:bg-slate-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GreetingCardsPage({ language }) {
  const isRtl = (language || localStorage.getItem("appLanguage") || "ar") === "ar";

  // Template image
  const [templateUrl, setTemplateUrl] = useState(null);
  const [templateW, setTemplateW] = useState(0);
  const [templateH, setTemplateH] = useState(0);

  // Template positioning — zoom + 2-axis offset applied ON TOP of fitMode.
  // Lets users reframe the template photo (move the sheep, crop the tree, etc.)
  // without re-uploading. Math is identical in preview (CSS transform) and
  // export (canvas drawImage) so what you see is what you get.
  //   templateZoom    — 1.0 = fit (cover/contain/fill); >1 zooms in, <1 zooms out
  //   templateOffsetX — % of card width; positive = shift template right
  //   templateOffsetY — % of card height; positive = shift template down
  const [templateZoom, setTemplateZoom] = useState(1);
  const [templateOffsetX, setTemplateOffsetX] = useState(0);
  const [templateOffsetY, setTemplateOffsetY] = useState(0);
  // "Pan mode" — when on, dragging the preview moves the template instead of
  // selecting overlays. Avoids the ambiguity of "is this drag a layout move?"
  const [templatePanMode, setTemplatePanMode] = useState(false);
  // Live drag state for template pan; captures starting mouse + offsets so
  // the math doesn't drift across re-renders mid-drag.
  const draggingTemplateRef = useRef(null);

  // Names from Excel
  const [names, setNames] = useState([]);
  const [previewIdx, setPreviewIdx] = useState(0);

  // Name text styling
  const [style, setStyle] = useState({
    x: 50,          // % of image width (center of text)
    y: 78,          // % of image height
    fontSize: 5,    // % of image height
    fontFamily: "Tajawal",
    color: "#d4af37",
    align: "center",
    bold: true,
    italic: false,
    shadow: true,
    rotation: 0,
    letterSpacing: 0,
    // Gradient mix for the name text
    useGradient: false,
    gradientColor2: "#ec4899",
    gradientAngle: 90,
    // Multi-line — used when the user's name field carries an explicit \n,
    // or when textWidth > 0 forces auto-wrap.
    textWidth: 0,
    lineHeight: 1.2,
  });

  // Logo overlay — uploaded once, drawn on every card
  const [logo, setLogo] = useState(null);
  // { url, naturalW, naturalH, x, y, width, color, opacity }
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const draggingLogoRef = useRef(false);
  const logoInputRef = useRef(null);

  // Static heading texts — same on every card (e.g. "عيد أضحى مبارك")
  // Each item: { id, text, x, y, fontSize, fontFamily, color, useGradient, gradientColor2, gradientAngle, align, bold, italic, shadow, rotation }
  const [headings, setHeadings] = useState([]);
  const [activeHeadingId, setActiveHeadingId] = useState(null);
  const draggingHeadingRef = useRef(null); // id of heading being dragged

  // Decorations — any number of image overlays (calligraphy PNGs, ornaments, ...)
  // Each item: { id, url, naturalW, naturalH, x, y, width, color, opacity, rotation, paintOverlay }
  const [decorations, setDecorations] = useState([]);
  const [activeDecorationId, setActiveDecorationId] = useState(null);
  const [uploadingDecoration, setUploadingDecoration] = useState(false);
  const [decoUrlInput, setDecoUrlInput] = useState("");
  const [addingDecoUrl, setAddingDecoUrl] = useState(false);
  const [removingDecoBg, setRemovingDecoBg] = useState(false);
  const [decoBgProgress, setDecoBgProgress] = useState("");
  const draggingDecorationRef = useRef(null);
  const draggingCornerRef = useRef(null); // { decoId, idx } while dragging a screen-fit corner
  const decorationInputRef = useRef(null);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

  // Stock illustrations — hand-drawn SVGs from the bundled library.
  // Each entry is an INSTANCE of a STOCK_ILLUSTRATIONS entry, with placement
  // + a per-region colour override:
  //   { id, typeId, x, y, width, rotation, opacity, colors: { region: hex } }
  // Stored separately from `decorations` because the recolour model is
  // fundamentally different (per-region, not single-tint).
  const [stockObjects, setStockObjects] = useState([]);
  const [activeStockId, setActiveStockId] = useState(null);
  const draggingStockRef = useRef(null);

  // ── Social contact box ────────────────────────────────────────────────
  // ONE box per card (vs. arbitrary count of decorations) — multiple
  // platforms inside a single styled container, all chips identically
  // sized so the box reads as a unified "contact strip".
  //   show       — quick toggle to hide/show without losing config
  //   x, y       — centre position (% of card)
  //   width      — overall box width (% of card), 0 = auto-fit to content
  //   iconSize   — % of card width per icon (also drives label font size)
  //   spacing    — gap between rows/items in same units
  //   layout     — "vertical" (icon + label) | "horizontal" (icons-only row)
  //                | "grid" (2-col icon+label)
  //   alignment  — "start" | "center" | "end" within the box
  //   colorMode  — "brand" (each platform brand hue) | "mono" (single colour)
  //                | "outline" (transparent fill + brand stroke)
  //   monoColor  — colour used when colorMode==="mono"
  //   textColor  — handle/label text colour
  //   bgEnabled  — draw a rounded rect behind the chips
  //   bgColor    — that rectangle's fill
  //   bgOpacity  — 0..1
  //   bgRadius   — corner radius (% of icon size)
  //   bgPadding  — interior padding (% of icon size)
  //   showLabels — render the handle text next to each icon
  //   fontFamily — label font
  //   items      — [{ id, platform, handle }]
  // Hydrate from the user's saved social profile so accounts, layout,
  // and styling all persist across sessions. See
  // src/utils/socialProfileStore.js for the persisted-fields list.
  // Positional fields (x/y) are intentionally NOT persisted — every
  // design has its own canvas and a remembered (x,y) often misses.
  const [socialBox, setSocialBox] = useState(() => applyProfileTo({
    show: false,
    x: 50,
    y: 90,
    iconSize: 7,
    spacing: 30,
    layout: "vertical",
    alignment: "center",
    colorMode: "brand",
    monoColor: "#ffffff",
    textColor: "#ffffff",
    // Background — solid colour OR two-stop gradient. `bgMode` decides.
    bgEnabled: false,
    bgMode: "solid",           // "solid" | "gradient"
    bgColor: "#000000",
    bgGradColor2: "#1e293b",
    bgGradAngle: 135,
    bgOpacity: 0.4,
    bgRadius: 25,
    bgPadding: 35,
    showLabels: true,
    fontFamily: "Tajawal",
    rotation: 0,
    items: [],
  }));
  // Auto-save the profile on every change. Throttling isn't worth it —
  // localStorage writes are sync but cheap, and the user's edits are
  // already debounced by the keyboard/input cadence.
  useEffect(() => { saveSocialProfile(socialBox); }, [socialBox]);
  const draggingSocialRef = useRef(false);
  const updateSocial = (patch) => setSocialBox((s) => ({ ...s, ...patch }));
  const addSocialItem = (platformId) => {
    const p = findPlatform(platformId);
    if (!p) return;
    updateSocial({
      show: true,
      items: [
        ...socialBox.items,
        { id: Math.random().toString(36).slice(2, 9), platform: platformId, handle: "" },
      ],
    });
  };
  const updateSocialItem = (id, patch) =>
    updateSocial({ items: socialBox.items.map((it) => it.id === id ? { ...it, ...patch } : it) });
  const removeSocialItem = (id) =>
    updateSocial({ items: socialBox.items.filter((it) => it.id !== id) });
  const moveSocialItem = (id, dir) => {
    const idx = socialBox.items.findIndex((it) => it.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= socialBox.items.length) return;
    const next = [...socialBox.items];
    [next[idx], next[target]] = [next[target], next[idx]];
    updateSocial({ items: next });
  };

  // Optional background fill used when no template image is uploaded.
  // `solid` = single colour; `gradient` = two-stop linear gradient at angle.
  // Whenever templateUrl is null we paint this onto the canvas first so the
  // card always has something behind the overlays.
  const [bgMode, setBgMode] = useState("solid"); // "solid" | "gradient"
  const [bgSolid, setBgSolid] = useState("#fef3e2");
  const [bgGrad1, setBgGrad1] = useState("#f4d3a8");
  const [bgGrad2, setBgGrad2] = useState("#d99464");
  const [bgGradAngle, setBgGradAngle] = useState(180);

  // Paint-by-click state
  const [paintingDecorationId, setPaintingDecorationId] = useState(null);
  const [paintColor, setPaintColor] = useState("#d4af37");
  // When true, clicks erase the region (set alpha to 0) instead of colouring it
  const [eraserMode, setEraserMode] = useState(false);

  // Text paint-brush state — independent of the decoration paint-by-click
  // because the recolouring model differs: text glyphs are individual
  // codepoint spans, decorations are pixel regions.
  //   textPaintingHeadingId — null = paint mode off; id = that heading is in
  //                            paint mode and accepting clicks
  //   textPaintColor        — current brush colour
  //   textPaintErase        — when true, click *removes* the glyph's colour
  //                            (back to the base fill colour) instead of
  //                            painting it
  const [textPaintingHeadingId, setTextPaintingHeadingId] = useState(null);
  const [textPaintColor, setTextPaintColor] = useState("#dc2626");
  const [textPaintErase, setTextPaintErase] = useState(false);
  // Cache the decoration's source ImageData so we don't reload on every click
  const paintSourceRef = useRef({ id: null, imageData: null });

  // Build a decoration object from ANY image source (blob / data URL / fetched
  // remote-as-data) and add it to the canvas. Shared by upload, paste, and URL.
  const addDecorationFromSrc = async (src) => {
    const img = await new Promise((res, rej) => {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = src;
    });
    const newDeco = {
      id: Math.random().toString(36).slice(2, 9),
      url: src,
      naturalW: img.naturalWidth,
      naturalH: img.naturalHeight,
      x: 50, y: 30,
      width: 60,
      color: "",
      // Gradient fill — when useGradient, color + gradientColor2 paint along gradientAngle
      useGradient: false,
      gradientColor2: "#fde047",
      gradientAngle: 90,
      // Multi-colour zones — stepped gradient with hard transitions, mapped
      // through the decoration's alpha mask. The cleanest way to colour
      // each word of a multi-word calligraphy PNG with no manual cropping.
      useMultiColor: false,
      multiColorAngle: 90,
      colorZones: [
        { color: "#dc2626", position: 0 },
        { color: "#d4af37", position: 33 },
        { color: "#16a34a", position: 66 },
      ],
      opacity: 1,
      rotation: 0,
      // Crop — show only this rectangle of the image (% values, 0..99)
      cropTop: 0, cropRight: 0, cropBottom: 0, cropLeft: 0,
    };
    setDecorations((d) => [...d, newDeco]);
    setActiveDecorationId(newDeco.id);
    return newDeco;
  };

  // Fetch a remote image URL through the backend (bypasses CORS / hotlink) and
  // add it as a decoration.
  const addDecorationFromUrl = async (rawUrl) => {
    const url = (rawUrl || "").trim();
    if (!/^https?:\/\//i.test(url)) throw new Error(isRtl ? "رابط غير صالح" : "Invalid URL");
    const dataUrl = await fetchImageByUrl(url);
    await addDecorationFromSrc(dataUrl);
  };

  const handleDecorationUpload = async (e) => {
    let file = e.target.files[0];
    if (!file) return;
    setUploadingDecoration(true);
    setError("");
    try {
      if (isHeic(file)) file = await normalizeImageFile(file);
      await addDecorationFromSrc(URL.createObjectURL(file));
    } catch (err) {
      setError((isRtl ? "تعذّر رفع الزخرفة: " : "Decoration upload failed: ") + (err?.message || err));
    } finally {
      setUploadingDecoration(false);
      e.target.value = "";
    }
  };

  // ── Smart add: paste an image (Ctrl+V) or an image URL, straight to canvas ──
  const handleAddDecoUrl = async () => {
    if (!decoUrlInput.trim()) return;
    setAddingDecoUrl(true);
    setError("");
    try {
      await addDecorationFromUrl(decoUrlInput);
      setDecoUrlInput("");
    } catch (err) {
      setError((isRtl ? "تعذّر جلب الصورة من الرابط: " : "Couldn't fetch image from URL: ") + (err?.message || err));
    } finally {
      setAddingDecoUrl(false);
    }
  };

  useEffect(() => {
    const onPaste = async (e) => {
      const t = e.target;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      const items = e.clipboardData?.items || [];
      // 1) Pasted image bytes (right-click → Copy image, then Ctrl+V)
      for (const it of items) {
        if (it.type && it.type.startsWith("image/")) {
          const file = it.getAsFile();
          if (file) {
            e.preventDefault();
            setUploadingDecoration(true);
            setError("");
            try { await addDecorationFromSrc(URL.createObjectURL(file)); }
            catch (err) { setError((isRtl ? "تعذّر لصق الصورة: " : "Paste failed: ") + (err?.message || err)); }
            finally { setUploadingDecoration(false); }
            return;
          }
        }
      }
      // 2) Pasted image URL (right-click → Copy image address). Skip while typing.
      if (typing) return;
      const text = e.clipboardData?.getData("text")?.trim();
      if (text && /^https?:\/\//i.test(text)) {
        e.preventDefault();
        setAddingDecoUrl(true);
        setError("");
        try { await addDecorationFromUrl(text); }
        catch (err) { setError((isRtl ? "تعذّر جلب الصورة من الرابط: " : "Couldn't fetch image from URL: ") + (err?.message || err)); }
        finally { setAddingDecoUrl(false); }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [isRtl]);

  // Measure the stage in px so the screen-fit perspective (matrix3d) is exact.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setStageSize((prev) => (prev.w === r.width && prev.h === r.height ? prev : { w: r.width, h: r.height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [templateUrl, stockObjects.length, headings.length, logo]);

  // Toggle screen-fit on the active decoration (perspective placement onto a screen).
  const toggleScreenFit = () => {
    if (!activeDecoration) return;
    const on = !activeDecoration.screenFit?.enabled;
    updateDecoration(activeDecoration.id, {
      screenFit: {
        enabled: on,
        corners: activeDecoration.screenFit?.corners
          || DEFAULT_SCREEN_CORNERS.map((c) => ({ ...c })),
      },
    });
  };

  const updateDecoration = (id, patch) => setDecorations((arr) => arr.map((d) => d.id === id ? { ...d, ...patch } : d));

  // AI background removal for a decoration — strips the checkerboard / any
  // background and leaves a clean cut-out. Runs in-browser via @imgly.
  const handleRemoveDecoBg = async () => {
    if (!activeDecoration || removingDecoBg) return;
    setRemovingDecoBg(true);
    setError("");
    setDecoBgProgress(isRtl ? "تحميل نموذج الذكاء…" : "Loading AI model…");
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const resultBlob = await removeBackground(activeDecoration.url, {
        output: { format: "image/png", quality: 1 },
        progress: (key, current, total) => {
          if (total > 0) {
            const pct = Math.round((current / total) * 100);
            setDecoBgProgress((isRtl ? "معالجة " : "Processing ") + pct + "%");
          }
        },
      });
      const safeBlob = await shrinkBlobToLimit(resultBlob);
      const newUrl = URL.createObjectURL(safeBlob);
      const dims = await new Promise((res) => {
        const im = new Image();
        im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight });
        im.onerror = () => res(null);
        im.src = newUrl;
      });
      updateDecoration(activeDecoration.id, {
        url: newUrl,
        ...(dims ? { naturalW: dims.w, naturalH: dims.h } : {}),
      });
    } catch (e) {
      setError((isRtl ? "فشل إزالة الخلفية: " : "Background removal failed: ") + (e?.message || e));
    } finally {
      setRemovingDecoBg(false);
      setDecoBgProgress("");
    }
  };

  // Convert "#rrggbb" to [r, g, b]
  const hexToRgb = (hex) => {
    const m = (hex || "#000000").replace("#", "");
    return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
  };

  // Read decoration pixels into a cached ImageData buffer
  const ensurePaintSource = async (deco) => {
    if (paintSourceRef.current.id === deco.id && paintSourceRef.current.imageData) {
      return paintSourceRef.current.imageData;
    }
    const img = await new Promise((res, rej) => {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = deco.url;
    });
    const tmp = document.createElement("canvas");
    tmp.width = img.naturalWidth;
    tmp.height = img.naturalHeight;
    const tc = tmp.getContext("2d");
    tc.drawImage(img, 0, 0);
    const data = tc.getImageData(0, 0, tmp.width, tmp.height);
    paintSourceRef.current = { id: deco.id, imageData: data };
    return data;
  };

  // Flood-fill connected non-transparent pixels starting at (px, py).
  // Lower threshold (8) includes anti-aliased edge pixels so the border of
  // each letter is painted along with the body.
  const floodFill = (imageData, px, py) => {
    const { width: W, height: H, data } = imageData;
    const idx0 = (py * W + px) * 4;
    const startAlpha = data[idx0 + 3];
    if (startAlpha < 8) return null; // clicked transparent area
    const visited = new Uint8Array(W * H);
    const stack = [[px, py]];
    while (stack.length > 0) {
      const [x, y] = stack.pop();
      if (x < 0 || x >= W || y < 0 || y >= H) continue;
      const flatIdx = y * W + x;
      if (visited[flatIdx]) continue;
      const alpha = data[flatIdx * 4 + 3];
      if (alpha < 8) continue;
      visited[flatIdx] = 1;
      stack.push([x + 1, y]); stack.push([x - 1, y]);
      stack.push([x, y + 1]); stack.push([x, y - 1]);
    }
    return visited;
  };

  // Bake the active recolor mode (solid / 2-stop gradient / multi-zone) into
  // a real image so subsequent paint clicks build ON TOP of it instead of
  // discarding the colours. Called only when a recolor is active and paintMap
  // doesn't exist yet.
  const renderColoredBase = async (deco) => {
    if (!deco.useMultiColor && !deco.useGradient && !deco.color) return null;
    const source = await ensurePaintSource(deco);
    const { width: W, height: H } = source;
    const off = document.createElement("canvas");
    off.width = W; off.height = H;
    const oc = off.getContext("2d");

    const img = await new Promise((res, rej) => {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = deco.url;
    });
    oc.drawImage(img, 0, 0, W, H);
    oc.globalCompositeOperation = "source-in";

    const endpointsFor = (angleDeg) => {
      const a = (angleDeg - 90) * Math.PI / 180;
      const halfW = W / 2;
      const halfH = H / 2;
      return [
        halfW - Math.cos(a) * halfW,
        halfH - Math.sin(a) * halfH,
        halfW + Math.cos(a) * halfW,
        halfH + Math.sin(a) * halfH,
      ];
    };

    if (deco.useMultiColor) {
      const zones = [...(deco.colorZones || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      if (zones.length > 0 && (zones[0].position ?? 0) > 0) zones.unshift({ ...zones[0], position: 0 });
      const [x1, y1, x2, y2] = endpointsFor(deco.multiColorAngle ?? 90);
      const grad = oc.createLinearGradient(x1, y1, x2, y2);
      for (let i = 0; i < zones.length; i++) {
        const start = (zones[i].position ?? 0) / 100;
        const end = i + 1 < zones.length ? (zones[i + 1].position ?? 100) / 100 : 1;
        grad.addColorStop(start, zones[i].color);
        grad.addColorStop(Math.max(start, end - 0.0001), zones[i].color);
      }
      oc.fillStyle = grad;
    } else if (deco.useGradient) {
      const [x1, y1, x2, y2] = endpointsFor(deco.gradientAngle ?? 90);
      const grad = oc.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, deco.color || "#d4af37");
      grad.addColorStop(1, deco.gradientColor2 || "#fde047");
      oc.fillStyle = grad;
    } else {
      oc.fillStyle = deco.color;
    }
    oc.fillRect(0, 0, W, H);
    return off.toDataURL("image/png");
  };

  // Paint a flood-filled region by REPLACING the decoration's pixels in the
  // painted area. Two modes:
  //   - paint: overwrite RGB to the chosen colour, preserve original alpha
  //     (smooth edges that blend with the card background, NOT with the
  //     original decoration colour underneath)
  //   - erase: zero the alpha so the region becomes transparent (deletes
  //     a part of the decoration without touching the rest)
  const paintRegion = async (deco, px, py, color, erase = false) => {
    const source = await ensurePaintSource(deco);
    const filled = floodFill(source, px, py);
    if (!filled) return null;
    const { width: W, height: H } = source;
    const out = document.createElement("canvas");
    out.width = W; out.height = H;
    const oc = out.getContext("2d");

    // Seed: existing paintMap → use it. No paintMap yet but a recolor is
    // active → bake the recolor into the base first so painting builds on it.
    // Otherwise → use the pristine source.
    let baseUrl = deco.paintMap;
    if (!baseUrl) {
      const colored = await renderColoredBase(deco);
      baseUrl = colored || deco.url;
    }
    const baseImg = await new Promise((res, rej) => {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = baseUrl;
    });
    oc.drawImage(baseImg, 0, 0, W, H);

    const out_data = oc.getImageData(0, 0, W, H);
    const [r, g, b] = hexToRgb(color);
    for (let i = 0; i < filled.length; i++) {
      if (!filled[i]) continue;
      const j = i * 4;
      if (erase) {
        // Wipe the pixel — RGB doesn't matter, alpha = 0 means fully transparent
        out_data.data[j + 3] = 0;
      } else {
        out_data.data[j]     = r;
        out_data.data[j + 1] = g;
        out_data.data[j + 2] = b;
        out_data.data[j + 3] = source.data[j + 3];
      }
    }
    oc.putImageData(out_data, 0, 0);
    return out.toDataURL("image/png");
  };

  // Handle a click on a decoration while paint mode is active
  const handlePaintClick = async (deco, stageRect, clientX, clientY) => {
    // Decoration's display bounding box on stage (in stage-px coords)
    const aspect = deco.naturalW / deco.naturalH || 1;
    const displayW = (deco.width / 100) * stageRect.width;
    const displayH = displayW / aspect;
    const centerX = (deco.x / 100) * stageRect.width;
    const centerY = (deco.y / 100) * stageRect.height;
    const boxLeft = centerX - displayW / 2;
    const boxTop = centerY - displayH / 2;
    // Click position relative to the decoration display
    let relX = (clientX - stageRect.left - boxLeft) / displayW;
    let relY = (clientY - stageRect.top - boxTop) / displayH;
    // Reverse-apply rotation around the center
    if (deco.rotation) {
      const rad = (-deco.rotation * Math.PI) / 180;
      const cx = 0.5, cy = 0.5;
      const dx = relX - cx, dy = relY - cy;
      relX = cx + dx * Math.cos(rad) - dy * Math.sin(rad);
      relY = cy + dx * Math.sin(rad) + dy * Math.cos(rad);
    }
    // Account for crop — only the un-cropped rectangle is visible/clickable
    const ct = (deco.cropTop || 0) / 100;
    const cr = (deco.cropRight || 0) / 100;
    const cb = (deco.cropBottom || 0) / 100;
    const cl = (deco.cropLeft || 0) / 100;
    const visibleW = 1 - cl - cr;
    const visibleH = 1 - ct - cb;
    relX = cl + relX * visibleW;
    relY = ct + relY * visibleH;
    if (relX < 0 || relX > 1 || relY < 0 || relY > 1) return;
    const px = Math.floor(relX * deco.naturalW);
    const py = Math.floor(relY * deco.naturalH);
    const newMap = await paintRegion(deco, px, py, paintColor, eraserMode);
    if (newMap) updateDecoration(deco.id, { paintMap: newMap });
  };

  // Invalidate the cached source when switching decorations or exiting paint mode
  useEffect(() => {
    if (paintingDecorationId !== paintSourceRef.current.id) {
      paintSourceRef.current = { id: null, imageData: null };
    }
  }, [paintingDecorationId]);

  // Clone an existing decoration. The clone shares the source image (same
  // object URL) but starts at a slight offset so the user sees it appear.
  // Combined with crop, this lets you split a multi-word calligraphy PNG
  // into independently-coloured pieces.
  const duplicateDecoration = (id) => {
    setDecorations((arr) => {
      const src = arr.find((d) => d.id === id);
      if (!src) return arr;
      const copy = {
        ...src,
        id: Math.random().toString(36).slice(2, 9),
        x: Math.min(95, src.x + 4),
        y: Math.min(95, src.y + 4),
      };
      const idx = arr.findIndex((d) => d.id === id);
      const next = [...arr];
      next.splice(idx + 1, 0, copy);
      setActiveDecorationId(copy.id);
      return next;
    });
  };

  const deleteDecoration = (id) => {
    setDecorations((arr) => {
      const target = arr.find((d) => d.id === id);
      const remaining = arr.filter((d) => d.id !== id);
      // Only revoke the blob URL once *every* decoration that shared it is gone
      // — duplicates intentionally reuse the same image source.
      if (target?.url && !remaining.some((d) => d.url === target.url)) {
        URL.revokeObjectURL(target.url);
      }
      return remaining;
    });
    if (activeDecorationId === id) setActiveDecorationId(null);
  };
  const activeDecoration = decorations.find((d) => d.id === activeDecorationId);

  // ── Stock-illustration helpers ────────────────────────────────────────
  const addStockObject = (typeId) => {
    const def = ALL_STOCK_DEFS.find((s) => s.id === typeId);
    if (!def) return;
    const newObj = {
      id: Math.random().toString(36).slice(2, 9),
      typeId,
      x: 50, y: 50,
      width: 30, // % of card width
      rotation: 0,
      opacity: 1,
      // Deep copy the default palette so per-instance tweaks don't bleed
      // into the shared definition.
      colors: { ...def.defaultColors },
    };
    setStockObjects((arr) => [...arr, newObj]);
    setActiveStockId(newObj.id);
  };
  const updateStockObject = (id, patch) => setStockObjects((arr) => arr.map((o) => o.id === id ? { ...o, ...patch } : o));
  const updateStockColor = (id, regionKey, color) => setStockObjects((arr) => arr.map((o) =>
    o.id === id ? { ...o, colors: { ...o.colors, [regionKey]: color } } : o
  ));
  const deleteStockObject = (id) => {
    setStockObjects((arr) => arr.filter((o) => o.id !== id));
    if (activeStockId === id) setActiveStockId(null);
  };
  const duplicateStockObject = (id) => {
    setStockObjects((arr) => {
      const src = arr.find((o) => o.id === id);
      if (!src) return arr;
      const copy = {
        ...src,
        id: Math.random().toString(36).slice(2, 9),
        x: Math.min(95, src.x + 4),
        y: Math.min(95, src.y + 4),
        colors: { ...src.colors },
      };
      const idx = arr.findIndex((o) => o.id === id);
      const next = [...arr];
      next.splice(idx + 1, 0, copy);
      setActiveStockId(copy.id);
      return next;
    });
  };
  const activeStock = stockObjects.find((o) => o.id === activeStockId);
  const activeStockDef = activeStock ? ALL_STOCK_DEFS.find((s) => s.id === activeStock.typeId) : null;

  const addHeading = (text = "") => {
    const newH = {
      id: Math.random().toString(36).slice(2, 9),
      text: text || (isRtl ? "عيد مبارك" : "Eid Mubarak"),
      x: 50, y: 20, fontSize: 8,
      fontFamily: "Aref Ruqaa Ink",
      color: "#d4af37",
      useGradient: false,
      gradientColor2: "#fde047",
      gradientAngle: 90,
      align: "center", bold: true, italic: false, shadow: true,
      rotation: 0,
      // Multi-line: 0 = no wrap (single line). >0 = wrap when text exceeds this % of card width.
      textWidth: 0,
      // Line spacing for multi-line text (1.0 = font size, 1.4 = roomy)
      lineHeight: 1.2,
      // ── Decoration effects ─────────────────────────────────────────────
      // Outline: stroked border around each glyph. The width is % of font
      // size so it scales with the text — fixed-pixel widths look chunky on
      // big headings and invisible on small ones.
      useOutline: false,
      outlineColor: "#000000",
      outlineWidth: 3,           // 0–20 % of font size
      // Glow: symmetric soft halo. Same scale-with-font-size rule as outline.
      useGlow: false,
      glowColor: "#ffd700",
      glowSize: 12,              // 0–50 % of font size
      // Background shape behind the text — "pill", "ribbon", "tag", "frame",
      // "circle". `pad` controls the gap between text and shape edge.
      textBgShape: "none",       // "none" | "pill" | "ribbon" | "tag" | "frame" | "circle"
      textBgColor: "#1e293b",
      textBgPadding: 30,         // % of font size
      textBgOpacity: 1,
      // Decorative ornament — a flourish drawn around the text bounding box.
      // Pulled from TEXT_ORNAMENTS, scaled relative to the text size.
      ornament: "none",          // "none" | "underline" | "side_brackets" | "stars_above" | "wreath" | "double_line"
      ornamentColor: "#d4af37",
      // Diacritic coloring — when on, harakat (fatha, damma, kasra, sukun,
      // shadda, etc.) plus combining hamza/madda render in a separate
      // colour from the base letters. Detected via the Unicode "Mn"
      // (Mark, nonspacing) category, so it works for any harakat the font
      // can render. Text is NFD-normalized first so precomposed forms like
      // أ decompose into ا + ?� and become colourable.
      useDiacriticColor: false,
      diacriticColor: "#dc2626",
      // Per-codepoint paint colours — map of NFD codepoint index → hex.
      // Filled by the "🖌️ Paint by click" tool: each tap on a letter,
      // diacritic, or hamza writes one entry here. Entries override the
      // base fill (and the auto-diacritic colour) for those glyphs.
      // Indices are positional; if the user later edits the text the
      // mapping may shift, but a one-click "Clear all paint" button
      // resets it.
      glyphColors: {},
    };
    setHeadings((h) => [...h, newH]);
    setActiveHeadingId(newH.id);
  };
  const updateHeading = (id, patch) => setHeadings((arr) => arr.map((h) => h.id === id ? { ...h, ...patch } : h));
  const deleteHeading = (id) => {
    setHeadings((arr) => arr.filter((h) => h.id !== id));
    if (activeHeadingId === id) setActiveHeadingId(null);
  };
  const activeHeading = headings.find((h) => h.id === activeHeadingId);

  // Output size / platform — null means "use template's native dimensions"
  const [outputSize, setOutputSize] = useState(null);
  // How the template image is fitted into the output canvas
  const [fitMode, setFitMode] = useState("cover"); // cover | contain | fill
  // Background colour shown when fitMode = "contain" leaves empty bars
  const [bgColor, setBgColor] = useState("#ffffff");

  // UX
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [error, setError] = useState("");

  // Export quality controls
  //   exportFormat="png"  → lossless: no JPEG ringing on text edges, no banding on gradients
  //   exportFormat="jpeg" → smaller file but introduces compression artifacts (off by default)
  //   superSample=2 means render at 2?� the target size then downsample with a high-quality
  //   bicubic-ish resampler → classic SSAA antialiasing for razor-sharp calligraphy edges.
  const [exportFormat, setExportFormat] = useState("png");
  const [superSample, setSuperSample] = useState(2);

  // Left-panel tabs — keeps each section on its own screen so the user never
  // has to scroll past one section to reach another.
  const PANELS = [
    { id: "card",   icon: "🖼️", labelAr: "البطاقة",  labelEn: "Card" },
    { id: "shapes", icon: "🐑", labelAr: "أشكال",    labelEn: "Shapes" },
    { id: "logo",   icon: "🏷️", labelAr: "لوقو",     labelEn: "Logo" },
    { id: "texts",  icon: "📝", labelAr: "نصوص",     labelEn: "Texts" },
    { id: "social", icon: "📱", labelAr: "تواصل",   labelEn: "Social" },
    { id: "deco",   icon: "🎨", labelAr: "زخارف",    labelEn: "Decor" },
    { id: "names",  icon: "📋", labelAr: "أسماء",    labelEn: "Names" },
    { id: "export", icon: "💾", labelAr: "تصدير",    labelEn: "Export" },
  ];
  const [activePanel, setActivePanel] = useState("card");

  // Saved cards library — persists card state in IndexedDB (large quota)
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [saveCardName, setSaveCardName] = useState("");
  const [savedCards, setSavedCards] = useState([]);
  const [savingCard, setSavingCard] = useState(false);

  // Load existing cards from IDB (and migrate any legacy localStorage cards)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await migrateLegacyCards();
      const all = await idbGetAllCards();
      if (!cancelled) {
        // Sort newest first by savedAt
        all.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
        setSavedCards(all);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Convert any image URL (blob: / data: / http) into a data URL for storage.
  // IndexedDB has plenty of room, so we keep the budget generous — exported
  // cards then stay sharp even at 4K-ish output.
  // 3500px / 10MB lets a typical phone photo template (3024?�4032) survive at
  // near-original quality.
  const urlToDataUrl = async (url, maxDim = 3500, maxBytes = 10 * 1024 * 1024) => {
    if (!url) return null;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const shrunk = await shrinkBlobToLimit(blob, { maxBytes, maxDimension: maxDim });
      return await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(shrunk);
      });
    } catch { return null; }
  };

  // Generate a small JPEG thumbnail of the current card preview for the library
  const generateThumbnail = async () => {
    if (!templateUrl) return null;
    try {
      // Use the rendered card (single anonymous name) — keeps the thumb small
      const blob = await renderCard("");
      if (!blob) return null;
      const img = await new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = URL.createObjectURL(blob);
      });
      const c = document.createElement("canvas");
      const ts = 240;
      c.width = ts;
      c.height = Math.round(ts * img.naturalHeight / img.naturalWidth);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", 0.75);
    } catch { return null; }
  };

  const handleSaveCard = async () => {
    const name = saveCardName.trim();
    if (!name) { setError(isRtl ? "أدخل اسماً للتصميم" : "Enter a card name"); return; }
    if (!templateUrl) { setError(isRtl ? "ارفع قالباً أولاً" : "Upload a template first"); return; }

    setSavingCard(true);
    setError("");
    try {
      // Snapshot all blob URLs as data URLs so the card survives a reload
      const templateData = await urlToDataUrl(templateUrl);
      const logoData = logo ? await urlToDataUrl(logo.url) : null;
      const decoData = await Promise.all(decorations.map(async (d) => ({
        ...d,
        url: await urlToDataUrl(d.url),
      })));
      const headingsClean = headings.map((h) => ({
        ...h,
        // fillImage is a blob URL too — convert it as well
        fillImage: h.fillImage ? null : null, // skip image fills in saves (size)
      }));
      const styleClean = { ...style, fillImage: null };
      const thumbnail = await generateThumbnail();

      const card = {
        id: `card_${Date.now()}`,
        name,
        savedAt: Date.now(),
        thumbnail,
        state: {
          template: { url: templateData, w: templateW, h: templateH },
          outputSize, fitMode, bgColor,
          logo: logo ? { ...logo, url: logoData } : null,
          decorations: decoData,
          headings: headingsClean,
          style: styleClean,
        },
      };

      // If a card with the same name exists, replace it (delete the old then add)
      const conflict = savedCards.find((c) => c.name === name);
      if (conflict) {
        try { await idbDeleteCard(conflict.id); } catch { /* ignore */ }
      }
      try {
        await idbSaveCard(card);
        const all = await idbGetAllCards();
        all.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
        setSavedCards(all);
        setShowSaveModal(false);
        setSaveCardName("");
      } catch (e) {
        setError((isRtl ? "تعذّر الحفظ: " : "Save failed: ") + (e?.message || e));
      }
    } finally {
      setSavingCard(false);
    }
  };

  const handleLoadCard = (card) => {
    const s = card.state;
    if (s.template?.url) {
      setTemplateUrl(s.template.url);
      setTemplateW(s.template.w);
      setTemplateH(s.template.h);
    }
    if (s.outputSize) setOutputSize(s.outputSize);
    if (s.fitMode) setFitMode(s.fitMode);
    if (s.bgColor) setBgColor(s.bgColor);
    setLogo(s.logo || null);
    setDecorations(s.decorations || []);
    setHeadings(s.headings || []);
    if (s.style) setStyle({ ...style, ...s.style });
    setShowLibraryModal(false);
    setActivePanel("card");
  };

  const handleDeleteCard = async (id) => {
    try { await idbDeleteCard(id); } catch { /* ignore */ }
    setSavedCards((arr) => arr.filter((c) => c.id !== id));
  };

  const templateInputRef = useRef(null);
  const namesInputRef = useRef(null);
  const stageRef = useRef(null);
  const draggingRef = useRef(false);
  const [stageHeight, setStageHeight] = useState(0);

  // Track the rendered stage height so the preview font size matches the export
  useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const ro = new ResizeObserver(([entry]) => {
      setStageHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [templateUrl]);

  const updateStyle = (patch) => setStyle((s) => ({ ...s, ...patch }));

  // Build a "stepped" linear gradient — each colour stop is duplicated so the
  // transition between zones is a hard line, splitting the image into bands.
  // zones = sorted array of { color, position(0..100) } — position is where
  // that zone *starts*; previous zone ends at this position.
  const buildSteppedGradient = (zones, angle = 90) => {
    if (!zones?.length) return null;
    const sorted = [...zones].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    if ((sorted[0].position ?? 0) > 0) sorted.unshift({ ...sorted[0], position: 0 });
    const stops = [];
    for (let i = 0; i < sorted.length; i++) {
      const start = sorted[i].position ?? 0;
      const end = i + 1 < sorted.length ? (sorted[i + 1].position ?? 100) : 100;
      stops.push(`${sorted[i].color} ${start}%`);
      stops.push(`${sorted[i].color} ${end}%`);
    }
    return `linear-gradient(${angle}deg, ${stops.join(", ")})`;
  };

  // XML-escape so user-typed text doesn't break the SVG document
  const xmlEscape = (s) => String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

  // Render an SVG image with one fill colour per word. SVG handles Arabic
  // bidi natively, so we don't have to fight the canvas about RTL ordering.
  const renderWordColoredSvg = (text, st, W, H) => {
    const words = String(text).split(/(\s+)/); // keep separators
    const colors = st.wordColors || [];
    const fontPx = Math.round((st.fontSize / 100) * H);
    const cx = (st.x / 100) * W;
    const cy = (st.y / 100) * H;
    const fontFamily = st.fontFamily || "Tajawal";
    const weight = st.bold ? "bold" : "normal";
    const italic = st.italic ? "italic" : "normal";
    const anchor = st.align === "left" ? "start" : st.align === "right" ? "end" : "middle";

    let wordIdx = 0;
    const tspans = words.map((w) => {
      if (/^\s+$/.test(w)) {
        // Preserve internal whitespace so words don't collapse together
        return `<tspan xml:space="preserve">${xmlEscape(w)}</tspan>`;
      }
      const c = colors[wordIdx] || st.color || "#ffffff";
      wordIdx++;
      return `<tspan fill="${xmlEscape(c)}">${xmlEscape(w)}</tspan>`;
    }).join("");

    const shadow = st.shadow
      ? `<filter id="ds" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="${(fontPx * 0.04).toFixed(2)}" dy="${(fontPx * 0.04).toFixed(2)}" stdDeviation="${(fontPx * 0.04).toFixed(2)}" flood-color="black" flood-opacity="0.55"/></filter>`
      : "";

    const transform = st.rotation ? `transform="rotate(${st.rotation} ${cx} ${cy})"` : "";
    const svgText = `<text x="${cx}" y="${cy}" font-family='"${xmlEscape(fontFamily)}", "Tajawal", sans-serif' font-size="${fontPx}" font-weight="${weight}" font-style="${italic}" text-anchor="${anchor}" dominant-baseline="central" ${transform} ${shadow ? 'filter="url(#ds)"' : ''}>${tspans}</text>`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${shadow ? `<defs>${shadow}</defs>` : ''}${svgText}</svg>`;
  };

  // True when this codepoint is a combining mark (Unicode category Mn):
  //   • All Arabic harakat: U+064B fathatan … U+0652 sukun
  //   • shadda U+0651, hamza above U+0654, hamza below U+0655
  //   • madda U+0653, superscript alef U+0670
  //   • Quranic recitation marks (U+06D6–U+06ED) and Extended-A diacritics
  //   • Any future combining mark the font supports
  // Using the Unicode property `Mn` instead of an enum of codepoints means
  // we don't have to maintain the list as Unicode grows.
  const isDiacritic = (ch) => /\p{Mn}/u.test(ch);

  // Split a string into RUNS where each run is a maximal sequence of chars
  // that share the same "type" (base letter vs. diacritic). Used both by
  // the canvas SVG renderer and the live preview.
  //
  // Important: the input is NFD-normalised so that precomposed Arabic
  // forms (أ, ؤ, ئ, إ, آ) decompose into base + combining mark, making
  // their hamza/madda eligible for separate colouring. Modern browsers
  // + fonts re-shape the decomposed form correctly at display time.
  const splitByDiacriticGroup = (text, baseColor, diacriticColor) => {
    const chars = Array.from(String(text).normalize("NFD"));
    const runs = [];
    let buf = "";
    let bufColor = null;
    for (const ch of chars) {
      const wantColor = isDiacritic(ch) ? diacriticColor : baseColor;
      if (bufColor === null) {
        buf = ch; bufColor = wantColor;
      } else if (wantColor === bufColor) {
        buf += ch;
      } else {
        runs.push({ text: buf, color: bufColor });
        buf = ch; bufColor = wantColor;
      }
    }
    if (buf) runs.push({ text: buf, color: bufColor });
    return runs;
  };

  // Single source of truth for grouping NFD-normalised text into runs of
  // same colour. Used by:
  //   • renderGlyphColoredSvg (canvas export, joins consecutive same-colour
  //     codepoints into one tspan to maximise shaping correctness)
  //   • the preview JSX (renders each codepoint as a separate span so the
  //     paint brush has per-glyph hit targets — see `getGlyphCodepoints`)
  const getGlyphRuns = (text, baseColor, glyphColors) => {
    const chars = Array.from(String(text || "").normalize("NFD"));
    const runs = [];
    let buf = "";
    let bufColor = null;
    chars.forEach((ch, i) => {
      const color = glyphColors?.[i] || baseColor;
      if (bufColor === null) { buf = ch; bufColor = color; }
      else if (color === bufColor) { buf += ch; }
      else { runs.push({ text: buf, color: bufColor }); buf = ch; bufColor = color; }
    });
    if (buf) runs.push({ text: buf, color: bufColor });
    return runs;
  };

  // Per-codepoint accessor — what the preview iterates when paint mode is
  // active. Returns parallel arrays so each codepoint can be tied to a
  // click handler that knows its index.
  const getGlyphCodepoints = (text) => Array.from(String(text || "").normalize("NFD"));

  // Render an SVG image with one colour per painted glyph. Consecutive
  // glyphs that share a colour are merged into a single tspan so the text
  // shaper sees as long a continuous run as possible (matters for Arabic
  // contextual forms — initial/medial/final glyph variants).
  const renderGlyphColoredSvg = (text, st, W, H) => {
    const fontPx = Math.round((st.fontSize / 100) * H);
    const cx = (st.x / 100) * W;
    const cy = (st.y / 100) * H;
    const fontFamily = st.fontFamily || "Tajawal";
    const weight = st.bold ? "bold" : "normal";
    const italic = st.italic ? "italic" : "normal";
    const anchor = st.align === "left" ? "start" : st.align === "right" ? "end" : "middle";

    const runs = getGlyphRuns(text, st.color || "#ffffff", st.glyphColors);
    const tspans = runs.map((r) =>
      `<tspan xml:space="preserve" fill="${xmlEscape(r.color)}">${xmlEscape(r.text)}</tspan>`
    ).join("");

    const shadowId = `dsG${Math.random().toString(36).slice(2, 7)}`;
    const shadow = st.shadow
      ? `<filter id="${shadowId}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="${(fontPx * 0.04).toFixed(2)}" dy="${(fontPx * 0.04).toFixed(2)}" stdDeviation="${(fontPx * 0.04).toFixed(2)}" flood-color="black" flood-opacity="0.55"/></filter>`
      : "";

    const transform = st.rotation ? `transform="rotate(${st.rotation} ${cx} ${cy})"` : "";
    const svgText = `<text x="${cx}" y="${cy}" font-family='"${xmlEscape(fontFamily)}", "Tajawal", sans-serif' font-size="${fontPx}" font-weight="${weight}" font-style="${italic}" text-anchor="${anchor}" dominant-baseline="central" ${transform} ${shadow ? `filter="url(#${shadowId})"` : ''}>${tspans}</text>`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${shadow ? `<defs>${shadow}</defs>` : ''}${svgText}</svg>`;
  };

  // Render an SVG image where base letters and diacritics use separate
  // fill colours. Mirrors `renderWordColoredSvg` but groups by codepoint
  // category rather than word boundaries.
  const renderDiacriticColoredSvg = (text, st, W, H) => {
    const fontPx = Math.round((st.fontSize / 100) * H);
    const cx = (st.x / 100) * W;
    const cy = (st.y / 100) * H;
    const fontFamily = st.fontFamily || "Tajawal";
    const weight = st.bold ? "bold" : "normal";
    const italic = st.italic ? "italic" : "normal";
    const anchor = st.align === "left" ? "start" : st.align === "right" ? "end" : "middle";

    const baseColor      = st.color          || "#ffffff";
    const diacriticColor = st.diacriticColor || "#dc2626";
    const runs = splitByDiacriticGroup(text, baseColor, diacriticColor);

    const tspans = runs.map((r) =>
      `<tspan xml:space="preserve" fill="${xmlEscape(r.color)}">${xmlEscape(r.text)}</tspan>`
    ).join("");

    // Unique filter id so multiple text overlays don't collide.
    const shadowId = `dsD${Math.random().toString(36).slice(2, 7)}`;
    const shadow = st.shadow
      ? `<filter id="${shadowId}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="${(fontPx * 0.04).toFixed(2)}" dy="${(fontPx * 0.04).toFixed(2)}" stdDeviation="${(fontPx * 0.04).toFixed(2)}" flood-color="black" flood-opacity="0.55"/></filter>`
      : "";

    const transform = st.rotation ? `transform="rotate(${st.rotation} ${cx} ${cy})"` : "";
    const svgText = `<text x="${cx}" y="${cy}" font-family='"${xmlEscape(fontFamily)}", "Tajawal", sans-serif' font-size="${fontPx}" font-weight="${weight}" font-style="${italic}" text-anchor="${anchor}" dominant-baseline="central" ${transform} ${shadow ? `filter="url(#${shadowId})"` : ''}>${tspans}</text>`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${shadow ? `<defs>${shadow}</defs>` : ''}${svgText}</svg>`;
  };

  // Pick an image file and return an object URL — used by "text image fill"
  const pickImageAsObjectUrl = async () => {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*,.heic,.heif";
      input.onchange = async () => {
        let file = input.files?.[0];
        if (!file) return resolve(null);
        try {
          if (isHeic(file)) file = await normalizeImageFile(file);
          resolve(URL.createObjectURL(file));
        } catch {
          resolve(null);
        }
      };
      input.click();
    });
  };

  // ── Logo upload ──────────────────────────────────────────────
  const handleLogo = async (e) => {
    let file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    setError("");
    try {
      if (isHeic(file)) file = await normalizeImageFile(file);
      const url = URL.createObjectURL(file);
      const img = await new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = url;
      });
      setLogo((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return {
          url,
          naturalW: img.naturalWidth,
          naturalH: img.naturalHeight,
          x: 88,       // % — top-right by default (like the Daaem logo in your example)
          y: 8,
          width: 15,   // % of card width
          color: "",   // empty = original colours
          opacity: 1,
        };
      });
    } catch (err) {
      setError((isRtl ? "تعذّر رفع اللوقو: " : "Logo upload failed: ") + (err?.message || err));
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const updateLogo = (patch) => setLogo((l) => (l ? { ...l, ...patch } : l));

  // Drag the logo on the preview
  useEffect(() => {
    const onMove = (e) => {
      if (!stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const clampedX = Math.max(0, Math.min(100, x));
      const clampedY = Math.max(0, Math.min(100, y));
      // Screen-fit corner drag wins over everything — move just that one corner.
      if (draggingCornerRef.current) {
        const { decoId, idx } = draggingCornerRef.current;
        const fx = Math.max(-0.1, Math.min(1.1, x / 100));
        const fy = Math.max(-0.1, Math.min(1.1, y / 100));
        setDecorations((arr) => arr.map((d) => {
          if (d.id !== decoId || !d.screenFit) return d;
          const corners = d.screenFit.corners.map((c, i) => i === idx ? { x: fx, y: fy } : c);
          return { ...d, screenFit: { ...d.screenFit, corners } };
        }));
        return;
      }
      // Template pan — drag distance (in % of stage) added to the offset at
      // drag start. Tracked separately from overlays so it survives clicks
      // outside the stage box (clamping would feel "sticky").
      if (draggingTemplateRef.current) {
        const start = draggingTemplateRef.current;
        const dxPct = ((e.clientX - start.mouseX) / rect.width) * 100;
        const dyPct = ((e.clientY - start.mouseY) / rect.height) * 100;
        setTemplateOffsetX(start.ox + dxPct);
        setTemplateOffsetY(start.oy + dyPct);
        return;
      }
      if (draggingLogoRef.current) {
        setLogo((l) => l ? { ...l, x: clampedX, y: clampedY } : l);
      } else if (draggingHeadingRef.current) {
        const hid = draggingHeadingRef.current;
        setHeadings((arr) => arr.map((h) => h.id === hid ? { ...h, x: clampedX, y: clampedY } : h));
      } else if (draggingDecorationRef.current) {
        const did = draggingDecorationRef.current;
        setDecorations((arr) => arr.map((d) => d.id === did ? { ...d, x: clampedX, y: clampedY } : d));
      } else if (draggingStockRef.current) {
        const sid = draggingStockRef.current;
        setStockObjects((arr) => arr.map((o) => o.id === sid ? { ...o, x: clampedX, y: clampedY } : o));
      } else if (draggingSocialRef.current) {
        setSocialBox((s) => ({ ...s, x: clampedX, y: clampedY }));
      }
    };
    const onUp = () => {
      draggingLogoRef.current = false;
      draggingHeadingRef.current = null;
      draggingDecorationRef.current = null;
      draggingCornerRef.current = null;
      draggingTemplateRef.current = null;
      draggingStockRef.current = null;
      draggingSocialRef.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // ── Template upload ──────────────────────────────────────────
  const handleTemplate = async (e) => {
    let file = e.target.files[0];
    if (!file) return;
    setUploadingTemplate(true);
    setError("");
    try {
      if (isHeic(file)) file = await normalizeImageFile(file);
      const url = URL.createObjectURL(file);
      const img = await new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = url;
      });
      setTemplateUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
      setTemplateW(img.naturalWidth);
      setTemplateH(img.naturalHeight);
      // Fresh template → fresh framing. A leftover zoom/offset from the
      // previous photo almost never matches the new one.
      setTemplateZoom(1);
      setTemplateOffsetX(0);
      setTemplateOffsetY(0);
    } catch (err) {
      setError((isRtl ? "تعذّر رفع القالب: " : "Template upload failed: ") + (err?.message || err));
    } finally {
      setUploadingTemplate(false);
      e.target.value = "";
    }
  };

  // ── Names upload (Excel / CSV) ───────────────────────────────
  const handleNames = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError("");
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      // Read every cell value as raw strings, no header assumption — supports a
      // simple one-column list or a Name column in a multi-column sheet.
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: "" });

      // Find the column that looks like names: header "name"/"اسم", otherwise first non-empty column
      let nameCol = 0;
      let startRow = 0;
      const firstRow = rows[0] || [];
      const headerIdx = firstRow.findIndex((c) => {
        const v = String(c || "").trim().toLowerCase();
        return v === "name" || v === "names" || v === "اسم" || v === "الاسم" || v === "الأسماء";
      });
      if (headerIdx >= 0) { nameCol = headerIdx; startRow = 1; }

      const extracted = rows.slice(startRow)
        .map((r) => String((r[nameCol] ?? "")).trim())
        .filter(Boolean);

      if (extracted.length === 0) {
        setError(isRtl ? "لم يتم العثور على أسماء في الملف" : "No names found in the file");
        return;
      }
      setNames(extracted);
      setPreviewIdx(0);
    } catch (err) {
      setError((isRtl ? "تعذّر قراءة الملف: " : "File parse failed: ") + (err?.message || err));
    } finally {
      e.target.value = "";
    }
  };

  // ── Drag the name overlay on the preview to position it ──────
  useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current || !stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setStyle((s) => ({ ...s, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }));
    };
    const onUp = () => { draggingRef.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // ── Render one card to a canvas blob ─────────────────────────
  // Reused for the preview download AND batch ZIP generation.
  // No template? We paint a solid / gradient background instead — lets users
  // build a card from scratch using just stock illustrations + text.
  const renderCard = useCallback(async (name) => {
    // Nothing to draw at all → bail.
    if (!templateUrl && stockObjects.length === 0 && headings.length === 0 && !logo) return null;
    // Template is optional now. If it exists, load it; otherwise we'll fall
    // back to the background-fill branch below.
    let img = null;
    let imgW = 0, imgH = 0;
    if (templateUrl) {
      img = await new Promise((res, rej) => {
        const im = new Image();
        im.crossOrigin = "anonymous";
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = templateUrl;
      });
      imgW = img.naturalWidth;
      imgH = img.naturalHeight;
    } else {
      // No template — fall back to the platform size, or a sensible square
      // when neither is set. The user can change either at any time.
      imgW = outputSize?.width  || 1080;
      imgH = outputSize?.height || 1080;
    }

    // Output canvas — chosen platform size, or fall back to the template's native size.
    // We render INTERNALLY at `superSample`?� this size (SSAA), then downsample the
    // result before encoding. Every dimension below is computed from W/H as a %, so
    // multiplying W/H by the scale factor automatically scales text, decorations,
    // logo, etc. with no per-element changes needed.
    const baseW = outputSize?.width  || imgW;
    const baseH = outputSize?.height || imgH;
    const scale = Math.max(1, superSample | 0);
    const W = baseW * scale;
    const H = baseH * scale;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    // Use the browser's best resampler when scaling images — keeps decoration
    // edges crisp and prevents jaggy text strokes during downscale.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // ── Background pass ─────────────────────────────────────────────────
    // Two paths depending on whether a template image was uploaded:
    //   • template → fit it (cover/contain/fill) then apply user reframe
    //   • no template → paint bgMode (solid or gradient) as the canvas base
    if (img) {
      let baseDw, baseDh, baseDx, baseDy;
      if (fitMode === "fill" || !outputSize) {
        baseDw = W; baseDh = H; baseDx = 0; baseDy = 0;
      } else {
        const sCover   = Math.max(W / imgW, H / imgH);
        const sContain = Math.min(W / imgW, H / imgH);
        const sFit     = fitMode === "cover" ? sCover : sContain;
        baseDw = imgW * sFit;
        baseDh = imgH * sFit;
        baseDx = (W - baseDw) / 2;
        baseDy = (H - baseDh) / 2;
        if (fitMode === "contain") {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, W, H);
        }
      }
      // User reframe: zoom ?� base, recenter, then shift by offset% of card.
      // This matches the CSS preview `translate(...) scale(...)` (translate%
      // is computed against the original box, so the visible offset is offset%
      // of card width regardless of zoom).
      const zoom = templateZoom || 1;
      const dw = baseDw * zoom;
      const dh = baseDh * zoom;
      const dx = baseDx - (dw - baseDw) / 2 + (templateOffsetX / 100) * W;
      const dy = baseDy - (dh - baseDh) / 2 + (templateOffsetY / 100) * H;
      ctx.drawImage(img, dx, dy, dw, dh);
    } else if (bgMode === "gradient") {
      // Two-stop linear gradient — endpoints derived from the angle so 0ذ
      // is top→bottom and angles rotate clockwise the same way CSS does.
      const a = (bgGradAngle - 90) * Math.PI / 180;
      const halfW = W / 2, halfH = H / 2;
      const grad = ctx.createLinearGradient(
        halfW - Math.cos(a) * halfW, halfH - Math.sin(a) * halfH,
        halfW + Math.cos(a) * halfW, halfH + Math.sin(a) * halfH,
      );
      grad.addColorStop(0, bgGrad1);
      grad.addColorStop(1, bgGrad2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.fillStyle = bgSolid;
      ctx.fillRect(0, 0, W, H);
    }

    // ── Stock illustrations (background-layer art) ──────────────────────
    // Drawn AFTER the background but BEFORE decorations / text so that
    // user-added scenes (sheep on a sand background, etc.) read as part of
    // the artwork rather than competing with the foreground text.
    for (const obj of stockObjects) {
      const def = ALL_STOCK_DEFS.find((s) => s.id === obj.typeId);
      if (!def) continue;
      try {
        const dw = (obj.width / 100) * W;
        const dh = dw / (def.aspect || 1);
        const dx = (obj.x / 100) * W - dw / 2;
        const dy = (obj.y / 100) * H - dh / 2;

        ctx.save();
        ctx.globalAlpha = obj.opacity ?? 1;
        if (obj.rotation) {
          const cx = dx + dw / 2;
          const cy = dy + dh / 2;
          ctx.translate(cx, cy);
          ctx.rotate((obj.rotation * Math.PI) / 180);
          ctx.translate(-cx, -cy);
        }

        if (def.type === "text") {
          // Letter shapes — render the Unicode glyph through ctx.fillText so
          // the page-loaded Arabic web font (Aref Ruqaa, Amiri Quran, etc.)
          // actually renders. The SVG → Image pipeline below can't see web
          // fonts; canvas API can, because the page's CSS loaded them.
          const color = obj.colors[def.regions[0].key] || def.defaultColors[def.regions[0].key];
          const fontPx = dh * 0.92;
          ctx.fillStyle = color;
          ctx.font = `bold ${fontPx}px ${def.font}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(def.letter, dx + dw / 2, dy + dh / 2);
        } else {
          // SVG-art entries — serialize their svg(colors) string, decode via
          // Image, and blit. Works for paths but not for web-font text.
          const svgStr = def.svg(obj.colors);
          const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          try {
            const objImg = await new Promise((res, rej) => {
              const im = new Image();
              im.onload = () => res(im);
              im.onerror = rej;
              im.src = url;
            });
            ctx.drawImage(objImg, dx, dy, dw, dh);
          } finally { URL.revokeObjectURL(url); }
        }

        ctx.restore();
      } catch { /* skip on individual failure */ }
    }

    // Draw the logo overlay (with optional recolor) BEFORE the name so the name
    // sits on top if they overlap
    if (logo?.url) {
      try {
        const logoImg = await new Promise((res, rej) => {
          const im = new Image();
          im.crossOrigin = "anonymous";
          im.onload = () => res(im);
          im.onerror = rej;
          im.src = logo.url;
        });
        const lAspect = logo.naturalW / logo.naturalH;
        const lw = (logo.width / 100) * W;
        const lh = lw / lAspect;
        const lx = (logo.x / 100) * W - lw / 2;
        const ly = (logo.y / 100) * H - lh / 2;

        ctx.save();
        ctx.globalAlpha = logo.opacity ?? 1;

        if (logo.color) {
          // Recolor: draw the logo on an offscreen canvas, then keep its alpha
          // mask while flooding it with the chosen colour.
          const off = document.createElement("canvas");
          off.width = Math.max(1, Math.round(lw));
          off.height = Math.max(1, Math.round(lh));
          const oc = off.getContext("2d");
          oc.imageSmoothingEnabled = true;
          oc.imageSmoothingQuality = "high";
          oc.drawImage(logoImg, 0, 0, off.width, off.height);
          oc.globalCompositeOperation = "source-in";
          oc.fillStyle = logo.color;
          oc.fillRect(0, 0, off.width, off.height);
          ctx.drawImage(off, lx, ly, lw, lh);
        } else {
          ctx.drawImage(logoImg, lx, ly, lw, lh);
        }
        ctx.restore();
      } catch { /* logo render failed — skip */ }
    }

    // Draw the decorations (calligraphy / ornaments) — rendered BEFORE text
    // so the calligraphy sits behind the name (typical layout). Each supports
    // optional recolour just like the logo, plus per-instance crop.
    for (const deco of decorations) {
      try {
        // paintMap always wins when present — same priority as the preview
        // so what the user sees is exactly what gets exported.
        const decoSrc = deco.paintMap || deco.url;
        const decoImg = await new Promise((res, rej) => {
          const im = new Image();
          im.crossOrigin = "anonymous";
          im.onload = () => res(im);
          im.onerror = rej;
          im.src = decoSrc;
        });
        // Screen-fit: warp the image onto the 4-corner quad (perspective). This
        // path ignores x/width/crop/recolor — the quad fully defines placement.
        if (deco.screenFit?.enabled && Array.isArray(deco.screenFit.corners)) {
          ctx.save();
          ctx.globalAlpha = deco.opacity ?? 1;
          const dstPx = deco.screenFit.corners.map((c) => ({ x: c.x * W, y: c.y * H }));
          drawImagePerspective(ctx, decoImg, dstPx);
          ctx.restore();
          continue;
        }

        const aspect = deco.naturalW / deco.naturalH;
        const dw = (deco.width / 100) * W;
        const dh = dw / aspect;
        const dx = (deco.x / 100) * W - dw / 2;
        const dy = (deco.y / 100) * H - dh / 2;

        ctx.save();
        ctx.globalAlpha = deco.opacity ?? 1;
        if (deco.rotation) {
          const cx = dx + dw / 2;
          const cy = dy + dh / 2;
          ctx.translate(cx, cy);
          ctx.rotate((deco.rotation * Math.PI) / 180);
          ctx.translate(-cx, -cy);
        }

        // Apply crop — clip to the visible rectangle so cropped portion stays hidden
        const ct = deco.cropTop || 0, cr = deco.cropRight || 0, cb = deco.cropBottom || 0, cl = deco.cropLeft || 0;
        if (ct + cr + cb + cl > 0) {
          const cx0 = dx + (cl / 100) * dw;
          const cy0 = dy + (ct / 100) * dh;
          const cw = dw * (1 - (cl + cr) / 100);
          const ch = dh * (1 - (ct + cb) / 100);
          ctx.beginPath();
          ctx.rect(cx0, cy0, cw, ch);
          ctx.clip();
        }

        // When paintMap is present it already encodes the final per-pixel
        // colours, so skip the recolor branch and draw paintMap directly.
        if (!deco.paintMap && (deco.useMultiColor || deco.useGradient || deco.color)) {
          // Recolor — render onto an offscreen canvas, keep the original alpha
          // shape, then flood with the chosen fill (solid / 2-colour gradient /
          // multi-zone stepped gradient).
          const off = document.createElement("canvas");
          off.width = Math.max(1, Math.round(dw));
          off.height = Math.max(1, Math.round(dh));
          const oc = off.getContext("2d");
          oc.imageSmoothingEnabled = true;
          oc.imageSmoothingQuality = "high";
          oc.drawImage(decoImg, 0, 0, off.width, off.height);
          oc.globalCompositeOperation = "source-in";

          // Helper: angle (deg, CSS convention) → gradient endpoints
          const endpointsFor = (angleDeg) => {
            const a = (angleDeg - 90) * Math.PI / 180;
            const halfW = off.width / 2;
            const halfH = off.height / 2;
            return [
              halfW - Math.cos(a) * halfW,
              halfH - Math.sin(a) * halfH,
              halfW + Math.cos(a) * halfW,
              halfH + Math.sin(a) * halfH,
            ];
          };

          if (deco.useMultiColor) {
            const zones = [...(deco.colorZones || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
            if (zones.length > 0 && (zones[0].position ?? 0) > 0) {
              zones.unshift({ ...zones[0], position: 0 });
            }
            const [x1, y1, x2, y2] = endpointsFor(deco.multiColorAngle ?? 90);
            const grad = oc.createLinearGradient(x1, y1, x2, y2);
            for (let i = 0; i < zones.length; i++) {
              const start = (zones[i].position ?? 0) / 100;
              const end = i + 1 < zones.length ? (zones[i + 1].position ?? 100) / 100 : 1;
              // Duplicate each stop at both edges of its band → hard transitions
              grad.addColorStop(start, zones[i].color);
              grad.addColorStop(Math.max(start, end - 0.0001), zones[i].color);
            }
            oc.fillStyle = grad;
          } else if (deco.useGradient) {
            const [x1, y1, x2, y2] = endpointsFor(deco.gradientAngle ?? 90);
            const grad = oc.createLinearGradient(x1, y1, x2, y2);
            grad.addColorStop(0, deco.color || "#d4af37");
            grad.addColorStop(1, deco.gradientColor2 || "#fde047");
            oc.fillStyle = grad;
          } else {
            oc.fillStyle = deco.color;
          }
          oc.fillRect(0, 0, off.width, off.height);
          ctx.drawImage(off, dx, dy, dw, dh);
        } else {
          ctx.drawImage(decoImg, dx, dy, dw, dh);
        }
        ctx.restore();
      } catch { /* skip decoration on failure */ }
    }

    // Helper — load an image once and cache
    const imgCache = new Map();
    const loadImg = (url) => {
      if (imgCache.has(url)) return imgCache.get(url);
      const p = new Promise((res, rej) => {
        const im = new Image();
        im.crossOrigin = "anonymous";
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = url;
      });
      imgCache.set(url, p);
      return p;
    };

    // Break text into rendered lines: respect explicit \n, and word-wrap when
    // `textWidth` (% of card width) is set and a line exceeds that width.
    const wrapLines = (text, st, fontPx) => {
      const explicit = String(text).split("\n");
      const maxWidthPx = st.textWidth > 0 ? (st.textWidth / 100) * W : Infinity;
      if (maxWidthPx === Infinity) return explicit;

      // Measure with the current ctx font (caller must set it first)
      const lines = [];
      for (const para of explicit) {
        const words = para.split(/(\s+)/);
        let current = "";
        for (const w of words) {
          const candidate = current + w;
          if (ctx.measureText(candidate).width <= maxWidthPx || !current) {
            current = candidate;
          } else {
            lines.push(current.trimEnd());
            current = w.trimStart();
          }
        }
        if (current) lines.push(current);
        if (!para) lines.push("");
      }
      return lines;
    };

    // ── Text-decoration helpers ─────────────────────────────────────────
    // Shared by drawTextBg + drawOrnament + the outline path in drawText.
    // Computes the rendered bounding box of `text` under `st` and leaves
    // ctx.font set, so callers can immediately reuse measurements.
    const computeTextBBox = (text, st) => {
      const fontPx = Math.round((st.fontSize / 100) * H);
      const weight = st.bold ? "bold " : "";
      const italic = st.italic ? "italic " : "";
      const fontStr = `${italic}${weight}${fontPx}px "${st.fontFamily}", "Tajawal", sans-serif`;
      ctx.font = fontStr;
      ctx.textAlign = st.align || "center";
      ctx.textBaseline = "middle";
      const lines = wrapLines(text, st, fontPx);
      const lh = fontPx * (st.lineHeight || 1.2);
      const totalH = lines.length * lh;
      let widestLine = "";
      for (const l of lines) {
        if (ctx.measureText(l).width > ctx.measureText(widestLine).width) widestLine = l;
      }
      const tw = ctx.measureText(widestLine).width || fontPx * 4;
      const th = totalH;
      const cx = (st.x / 100) * W;
      const cy = (st.y / 100) * H;
      const bx = st.align === "left" ? cx
              : st.align === "right" ? cx - tw
              : cx - tw / 2;
      const by = cy - th / 2;
      return { cx, cy, bx, by, tw, th, fontPx };
    };

    // Round-rect path builder — used by every bg shape that has rounded corners.
    const roundRectPath = (x, y, w, h, r) => {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y,     x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x,     y + h, rr);
      ctx.arcTo(x,     y + h, x,     y,     rr);
      ctx.arcTo(x,     y,     x + w, y,     rr);
      ctx.closePath();
    };

    // Draws a coloured shape *behind* the text. Shapes share the same
    // pad-in-percent-of-fontSize sizing so swapping shapes doesn't change
    // the visible size of the badge.
    const drawTextBg = (st, bx, by, bw, bh, fontPx) => {
      if (!st.textBgShape || st.textBgShape === "none") return;
      const padPx = ((st.textBgPadding ?? 30) / 100) * fontPx;
      const ex = bx - padPx;
      const ey = by - padPx;
      const ew = bw + 2 * padPx;
      const eh = bh + 2 * padPx;

      ctx.save();
      ctx.globalAlpha = st.textBgOpacity ?? 1;
      // Rotation around the text centre so the badge follows the text.
      if (st.rotation) {
        const cxr = bx + bw / 2, cyr = by + bh / 2;
        ctx.translate(cxr, cyr);
        ctx.rotate((st.rotation * Math.PI) / 180);
        ctx.translate(-cxr, -cyr);
      }
      ctx.fillStyle = st.textBgColor || "#1e293b";

      switch (st.textBgShape) {
        case "pill":
          roundRectPath(ex, ey, ew, eh, eh / 2);
          ctx.fill();
          break;
        case "tag":
          roundRectPath(ex, ey, ew, eh, fontPx * 0.25);
          ctx.fill();
          break;
        case "circle":
          ctx.beginPath();
          ctx.ellipse(ex + ew / 2, ey + eh / 2, (ew / 2) * 1.12, (eh / 2) * 1.3, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "ribbon": {
          // Banner with chevron notches on left + right edges.
          const v = eh / 3.2;
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex + ew, ey);
          ctx.lineTo(ex + ew - v, ey + eh / 2);
          ctx.lineTo(ex + ew, ey + eh);
          ctx.lineTo(ex, ey + eh);
          ctx.lineTo(ex + v, ey + eh / 2);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case "frame":
          // Outline only — text sits inside an empty border.
          ctx.strokeStyle = st.textBgColor || "#d4af37";
          ctx.lineWidth = Math.max(2, fontPx * 0.05);
          roundRectPath(ex, ey, ew, eh, fontPx * 0.18);
          ctx.stroke();
          break;
        default: break;
      }
      ctx.restore();
    };

    // Renders an ornament SVG (from TEXT_ORNAMENTS) wrapping the text bbox.
    // The ornament's 100?�40 reference grid is scaled so its "text area" (the
    // middle region after subtracting padTop/padBottom etc.) matches the real
    // text bbox — so brackets sit at the right place regardless of font size.
    const drawOrnament = async (ornamentId, color, bx, by, bw, bh, rotation) => {
      const o = TEXT_ORNAMENTS[ornamentId];
      if (!o) return;
      const padTop    = o.padTop    || 0;
      const padBottom = o.padBottom || 0;
      const padLeft   = o.padLeft   || 0;
      const padRight  = o.padRight  || 0;
      const gridTextW = 100 - padLeft - padRight;
      const gridTextH = 40  - padTop  - padBottom;
      if (gridTextW <= 0 || gridTextH <= 0) return;

      const scaleX = bw / gridTextW;
      const scaleY = bh / gridTextH;
      const ornW = 100 * scaleX;
      const ornH = 40  * scaleY;
      const ornX = bx - padLeft * scaleX;
      const ornY = by - padTop  * scaleY;

      const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40">${o.svg(color)}</svg>`;
      const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      try {
        const img = await loadImg(url);
        ctx.save();
        // Match the text's own rotation so brackets stay aligned with rotated text.
        if (rotation) {
          const cxr = bx + bw / 2, cyr = by + bh / 2;
          ctx.translate(cxr, cyr);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.translate(-cxr, -cyr);
        }
        ctx.drawImage(img, ornX, ornY, ornW, ornH);
        ctx.restore();
      } finally { URL.revokeObjectURL(url); }
    };

    // Draw a single text overlay (heading or name). Supports:
    //   - solid colour
    //   - linear gradient between two colours
    //   - image fill: the text glyphs become a window onto an uploaded image
    //   - per-word colours: each space-separated word gets its own colour
    //   - multi-line: explicit \n and/or word-wrap at textWidth
    //   - outline (strokeText) — only on the solid/gradient path; per-word and
    //     image-fill keep their existing behaviour for simplicity
    //   - glow — supersedes the legacy `shadow` when on
    const drawText = async (text, st) => {
      if (!text) return;

      // ── Per-word colours: render via SVG so Arabic bidi works correctly ──
      if (st.useWordColors && (st.wordColors?.length || 0) > 0) {
        try {
          const svg = renderWordColoredSvg(text, st, W, H);
          const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          try {
            const img = await loadImg(url);
            ctx.drawImage(img, 0, 0);
          } finally { URL.revokeObjectURL(url); }
          return;
        } catch { /* fall through to standard rendering */ }
      }

      // ── Glyph paint: per-codepoint colours from the paint-by-click tool ──
      // Takes priority over diacritic auto-grouping because it represents
      // an explicit user choice. Only kicks in when at least one glyph has
      // been painted.
      const hasPaintedGlyph =
        st.glyphColors && Object.keys(st.glyphColors).length > 0;
      if (hasPaintedGlyph) {
        try {
          const svg = renderGlyphColoredSvg(text, st, W, H);
          const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          try {
            const img = await loadImg(url);
            ctx.drawImage(img, 0, 0);
          } finally { URL.revokeObjectURL(url); }
          return;
        } catch { /* fall through to standard rendering */ }
      }

      // ── Diacritic colours: base letters + harakat in separate hues ──
      // Only applies when per-word colours aren't already on (they're a
      // coarser grouping; we let the user pick one mode at a time).
      if (st.useDiacriticColor) {
        try {
          const svg = renderDiacriticColoredSvg(text, st, W, H);
          const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          try {
            const img = await loadImg(url);
            ctx.drawImage(img, 0, 0);
          } finally { URL.revokeObjectURL(url); }
          return;
        } catch { /* fall through to standard rendering */ }
      }

      const fontPx = Math.round((st.fontSize / 100) * H);
      const weight = st.bold ? "bold " : "";
      const italic = st.italic ? "italic " : "";
      const fontStr = `${italic}${weight}${fontPx}px "${st.fontFamily}", "Tajawal", sans-serif`;
      ctx.font = fontStr;
      ctx.textAlign = st.align || "center";
      ctx.textBaseline = "middle";
      if (st.letterSpacing) ctx.letterSpacing = `${st.letterSpacing}px`;

      const cx = (st.x / 100) * W;
      const cy = (st.y / 100) * H;

      // ── Image-fill (text becomes a window onto an image) ───────────────
      if (st.fillImage) {
        try {
          const fillImg = await loadImg(st.fillImage);
          const off = document.createElement("canvas");
          off.width = W;
          off.height = H;
          const oc = off.getContext("2d");
          oc.imageSmoothingEnabled = true;
          oc.imageSmoothingQuality = "high";
          oc.font = fontStr;
          oc.textAlign = st.align || "center";
          oc.textBaseline = "middle";
          if (st.letterSpacing) oc.letterSpacing = `${st.letterSpacing}px`;

          // Apply the same rotation to the offscreen so the masked result aligns
          if (st.rotation) {
            oc.translate(cx, cy);
            oc.rotate((st.rotation * Math.PI) / 180);
            oc.translate(-cx, -cy);
          }

          // Compute the text's bounding box so we can "cover" the image inside it
          const metrics = oc.measureText(text);
          const tw = metrics.width || fontPx * 4;
          const th = fontPx;
          const txStart = st.align === "right" ? (cx - tw)
                        : st.align === "left"  ? cx
                        :                        cx - tw / 2;
          const tyStart = cy - th / 2;

          // Scale the fill image with "cover" semantics so it never letterboxes
          const ia = fillImg.naturalWidth / fillImg.naturalHeight;
          const aa = tw / th;
          let dw, dh;
          if (ia > aa) { dh = th; dw = dh * ia; }
          else         { dw = tw; dh = dw / ia; }
          const dx = txStart + (tw - dw) / 2;
          const dy = tyStart + (th - dh) / 2;
          oc.drawImage(fillImg, dx, dy, dw, dh);

          // Clip the image to the text glyph shape
          oc.globalCompositeOperation = "destination-in";
          oc.fillStyle = "#ffffff";
          oc.fillText(text, cx, cy);

          // Composite onto the main canvas — preserve shadow as a separate paint
          ctx.save();
          if (st.shadow) {
            ctx.shadowColor = "rgba(0,0,0,0.55)";
            ctx.shadowBlur = Math.max(2, fontPx * 0.08);
            ctx.shadowOffsetX = Math.max(1, fontPx * 0.04);
            ctx.shadowOffsetY = Math.max(1, fontPx * 0.04);
          }
          ctx.drawImage(off, 0, 0);
          ctx.restore();
          return;
        } catch { /* fall through to colour/gradient if the image fails to load */ }
      }

      // ── Solid colour or linear gradient ────────────────────────────────
      // For gradients we need the text bounds — compute against the widest line.
      const lines = wrapLines(text, st, fontPx);
      const lh = fontPx * (st.lineHeight || 1.2);
      const totalH = lines.length * lh;
      const firstLineY = cy - totalH / 2 + lh / 2;

      let widestLine = "";
      for (const l of lines) {
        if (ctx.measureText(l).width > ctx.measureText(widestLine).width) widestLine = l;
      }

      let fillStyle = st.color;
      if (st.useGradient) {
        const metrics = ctx.measureText(widestLine);
        const tw = metrics.width || fontPx * 4;
        const th = totalH;
        const rad = ((st.gradientAngle || 0) - 90) * Math.PI / 180;
        const ddx = Math.cos(rad) * tw / 2;
        const ddy = Math.sin(rad) * th / 2;
        const grad = ctx.createLinearGradient(cx - ddx, cy - ddy, cx + ddx, cy + ddy);
        grad.addColorStop(0, st.color);
        grad.addColorStop(1, st.gradientColor2 || "#ec4899");
        fillStyle = grad;
      }
      ctx.fillStyle = fillStyle;

      ctx.save();
      if (st.rotation) {
        ctx.translate(cx, cy);
        ctx.rotate((st.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }
      // Glow takes precedence over the legacy shadow — they share the same
      // canvas shadow* properties so we pick one or the other, never both.
      if (st.useGlow) {
        ctx.shadowColor = st.glowColor || "#ffd700";
        ctx.shadowBlur  = ((st.glowSize ?? 12) / 100) * fontPx;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      } else if (st.shadow) {
        ctx.shadowColor = "rgba(0,0,0,0.55)";
        ctx.shadowBlur = Math.max(2, fontPx * 0.08);
        ctx.shadowOffsetX = Math.max(1, fontPx * 0.04);
        ctx.shadowOffsetY = Math.max(1, fontPx * 0.04);
      }
      // Outline pass — drawn BEFORE the fill so the fill sits cleanly on top.
      // Both stroke and fill receive the glow / shadow, which is the desired
      // visual (the glow wraps the outlined silhouette, not just the fill).
      if (st.useOutline) {
        ctx.strokeStyle = st.outlineColor || "#000000";
        ctx.lineWidth   = ((st.outlineWidth ?? 3) / 100) * fontPx;
        ctx.lineJoin    = "round";
        ctx.miterLimit  = 2;
        for (let i = 0; i < lines.length; i++) {
          ctx.strokeText(lines[i], cx, firstLineY + i * lh);
        }
      }
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], cx, firstLineY + i * lh);
      }
      ctx.restore();
    };

    // Headings first (so the recipient name renders on top if they overlap).
    // Render order per item:
    //   1. Background shape   �? under everything
    //   2. Text (with outline + glow)
    //   3. Ornament SVG       �? on top of text
    for (const h of headings) {
      if (!h.text) continue;
      const bbox = computeTextBBox(h.text, h);
      drawTextBg(h, bbox.bx, bbox.by, bbox.tw, bbox.th, bbox.fontPx);
      await drawText(h.text, h);
      if (h.ornament && h.ornament !== "none") {
        await drawOrnament(h.ornament, h.ornamentColor || h.color || "#d4af37",
                            bbox.bx, bbox.by, bbox.tw, bbox.th, h.rotation);
      }
    }
    // Recipient name (only when there's actually one — anonymous cards skip).
    if (name) {
      const nameBBox = computeTextBBox(name, style);
      drawTextBg(style, nameBBox.bx, nameBBox.by, nameBBox.tw, nameBBox.th, nameBBox.fontPx);
      await drawText(name, style);
      if (style.ornament && style.ornament !== "none") {
        await drawOrnament(style.ornament, style.ornamentColor || style.color || "#d4af37",
                            nameBBox.bx, nameBBox.by, nameBBox.tw, nameBBox.th, style.rotation);
      }
    } else {
      // Anonymous card — still call drawText so it bails cleanly (was the
      // legacy behaviour; preserved for any side effects callers rely on).
      await drawText(name, style);
    }

    // ── Social contact box ──────────────────────────────────────────────
    // Drawn LAST so it's always on top of decorations, text, and stock
    // shapes — contact info is the "actionable" content; you don't want
    // it hidden by ornament. Empty-items / hidden → no-op.
    if (socialBox.show && socialBox.items.length > 0) {
      try {
        const sb = socialBox;
        const iconPx   = (sb.iconSize / 100) * W;
        const fontPx   = iconPx * 0.55;
        const spacing  = (sb.spacing  / 100) * iconPx;
        const padding  = (sb.bgPadding / 100) * iconPx;
        const radius   = (sb.bgRadius  / 100) * iconPx;
        const labelGap = iconPx * 0.35;

        // Set font once so subsequent ctx.measureText calls use it.
        ctx.font = `bold ${fontPx}px "${sb.fontFamily}", sans-serif`;
        ctx.textBaseline = "middle";

        // Measure every label so we can centre-align icons in a column.
        // Only show chips with a handle (unless the user just wants the icon
        // alone — handled by the "showLabels" toggle, not by layout).
        const items = sb.items.filter((it) => it.handle.trim() || !sb.showLabels);
        if (items.length === 0) throw new Error("no visible items");
        const labels = items.map((it) => {
          const p = findPlatform(it.platform);
          return { item: it, platform: p, labelW: sb.showLabels && it.handle ? ctx.measureText(it.handle).width : 0 };
        });
        const maxLabelW = Math.max(...labels.map((l) => l.labelW), 0);

        // Per-chip width when label is shown next to the icon:
        //   chip = iconPx + labelGap + that-chip's-label-width
        // For grid + horizontal we use the WIDEST chip so all cells line up.
        const chipsHaveLabels = sb.showLabels && maxLabelW > 0;
        const chipWidth = iconPx + (chipsHaveLabels ? labelGap + maxLabelW : 0);

        // Box dimensions per layout. Each branch sets totalW / totalH and a
        // function `placeItem(i)` returning the icon's top-left within the box.
        let totalW, totalH, placeItem;
        if (sb.layout === "horizontal") {
          // Chips arranged left→right; each chip = icon + (optional) label.
          // Labels stay visible — the user asked for handles in this mode.
          totalW = items.length * chipWidth + (items.length - 1) * spacing + 2 * padding;
          totalH = iconPx + 2 * padding;
          placeItem = (i) => {
            const ix = padding + i * (chipWidth + spacing);
            return { ix, iy: padding, lx: ix + iconPx + labelGap };
          };
        } else if (sb.layout === "grid") {
          // 2-column grid of icon + label cells.
          const cols = 2;
          const rows = Math.ceil(items.length / cols);
          totalW = cols * chipWidth + (cols - 1) * spacing + 2 * padding;
          totalH = rows * iconPx + (rows - 1) * spacing + 2 * padding;
          placeItem = (i) => {
            const col = i % cols, row = Math.floor(i / cols);
            const ix = padding + col * (chipWidth + spacing);
            const iy = padding + row * (iconPx + spacing);
            return { ix, iy, lx: ix + iconPx + labelGap };
          };
        } else {
          // Default: vertical column with labels next to icons.
          totalW = chipWidth + 2 * padding;
          totalH = items.length * iconPx + (items.length - 1) * spacing + 2 * padding;
          placeItem = (i) => {
            const ix = padding;
            const iy = padding + i * (iconPx + spacing);
            return { ix, iy, lx: ix + iconPx + labelGap };
          };
        }

        // Centre the box at (sb.x%, sb.y%).
        const boxX = (sb.x / 100) * W - totalW / 2;
        const boxY = (sb.y / 100) * H - totalH / 2;

        ctx.save();
        if (sb.rotation) {
          const cx = boxX + totalW / 2, cy = boxY + totalH / 2;
          ctx.translate(cx, cy);
          ctx.rotate((sb.rotation * Math.PI) / 180);
          ctx.translate(-cx, -cy);
        }

        // Background rounded rect — drawn first so chips sit on top.
        // Gradient mode uses a CanvasGradient (no opacity slider — bake
        // transparency into the stops if needed). Solid mode keeps the
        // opacity slider for partial-tint use cases.
        if (sb.bgEnabled) {
          if (sb.bgMode === "gradient") {
            const a = ((sb.bgGradAngle ?? 135) - 90) * Math.PI / 180;
            const halfW = totalW / 2, halfH = totalH / 2;
            const grad = ctx.createLinearGradient(
              boxX + halfW - Math.cos(a) * halfW,
              boxY + halfH - Math.sin(a) * halfH,
              boxX + halfW + Math.cos(a) * halfW,
              boxY + halfH + Math.sin(a) * halfH,
            );
            grad.addColorStop(0, sb.bgColor);
            grad.addColorStop(1, sb.bgGradColor2 || "#1e293b");
            ctx.fillStyle = grad;
            ctx.globalAlpha = 1;
          } else {
            ctx.globalAlpha = sb.bgOpacity ?? 1;
            ctx.fillStyle = sb.bgColor;
          }
          const r = Math.min(radius, totalW / 2, totalH / 2);
          ctx.beginPath();
          ctx.moveTo(boxX + r, boxY);
          ctx.arcTo(boxX + totalW, boxY,           boxX + totalW, boxY + totalH, r);
          ctx.arcTo(boxX + totalW, boxY + totalH, boxX,            boxY + totalH, r);
          ctx.arcTo(boxX,           boxY + totalH, boxX,            boxY,           r);
          ctx.arcTo(boxX,           boxY,            boxX + totalW, boxY,           r);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Per-item rendering: icon SVG (decoded to Image) + label fillText.
        for (let i = 0; i < items.length; i++) {
          const { item, platform, labelW } = labels[i];
          if (!platform) continue;
          const { ix, iy, lx } = placeItem(i);
          // Brand-mode = each chip uses its own brand colour; mono = single
          // colour for all (clean magazine look); outline = transparent fill
          // with brand-coloured icon glyph.
          const bg = sb.colorMode === "mono"    ? sb.monoColor
                   : sb.colorMode === "outline" ? "transparent"
                   :                              platform.brandColor;
          const fg = sb.colorMode === "outline" ? platform.brandColor : "#ffffff";
          const svgStr = platform.svg(bg, fg);
          const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          try {
            const img = await loadImg(url);
            ctx.drawImage(img, boxX + ix, boxY + iy, iconPx, iconPx);
          } finally { URL.revokeObjectURL(url); }

          // Label render — used by every layout when showLabels is on.
          // Empty handles get skipped so an unfinished chip doesn't paint
          // ghost whitespace.
          //
          // ctx.direction = "ltr" is critical here. The page is rendered
          // inside an RTL document, so the canvas inherits a "rtl" base
          // direction. Handles like "@hovera_sa" and phone numbers
          // "055 1 64 65 66" are inherently LTR; without this override
          // the BiDi algorithm reorders them ("Hovera_sa@" / "66 65 64 1 55").
          if (sb.showLabels && item.handle) {
            ctx.save();
            ctx.direction = "ltr";
            ctx.fillStyle = sb.textColor;
            ctx.font = `bold ${fontPx}px "${sb.fontFamily}", sans-serif`;
            ctx.textAlign = "left";
            ctx.fillText(item.handle, boxX + lx, boxY + iy + iconPx / 2);
            ctx.restore();
            void labelW;
          }
        }
        ctx.restore();
      } catch { /* skip social box on render failure */ }
    }

    // ── Downsample the super-sampled canvas to the final output size ──────
    // Drawing the 2?� canvas into a 1?� canvas with imageSmoothingQuality="high"
    // averages 4 samples per output pixel → SSAA-quality edges (no jaggies on
    // calligraphy, gold/dark text on light backgrounds stays crisp).
    let finalCanvas = canvas;
    if (scale > 1) {
      finalCanvas = document.createElement("canvas");
      finalCanvas.width = baseW;
      finalCanvas.height = baseH;
      const fc = finalCanvas.getContext("2d");
      fc.imageSmoothingEnabled = true;
      fc.imageSmoothingQuality = "high";
      fc.drawImage(canvas, 0, 0, baseW, baseH);
    }

    // PNG = lossless (no JPEG ringing around text edges, no gradient banding,
    // perfect for greeting cards with hard-edged calligraphy + smooth gradients).
    // JPEG kept as an opt-in for users who care more about file size.
    if (exportFormat === "png") {
      return new Promise((resolve) => finalCanvas.toBlob((b) => resolve(b), "image/png"));
    }
    return new Promise((resolve) => finalCanvas.toBlob((b) => resolve(b), "image/jpeg", 0.98));
  }, [templateUrl, style, logo, outputSize, fitMode, bgColor, headings, decorations, exportFormat, superSample, templateZoom, templateOffsetX, templateOffsetY, stockObjects, bgMode, bgSolid, bgGrad1, bgGrad2, bgGradAngle, socialBox]);

  // Make a safe filename from an arbitrary string
  const safeFileName = (s) => String(s).replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 60) || "card";

  // File extension follows the chosen export format
  const fileExt = exportFormat === "png" ? "png" : "jpg";

  // ── Generate all cards & download a ZIP ──────────────────────
  // If no names are uploaded, generate a single anonymous card (no recipient name).
  const handleGenerateAll = async () => {
    if (!templateUrl) return;
    setGenerating(true);
    setGenProgress(0);
    try {
      // No names → just one card, downloaded directly (skip ZIP).
      if (names.length === 0) {
        setGenProgress(40);
        const blob = await renderCard("");
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `greeting-card.${fileExt}`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 5000);
        }
        setGenProgress(100);
        return;
      }

      const zip = new JSZip();
      const folder = zip.folder("greeting-cards");
      for (let i = 0; i < names.length; i++) {
        const blob = await renderCard(names[i]);
        if (blob) folder.file(`${String(i + 1).padStart(3, "0")} - ${safeFileName(names[i])}.${fileExt}`, blob);
        setGenProgress(Math.round(((i + 1) / names.length) * 100));
        // Yield to the browser so the progress UI updates
        await new Promise((r) => setTimeout(r, 0));
      }
      const out = await zip.generateAsync({ type: "blob" }, (m) => setGenProgress(80 + Math.round(m.percent / 5)));
      const url = URL.createObjectURL(out);
      const a = document.createElement("a");
      a.href = url;
      a.download = `greeting-cards-${names.length}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      setError((isRtl ? "تعذّر إنشاء الملفات: " : "Generation failed: ") + (err?.message || err));
    } finally {
      setGenerating(false);
      setGenProgress(0);
    }
  };

  // Download just the current preview card — works with or without a name
  const handleDownloadOne = async () => {
    if (!templateUrl) return;
    const name = names[previewIdx] || "";
    const blob = await renderCard(name);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFileName(name) || "greeting-card"}.${fileExt}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const previewName = names[previewIdx] || (isRtl ? "— اسم المستلم —" : "— Recipient name —");
  // Preview aspect ratio follows the chosen platform size when set, else template's native
  const aspectRatio = outputSize
    ? outputSize.width / outputSize.height
    : (templateW && templateH ? templateW / templateH : 1);
  const previewObjectFit = (!outputSize || fitMode === "fill") ? "fill" : fitMode;

  // Group SIZES by platform for a nicer picker
  const sizesByPlatform = SIZES.reduce((acc, s) => {
    const p = s.platform || "Other";
    (acc[p] = acc[p] || []).push(s);
    return acc;
  }, {});

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="h-full bg-slate-950 text-white overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-pink-600 flex items-center justify-center">
            <Type className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{isRtl ? "بطاقات التهنئة" : "Greeting Cards"}</h1>
            <p className="text-slate-400 text-xs">
              {isRtl ? "ارفع قالباً وقائمة أسماء، ثم نزّل كل البطاقات دفعة واحدة" : "Upload a template + names list, download all cards in one click"}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
          {/* ── LEFT: Controls ───────────────────────────────── */}
          <div className="flex flex-col gap-3 h-[calc(100vh-150px)] sticky top-4">
            {/* Tab bar — sticky at top, each tab opens its dedicated panel */}
            <div className="grid grid-cols-8 gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 flex-shrink-0">
              {PANELS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActivePanel(p.id)}
                  title={isRtl ? p.labelAr : p.labelEn}
                  className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg text-[10px] font-semibold transition ${
                    activePanel === p.id
                      ? "bg-indigo-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <span className="text-base leading-none">{p.icon}</span>
                  <span>{isRtl ? p.labelAr : p.labelEn}</span>
                </button>
              ))}
            </div>

            {/* Panel content — scrollable internally so the tab bar stays put */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {/* ───── CARD tab: Template + Size ───── */}
            {activePanel === "card" && (<>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">1</span>
                {isRtl ? "قالب البطاقة" : "Card template"}
              </h3>
              <button
                onClick={() => templateInputRef.current?.click()}
                disabled={uploadingTemplate}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition disabled:opacity-50"
              >
                {uploadingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                {templateUrl ? (isRtl ? "تغيير الصورة" : "Change image") : (isRtl ? "رفع صورة القالب" : "Upload template image")}
              </button>
              <input ref={templateInputRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={handleTemplate} />
              {templateW > 0 && (
                <p className="text-[10px] text-slate-500 mt-1.5">{templateW} ?� {templateH} px</p>
              )}
            </div>

            {/* Template framing — zoom + pan + reset.
                Only meaningful once a template is uploaded; before then it's
                a no-op so we hide it to keep the panel clean. */}
            {templateUrl && (
              <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    ↔�? {isRtl ? "تحريك القالب وتكبيره" : "Reframe template"}
                  </h3>
                  {(templateZoom !== 1 || templateOffsetX !== 0 || templateOffsetY !== 0) && (
                    <button
                      onClick={() => { setTemplateZoom(1); setTemplateOffsetX(0); setTemplateOffsetY(0); }}
                      className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      �? {isRtl ? "إعادة" : "Reset"}
                    </button>
                  )}
                </div>

                {/* Pan mode — when on, dragging the preview moves the template
                    instead of selecting overlays. Far easier than sliders. */}
                <button
                  onClick={() => setTemplatePanMode((m) => !m)}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
                    templatePanMode
                      ? "bg-cyan-500 text-slate-900 shadow-lg"
                      : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                >
                  {templatePanMode
                    ? (isRtl ? "✋ وضع التحريك مفعّل — اسحب الصورة" : "✋ Pan mode active — drag the image")
                    : (isRtl ? "🖐️ تفعيل السحب على المعاينة" : "🖐️ Enable drag-on-preview")}
                </button>

                {/* Zoom — 0.5?� to 3?�, 1 = baseline (no zoom). */}
                <div>
                  <label className="text-[10px] text-slate-400 block">
                    {isRtl ? "تكبير" : "Zoom"}: {templateZoom.toFixed(2)}?�
                  </label>
                  <input type="range" min="0.5" max="3" step="0.01" value={templateZoom}
                    onChange={(e) => setTemplateZoom(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500" />
                </div>

                {/* Offset X / Y — slider range goes wider than ر100% so users
                    can push subjects fully off-frame if needed (e.g. crop just
                    a corner of the photo). */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block">
                      {isRtl ? "أفقي" : "X"}: {templateOffsetX.toFixed(0)}%
                    </label>
                    <input type="range" min="-150" max="150" step="0.5" value={templateOffsetX}
                      onChange={(e) => setTemplateOffsetX(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">
                      {isRtl ? "عمودي" : "Y"}: {templateOffsetY.toFixed(0)}%
                    </label>
                    <input type="range" min="-150" max="150" step="0.5" value={templateOffsetY}
                      onChange={(e) => setTemplateOffsetY(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500" />
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 leading-relaxed">
                  {isRtl ? "💡 كبّر ثم اسحب الصورة لتختار أي جزء يظهر — مثلاً حرّك الخروف يمين/يسار أو اقصّ الشجرة." : "💡 Zoom in then drag to choose what's visible — move the subject around or crop out unwanted parts."}
                </p>
              </div>
            )}

            {/* Step 2: Output size / platform */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">2</span>
                <Maximize2 className="w-4 h-4" />
                {isRtl ? "المقاس والمنصة" : "Size & Platform"}
              </h3>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "اختر مقاساً" : "Pick a size"}</label>
                <select
                  value={outputSize?.id || ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) setOutputSize(null);
                    else setOutputSize(SIZES.find((s) => s.id === v) || null);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                >
                  <option value="">{isRtl ? "أبعاد القالب الأصلية" : "Template's native size"}</option>
                  {Object.entries(sizesByPlatform).map(([platform, list]) => (
                    <optgroup key={platform} label={platform}>
                      {list.map((s) => (
                        <option key={s.id} value={s.id}>
                          {(isRtl ? s.nameAr : s.nameEn)} — {s.width}?�{s.height}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {outputSize && (
                  <p className="text-[10px] text-indigo-400 mt-1">
                    📐 {outputSize.width}×{outputSize.height} px ({outputSize.ratio})
                  </p>
                )}
              </div>

              {outputSize && (
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "كيف تُلائم الصورة المقاس؟" : "Fit mode"}</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: "cover",   ar: "ملء (قص)",      en: "Cover" },
                      { id: "contain", ar: "احتواء كامل",   en: "Contain" },
                      { id: "fill",    ar: "تمديد",         en: "Stretch" },
                    ].map((m) => (
                      <button key={m.id} onClick={() => setFitMode(m.id)}
                        className={`py-1.5 rounded text-[11px] font-semibold transition ${fitMode === m.id ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
                        {isRtl ? m.ar : m.en}
                      </button>
                    ))}
                  </div>
                  {fitMode === "contain" && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">{isRtl ? "لون الإطار" : "Bar color"}</span>
                      <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                        className="w-7 h-7 rounded cursor-pointer bg-slate-800" />
                    </div>
                  )}
                </div>
              )}
            </div>
            </>)}

            {/* ───── SHAPES tab — stock illustrations gallery + multi-region recolor ───── */}
            {activePanel === "shapes" && (<>
            {/* Honest framing — set expectations up front. These are flat,
                stylized illustrations (good for cards with a graphic look). If
                the user wants real photos, point them at the Decor tab where
                the new quick-search shortcuts make PNG hunting frictionless. */}
            <div className="bg-amber-500/10 border border-amber-500/40 rounded-lg p-3 text-[11px] text-amber-100 leading-relaxed">
              <p className="font-bold mb-1">
                ℹ�? {isRtl ? "ℹ️ هذه رسومات (Flat / Vector) — مو صور حقيقية" : "ℹ️ These are flat/vector illustrations — not real photos"}
              </p>
              <p>
                {isRtl ? "إذا تبي صور حقيقيه (خروف حقيقي، بيت تراثي حقيقي، إلخ) روح تبويب «🎨 زخارف» — فيه أزرار بحث جاهزه تفتح Google تلقائياً بصور PNG شفافه واقعيه." : "If you want real photos (real sheep, real heritage house, etc.) use the '🎨 Decor' tab — it has quick-search buttons that open Google pre-filtered to realistic transparent PNGs."}
              </p>
              <button
                onClick={() => setActivePanel("deco")}
                className="mt-2 text-[10px] px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold"
              >
                {isRtl ? "اذهب لتبويب «زخارف» ←" : "Go to 'Decor' tab →"}
              </button>
            </div>

            {/* Background-fill controls — only meaningful when no template
                photo is uploaded (otherwise the template covers the bg).
                Lets users start from a blank canvas with a solid/gradient. */}
            {!templateUrl && (
              <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  🎨 {isRtl ? "خلفية البطاقة" : "Card background"}
                </h3>

                {/* Mode toggle */}
                <div className="grid grid-cols-2 gap-1 bg-slate-800/60 rounded p-1">
                  <button onClick={() => setBgMode("solid")}
                    className={`py-1.5 rounded text-[11px] font-semibold transition ${
                      bgMode === "solid" ? "bg-cyan-500 text-slate-900" : "text-slate-300 hover:bg-slate-700"
                    }`}>
                    {isRtl ? "لون واحد" : "Solid"}
                  </button>
                  <button onClick={() => setBgMode("gradient")}
                    className={`py-1.5 rounded text-[11px] font-semibold transition ${
                      bgMode === "gradient" ? "bg-cyan-500 text-slate-900" : "text-slate-300 hover:bg-slate-700"
                    }`}>
                    🌈 {isRtl ? "تدرّج" : "Gradient"}
                  </button>
                </div>

                {/* Solid colour picker */}
                {bgMode === "solid" && (
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "اللون" : "Color"}</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={bgSolid}
                        onChange={(e) => setBgSolid(e.target.value)}
                        className="w-9 h-9 rounded cursor-pointer bg-slate-800" />
                      <div className="flex flex-wrap gap-1 flex-1">
                        {QUICK_COLORS.map((c) => (
                          <button key={c} onClick={() => setBgSolid(c)}
                            className="w-5 h-5 rounded-full hover:scale-110 transition"
                            style={{ background: c, outline: bgSolid === c ? "2px solid #22d3ee" : "1px solid #475569" }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Gradient — two colours + angle */}
                {bgMode === "gradient" && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "اللون" : "Color"}</label>
                        <input type="color" value={bgGrad1}
                          onChange={(e) => setBgGrad1(e.target.value)}
                          className="w-full h-9 rounded cursor-pointer bg-slate-800" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "اللون" : "Color"}</label>
                        <input type="color" value={bgGrad2}
                          onChange={(e) => setBgGrad2(e.target.value)}
                          className="w-full h-9 rounded cursor-pointer bg-slate-800" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">{isRtl ? "اتجاه التقسيم" : "Direction"}: {bgGradAngle}ذ</label>
                      <input type="range" min="0" max="360" step="5" value={bgGradAngle}
                        onChange={(e) => setBgGradAngle(parseInt(e.target.value))}
                        className="w-full accent-cyan-500" />
                    </div>
                  </div>
                )}

                {/* Themed gradient presets */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "خلفيات جاهزة" : "Ready backgrounds"}</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {BG_GRADIENT_PRESETS.map((p) => (
                      <button key={p.name}
                        onClick={() => {
                          setBgMode("gradient");
                          setBgGrad1(p.c1); setBgGrad2(p.c2); setBgGradAngle(p.angle);
                        }}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 transition">
                        <span className="w-5 h-5 rounded border border-slate-600 flex-shrink-0"
                          style={{ background: `linear-gradient(${p.angle}deg, ${p.c1}, ${p.c2})` }} />
                        <span className="truncate">{isRtl ? p.ar : p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Gallery — every illustration in the library, click to add a copy */}
            <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                🐑 {isRtl ? "🐑 أضف شكلًا للبطاقة" : "🐑 Add a shape"}
              </h3>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                {isRtl ? "كل شكل قابل للتلوين بأجزائه — لوّن الصوف، أو الباب الخشبي، أو الورد، كل جزء بمفرده." : "Each shape exposes its parts so you can colour them independently — the wool, the wooden door, the petals, etc."}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {STOCK_ILLUSTRATIONS.map((def) => (
                  <button key={def.id}
                    onClick={() => addStockObject(def.id)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-900 border border-slate-700 hover:border-amber-300 transition group"
                    title={isRtl ? def.nameAr : def.nameEn}
                  >
                    {/* Live SVG thumbnail using the default palette — what
                        you see is exactly what gets added. */}
                    <div className="w-full aspect-square bg-slate-900/40 rounded group-hover:bg-white/90 transition flex items-center justify-center p-1">
                      <div className="w-full h-full"
                        dangerouslySetInnerHTML={{ __html: def.svg(def.defaultColors) }} />
                    </div>
                    <span className="text-[10px] font-semibold truncate w-full text-center">
                      {def.emoji} {isRtl ? def.nameAr : def.nameEn}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Calligraphic marks gallery — these are small floating ornaments
                like the ones the user circled in red on their reference card:
                tatweel flourishes, hooks, diamonds, dot clusters, rub el hizb.
                Share the same stockObjects state + drag/colour UI, so once
                placed they behave exactly like a regular shape. */}
            <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                🖋️ {isRtl ? "علامات كاليجرافي" : "Calligraphic marks"}
              </h3>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                {isRtl
                  ? "الزخارف الصغيرة التي تلاحظها في الكاليجرافي العربي الفاخر (سواش، حلقات، نقاط، معينات، رب الحزب). أضفها فوق نصك أو حولها، حركها، لوّنها."
                  : "The little flourishes you see in premium Arabic calligraphy (swooshes, hooks, dots, diamonds, rub-el-hizb). Drop them around your text, move + colour freely."}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {CALLIGRAPHIC_MARKS.map((def) => (
                  <button key={def.id}
                    onClick={() => addStockObject(def.id)}
                    className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-900 border border-slate-700 hover:border-amber-300 transition group"
                    title={isRtl ? def.nameAr : def.nameEn}
                  >
                    <div className="w-full aspect-square bg-slate-900/60 rounded group-hover:bg-slate-100 transition flex items-center justify-center p-1">
                      <div className="w-full h-full"
                        dangerouslySetInnerHTML={{ __html: def.svg(def.defaultColors) }} />
                    </div>
                    <span className="text-[9px] font-semibold truncate w-full text-center">
                      {isRtl ? def.nameAr : def.nameEn}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Arabic letter shapes — single letters / digits / ligatures
                rendered with calligraphic Arabic fonts. Same gallery pattern
                as calligraphic marks; the difference is each "thumbnail" is
                a real Unicode glyph drawn by the loaded web font, not an
                SVG path. */}
            <div className="bg-slate-900 border border-teal-500/30 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                ﺡ {isRtl ? "أحرف وأرقام عربية" : "Arabic letters & digits"}
              </h3>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                {isRtl
                  ? "اختر حرفًا أو رقمًا أو لفظًا (مثل ﷲ، ﷺ) — يُضاف كبيرًا فوق البطاقة. حرّكه، كبّره، لوّنه."
                  : "Pick a letter, digit, or ligature (Allah, Sallam, etc.) — added as a large decorative glyph. Move, resize, recolour."}
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {ARABIC_LETTER_SHAPES.map((def) => (
                  <button key={def.id}
                    onClick={() => addStockObject(def.id)}
                    className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-slate-800 hover:bg-teal-500 hover:text-slate-900 border border-slate-700 hover:border-teal-300 transition group"
                    title={isRtl ? def.nameAr : def.nameEn}
                  >
                    <div className="w-full aspect-square bg-slate-900/60 rounded group-hover:bg-slate-100 transition flex items-center justify-center overflow-hidden">
                      {/* Render the glyph directly with the calligraphic font
                          rather than the inline SVG — gives the picker the
                          same visual the canvas export produces. */}
                      <span style={{
                        fontFamily: def.font,
                        fontSize: def.aspect > 1.8 ? "16px" : "30px",
                        color: def.defaultColors.color,
                        fontWeight: "bold",
                        lineHeight: 1,
                      }}>
                        {def.letter}
                      </span>
                    </div>
                    <span className="text-[9px] font-semibold truncate w-full text-center">
                      {isRtl ? def.nameAr : def.nameEn}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Layers list — every stock object on this card */}
            {stockObjects.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  📚 {isRtl ? `الأشكال (${stockObjects.length})` : `Shapes (${stockObjects.length})`}
                </h3>
                <div className="space-y-1">
                  {stockObjects.map((obj, i) => {
                    const def = ALL_STOCK_DEFS.find((s) => s.id === obj.typeId);
                    return (
                      <button key={obj.id}
                        onClick={() => setActiveStockId(obj.id)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition ${
                          activeStockId === obj.id
                            ? "bg-cyan-500/20 border border-cyan-500/60"
                            : "bg-slate-800 hover:bg-slate-700 border border-transparent"
                        }`}
                      >
                        <div className="w-8 h-8 bg-white/90 rounded p-0.5 flex-shrink-0"
                          dangerouslySetInnerHTML={{ __html: def?.svg(obj.colors) || "" }} />
                        <span className="flex-1 text-start text-slate-200 truncate text-[10px]">
                          #{i + 1} ط {isRtl ? def?.nameAr : def?.nameEn}
                        </span>
                        <span onClick={(e) => { e.stopPropagation(); duplicateStockObject(obj.id); }}
                          className="text-slate-400 hover:text-white cursor-pointer">
                          <Copy className="w-3 h-3" />
                        </span>
                        <span onClick={(e) => { e.stopPropagation(); deleteStockObject(obj.id); }}
                          className="text-red-400 hover:text-red-300 cursor-pointer">
                          <Trash2 className="w-3 h-3" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active stock object editor — per-region colour pickers,
                placement sliders, vintage palette presets. */}
            {activeStock && activeStockDef && (
              <div className="bg-slate-900 border border-cyan-500/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    🎨 {isRtl ? `تلوين: ${activeStockDef.nameAr}` : `Colour: ${activeStockDef.nameEn}`}
                  </h3>
                  <button
                    onClick={() => updateStockObject(activeStock.id, { colors: { ...activeStockDef.defaultColors } })}
                    className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title={isRtl ? "ارجع للألوان الأصلية" : "Reset to defaults"}
                  >
                    �? {isRtl ? "افتراضي" : "Default"}
                  </button>
                </div>

                {/* One colour-picker row per region — labelled in the user's language */}
                <div className="space-y-2">
                  {activeStockDef.regions.map((region) => {
                    const current = activeStock.colors[region.key] || activeStockDef.defaultColors[region.key];
                    return (
                      <div key={region.key} className="bg-slate-800/60 rounded-lg p-2 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-200 font-semibold flex-1">
                            {isRtl ? region.ar : region.en}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">{current}</span>
                          <input type="color" value={current}
                            onChange={(e) => updateStockColor(activeStock.id, region.key, e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer bg-slate-900" />
                        </div>
                        {/* Quick palette — bright colours first row, vintage second */}
                        <div className="flex flex-wrap gap-1">
                          {QUICK_COLORS.map((c) => (
                            <button key={c} onClick={() => updateStockColor(activeStock.id, region.key, c)}
                              className="w-4 h-4 rounded-full hover:scale-125 transition"
                              style={{ background: c, outline: current === c ? "1.5px solid #22d3ee" : "1px solid #475569" }}
                              title={c} />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-700/50">
                          <span className="text-[9px] text-amber-400/80 w-full">{isRtl ? "🏺 ألوان قديمة" : "🏺 Vintage"}</span>
                          {VINTAGE_PALETTE.map((p) => (
                            <button key={p.color} onClick={() => updateStockColor(activeStock.id, region.key, p.color)}
                              className="w-4 h-4 rounded hover:scale-125 transition"
                              style={{ background: p.color, outline: current === p.color ? "1.5px solid #f59e0b" : "1px solid #475569" }}
                              title={isRtl ? p.ar : p.name} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Placement — size / position / rotation / opacity */}
                <div className="bg-slate-800/40 rounded-lg p-2 space-y-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block">{isRtl ? "الحجم" : "Size"}: {activeStock.width.toFixed(1)}%</label>
                    <input type="range" min="5" max="100" step="0.5" value={activeStock.width}
                      onChange={(e) => updateStockObject(activeStock.id, { width: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block">X: {activeStock.x.toFixed(1)}%</label>
                      <input type="range" min="0" max="100" step="0.5" value={activeStock.x}
                        onChange={(e) => updateStockObject(activeStock.id, { x: parseFloat(e.target.value) })}
                        className="w-full accent-cyan-500" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">Y: {activeStock.y.toFixed(1)}%</label>
                      <input type="range" min="0" max="100" step="0.5" value={activeStock.y}
                        onChange={(e) => updateStockObject(activeStock.id, { y: parseFloat(e.target.value) })}
                        className="w-full accent-cyan-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block">{isRtl ? "دوران" : "Rotation"}: {activeStock.rotation}ذ</label>
                      <input type="range" min="-180" max="180" value={activeStock.rotation}
                        onChange={(e) => updateStockObject(activeStock.id, { rotation: parseInt(e.target.value) })}
                        className="w-full accent-cyan-500" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">{isRtl ? "الشفافية" : "Opacity"}: {Math.round((activeStock.opacity ?? 1) * 100)}%</label>
                      <input type="range" min="0.1" max="1" step="0.05" value={activeStock.opacity ?? 1}
                        onChange={(e) => updateStockObject(activeStock.id, { opacity: parseFloat(e.target.value) })}
                        className="w-full accent-cyan-500" />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">{isRtl ? "💡 يمكنك سحب الشكل بالماوس مباشرة على المعاينة." : "💡 Drag the shape directly on the preview."}</p>
                </div>
              </div>
            )}
            </>)}

            {/* ───── LOGO tab ───── */}
            {activePanel === "logo" && (<>
            {/* Logo overlay — optional brand logo on every card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-pink-400" />
                {isRtl ? "🏷️ اللوقو (اختياري)" : "🏷️ Brand Logo (optional)"}
              </h3>

              {!logo ? (
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 text-xs font-semibold transition disabled:opacity-50"
                >
                  {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {isRtl ? "رفع لوقو" : "Upload logo"}
                </button>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <img src={logo.url} alt="logo" className="w-12 h-12 object-contain rounded bg-slate-800 border border-slate-700" />
                    <div className="flex-1 text-[10px] text-slate-400">
                      {logo.naturalW}?�{logo.naturalH}
                    </div>
                    <button onClick={() => logoInputRef.current?.click()}
                      className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200">
                      {isRtl ? "تغيير" : "Change"}
                    </button>
                    <button onClick={() => { if (logo.url) URL.revokeObjectURL(logo.url); setLogo(null); }}
                      className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-red-600 text-slate-200">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block">{isRtl ? "الحجم" : "Size"}: {logo.width.toFixed(1)}%</label>
                    <input type="range" min="3" max="50" step="0.5" value={logo.width}
                      onChange={(e) => updateLogo({ width: parseFloat(e.target.value) })} className="w-full accent-indigo-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block">X: {logo.x.toFixed(1)}%</label>
                      <input type="range" min="0" max="100" step="0.5" value={logo.x}
                        onChange={(e) => updateLogo({ x: parseFloat(e.target.value) })} className="w-full accent-indigo-500" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">Y: {logo.y.toFixed(1)}%</label>
                      <input type="range" min="0" max="100" step="0.5" value={logo.y}
                        onChange={(e) => updateLogo({ y: parseFloat(e.target.value) })} className="w-full accent-indigo-500" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block">{isRtl ? "الشفافية" : "Opacity"}: {Math.round((logo.opacity ?? 1) * 100)}%</label>
                    <input type="range" min="0.1" max="1" step="0.05" value={logo.opacity ?? 1}
                      onChange={(e) => updateLogo({ opacity: parseFloat(e.target.value) })} className="w-full accent-indigo-500" />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "🎨 تلوين الزخرفة" : "🎨 Recolor"}</label>
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="color"
                        value={logo.color || "#ffffff"}
                        onChange={(e) => updateLogo({ color: e.target.value })}
                        className="w-9 h-9 rounded cursor-pointer bg-slate-800"
                      />
                      {logo.color && (
                        <button onClick={() => updateLogo({ color: "" })}
                          className="text-[10px] px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">
                          {isRtl ? "× أصلي" : "× Original"}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {QUICK_COLORS.map((c) => (
                        <button key={c} onClick={() => updateLogo({ color: c })}
                          className="w-5 h-5 rounded-full hover:scale-110 transition"
                          style={{ background: c, outline: logo.color === c ? "2px solid #818cf8" : "1px solid #475569" }} />
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {isRtl ? "💡 التلوين يعمل أفضل مع شعارات بلون واحد (شفافية في الخلفية)." : "💡 Works best with single-colour logos (transparent background)."}
                    </p>
                  </div>
                </>
              )}
              <input ref={logoInputRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={handleLogo} />
            </div>
            </>)}

            {/* ───── TEXTS tab: Static headings ───── */}
            {activePanel === "texts" && (<>
            {/* Headings — static text overlays (e.g. "عيد أضحى مبارك") */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Type className="w-4 h-4 text-amber-400" />
                  {isRtl ? "📝 نصوص ثابتة" : "📝 Static Texts"}
                </h3>
                <button
                  onClick={() => addHeading()}
                  className="text-[10px] px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold transition"
                >
                  + {isRtl ? "إضافة نص" : "Add text"}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                {isRtl
                  ? "اك🎨 نصوصاً تظهر على كل البطاقات (مثل ثع🎯 أضحى مبارك?�ٌ ثمن / إلى?�...). كل نص له تنسيقه الخاص."
                  : 'Add texts that appear on every card (e.g. "Eid Mubarak", "From / To"). Each has its own styling.'}
              </p>

              {/* Headings list */}
              {headings.length > 0 && (
                <div className="space-y-1">
                  {headings.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => setActiveHeadingId(h.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition ${
                        activeHeadingId === h.id ? "bg-amber-500/20 border border-amber-500/60" : "bg-slate-800 hover:bg-slate-700 border border-transparent"
                      }`}
                    >
                      <span style={{ color: h.color, fontFamily: h.fontFamily }} className="flex-1 truncate text-start">
                        {h.text || (isRtl ? "(فارغ)" : "(empty)")}
                      </span>
                      <span onClick={(e) => { e.stopPropagation(); deleteHeading(h.id); }} className="text-red-400 hover:text-red-300 cursor-pointer">
                        <Trash2 className="w-3 h-3" />
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Active heading editor */}
              {activeHeading && (
                <div className="bg-slate-800/60 border border-amber-500/30 rounded-lg p-2 space-y-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      {isRtl ? "النص" : "Text"} <span className="text-slate-500">— {isRtl ? "اضغط Enter لسطر جديد" : "Enter for new line"}</span>
                    </label>
                    <textarea
                      rows={2}
                      value={activeHeading.text}
                      onChange={(e) => updateHeading(activeHeading.id, { text: e.target.value })}
                      placeholder={isRtl ? "مثلاً: عيد أضحى مبارك" : "e.g. Eid Mubarak"}
                      style={{ fontFamily: activeHeading.fontFamily, resize: "vertical" }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white"
                    />
                  </div>

                  {/* Multi-line controls — text box width + line spacing */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block">
                        {isRtl ? "عرض الصندوق" : "Box width"}: {activeHeading.textWidth ? `${activeHeading.textWidth}%` : (isRtl ? "تلقائي" : "auto")}
                      </label>
                      <input type="range" min="0" max="100" value={activeHeading.textWidth || 0}
                        onChange={(e) => updateHeading(activeHeading.id, { textWidth: parseInt(e.target.value) })}
                        className="w-full accent-amber-500" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">
                        {isRtl ? "تباعد السطور" : "Line spacing"}: {(activeHeading.lineHeight || 1.2).toFixed(2)}
                      </label>
                      <input type="range" min="0.8" max="2.5" step="0.05" value={activeHeading.lineHeight || 1.2}
                        onChange={(e) => updateHeading(activeHeading.id, { lineHeight: parseFloat(e.target.value) })}
                        className="w-full accent-amber-500" />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    {isRtl
                      ? "💡 اجعل «عرض الصندوق» > 0 ليلتف النص لسطور تلقائياً عند تجاوز هذا العرض، أو اك🎨 Enter ???? النص لكسر السطر 🎯و??اً."
                      : '💡 Set "Box width" > 0 to auto-wrap when exceeding that width, or press Enter in the text for manual line breaks.'}
                  </p>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      {isRtl ? "نوع الخط" : "Font"} <span className="text-amber-400">— {isRtl ? "مرّر للمعاينة" : "hover to preview"}</span>
                    </label>
                    <FontPicker
                      value={activeHeading.fontFamily}
                      onChange={(name) => updateHeading(activeHeading.id, { fontFamily: name })}
                      fonts={FONTS}
                      isRtl={isRtl}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">{isRtl ? "الحجم" : "Size"}: {activeHeading.fontSize}%</label>
                    <input type="range" min="2" max="25" step="0.5" value={activeHeading.fontSize}
                      onChange={(e) => updateHeading(activeHeading.id, { fontSize: parseFloat(e.target.value) })}
                      className="w-full accent-amber-500" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1 gap-1">
                      <label className="text-[10px] text-slate-400">{isRtl ? "اللون" : "Color"}</label>
                      <div className="flex gap-1">
                        <button
                          onClick={() => updateHeading(activeHeading.id, { useGradient: !activeHeading.useGradient, fillImage: null, useWordColors: false })}
                          className={`text-[10px] px-2 py-0.5 rounded transition ${activeHeading.useGradient ? "bg-amber-500 text-slate-900" : "bg-slate-900 text-slate-300"}`}
                        >
                          {isRtl ? (activeHeading.useGradient ? "🌈 تدرّج" : "+ تدرّج") : (activeHeading.useGradient ? "🌈 Gradient" : "+ Gradient")}
                        </button>
                        <button
                          onClick={async () => {
                            if (activeHeading.fillImage) {
                              URL.revokeObjectURL(activeHeading.fillImage);
                              updateHeading(activeHeading.id, { fillImage: null });
                              return;
                            }
                            const url = await pickImageAsObjectUrl();
                            if (url) updateHeading(activeHeading.id, { fillImage: url, useGradient: false, useWordColors: false });
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded transition ${activeHeading.fillImage ? "bg-pink-600 text-white" : "bg-slate-900 text-slate-300"}`}
                          title={isRtl ? "اجعل الحروف مفرّغة وفيها صورة" : "Image-clipped text"}
                        >
                          {isRtl ? (activeHeading.fillImage ? "📌 صورة" : "+ 📌 صورة") : (activeHeading.fillImage ? "📌 Image" : "+ 📌 Image")}
                        </button>
                        <button
                          onClick={() => {
                            const words = (activeHeading.text || "").trim().split(/\s+/).filter(Boolean);
                            const palette = ["#dc2626", "#d4af37", "#16a34a", "#3b82f6", "#7c3aed", "#ec4899"];
                            const seed = (activeHeading.wordColors && activeHeading.wordColors.length === words.length)
                              ? activeHeading.wordColors
                              : words.map((_, i) => palette[i % palette.length]);
                            updateHeading(activeHeading.id, {
                              useWordColors: !activeHeading.useWordColors,
                              wordColors: seed,
                              fillImage: null, useGradient: false,
                            });
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded transition ${activeHeading.useWordColors ? "bg-emerald-600 text-white" : "bg-slate-900 text-slate-300"}`}
                          title={isRtl ? "لون مختلف لكل كلمة" : "Different color per word"}
                        >
                          {isRtl ? (activeHeading.useWordColors ? "🎨 لكل كلمة" : "+ 🎨 لكل كلمة") : (activeHeading.useWordColors ? "🎨 Per-word" : "+ 🎨 Per-word")}
                        </button>
                      </div>
                    </div>

                    {/* Per-word color picker — shown when useWordColors is on */}
                    {activeHeading.useWordColors && (() => {
                      const words = (activeHeading.text || "").trim().split(/\s+/).filter(Boolean);
                      const colors = activeHeading.wordColors || [];
                      const setWordColor = (idx, c) => {
                        const next = [...colors];
                        while (next.length < words.length) next.push(activeHeading.color || "#ffffff");
                        next[idx] = c;
                        updateHeading(activeHeading.id, { wordColors: next });
                      };
                      if (words.length === 0) {
                        return <div className="bg-slate-900/70 border border-emerald-500/30 rounded p-2 text-[10px] text-slate-400">
                          {isRtl ? "اكتب نصاً أولاً ثم لوّن كل كلمة منه" : "Type some text first, then color each word"}
                        </div>;
                      }
                      return (
                        <div className="mb-2 bg-slate-900/80 border border-emerald-500/30 rounded p-2 space-y-2">
                          <p className="text-[10px] text-emerald-200">{isRtl ? `🎨 ${words.length} كلمة — لوّن كل واحدة:` : `🎨 ${words.length} words — color each:`}</p>
                          {words.map((w, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span style={{ color: colors[i] || activeHeading.color, fontFamily: activeHeading.fontFamily }}
                                className="flex-1 text-[12px] truncate font-bold">
                                {w}
                              </span>
                              <input type="color" value={colors[i] || activeHeading.color || "#ffffff"}
                                onChange={(e) => setWordColor(i, e.target.value)}
                                className="w-7 h-7 rounded cursor-pointer bg-slate-800" />
                              <div className="flex gap-0.5">
                                {QUICK_COLORS.slice(0, 6).map((c) => (
                                  <button key={c} onClick={() => setWordColor(i, c)}
                                    className="w-4 h-4 rounded-full hover:scale-110 transition"
                                    style={{ background: c, outline: colors[i] === c ? "1.5px solid #fbbf24" : "1px solid #475569" }} />
                                ))}
                              </div>
                            </div>
                          ))}
                          <div className="flex gap-1 pt-1 border-t border-slate-700">
                            <button onClick={() => {
                              const palette = ["#dc2626", "#d4af37", "#16a34a", "#3b82f6", "#7c3aed", "#ec4899", "#14b8a6", "#f97316"];
                              updateHeading(activeHeading.id, { wordColors: words.map((_, i) => palette[i % palette.length]) });
                            }} className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200">
                              {isRtl ? "🎲 ألوان عشوائية" : "🎲 Random"}
                            </button>
                            <button onClick={() => {
                              updateHeading(activeHeading.id, { wordColors: words.map(() => activeHeading.color || "#ffffff") });
                            }} className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200">
                              {isRtl ? "↺ توحيد" : "↺ Reset"}
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                    {activeHeading.fillImage && (
                      <div className="mb-2 flex items-center gap-2 bg-pink-500/10 border border-pink-500/30 rounded p-1.5">
                        <img src={activeHeading.fillImage} alt="" className="w-9 h-9 object-cover rounded border border-pink-500/40" />
                        <p className="flex-1 text-[10px] text-pink-200 leading-tight">
                          {isRtl ? "النص مفرّغ والصورة تظهر داخله" : "Text shows the image through the glyphs"}
                        </p>
                        <button onClick={async () => {
                          const url = await pickImageAsObjectUrl();
                          if (url) { URL.revokeObjectURL(activeHeading.fillImage); updateHeading(activeHeading.id, { fillImage: url }); }
                        }} className="text-[10px] px-2 py-1 rounded bg-pink-700 hover:bg-pink-600 text-white">
                          {isRtl ? "تغيير" : "Change"}
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input type="color" value={activeHeading.color}
                        onChange={(e) => updateHeading(activeHeading.id, { color: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer bg-slate-900" />
                      <div className="flex flex-wrap gap-1 flex-1">
                        {QUICK_COLORS.map((c) => (
                          <button key={c} onClick={() => updateHeading(activeHeading.id, { color: c })}
                            className="w-5 h-5 rounded-full hover:scale-110 transition"
                            style={{ background: c, outline: activeHeading.color === c ? "2px solid #fbbf24" : "1px solid #475569" }} />
                        ))}
                      </div>
                    </div>
                    {activeHeading.useGradient && (
                      <div className="mt-2 space-y-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "اللون الثاني" : "Second color"}</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={activeHeading.gradientColor2}
                              onChange={(e) => updateHeading(activeHeading.id, { gradientColor2: e.target.value })}
                              className="w-8 h-8 rounded cursor-pointer bg-slate-900" />
                            <div className="flex flex-wrap gap-1 flex-1">
                              {QUICK_COLORS.map((c) => (
                                <button key={c} onClick={() => updateHeading(activeHeading.id, { gradientColor2: c })}
                                  className="w-5 h-5 rounded-full hover:scale-110 transition"
                                  style={{ background: c, outline: activeHeading.gradientColor2 === c ? "2px solid #fbbf24" : "1px solid #475569" }} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "مزائج جاهزة" : "Ready combos"}</label>
                          <div className="grid grid-cols-2 gap-1">
                            {[
                              { name: isRtl ? "ذهبي" : "Gold",   c1: "#d4af37", c2: "#fde047", a: 90 },
                              { name: isRtl ? "فاخر" : "Luxury", c1: "#7c3aed", c2: "#ec4899", a: 135 },
                              { name: isRtl ? "غروب" : "Sunset", c1: "#f59e0b", c2: "#ef4444", a: 135 },
                              { name: isRtl ? "ملكي" : "Royal",  c1: "#1e293b", c2: "#d4af37", a: 45 },
                            ].map((p) => (
                              <button key={p.name}
                                onClick={() => updateHeading(activeHeading.id, { color: p.c1, gradientColor2: p.c2, gradientAngle: p.a })}
                                className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 hover:bg-slate-700 text-[10px] text-slate-200 transition">
                                <span className="w-4 h-4 rounded border border-slate-600"
                                  style={{ background: `linear-gradient(${p.a}deg, ${p.c1}, ${p.c2})` }} />
                                {p.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <label className="flex-1 flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={activeHeading.bold} onChange={(e) => updateHeading(activeHeading.id, { bold: e.target.checked })} />
                      <span className="text-[10px]">B</span>
                    </label>
                    <label className="flex-1 flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={activeHeading.italic} onChange={(e) => updateHeading(activeHeading.id, { italic: e.target.checked })} />
                      <span className="text-[10px] italic">I</span>
                    </label>
                    <label className="flex-1 flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={activeHeading.shadow} onChange={(e) => updateHeading(activeHeading.id, { shadow: e.target.checked })} />
                      <span className="text-[10px]">{isRtl ? "ظل" : "Shadow"}</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block">X: {activeHeading.x.toFixed(1)}%</label>
                      <input type="range" min="0" max="100" step="0.5" value={activeHeading.x}
                        onChange={(e) => updateHeading(activeHeading.id, { x: parseFloat(e.target.value) })} className="w-full accent-amber-500" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">Y: {activeHeading.y.toFixed(1)}%</label>
                      <input type="range" min="0" max="100" step="0.5" value={activeHeading.y}
                        onChange={(e) => updateHeading(activeHeading.id, { y: parseFloat(e.target.value) })} className="w-full accent-amber-500" />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">{isRtl ? "💡 يمكنك سحب النص بالماوس على المعاينة." : "💡 Drag the text directly on the preview."}</p>

                  {/* ─── 🎨 Text decoration effects ──────────────────────
                      Five independent toggles, each compact. Order is by
                      how often it gets used: diacritic colours → outline →
                      glow → bg shape → ornament. Empty defaults so the
                      section reads as "nothing active" until the user
                      opts in. */}
                  <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/40 rounded-lg p-2.5 space-y-2.5">
                    <h4 className="text-[11px] font-bold flex items-center gap-1.5 text-purple-200">
                      ✨ {isRtl ? "زخارف النص" : "Text decorations"}
                    </h4>

                    {/* ── 🔍 Paint brush — click any letter/diacritic/dot
                        to colour it. The flagship interaction for fine
                        control; sits at the top because it's the
                        most-asked-for feature. */}
                    {(() => {
                      const isPaintingThis = textPaintingHeadingId === activeHeading.id;
                      const paintedCount = Object.keys(activeHeading.glyphColors || {}).length;
                      return (
                        <div className={`rounded-lg p-2 space-y-1.5 ${isPaintingThis ? "bg-pink-500/20 border border-pink-500/70" : "bg-pink-500/8 border border-pink-500/40"}`}>
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-[11px] font-bold flex items-center gap-1 text-pink-100">
                              🔍 {isRtl ? "🖌️ قلم تلوين النص" : "🖌️ Text paint brush"}
                              {paintedCount > 0 && (
                                <span className="text-[9px] bg-pink-700/60 px-1.5 py-0.5 rounded">
                                  {paintedCount}
                                </span>
                              )}
                            </label>
                            <button
                              onClick={() => setTextPaintingHeadingId(isPaintingThis ? null : activeHeading.id)}
                              className={`text-[10px] px-2.5 py-1 rounded font-bold transition ${
                                isPaintingThis
                                  ? "bg-pink-500 text-white"
                                  : "bg-slate-800 text-slate-300 hover:bg-pink-500 hover:text-white"
                              }`}
                            >
                              {isPaintingThis
                                ? (isRtl ? "⏹ إنهاء" : "⏹ Exit")
                                : (isRtl ? "▶ تفعيل القلم" : "▶ Start painting")}
                            </button>
                          </div>

                          {isPaintingThis ? (
                            <>
                              <p className="text-[10px] text-pink-100 leading-tight">
                                {textPaintErase
                                  ? (isRtl ? "🧹 ممحاة: انقر على حرف/تشكيل لإرجاعه للون الأساسي." : "🧹 Eraser: click a glyph to revert to base colour.")
                                  : (isRtl ? "انقر على أي حرف، فتحه، ضمه، شدّه، همزه، أو نقطه في المعاينة → تتلوّن باللون المختار." : "Click any letter, fatha, damma, shadda, hamza, or dot in the preview → painted with the chosen colour.")}
                              </p>

                              {/* Paint / Erase toggle */}
                              <div className="grid grid-cols-2 gap-1 bg-slate-900/60 rounded p-1">
                                <button onClick={() => setTextPaintErase(false)}
                                  className={`py-1.5 rounded text-[11px] font-bold transition ${!textPaintErase ? "bg-pink-500 text-white" : "text-slate-300 hover:bg-slate-700"}`}>
                                  🔍 {isRtl ? "قلم" : "Paint"}
                                </button>
                                <button onClick={() => setTextPaintErase(true)}
                                  className={`py-1.5 rounded text-[11px] font-bold transition ${textPaintErase ? "bg-pink-500 text-white" : "text-slate-300 hover:bg-slate-700"}`}>
                                  🧹 {isRtl ? "ممحاة" : "Eraser"}
                                </button>
                              </div>

                              {/* Brush colour (only meaningful in paint mode) */}
                              {!textPaintErase && (
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <input type="color" value={textPaintColor}
                                      onChange={(e) => setTextPaintColor(e.target.value)}
                                      className="w-9 h-9 rounded cursor-pointer bg-slate-900" />
                                    <span className="text-[10px] text-slate-300 flex-1 font-mono">{textPaintColor}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {["#dc2626", "#d4af37", "#fbbf24", "#16a34a", "#3b82f6", "#7c3aed", "#ec4899", "#06b6d4", "#000000", "#ffffff"].map((c) => (
                                      <button key={c} onClick={() => setTextPaintColor(c)}
                                        className="w-5 h-5 rounded-full hover:scale-125 transition"
                                        style={{ background: c, outline: textPaintColor === c ? "2px solid #ec4899" : "1px solid #475569" }} />
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* ── Glyph palette ──────────────────────────
                                  CSS click targets for combining marks (harakat) are
                                  effectively zero-width because they have no advance —
                                  clicks fall through to the base letter underneath.
                                  This palette is the fix: every NFD codepoint of the
                                  text becomes a separate big button with its own hit
                                  area. Harakat get a tinted background so the user
                                  can tell letters from marks at a glance. */}
                              {(activeHeading.text || "").length > 0 && (() => {
                                const chars = getGlyphCodepoints(activeHeading.text);
                                const baseColor = activeHeading.color || "#fff";
                                return (
                                  <div className="bg-slate-950/60 rounded p-2 space-y-1.5 border border-pink-500/30">
                                    <p className="text-[10px] text-pink-100 font-semibold">
                                      {textPaintErase
                                        ? (isRtl ? "🧹 انقر لمسح اللون عن أي حرف/تشكيل:" : "🧹 Click any glyph to clear its colour:")
                                        : (isRtl ? "👇 انقر على أي حرف أو تشكيل لتلوينه:" : "👇 Click any glyph below to paint it:")}
                                    </p>
                                    <div className="flex flex-wrap gap-1" dir="rtl">
                                      {chars.map((ch, i) => {
                                        const c = activeHeading.glyphColors?.[i] || baseColor;
                                        const isDiac = /\p{Mn}/u.test(ch);
                                        const isPainted = !!activeHeading.glyphColors?.[i];
                                        return (
                                          <button
                                            key={i}
                                            onClick={() => {
                                              const next = { ...(activeHeading.glyphColors || {}) };
                                              if (textPaintErase) delete next[i];
                                              else next[i] = textPaintColor;
                                              updateHeading(activeHeading.id, { glyphColors: next });
                                            }}
                                            title={`#${i + 1}${isDiac ? (isRtl ? " — تشكيل" : " — diacritic") : ""}${isPainted ? (isRtl ? " ✓ ملوّن" : " ✓ painted") : ""}`}
                                            style={{
                                              fontFamily: activeHeading.fontFamily,
                                              color: c,
                                              backgroundColor: isDiac ? "rgba(168,85,247,0.18)" : "rgba(15,23,42,0.85)",
                                              borderColor: isPainted ? "#ec4899" : (isDiac ? "rgba(168,85,247,0.55)" : "rgba(71,85,105,0.6)"),
                                            }}
                                            className="min-w-[34px] h-[44px] px-1.5 rounded text-2xl font-bold border-2 hover:scale-110 hover:border-pink-400 transition flex items-center justify-center relative"
                                          >
                                            {/* Render an extra placeholder dotted-circle (U+25CC) before
                                                a combining mark so it doesn't render as an empty box.
                                                Standard Unicode trick used by font preview apps. */}
                                            {isDiac ? `◌${ch}` : ch}
                                            {isPainted && (
                                              <span className="absolute -top-1 -end-1 w-3 h-3 rounded-full bg-pink-500 text-[7px] text-white flex items-center justify-center font-bold">
                                                ✓
                                              </span>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    <p className="text-[9px] text-slate-500 leading-tight">
                                      {isRtl
                                        ? "🟪 البنفسجي = تشكيل (فتحة، ضمة، شدّة...) — 🟦 الباقي = حرف"
                                        : "🟪 Purple = diacritic (fatha, damma, shadda…) — 🟦 Others = letter"}
                                    </p>
                                  </div>
                                );
                              })()}

                              {/* Clear all painted glyphs */}
                              {paintedCount > 0 && (
                                <button
                                  onClick={() => updateHeading(activeHeading.id, { glyphColors: {} })}
                                  className="w-full py-1.5 rounded bg-slate-800 hover:bg-red-600 text-[10px] text-slate-200 font-semibold transition"
                                >
                                  🗑️ {isRtl ? `مسح كل التلوين (${paintedCount})` : `Clear all paint (${paintedCount})`}
                                </button>
                              )}
                            </>
                          ) : (
                            <p className="text-[10px] text-slate-400 leading-tight">
                              {paintedCount > 0
                                ? (isRtl
                                  ? `🎨 ${paintedCount} حرف/تشكيل ملوّن. اضغط «تفعيل القلم» للتعديل.`
                                  : `🎨 ${paintedCount} glyph(s) painted. Click "Start painting" to edit.`)
                                : (isRtl ? "🎯 أدق طريقة — انقر على أي شي تبيه يتلوّن (حرف، تشكيل، نقطه)." : "🎯 Most precise — click anything to colour it (letter, mark, dot).")}
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* ── Diacritic / tashkeel colour ───────────────────
                        Splits Arabic harakat (fatha, damma, kasra, shadda,
                        sukun, hamza, madda, etc.) from base letters and
                        paints them in a separate colour. Disabled while
                        per-word colours are on — they own the splitting
                        logic and we don't combine the two. */}
                    <div className="bg-slate-900/60 rounded p-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className={`text-[10px] font-semibold flex items-center gap-1.5 cursor-pointer ${activeHeading.useWordColors ? "text-slate-500" : "text-slate-300"}`}>
                          <input type="checkbox"
                            checked={!!activeHeading.useDiacriticColor}
                            disabled={activeHeading.useWordColors}
                            onChange={(e) => updateHeading(activeHeading.id, { useDiacriticColor: e.target.checked })} />
                          ◌ٌ {isRtl ? "◌ٌ تلوين التشكيل" : "◌ٌ Diacritic colour"}
                        </label>
                      </div>
                      {activeHeading.useDiacriticColor && !activeHeading.useWordColors && (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center gap-2">
                            <input type="color"
                              value={activeHeading.diacriticColor || "#dc2626"}
                              onChange={(e) => updateHeading(activeHeading.id, { diacriticColor: e.target.value })}
                              className="w-7 h-7 rounded cursor-pointer bg-slate-900" />
                            <span className="text-[10px] text-slate-400 flex-1">
                              {isRtl ? "انقر على أي حرف، فتحه، ضمه، شدّه، همزه، أو نقطه في المعاينة → تتلوّن باللون المختار." : "Click any letter, fatha, damma, shadda, hamza, or dot in the preview → painted with the chosen colour."}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {["#dc2626", "#d4af37", "#16a34a", "#3b82f6", "#7c3aed", "#ec4899", "#fbbf24", "#000000", "#ffffff"].map((c) => (
                              <button key={c} onClick={() => updateHeading(activeHeading.id, { diacriticColor: c })}
                                className="w-5 h-5 rounded-full hover:scale-125 transition"
                                style={{ background: c, outline: activeHeading.diacriticColor === c ? "2px solid #a855f7" : "1px solid #475569" }} />
                            ))}
                          </div>
                          <p className="text-[9px] text-slate-500 leading-tight">
                            {isRtl ? "💡 لون الحروف يبقى من «اللون / التعبئة». اكتب الحركات في نصك (مثل: عِيْد أَضْحَى مُبَارَك)." : "💡 Letters use the main fill colour. Type harakat in your text (e.g. عِيْد أَضْحَى مُبَارَك)."}
                          </p>
                        </div>
                      )}
                      {activeHeading.useWordColors && (
                        <p className="text-[9px] text-amber-300/80 leading-tight">
                          {isRtl ? "⚠️ معطّل — «لون لكل كلمة» مفعّل" : "⚠️ Disabled — Per-word colours is on"}
                        </p>
                      )}
                    </div>

                    {/* ── Outline ──────────────────────────────────────── */}
                    <div className="bg-slate-900/60 rounded p-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-slate-300 font-semibold flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={!!activeHeading.useOutline}
                            onChange={(e) => updateHeading(activeHeading.id, { useOutline: e.target.checked })} />
                          ✍️ {isRtl ? "حدّ خارجي (Outline)" : "Outline"}
                        </label>
                      </div>
                      {activeHeading.useOutline && (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center gap-2">
                            <input type="color" value={activeHeading.outlineColor || "#000000"}
                              onChange={(e) => updateHeading(activeHeading.id, { outlineColor: e.target.value })}
                              className="w-7 h-7 rounded cursor-pointer bg-slate-900" />
                            <label className="text-[10px] text-slate-400 flex-1">
                              {isRtl ? "السماكة" : "Width"}: {activeHeading.outlineWidth || 3}%
                            </label>
                          </div>
                          <input type="range" min="0.5" max="20" step="0.5" value={activeHeading.outlineWidth || 3}
                            onChange={(e) => updateHeading(activeHeading.id, { outlineWidth: parseFloat(e.target.value) })}
                            className="w-full accent-purple-500" />
                        </div>
                      )}
                    </div>

                    {/* ── Glow ────────────────────────────────────────── */}
                    <div className="bg-slate-900/60 rounded p-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-slate-300 font-semibold flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={!!activeHeading.useGlow}
                            onChange={(e) => updateHeading(activeHeading.id, { useGlow: e.target.checked })} />
                          ✨ {isRtl ? "توهج (Glow)" : "Glow"}
                        </label>
                      </div>
                      {activeHeading.useGlow && (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center gap-2">
                            <input type="color" value={activeHeading.glowColor || "#ffd700"}
                              onChange={(e) => updateHeading(activeHeading.id, { glowColor: e.target.value })}
                              className="w-7 h-7 rounded cursor-pointer bg-slate-900" />
                            <label className="text-[10px] text-slate-400 flex-1">
                              {isRtl ? "القوة" : "Intensity"}: {activeHeading.glowSize || 12}%
                            </label>
                          </div>
                          <input type="range" min="2" max="50" step="1" value={activeHeading.glowSize || 12}
                            onChange={(e) => updateHeading(activeHeading.id, { glowSize: parseFloat(e.target.value) })}
                            className="w-full accent-purple-500" />
                          <div className="flex flex-wrap gap-1">
                            {["#ffd700", "#fbbf24", "#22d3ee", "#a855f7", "#ec4899", "#fff"].map((c) => (
                              <button key={c} onClick={() => updateHeading(activeHeading.id, { glowColor: c })}
                                className="w-4 h-4 rounded-full hover:scale-125 transition"
                                style={{ background: c, outline: activeHeading.glowColor === c ? "1.5px solid #a855f7" : "1px solid #475569" }} />
                            ))}
                          </div>
                          <p className="text-[9px] text-slate-500 leading-tight">
                            {isRtl ? "💡 التوهج يحل محل الظل العادي عند تفعيله" : "💡 Glow replaces the basic shadow when on"}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ── Background shape ────────────────────────────── */}
                    <div className="bg-slate-900/60 rounded p-2 space-y-1.5">
                      <label className="text-[10px] text-slate-300 font-semibold">
                        🎯 {isRtl ? "🎯 شكل خلف النص" : "🎯 Background shape"}
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { id: "none",   ar: "بدون",   en: "None" },
                          { id: "pill",   ar: "كبسولة", en: "Pill" },
                          { id: "tag",    ar: "مستطيل", en: "Tag" },
                          { id: "ribbon", ar: "علم",    en: "Ribbon" },
                          { id: "circle", ar: "دائرة",  en: "Circle" },
                          { id: "frame",  ar: "إطار",   en: "Frame" },
                        ].map((s) => (
                          <button key={s.id}
                            onClick={() => updateHeading(activeHeading.id, { textBgShape: s.id })}
                            className={`py-1 rounded text-[10px] font-semibold transition ${
                              (activeHeading.textBgShape || "none") === s.id
                                ? "bg-purple-500 text-white"
                                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                            }`}>
                            {isRtl ? s.ar : s.en}
                          </button>
                        ))}
                      </div>
                      {activeHeading.textBgShape && activeHeading.textBgShape !== "none" && (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center gap-2">
                            <input type="color" value={activeHeading.textBgColor || "#1e293b"}
                              onChange={(e) => updateHeading(activeHeading.id, { textBgColor: e.target.value })}
                              className="w-7 h-7 rounded cursor-pointer bg-slate-900" />
                            <label className="text-[10px] text-slate-400 flex-1">
                              {isRtl ? "مساحة" : "Padding"}: {activeHeading.textBgPadding ?? 30}%
                            </label>
                          </div>
                          <input type="range" min="5" max="100" step="1" value={activeHeading.textBgPadding ?? 30}
                            onChange={(e) => updateHeading(activeHeading.id, { textBgPadding: parseFloat(e.target.value) })}
                            className="w-full accent-purple-500" />
                          <div>
                            <label className="text-[10px] text-slate-400 block">
                              {isRtl ? "الشفافية" : "Opacity"}: {Math.round((activeHeading.textBgOpacity ?? 1) * 100)}%
                            </label>
                            <input type="range" min="0.1" max="1" step="0.05" value={activeHeading.textBgOpacity ?? 1}
                              onChange={(e) => updateHeading(activeHeading.id, { textBgOpacity: parseFloat(e.target.value) })}
                              className="w-full accent-purple-500" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── Ornament (decorative flourish around text) ──── */}
                    <div className="bg-slate-900/60 rounded p-2 space-y-1.5">
                      <label className="text-[10px] text-slate-300 font-semibold">
                        ?ْ� {isRtl ? "💫 زخرفة جانبية" : "💫 Decorative ornament"}
                      </label>
                      <div className="grid grid-cols-2 gap-1">
                        {TEXT_ORNAMENT_LIST.map((o) => (
                          <button key={o.id}
                            onClick={() => updateHeading(activeHeading.id, { ornament: o.id })}
                            className={`py-1 px-1.5 rounded text-[10px] font-semibold transition truncate ${
                              (activeHeading.ornament || "none") === o.id
                                ? "bg-purple-500 text-white"
                                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                            }`}>
                            {isRtl ? o.nameAr : o.nameEn}
                          </button>
                        ))}
                      </div>
                      {activeHeading.ornament && activeHeading.ornament !== "none" && (
                        <div className="flex items-center gap-2 pt-1">
                          <input type="color" value={activeHeading.ornamentColor || activeHeading.color || "#d4af37"}
                            onChange={(e) => updateHeading(activeHeading.id, { ornamentColor: e.target.value })}
                            className="w-7 h-7 rounded cursor-pointer bg-slate-900" />
                          <span className="text-[10px] text-slate-400 flex-1">
                            {isRtl ? "لون الزخرفة" : "Ornament color"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {headings.length === 0 && (
                <div className="bg-slate-800/40 rounded-lg p-3 text-center">
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {isRtl
                      ? "لا توجد نصوص بعد. اضغط «+ إضافة نص» لكتابة عبارة مثل ثع🎯 أضحى مبارك?� بخط مزخرف."
                      : 'No texts yet. Click "Add text" to add an ornate phrase like "Eid Mubarak".'}
                  </p>
                </div>
              )}
            </div>
            </>)}

            {/* ───── DECOR tab: Decorations / Calligraphy ───── */}
            {/* ───── SOCIAL tab ───── */}
            {activePanel === "social" && (<>
            <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  📱 {isRtl ? "بوكس التواصل الاجتماعي" : "Social contact box"}
                </h3>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={socialBox.show}
                    onChange={(e) => updateSocial({ show: e.target.checked })} />
                  <span className="text-[10px] text-slate-300">{isRtl ? "إظهار" : "Show"}</span>
                </label>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                {isRtl
                  ? "أضف منصاتك وحساباتك — يظهرون في بوكس واحد منسّق على البطاقة. اسحبه بالماوس لتغيير موقعه."
                  : "Add your platforms + handles — they show in one tidy box on the card. Drag it to reposition."}
              </p>

              {/* Platform picker — grid of brand-coloured chips */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1.5">
                  {isRtl ? "أضف منصة:" : "Add a platform:"}
                </label>
                <div className="grid grid-cols-6 gap-1.5">
                  {SOCIAL_PLATFORMS.map((p) => (
                    <button key={p.id}
                      onClick={() => addSocialItem(p.id)}
                      title={isRtl ? p.nameAr : p.nameEn}
                      className="aspect-square rounded-lg overflow-hidden border border-slate-700 hover:scale-105 hover:border-cyan-300 transition"
                    >
                      <div className="w-full h-full"
                        dangerouslySetInnerHTML={{ __html: p.svg(p.brandColor, "#ffffff") }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Item list — each row: icon + handle input + delete + reorder */}
              {socialBox.items.length > 0 && (
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1.5">
                    {isRtl ? `الحسابات (${socialBox.items.length})` : `Accounts (${socialBox.items.length})`}
                  </label>
                  <div className="space-y-1.5">
                    {socialBox.items.map((it, idx) => {
                      const p = findPlatform(it.platform);
                      if (!p) return null;
                      return (
                        <div key={it.id} className="flex items-center gap-1.5 bg-slate-800/60 rounded p-1.5">
                          <div className="w-8 h-8 flex-shrink-0"
                            dangerouslySetInnerHTML={{ __html: p.svg(p.brandColor, "#ffffff") }} />
                          <input
                            type="text"
                            value={it.handle}
                            onChange={(e) => updateSocialItem(it.id, { handle: e.target.value })}
                            placeholder={isRtl ? p.placeholderAr : p.placeholderEn}
                            dir="ltr"
                            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-white min-w-0"
                          />
                          {/* Reorder arrows — useful in vertical layout */}
                          <button onClick={() => moveSocialItem(it.id, -1)}
                            disabled={idx === 0}
                            className="text-slate-400 hover:text-white disabled:opacity-30 text-[14px] leading-none w-5 h-5">▲</button>
                          <button onClick={() => moveSocialItem(it.id, +1)}
                            disabled={idx === socialBox.items.length - 1}
                            className="text-slate-400 hover:text-white disabled:opacity-30 text-[14px] leading-none w-5 h-5">▼</button>
                          <button onClick={() => removeSocialItem(it.id)}
                            className="text-red-400 hover:text-red-300 w-5 h-5">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Layout + style block — only meaningful once there's at least one item */}
            {socialBox.items.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  🎨 {isRtl ? "تنسيق البوكس" : "Box styling"}
                </h3>

                {/* Layout — 3 ways to arrange the chips */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "ترتيب" : "Layout"}</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: "vertical",   ar: "عمودي",  en: "Vertical" },
                      { id: "horizontal", ar: "أفقي",   en: "Horizontal" },
                      { id: "grid",       ar: "شبكة",   en: "Grid" },
                    ].map((m) => (
                      <button key={m.id}
                        onClick={() => updateSocial({ layout: m.id })}
                        className={`py-1.5 rounded text-[10px] font-semibold transition ${
                          socialBox.layout === m.id ? "bg-cyan-500 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}>
                        {isRtl ? m.ar : m.en}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colour mode */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "نمط الألوان" : "Color mode"}</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: "brand",   ar: "ألوان المنصات",  en: "Brand" },
                      { id: "mono",    ar: "لون موحد",       en: "Mono" },
                      { id: "outline", ar: "إطار فقط",       en: "Outline" },
                    ].map((m) => (
                      <button key={m.id}
                        onClick={() => updateSocial({ colorMode: m.id })}
                        className={`py-1.5 rounded text-[10px] font-semibold transition ${
                          socialBox.colorMode === m.id ? "bg-cyan-500 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}>
                        {isRtl ? m.ar : m.en}
                      </button>
                    ))}
                  </div>
                </div>

                {socialBox.colorMode === "mono" && (
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-slate-400 flex-1">{isRtl ? "لون الأيقونات" : "Icon color"}</label>
                    <input type="color" value={socialBox.monoColor}
                      onChange={(e) => updateSocial({ monoColor: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer bg-slate-800" />
                  </div>
                )}

                {/* Sizing */}
                <div>
                  <label className="text-[10px] text-slate-400 block">{isRtl ? "حجم الأيقونة" : "Icon size"}: {socialBox.iconSize}%</label>
                  <input type="range" min="3" max="20" step="0.5" value={socialBox.iconSize}
                    onChange={(e) => updateSocial({ iconSize: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-500" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">{isRtl ? "المسافة بين الأيقونات" : "Spacing"}: {socialBox.spacing}%</label>
                  <input type="range" min="0" max="100" step="2" value={socialBox.spacing}
                    onChange={(e) => updateSocial({ spacing: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-500" />
                </div>

                {/* Text colour + show labels */}
                {socialBox.layout !== "horizontal" && (
                  <>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={socialBox.showLabels}
                        onChange={(e) => updateSocial({ showLabels: e.target.checked })} />
                      <span className="text-[10px] text-slate-300">{isRtl ? "إظهار النص بجانب الأيقونة" : "Show text labels"}</span>
                    </label>
                    {socialBox.showLabels && (
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-slate-400 flex-1">{isRtl ? "لون النص" : "Text color"}</label>
                        <input type="color" value={socialBox.textColor}
                          onChange={(e) => updateSocial({ textColor: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer bg-slate-800" />
                      </div>
                    )}
                  </>
                )}

                {/* Background panel */}
                <div className="bg-slate-800/60 rounded-lg p-2 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={socialBox.bgEnabled}
                      onChange={(e) => updateSocial({ bgEnabled: e.target.checked })} />
                    <span className="text-[11px] text-slate-200 font-bold">{isRtl ? "خلفية مستديرة" : "Rounded background"}</span>
                  </label>
                  {socialBox.bgEnabled && (
                    <>
                      {/* Solid vs gradient — sticks at the top of the bg
                          options because it changes which controls below
                          are meaningful (opacity vs color-2 + angle). */}
                      <div className="grid grid-cols-2 gap-1 bg-slate-800/60 rounded p-1">
                        <button onClick={() => updateSocial({ bgMode: "solid" })}
                          className={`py-1 rounded text-[10px] font-bold transition ${
                            (socialBox.bgMode || "solid") === "solid" ? "bg-cyan-500 text-slate-900" : "text-slate-300 hover:bg-slate-700"
                          }`}>
                          {isRtl ? "لون واحد" : "Solid"}
                        </button>
                        <button onClick={() => updateSocial({ bgMode: "gradient" })}
                          className={`py-1 rounded text-[10px] font-bold transition ${
                            socialBox.bgMode === "gradient" ? "bg-cyan-500 text-slate-900" : "text-slate-300 hover:bg-slate-700"
                          }`}>
                          🌈 {isRtl ? "تدرّج" : "Gradient"}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <input type="color" value={socialBox.bgColor}
                          onChange={(e) => updateSocial({ bgColor: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer bg-slate-900" />
                        <label className="text-[10px] text-slate-400 flex-1">
                          {socialBox.bgMode === "gradient" ? (isRtl ? "اللون 1" : "Color 1") : (isRtl ? "لون الخلفية" : "Background")}
                        </label>
                      </div>

                      {socialBox.bgMode === "gradient" && (
                        <>
                          <div className="flex items-center gap-2">
                            <input type="color" value={socialBox.bgGradColor2 || "#1e293b"}
                              onChange={(e) => updateSocial({ bgGradColor2: e.target.value })}
                              className="w-8 h-8 rounded cursor-pointer bg-slate-900" />
                            <label className="text-[10px] text-slate-400 flex-1">{isRtl ? "اللون 2" : "Color 2"}</label>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block">{isRtl ? "اتجاه التدرّج" : "Angle"}: {socialBox.bgGradAngle || 135}°</label>
                            <input type="range" min="0" max="360" step="5" value={socialBox.bgGradAngle || 135}
                              onChange={(e) => updateSocial({ bgGradAngle: parseInt(e.target.value) })}
                              className="w-full accent-cyan-500" />
                          </div>
                          {/* Curated gradient presets */}
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "تدرّجات جاهزة" : "Presets"}</label>
                            <div className="grid grid-cols-3 gap-1">
                              {[
                                { c1: "#ec4899", c2: "#8b5cf6", a: 135 },
                                { c1: "#f59e0b", c2: "#ef4444", a: 135 },
                                { c1: "#10b981", c2: "#0d9488", a: 135 },
                                { c1: "#1e293b", c2: "#7c3aed", a: 135 },
                                { c1: "#fbbf24", c2: "#d4af37", a: 135 },
                                { c1: "#000000", c2: "#374151", a: 135 },
                              ].map((p, i) => (
                                <button key={i}
                                  onClick={() => updateSocial({ bgColor: p.c1, bgGradColor2: p.c2, bgGradAngle: p.a })}
                                  className="h-6 rounded border border-slate-600 hover:scale-105 transition"
                                  style={{ background: `linear-gradient(${p.a}deg, ${p.c1}, ${p.c2})` }} />
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Opacity only applies to solid mode — gradient
                          stops can already encode any alpha via the
                          colour pickers above. */}
                      {socialBox.bgMode !== "gradient" && (
                        <div>
                          <label className="text-[10px] text-slate-400 block">{isRtl ? "الشفافية" : "Opacity"}: {Math.round(socialBox.bgOpacity * 100)}%</label>
                          <input type="range" min="0.1" max="1" step="0.05" value={socialBox.bgOpacity}
                            onChange={(e) => updateSocial({ bgOpacity: parseFloat(e.target.value) })}
                            className="w-full accent-cyan-500" />
                        </div>
                      )}
                      <div>
                        <label className="text-[10px] text-slate-400 block">{isRtl ? "استدارة الزوايا" : "Corner radius"}: {socialBox.bgRadius}%</label>
                        <input type="range" min="0" max="80" step="2" value={socialBox.bgRadius}
                          onChange={(e) => updateSocial({ bgRadius: parseFloat(e.target.value) })}
                          className="w-full accent-cyan-500" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block">{isRtl ? "الحشو الداخلي" : "Padding"}: {socialBox.bgPadding}%</label>
                        <input type="range" min="0" max="100" step="2" value={socialBox.bgPadding}
                          onChange={(e) => updateSocial({ bgPadding: parseFloat(e.target.value) })}
                          className="w-full accent-cyan-500" />
                      </div>
                    </>
                  )}
                </div>

                {/* Position */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block">X: {socialBox.x.toFixed(1)}%</label>
                    <input type="range" min="0" max="100" step="0.5" value={socialBox.x}
                      onChange={(e) => updateSocial({ x: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-500" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Y: {socialBox.y.toFixed(1)}%</label>
                    <input type="range" min="0" max="100" step="0.5" value={socialBox.y}
                      onChange={(e) => updateSocial({ y: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-500" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">{isRtl ? "دوران" : "Rotation"}: {socialBox.rotation}°</label>
                  <input type="range" min="-180" max="180" value={socialBox.rotation}
                    onChange={(e) => updateSocial({ rotation: parseInt(e.target.value) })}
                    className="w-full accent-cyan-500" />
                </div>
                <p className="text-[10px] text-slate-500">{isRtl ? "💡 يمكنك سحب البوكس بالماوس على المعاينة." : "💡 You can drag the box directly on the preview."}</p>
              </div>
            )}
            </>)}

            {activePanel === "deco" && (<>
            {/* Quick-search shortcuts — one-click Google Images searches with
                the transparent-background filter pre-applied. Bridges the gap
                between "I want realistic art" and "I have to find PNG files
                manually". User clicks subject → external tab opens with
                pre-filtered results → they save the image → upload below. */}
            <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                🔍 {isRtl ? "🔍 ابحث عن صور حقيقيه (PNG شفاف)" : "🔍 Find realistic images (transparent PNG)"}
              </h3>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5 text-[10px] text-emerald-200 leading-relaxed">
                💡 {isRtl ? "اضغط على أي موضوع تبيه → يفتح بحث Google بصور PNG ذات خلفية شفافه فقط. احفظ الصوره (Right-click → Save Image) ثم ارفعها من زرّ «رفع زخرفه» تحت. هكذا تحصل على صور حقيقيه فعلاً (مو رسومات)." : "Click any subject → Google opens, pre-filtered to transparent-PNG results. Right-click → Save the image you like, then upload it via the 'Upload' button below. This gets you real photos (not illustrations)."}
              </div>

              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pe-1">
                {REAL_IMAGE_CATEGORIES.map((cat) => (
                  <div key={cat.en} className="space-y-1.5">
                    <h4 className="text-[11px] font-bold text-emerald-300/90 sticky top-0 bg-slate-900 py-0.5">
                      {isRtl ? cat.ar : cat.en}
                    </h4>
                    <div className="grid grid-cols-4 gap-1.5">
                      {cat.items.map((s) => (
                        <a
                          key={s.query}
                          href={googleImagesUrl(s.query)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center gap-0.5 p-2 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-slate-900 border border-slate-700 hover:border-emerald-300 transition group"
                          title={isRtl ? s.ar : s.en}
                        >
                          <span className="text-xl leading-none">{s.emoji}</span>
                          <span className="text-[9.5px] font-semibold truncate w-full text-center">
                            {isRtl ? s.ar : s.en}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed pt-1 border-t border-slate-800">
                {isRtl ? "📌 مواقع أخرى مفيدة: " : "📌 Other useful sources: "}
                <a href="https://pngwing.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">pngwing.com</a>
                {" ط "}
                <a href="https://pngegg.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">pngegg.com</a>
                {" ط "}
                <a href="https://www.stickpng.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">stickpng.com</a>
                {" ط "}
                <a href="https://www.freepik.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">freepik.com</a>
              </p>
            </div>

            {/* Decorations — calligraphy / ornament images for that Photoshop-level look */}
            <div className="bg-slate-900 border border-amber-500/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  {isRtl ? "🎨 زخارف وكاليجرافي" : "🎨 Calligraphy & Decorations"}
                </h3>
                <button
                  onClick={() => decorationInputRef.current?.click()}
                  disabled={uploadingDecoration}
                  className="text-[10px] px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold transition disabled:opacity-50"
                >
                  {uploadingDecoration ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "+ "}
                  {isRtl ? "رفع زخرفة" : "Upload"}
                </button>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 text-[10px] text-amber-200 leading-relaxed">
                💡 {isRtl ? "خطوط الكاليجرافي الفنيّة (مثل «عيد أضحى مبارك» الفاخرة) ليست خطوطاً برمجية بل لوحات يدويّة. ابحث في Google عن «عيد مبارك png شفاف» أو «خط ديواني png»، نزّل الصورة بخلفية شفافة، ثم ارفعها هنا — يمكنك تلوينها وتدويرها وتغيير حجمها بحرية." : "Premium calligraphy (like the ornate Eid Mubarak you saw) isn't a programmatic font — it's hand-drawn art. Search 'Eid Mubarak png transparent' or 'Arabic calligraphy png', download a transparent PNG, then upload here. You can recolor, rotate, and resize it freely."}
              </div>

              {/* ⚡ Smart add — paste image (Ctrl+V) or an image URL, straight to canvas */}
              <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-lg p-2.5 space-y-2">
                <p className="text-[11px] text-emerald-200 font-bold flex items-center gap-1">
                  ⚡ {isRtl ? "إضافة ذكية — بدون تحميل ملفات" : "Smart add — no downloads"}
                </p>
                <p className="text-[10px] text-emerald-200/90 leading-relaxed">
                  {isRtl
                    ? "في Google: كليك يمين على الصورة → «نسخ الصورة» ثم الصقها هنا بـ Ctrl+V وتنضاف فوراً. أو «نسخ عنوان الصورة» والصق الرابط في الخانة تحت."
                    : "In Google: right-click the image → \"Copy image\", then press Ctrl+V here to drop it on the canvas. Or \"Copy image address\" and paste the link below."}
                </p>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={decoUrlInput}
                    onChange={(e) => setDecoUrlInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddDecoUrl(); } }}
                    placeholder={isRtl ? "الصق رابط الصورة هنا…" : "Paste image URL here…"}
                    dir="ltr"
                    className="flex-1 bg-slate-800 border border-emerald-500/40 rounded px-2 py-1.5 text-[11px] text-white placeholder-slate-500 outline-none focus:border-emerald-400"
                  />
                  <button
                    onClick={handleAddDecoUrl}
                    disabled={addingDecoUrl || !decoUrlInput.trim()}
                    className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-[11px] font-bold transition disabled:opacity-50 whitespace-nowrap"
                  >
                    {addingDecoUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : (isRtl ? "إضافة" : "Add")}
                  </button>
                </div>
              </div>

              {/* Decorations list */}
              {decorations.length > 0 && (
                <div className="space-y-1">
                  {decorations.map((d, i) => (
                    <button
                      key={d.id}
                      onClick={() => setActiveDecorationId(d.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition ${
                        activeDecorationId === d.id ? "bg-amber-500/20 border border-amber-500/60" : "bg-slate-800 hover:bg-slate-700 border border-transparent"
                      }`}
                    >
                      <img src={d.url} alt="" className="w-8 h-8 object-contain rounded bg-slate-700 border border-slate-600" />
                      <span className="flex-1 text-start text-slate-200 truncate text-[10px]">
                        {isRtl ? `#${i + 1}` : `#${i + 1}`} ط {d.naturalW}?�{d.naturalH}
                      </span>
                      <span onClick={(e) => { e.stopPropagation(); duplicateDecoration(d.id); }}
                        title={isRtl ? "تكرار (لقصّها لأجزاء مختلفة)" : "Duplicate (for splitting into pieces)"}
                        className="text-slate-400 hover:text-white cursor-pointer">
                        <Copy className="w-3 h-3" />
                      </span>
                      <span onClick={(e) => { e.stopPropagation(); deleteDecoration(d.id); }} className="text-red-400 hover:text-red-300 cursor-pointer">
                        <Trash2 className="w-3 h-3" />
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Active decoration editor */}
              {activeDecoration && (
                <div className="bg-slate-800/60 border border-amber-500/30 rounded-lg p-2 space-y-2">
                  {/* Quick actions */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => duplicateDecoration(activeDecoration.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-slate-900 hover:bg-amber-500 hover:text-slate-900 text-[10px] text-slate-200 transition"
                      title={isRtl ? "أنشئ نسخة لقصّ كلمة منها" : "Create a copy for cropping"}
                    >
                      <Copy className="w-3 h-3" />
                      {isRtl ? "تكرار لقصّها" : "Duplicate"}
                    </button>
                    <button
                      onClick={handleRemoveDecoBg}
                      disabled={removingDecoBg}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-fuchsia-700 hover:bg-fuchsia-600 text-[10px] text-white font-semibold transition disabled:opacity-60"
                      title={isRtl ? "يشيل المربعات / أي خلفية ويترك العنصر نظيف" : "Strip checkerboard / any background"}
                    >
                      {removingDecoBg
                        ? <><Loader2 className="w-3 h-3 animate-spin" />{decoBgProgress || (isRtl ? "جارٍ…" : "…")}</>
                        : <>✂️ {isRtl ? "إزالة الخلفية" : "Remove BG"}</>}
                    </button>
                  </div>

                  {/* 📱 Screen fit — drop this image onto a phone/laptop screen via 4 corners */}
                  <div className={`rounded-lg p-2 space-y-2 ${activeDecoration.screenFit?.enabled ? "bg-emerald-500/15 border border-emerald-500/60" : "bg-slate-900/60 border border-emerald-500/30"}`}>
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-emerald-200 font-bold flex items-center gap-1">
                        📱 {isRtl ? "تركيب على الشاشة (٤ زوايا)" : "Fit onto screen (4 corners)"}
                      </label>
                      <button
                        onClick={toggleScreenFit}
                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition ${activeDecoration.screenFit?.enabled ? "bg-emerald-500 text-slate-900" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
                      >
                        {activeDecoration.screenFit?.enabled ? (isRtl ? "مفعّل ✓" : "ON ✓") : (isRtl ? "تفعيل" : "Enable")}
                      </button>
                    </div>
                    {activeDecoration.screenFit?.enabled ? (
                      <>
                        <p className="text-[10px] text-emerald-200/90 leading-relaxed">
                          {isRtl
                            ? "اسحب النقاط الخضراء الأربع على المعاينة وحطّها على زوايا شاشة الجوال — الصورة تنحني وتتطابق مع الشاشة بالضبط ولا تطلع برّا."
                            : "Drag the 4 green dots onto the phone-screen corners. The image bends to fit the screen exactly and never overflows."}
                        </p>
                        <button
                          onClick={() => updateDecoration(activeDecoration.id, { screenFit: { ...activeDecoration.screenFit, corners: DEFAULT_SCREEN_CORNERS.map((c) => ({ ...c })) } })}
                          className="w-full py-1 rounded bg-slate-700 hover:bg-slate-600 text-[10px] text-slate-200 transition"
                        >
                          {isRtl ? "🔄 إعادة ضبط الزوايا" : "🔄 Reset corners"}
                        </button>
                      </>
                    ) : (
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        {isRtl
                          ? "فعّلها لتضع هذه الصورة داخل شاشة جوال/لابتوب في القالب بزاوية مظبوطة."
                          : "Enable to place this image inside a phone/laptop screen at the right angle."}
                      </p>
                    )}
                  </div>

                  {/* 🔍 Paint by click — pick a color, click on a word/letter to flood-fill it */}
                  <div className={`rounded-lg p-2 space-y-2 ${paintingDecorationId === activeDecoration.id ? "bg-pink-500/15 border border-pink-500/60" : "bg-slate-900/60 border border-pink-500/30"}`}>
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-pink-200 font-bold flex items-center gap-1">
                        🔍 {isRtl ? "🖌️ قلم تلوين بالنقر" : "🖌️ Paint by click"}
                      </label>
                      <button
                        onClick={() => setPaintingDecorationId(
                          paintingDecorationId === activeDecoration.id ? null : activeDecoration.id
                        )}
                        className={`text-[10px] px-2.5 py-1 rounded font-bold transition ${
                          paintingDecorationId === activeDecoration.id
                            ? "bg-pink-500 text-white"
                            : "bg-slate-800 text-slate-300 hover:bg-pink-500 hover:text-white"
                        }`}
                      >
                        {paintingDecorationId === activeDecoration.id
                          ? (isRtl ? "⏹ إنهاء التلوين" : "⏹ Exit paint")
                          : (isRtl ? "▶ تفعيل القلم" : "▶ Start painting")}
                      </button>
                    </div>

                    {paintingDecorationId === activeDecoration.id ? (
                      <>
                        <p className="text-[10px] text-pink-100 leading-tight">
                          {eraserMode
                            ? (isRtl ? "🧹 ممحاة: انقر على جزء من الزخرفة لحذفه (يصير شفافاً) دون التأثير على الباقي." : "🧹 Eraser: click a part to delete it (becomes transparent) without affecting the rest.")
                            : (isRtl ? "اختر لوناً ثم انقر على أي حرف/كلمة → ستتلوّن المنطقة المتّصلة فوراً." : "Pick a color then click any letter/word → the connected region floods with that color.")}
                        </p>

                        {/* Tool mode: Paint vs Erase */}
                        <div className="grid grid-cols-2 gap-1 bg-slate-900/60 rounded p-1">
                          <button onClick={() => setEraserMode(false)}
                            className={`py-1.5 rounded text-[11px] font-bold transition ${!eraserMode ? "bg-pink-500 text-white" : "text-slate-300 hover:bg-slate-700"}`}>
                            🔍 {isRtl ? "قلم" : "Paint"}
                          </button>
                          <button onClick={() => setEraserMode(true)}
                            className={`py-1.5 rounded text-[11px] font-bold transition ${eraserMode ? "bg-pink-500 text-white" : "text-slate-300 hover:bg-slate-700"}`}>
                            🧹 {isRtl ? "ممحاة" : "Eraser"}
                          </button>
                        </div>

                        {/* Current color — only when in paint mode */}
                        {!eraserMode && (
                          <div>
                            <label className="text-[10px] text-slate-300 block mb-1">{isRtl ? "اللون الحالي" : "Current color"}</label>
                            <div className="flex items-center gap-2">
                              <input type="color" value={paintColor}
                                onChange={(e) => setPaintColor(e.target.value)}
                                className="w-9 h-9 rounded cursor-pointer bg-slate-900" />
                              <div className="flex flex-wrap gap-1 flex-1">
                                {QUICK_COLORS.map((c) => (
                                  <button key={c} onClick={() => setPaintColor(c)}
                                    className="w-5 h-5 rounded-full hover:scale-110 transition"
                                    style={{ background: c, outline: paintColor === c ? "2px solid #ec4899" : "1px solid #475569" }} />
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {activeDecoration.paintMap && (
                          <button onClick={() => updateDecoration(activeDecoration.id, { paintMap: null })}
                            className="w-full py-1.5 rounded bg-slate-800 hover:bg-red-600 text-[10px] text-slate-200 transition">
                            🔍 {isRtl ? "إعادة الزخرفة لأصلها" : "Restore original"}
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="text-[10px] text-slate-400 leading-tight">
                        {isRtl ? "🎯 أدق طريقة لتلوين كل كلمة بلون. اضغط «تفعيل القلم» ثم انقر على المعاينة." : "🎯 Most precise way to color each word. Click \"Start painting\" then click on the preview."}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block">{isRtl ? "الحجم" : "Size"}: {activeDecoration.width.toFixed(1)}%</label>
                    <input type="range" min="5" max="100" step="0.5" value={activeDecoration.width}
                      onChange={(e) => updateDecoration(activeDecoration.id, { width: parseFloat(e.target.value) })}
                      className="w-full accent-amber-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block">X: {activeDecoration.x.toFixed(1)}%</label>
                      <input type="range" min="0" max="100" step="0.5" value={activeDecoration.x}
                        onChange={(e) => updateDecoration(activeDecoration.id, { x: parseFloat(e.target.value) })}
                        className="w-full accent-amber-500" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">Y: {activeDecoration.y.toFixed(1)}%</label>
                      <input type="range" min="0" max="100" step="0.5" value={activeDecoration.y}
                        onChange={(e) => updateDecoration(activeDecoration.id, { y: parseFloat(e.target.value) })}
                        className="w-full accent-amber-500" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">{isRtl ? "دوران" : "Rotation"}: {activeDecoration.rotation}ذ</label>
                    <input type="range" min="-180" max="180" value={activeDecoration.rotation}
                      onChange={(e) => updateDecoration(activeDecoration.id, { rotation: parseInt(e.target.value) })}
                      className="w-full accent-amber-500" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">{isRtl ? "الشفافية" : "Opacity"}: {Math.round((activeDecoration.opacity ?? 1) * 100)}%</label>
                    <input type="range" min="0.1" max="1" step="0.05" value={activeDecoration.opacity ?? 1}
                      onChange={(e) => updateDecoration(activeDecoration.id, { opacity: parseFloat(e.target.value) })}
                      className="w-full accent-amber-500" />
                  </div>

                  {/* Crop — show only a rectangle of the source image. Use with Duplicate
                      to split a multi-word calligraphy PNG into independently-coloured pieces. */}
                  <div className="bg-slate-900/60 border border-slate-700 rounded p-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-slate-300 font-bold flex items-center gap-1">
                        <Crop className="w-3 h-3" /> {isRtl ? "قصّ — لإظهار جزء فقط" : "Crop — show partial image"}
                      </label>
                      {((activeDecoration.cropTop || 0) + (activeDecoration.cropRight || 0) + (activeDecoration.cropBottom || 0) + (activeDecoration.cropLeft || 0)) > 0 && (
                        <button onClick={() => updateDecoration(activeDecoration.id, { cropTop: 0, cropRight: 0, cropBottom: 0, cropLeft: 0 })}
                          className="text-[10px] text-slate-400 hover:text-white">
                          �? {isRtl ? "إعادة" : "Reset"}
                        </button>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-500 leading-tight">
                      {isRtl
                        ? "💡 كرّر الزخرفة 3 مرات، اقصّ كل نسخة لإظهار كلمة، لوّن كلاً بلون."
                        : "💡 Duplicate 3×, crop each to one word, color each separately."}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[9px] text-slate-400 block">{isRtl ? "علوي" : "Top"}: {activeDecoration.cropTop ?? 0}%</label>
                        <input type="range" min="0" max="95" value={activeDecoration.cropTop ?? 0}
                          onChange={(e) => updateDecoration(activeDecoration.id, { cropTop: parseInt(e.target.value) })}
                          className="w-full accent-amber-500" />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 block">{isRtl ? "سفلي" : "Bottom"}: {activeDecoration.cropBottom ?? 0}%</label>
                        <input type="range" min="0" max="95" value={activeDecoration.cropBottom ?? 0}
                          onChange={(e) => updateDecoration(activeDecoration.id, { cropBottom: parseInt(e.target.value) })}
                          className="w-full accent-amber-500" />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 block">{isRtl ? "يسار" : "Left"}: {activeDecoration.cropLeft ?? 0}%</label>
                        <input type="range" min="0" max="95" value={activeDecoration.cropLeft ?? 0}
                          onChange={(e) => updateDecoration(activeDecoration.id, { cropLeft: parseInt(e.target.value) })}
                          className="w-full accent-amber-500" />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 block">{isRtl ? "يمين" : "Right"}: {activeDecoration.cropRight ?? 0}%</label>
                        <input type="range" min="0" max="95" value={activeDecoration.cropRight ?? 0}
                          onChange={(e) => updateDecoration(activeDecoration.id, { cropRight: parseInt(e.target.value) })}
                          className="w-full accent-amber-500" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                      <label className="text-[10px] text-slate-400">{isRtl ? "🎨 تلوين الزخرفة" : "🎨 Recolor"}</label>
                      <div className="flex gap-1 flex-wrap">
                        <button
                          onClick={() => updateDecoration(activeDecoration.id, { useGradient: !activeDecoration.useGradient, useMultiColor: false, color: activeDecoration.color || "#d4af37" })}
                          className={`text-[10px] px-2 py-0.5 rounded transition ${activeDecoration.useGradient ? "bg-amber-500 text-slate-900" : "bg-slate-900 text-slate-300"}`}
                        >
                          {isRtl ? (activeDecoration.useGradient ? "🌈 تدرّج" : "+ تدرّج") : (activeDecoration.useGradient ? "🌈 Gradient" : "+ Gradient")}
                        </button>
                        <button
                          onClick={() => updateDecoration(activeDecoration.id, { useMultiColor: !activeDecoration.useMultiColor, useGradient: false })}
                          className={`text-[10px] px-2 py-0.5 rounded transition ${activeDecoration.useMultiColor ? "bg-emerald-500 text-slate-900" : "bg-slate-900 text-slate-300"}`}
                          title={isRtl ? "قسّم الزخرفة لمناطق ألوان" : "Split into colour zones"}
                        >
                          {isRtl ? (activeDecoration.useMultiColor ? "🎨 مناطق" : "+ 🎨 مناطق") : (activeDecoration.useMultiColor ? "🎨 Zones" : "+ 🎨 Zones")}
                        </button>
                        {(activeDecoration.color || activeDecoration.useGradient || activeDecoration.useMultiColor) && (
                          <button onClick={() => updateDecoration(activeDecoration.id, { color: "", useGradient: false, useMultiColor: false })}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-700 text-slate-300">
                            {isRtl ? "× أصلي" : "× Original"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Multi-colour zones editor — only shown when useMultiColor is on */}
                    {activeDecoration.useMultiColor && (() => {
                      const zones = [...(activeDecoration.colorZones || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
                      const setZones = (next) => updateDecoration(activeDecoration.id, { colorZones: next });
                      const addZone = () => {
                        if (zones.length >= 6) return;
                        const last = zones[zones.length - 1]?.position ?? 0;
                        const newPos = Math.min(99, Math.round((last + 100) / 2));
                        const palette = ["#dc2626", "#d4af37", "#16a34a", "#3b82f6", "#7c3aed", "#ec4899"];
                        setZones([...zones, { color: palette[zones.length % palette.length], position: newPos }]);
                      };
                      const removeZone = (i) => { if (zones.length > 2) setZones(zones.filter((_, j) => j !== i)); };
                      const updateZone = (i, patch) => setZones(zones.map((z, j) => j === i ? { ...z, ...patch } : z));
                      return (
                        <div className="mt-1 bg-slate-900/80 border border-emerald-500/40 rounded p-2 space-y-2">
                          <p className="text-[10px] text-emerald-200 leading-tight">
                            {isRtl ? "💡 الزخرفة تنقسم لمناطق بألوان حادّة. اسحب «الموضع» ليطابق حدود الكلمات." : "💡 The decoration is split into hard-edged colour bands. Drag positions to match word boundaries."}
                          </p>

                          {/* Direction */}
                          <div>
                            <label className="text-[10px] text-slate-400 block">{isRtl ? "اتجاه التقسيم" : "Direction"}: {activeDecoration.multiColorAngle}ذ</label>
                            <input type="range" min="0" max="360" step="5" value={activeDecoration.multiColorAngle}
                              onChange={(e) => updateDecoration(activeDecoration.id, { multiColorAngle: parseInt(e.target.value) })}
                              className="w-full accent-emerald-500" />
                            <div className="flex gap-1 mt-1">
                              {[
                                { l: isRtl ? "→ أفقي" : "→ Horiz", v: 90 },
                                { l: isRtl ? "← معكوس" : "← Rev", v: 270 },
                                { l: isRtl ? "↓ عمودي" : "↓ Vert", v: 180 },
                                { l: isRtl ? "↗ مائل" : "↗ Diag", v: 45 },
                              ].map((d) => (
                                <button key={d.v} onClick={() => updateDecoration(activeDecoration.id, { multiColorAngle: d.v })}
                                  className={`flex-1 py-0.5 rounded text-[9px] ${activeDecoration.multiColorAngle === d.v ? "bg-emerald-500 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
                                  {d.l}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Zone list */}
                          <div className="space-y-1.5">
                            {zones.map((z, i) => (
                              <div key={i} className="bg-slate-800/60 rounded p-1.5 space-y-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-slate-400 w-12 flex-shrink-0">{isRtl ? `منطقة ${i + 1}` : `Zone ${i + 1}`}</span>
                                  <input type="color" value={z.color}
                                    onChange={(e) => updateZone(i, { color: e.target.value })}
                                    className="w-7 h-7 rounded cursor-pointer bg-slate-900" />
                                  <div className="flex gap-0.5 flex-1">
                                    {QUICK_COLORS.slice(0, 6).map((c) => (
                                      <button key={c} onClick={() => updateZone(i, { color: c })}
                                        className="w-4 h-4 rounded-full hover:scale-110 transition"
                                        style={{ background: c, outline: z.color === c ? "1.5px solid #10b981" : "1px solid #475569" }} />
                                    ))}
                                  </div>
                                  {zones.length > 2 && (
                                    <button onClick={() => removeZone(i)}
                                      className="text-red-400 hover:text-red-300 px-1">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                {i > 0 && (
                                  <div>
                                    <label className="text-[9px] text-slate-400 block">{isRtl ? "حدّ البداية" : "Start at"}: {z.position}%</label>
                                    <input type="range" min={i === 0 ? 0 : 1} max="99" value={z.position}
                                      onChange={(e) => updateZone(i, { position: parseInt(e.target.value) })}
                                      className="w-full accent-emerald-500" />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Add zone */}
                          {zones.length < 6 && (
                            <button onClick={addZone}
                              className="w-full py-1 rounded bg-slate-800 hover:bg-emerald-500 hover:text-slate-900 text-[10px] text-emerald-300 transition">
                              + {isRtl ? "إضافة منطقة" : "Add zone"}
                            </button>
                          )}

                          {/* Preset arrangements */}
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "تقسيمات سريعة" : "Quick presets"}</label>
                            <div className="grid grid-cols-3 gap-1">
                              <button onClick={() => setZones([
                                { color: "#dc2626", position: 0 },
                                { color: "#16a34a", position: 50 },
                              ])} className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200">
                                {isRtl ? "كلمتين" : "2 zones"}
                              </button>
                              <button onClick={() => setZones([
                                { color: "#dc2626", position: 0 },
                                { color: "#d4af37", position: 33 },
                                { color: "#16a34a", position: 66 },
                              ])} className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200">
                                {isRtl ? "ثلاث" : "3 zones"}
                              </button>
                              <button onClick={() => setZones([
                                { color: "#dc2626", position: 0 },
                                { color: "#d4af37", position: 25 },
                                { color: "#16a34a", position: 50 },
                                { color: "#3b82f6", position: 75 },
                              ])} className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200">
                                {isRtl ? "أربع" : "4 zones"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="flex items-center gap-2 mb-1">
                      <input type="color" value={activeDecoration.color || "#ffffff"}
                        onChange={(e) => updateDecoration(activeDecoration.id, { color: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer bg-slate-900" />
                      <div className="flex flex-wrap gap-1 flex-1">
                        {QUICK_COLORS.map((c) => (
                          <button key={c} onClick={() => updateDecoration(activeDecoration.id, { color: c })}
                            className="w-5 h-5 rounded-full hover:scale-110 transition"
                            style={{ background: c, outline: activeDecoration.color === c ? "2px solid #fbbf24" : "1px solid #475569" }} />
                        ))}
                      </div>
                    </div>

                    {/* Gradient controls — only shown when gradient is enabled */}
                    {activeDecoration.useGradient && (
                      <div className="mt-2 bg-slate-900/80 border border-slate-700 rounded p-2 space-y-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "اللون الثاني" : "Second color"}</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={activeDecoration.gradientColor2}
                              onChange={(e) => updateDecoration(activeDecoration.id, { gradientColor2: e.target.value })}
                              className="w-8 h-8 rounded cursor-pointer bg-slate-900" />
                            <div className="flex flex-wrap gap-1 flex-1">
                              {QUICK_COLORS.map((c) => (
                                <button key={c} onClick={() => updateDecoration(activeDecoration.id, { gradientColor2: c })}
                                  className="w-5 h-5 rounded-full hover:scale-110 transition"
                                  style={{ background: c, outline: activeDecoration.gradientColor2 === c ? "2px solid #fbbf24" : "1px solid #475569" }} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block">{isRtl ? "اتجاه التقسيم" : "Direction"}: {activeDecoration.gradientAngle}ذ</label>
                          <input type="range" min="0" max="360" step="5" value={activeDecoration.gradientAngle}
                            onChange={(e) => updateDecoration(activeDecoration.id, { gradientAngle: parseInt(e.target.value) })}
                            className="w-full accent-amber-500" />
                          <div className="flex gap-1 mt-1">
                            {[
                              { l: "→", v: 90 }, { l: "�?", v: 270 },
                              { l: "↑", v: 0 }, { l: "↓", v: 180 },
                              { l: "�?", v: 135 }, { l: "↗", v: 45 },
                            ].map((d) => (
                              <button key={d.v} onClick={() => updateDecoration(activeDecoration.id, { gradientAngle: d.v })}
                                className={`flex-1 py-0.5 rounded text-[10px] ${activeDecoration.gradientAngle === d.v ? "bg-amber-500 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
                                {d.l}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "مزائج جاهزة" : "Ready combos"}</label>
                          <div className="grid grid-cols-2 gap-1">
                            {[
                              { name: isRtl ? "ذهبي" : "Gold",     c1: "#d4af37", c2: "#fde047", a: 90 },
                              { name: isRtl ? "فاخر" : "Luxury",   c1: "#7c3aed", c2: "#ec4899", a: 135 },
                              { name: isRtl ? "غروب" : "Sunset",   c1: "#f59e0b", c2: "#ef4444", a: 135 },
                              { name: isRtl ? "ملكي" : "Royal",    c1: "#1e293b", c2: "#d4af37", a: 45 },
                              { name: isRtl ? "زمرد" : "Emerald",  c1: "#065f46", c2: "#10b981", a: 90 },
                              { name: isRtl ? "نحاسي" : "Copper",  c1: "#92400e", c2: "#fbbf24", a: 90 },
                            ].map((p) => (
                              <button key={p.name}
                                onClick={() => updateDecoration(activeDecoration.id, { color: p.c1, gradientColor2: p.c2, gradientAngle: p.a })}
                                className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 transition">
                                <span className="w-4 h-4 rounded border border-slate-600"
                                  style={{ background: `linear-gradient(${p.a}deg, ${p.c1}, ${p.c2})` }} />
                                {p.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <input ref={decorationInputRef} type="file" accept="image/*,.heic,.heif,image/svg+xml" className="hidden" onChange={handleDecorationUpload} />
            </div>
            </>)}

            {/* ───── NAMES tab: Excel + Name styling ───── */}
            {activePanel === "names" && (<>
            {/* Step 3: Names */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">3</span>
                {isRtl ? "قائمة الأسماء (Excel/CSV)" : "Names list (Excel/CSV)"}
              </h3>
              <button
                onClick={() => namesInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {names.length > 0 ? (isRtl ? `${names.length} اسم — تغيير` : `${names.length} names — change`) : (isRtl ? "رفع ملف Excel/CSV" : "Upload Excel/CSV")}
              </button>
              <input ref={namesInputRef} type="file" accept=".xlsx,.xls,.csv,.ods" className="hidden" onChange={handleNames} />
              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                {isRtl
                  ? "💡 أول عمود ??حو?? الأسماء — أو ضع عنواناً «الاسم» / «Name» ???? الصف الأول."
                  : '💡 First column = names — or use a header "Name" / "الاسم" in the first row.'}
              </p>
              {names.length > 0 && (
                <div className="mt-2 max-h-28 overflow-y-auto bg-slate-800/50 rounded p-2 text-[11px] space-y-0.5">
                  {names.slice(0, 8).map((n, i) => (
                    <div key={i} className="text-slate-300 flex items-center gap-2">
                      <span className="text-slate-500 text-[9px] w-5">{i + 1}.</span>
                      <span className="truncate">{n}</span>
                    </div>
                  ))}
                  {names.length > 8 && <p className="text-slate-500 text-[10px]">+ {names.length - 8} {isRtl ? "آخر" : "more"}</p>}
                  <button onClick={() => setNames([])} className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 mt-1">
                    <Trash2 className="w-3 h-3" /> {isRtl ? "مسح القائمة" : "Clear list"}
                  </button>
                </div>
              )}
            </div>

            {/* Step 4: Text styling */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">4</span>
                {isRtl ? "تنسيق الاسم" : "Name styling"}
              </h3>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  {isRtl ? "نوع الخط" : "Font"} <span className="text-indigo-400">— {isRtl ? "مرّر فوق الخط لرؤيته فوراً" : "hover to preview live"}</span>
                </label>
                <FontPicker
                  value={style.fontFamily}
                  onChange={(name) => updateStyle({ fontFamily: name })}
                  fonts={FONTS}
                  isRtl={isRtl}
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block">{isRtl ? "حجم الخط" : "Size"}: {style.fontSize}%</label>
                <input type="range" min="2" max="20" step="0.5" value={style.fontSize}
                  onChange={(e) => updateStyle({ fontSize: parseFloat(e.target.value) })} className="w-full accent-indigo-500" />
              </div>

              {/* Multi-line controls for the recipient name */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block">
                    {isRtl ? "عرض الصندوق" : "Box width"}: {style.textWidth ? `${style.textWidth}%` : (isRtl ? "تلقائي" : "auto")}
                  </label>
                  <input type="range" min="0" max="100" value={style.textWidth || 0}
                    onChange={(e) => updateStyle({ textWidth: parseInt(e.target.value) })} className="w-full accent-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">
                    {isRtl ? "تباعد السطور" : "Line spacing"}: {(style.lineHeight || 1.2).toFixed(2)}
                  </label>
                  <input type="range" min="0.8" max="2.5" step="0.05" value={style.lineHeight || 1.2}
                    onChange={(e) => updateStyle({ lineHeight: parseFloat(e.target.value) })} className="w-full accent-indigo-500" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 gap-1">
                  <label className="text-[10px] text-slate-400">{isRtl ? "اللون" : "Color"}</label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => updateStyle({ useGradient: !style.useGradient, fillImage: null })}
                      className={`text-[10px] px-2 py-0.5 rounded transition ${style.useGradient ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300"}`}
                    >
                      {isRtl ? (style.useGradient ? "🌈 تدرّج" : "+ تدرّج") : (style.useGradient ? "🌈 Gradient" : "+ Gradient")}
                    </button>
                    <button
                      onClick={async () => {
                        if (style.fillImage) {
                          URL.revokeObjectURL(style.fillImage);
                          updateStyle({ fillImage: null });
                          return;
                        }
                        const url = await pickImageAsObjectUrl();
                        if (url) updateStyle({ fillImage: url, useGradient: false });
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded transition ${style.fillImage ? "bg-pink-600 text-white" : "bg-slate-800 text-slate-300"}`}
                      title={isRtl ? "اجعل الحروف مفرّغة وفيها صورة" : "Fill text with an image (image-clipped text)"}
                    >
                      {isRtl ? (style.fillImage ? "📌 صورة مفعّلة" : "📌 صورة داخل النص") : (style.fillImage ? "📌 Image on" : "📌 Image in text")}
                    </button>
                  </div>
                </div>
                {style.fillImage && (
                  <div className="mb-2 flex items-center gap-2 bg-pink-500/10 border border-pink-500/30 rounded p-1.5">
                    <img src={style.fillImage} alt="" className="w-10 h-10 object-cover rounded border border-pink-500/40" />
                    <p className="flex-1 text-[10px] text-pink-200 leading-tight">
                      {isRtl ? "النص الآن يظهر الصورة عبر شكل الحروف" : "Text now shows the image through the glyphs"}
                    </p>
                    <button onClick={async () => {
                      const url = await pickImageAsObjectUrl();
                      if (url) { URL.revokeObjectURL(style.fillImage); updateStyle({ fillImage: url }); }
                    }} className="text-[10px] px-2 py-1 rounded bg-pink-700 hover:bg-pink-600 text-white">
                      {isRtl ? "تغيير" : "Change"}
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input type="color" value={style.color} onChange={(e) => updateStyle({ color: e.target.value })}
                    className="w-9 h-9 rounded cursor-pointer bg-slate-800" />
                  <div className="flex flex-wrap gap-1 flex-1">
                    {QUICK_COLORS.map((c) => (
                      <button key={c} onClick={() => updateStyle({ color: c })}
                        className="w-5 h-5 rounded-full hover:scale-110 transition"
                        style={{ background: c, outline: style.color === c ? "2px solid #818cf8" : "1px solid #475569" }} />
                    ))}
                  </div>
                </div>

                {/* Gradient — second color + angle + ready-made combos */}
                {style.useGradient && (
                  <div className="mt-2 bg-slate-800/60 border border-slate-700 rounded p-2 space-y-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "اللون الثاني" : "Second color"}</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={style.gradientColor2}
                          onChange={(e) => updateStyle({ gradientColor2: e.target.value })}
                          className="w-9 h-9 rounded cursor-pointer bg-slate-800" />
                        <div className="flex flex-wrap gap-1 flex-1">
                          {QUICK_COLORS.map((c) => (
                            <button key={c} onClick={() => updateStyle({ gradientColor2: c })}
                              className="w-5 h-5 rounded-full hover:scale-110 transition"
                              style={{ background: c, outline: style.gradientColor2 === c ? "2px solid #818cf8" : "1px solid #475569" }} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">{isRtl ? "اتجاه التقسيم" : "Direction"}: {style.gradientAngle}ذ</label>
                      <input type="range" min="0" max="360" step="5" value={style.gradientAngle}
                        onChange={(e) => updateStyle({ gradientAngle: parseInt(e.target.value) })}
                        className="w-full accent-indigo-500" />
                      <div className="flex gap-1 mt-1">
                        {[
                          { l: "→", v: 90 }, { l: "�?", v: 270 },
                          { l: "↑", v: 0 }, { l: "↓", v: 180 },
                          { l: "�?", v: 135 }, { l: "↗", v: 45 },
                        ].map((d) => (
                          <button key={d.v} onClick={() => updateStyle({ gradientAngle: d.v })}
                            className={`flex-1 py-0.5 rounded text-[10px] ${style.gradientAngle === d.v ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
                            {d.l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "مزائج جاهزة" : "Ready combos"}</label>
                      <div className="grid grid-cols-2 gap-1">
                        {[
                          { name: isRtl ? "ذهبي" : "Gold",     c1: "#d4af37", c2: "#fde047", a: 90 },
                          { name: isRtl ? "فاخر" : "Luxury",   c1: "#7c3aed", c2: "#ec4899", a: 135 },
                          { name: isRtl ? "بحري" : "Ocean",    c1: "#0ea5e9", c2: "#14b8a6", a: 90 },
                          { name: isRtl ? "غروب" : "Sunset",   c1: "#f59e0b", c2: "#ef4444", a: 135 },
                          { name: isRtl ? "ربيع" : "Spring",   c1: "#22c55e", c2: "#fde047", a: 90 },
                          { name: isRtl ? "ملكي" : "Royal",    c1: "#1e293b", c2: "#d4af37", a: 45 },
                        ].map((p) => (
                          <button key={p.name}
                            onClick={() => updateStyle({ color: p.c1, gradientColor2: p.c2, gradientAngle: p.a })}
                            className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 transition">
                            <span className="w-4 h-4 rounded border border-slate-600"
                              style={{ background: `linear-gradient(${p.a}deg, ${p.c1}, ${p.c2})` }} />
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "محاذاة" : "Alignment"}</label>
                <div className="grid grid-cols-3 gap-1">
                  {["right", "center", "left"].map((a) => (
                    <button key={a} onClick={() => updateStyle({ align: a })}
                      className={`py-1.5 rounded text-[11px] font-semibold transition ${style.align === a ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
                      {a === "right" ? (isRtl ? "يمين" : "Right") : a === "center" ? (isRtl ? "وسط" : "Center") : (isRtl ? "يسار" : "Left")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <label className="flex-1 flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={style.bold} onChange={(e) => updateStyle({ bold: e.target.checked })} />
                  <span className="text-xs">B {isRtl ? "غامق" : "Bold"}</span>
                </label>
                <label className="flex-1 flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={style.italic} onChange={(e) => updateStyle({ italic: e.target.checked })} />
                  <span className="text-xs italic">I {isRtl ? "مائل" : "Italic"}</span>
                </label>
                <label className="flex-1 flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={style.shadow} onChange={(e) => updateStyle({ shadow: e.target.checked })} />
                  <span className="text-xs">{isRtl ? "ظل" : "Shadow"}</span>
                </label>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block">{isRtl ? "دوران" : "Rotation"}: {style.rotation}ذ</label>
                <input type="range" min="-45" max="45" value={style.rotation}
                  onChange={(e) => updateStyle({ rotation: parseInt(e.target.value) })} className="w-full accent-indigo-500" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block">X: {style.x.toFixed(1)}%</label>
                  <input type="range" min="0" max="100" step="0.5" value={style.x}
                    onChange={(e) => updateStyle({ x: parseFloat(e.target.value) })} className="w-full accent-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">Y: {style.y.toFixed(1)}%</label>
                  <input type="range" min="0" max="100" step="0.5" value={style.y}
                    onChange={(e) => updateStyle({ y: parseFloat(e.target.value) })} className="w-full accent-indigo-500" />
                </div>
              </div>
              <p className="text-[10px] text-slate-500">
                {isRtl ? "💡 يمكنك سحب الاسم بالماوس مباشرة على المعاينة." : "💡 You can also drag the name directly on the preview."}
              </p>
            </div>
            </>)}

            {/* ───── EXPORT tab: Save / Library / Generate ───── */}
            {activePanel === "export" && (<>
            {/* Save & Library */}
            <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-bold flex items-center gap-2">
                ?ْ� {isRtl ? "حفظ التصميم" : "Save design"}
              </h3>
              <button
                onClick={() => { setSaveCardName(""); setShowSaveModal(true); }}
                disabled={!templateUrl && stockObjects.length === 0 && headings.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition disabled:opacity-40"
              >
                ?ْ� {isRtl ? "حفظ هذا التصميم" : "Save current design"}
              </button>
              <button
                onClick={() => setShowLibraryModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition"
              >
                📌 {isRtl ? `مك🎨ة البطاقات (${savedCards.length})` : `Cards library (${savedCards.length})`}
              </button>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                {isRtl ? "💡 الحفظ يخزّن البطاقة في متصفحك (localStorage). لن تختفي بعد إعادة التشغيل." : "💡 Saved cards live in your browser's localStorage — they survive a page reload."}
              </p>
            </div>

            {/* Quality controls — format + super-sampling factor.
                These directly shape what `renderCard` produces (see its top). */}
            <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                🎯 {isRtl ? "جودة التصدير" : "Export quality"}
              </h3>

              {/* Format toggle — PNG is lossless (kills banding + edge noise),
                  JPEG is opt-in for users who care about file size. */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">{isRtl ? "صيغة الملف" : "File format"}</label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => setExportFormat("png")}
                    className={`py-2 rounded text-[11px] font-bold transition ${
                      exportFormat === "png"
                        ? "bg-indigo-600 text-white shadow-lg"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    🏆 PNG
                    <div className="text-[9px] opacity-80 font-normal mt-0.5">
                      {isRtl ? "جودة قصوى — بدون ضغط" : "Max quality — lossless"}
                    </div>
                  </button>
                  <button
                    onClick={() => setExportFormat("jpeg")}
                    className={`py-2 rounded text-[11px] font-bold transition ${
                      exportFormat === "jpeg"
                        ? "bg-indigo-600 text-white shadow-lg"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    �?? JPEG
                    <div className="text-[9px] opacity-80 font-normal mt-0.5">
                      {isRtl ? "ملف أصغر — جودة 98%" : "Smaller file — 98% quality"}
                    </div>
                  </button>
                </div>
              </div>

              {/* Super-sampling factor — internal render at N?� then downsample.
                  2?� is the sweet spot (4 samples/pixel) — 3?� rarely buys more
                  but quadruples the memory/time. */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  {isRtl ? "نعومة الحواف (Anti-Alias)" : "Edge smoothness (SSAA)"}
                  <span className="text-indigo-400"> — {superSample}?�</span>
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { v: 1, l: isRtl ? "عادي" : "Off",      d: isRtl ? "أسرع" : "Fastest" },
                    { v: 2, l: isRtl ? "ممتاز" : "Best",    d: isRtl ? "موصى به" : "Recommended" },
                    { v: 3, l: isRtl ? "احترافي" : "Ultra", d: isRtl ? "أبطأ" : "Slowest" },
                  ].map((o) => (
                    <button
                      key={o.v}
                      onClick={() => setSuperSample(o.v)}
                      className={`py-1.5 rounded text-[11px] font-semibold transition ${
                        superSample === o.v
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {o.l}
                      <div className="text-[9px] opacity-70 font-normal">{o.d}</div>
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed">
                {isRtl ? "💡 PNG + ممتاز = أوضح نتيجة للنصوص الذهبية والتدرجات. اختر JPEG فقط لو حجم الملف مهم." : "💡 PNG + Best = sharpest output for gold text and gradients. Use JPEG only if file size matters."}
              </p>
            </div>

            {/* Step 5: Generate */}
            <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">5</span>
                {isRtl ? "إنشاء وتنزيل" : "Generate & Download"}
              </h3>
              <button
                onClick={handleGenerateAll}
                disabled={(!templateUrl && stockObjects.length === 0 && headings.length === 0) || generating}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-400 hover:to-pink-500 text-white font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {generating
                  ? `${genProgress}%`
                  : names.length === 0
                    ? (isRtl ? "🎁 إنشاء بطاقة (بدون اسم)" : "🎁 Generate card (no name)")
                    : (isRtl ? `???? إنشا?? ${names.length} بطاقة (ZIP)` : `???? Generate ${names.length} cards (ZIP)`)}
              </button>
              {generating && (
                <div className="mt-2 h-1.5 bg-slate-800 rounded overflow-hidden">
                  <div className="h-full bg-amber-500 transition-all" style={{ width: `${genProgress}%` }} />
                </div>
              )}
              {names.length > 0 && (templateUrl || stockObjects.length > 0 || headings.length > 0) && !generating && (
                <button
                  onClick={handleDownloadOne}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isRtl ? "تنزيل البطاقة الحالية فقط" : "Download current card only"}
                </button>
              )}
            </div>
            </>)}
            </div>
          </div>

          {/* ── RIGHT: Preview ──────────────────────────────── */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">{isRtl ? "👁️ معاينة" : "👁️ Preview"}</h3>
              {names.length > 0 && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setPreviewIdx((i) => Math.max(0, i - 1))} disabled={previewIdx <= 0}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-300 font-mono w-20 text-center">{previewIdx + 1} / {names.length}</span>
                  <button onClick={() => setPreviewIdx((i) => Math.min(names.length - 1, i + 1))} disabled={previewIdx >= names.length - 1}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 flex items-center justify-center min-h-[400px]">
              {/* Stage is shown the moment the card has ANY content — template,
                  stock object, heading, or logo. Empty state is reserved for
                  the truly-blank card. */}
              {!templateUrl && stockObjects.length === 0 && headings.length === 0 && !logo ? (
                <div className="text-center text-slate-500 max-w-sm">
                  <Upload className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">
                    {isRtl
                      ? "ابدأ برفع صورة قالب — أو افتح تبويب «أشكال» وابدأ بناء بطاقتك من الصفر."
                      : "Upload a template image — or open the \"Shapes\" tab and build a card from scratch."}
                  </p>
                </div>
              ) : (
                <div
                  ref={stageRef}
                  onMouseDown={(e) => {
                    // Pan mode wins over everything else — but only if the
                    // click is on the bare stage, not on an overlay (overlays
                    // stopPropagation on their own onMouseDown).
                    if (!templatePanMode) return;
                    e.preventDefault();
                    draggingTemplateRef.current = {
                      mouseX: e.clientX,
                      mouseY: e.clientY,
                      ox: templateOffsetX,
                      oy: templateOffsetY,
                    };
                  }}
                  className="relative rounded-lg overflow-hidden shadow-2xl border border-slate-700"
                  style={{
                    width: "100%",
                    maxWidth: 720,
                    aspectRatio: String(aspectRatio || 1),
                    // No template? Paint bgMode as the preview background so what
                    // the user sees matches what `renderCard` will draw.
                    background: templateUrl
                      ? (outputSize && fitMode === "contain" ? bgColor : "#000")
                      : (bgMode === "gradient"
                        ? `linear-gradient(${bgGradAngle}deg, ${bgGrad1}, ${bgGrad2})`
                        : bgSolid),
                    cursor: templatePanMode ? (draggingTemplateRef.current ? "grabbing" : "grab") : "default",
                  }}
                >
                  {templateUrl && (
                    <img src={templateUrl} alt="template" draggable={false}
                      style={{
                        width: "100%", height: "100%",
                        objectFit: previewObjectFit,
                        // translate-then-scale: per CSS spec translate% uses the
                        // pre-transform box, so the visible offset is exactly
                        // offsetX% of card width — matches the canvas formula.
                        transform: `translate(${templateOffsetX}%, ${templateOffsetY}%) scale(${templateZoom})`,
                        transformOrigin: "center center",
                        display: "block", pointerEvents: "none", userSelect: "none",
                      }} />
                  )}

                  {/* Stock illustrations — draggable SVG overlays. Rendered before
                      decorations so the same z-order applies as in the canvas:
                      stock art behind, decorations in front, text on top. */}
                  {stockObjects.map((obj) => {
                    const def = ALL_STOCK_DEFS.find((s) => s.id === obj.typeId);
                    if (!def) return null;
                    const isActive = activeStockId === obj.id;
                    const aspect = def.aspect || 1;
                    return (
                      <div
                        key={obj.id}
                        onMouseDown={(e) => {
                          e.preventDefault(); e.stopPropagation();
                          setActiveStockId(obj.id);
                          draggingStockRef.current = obj.id;
                        }}
                        style={{
                          position: "absolute",
                          left: `${obj.x}%`,
                          top: `${obj.y}%`,
                          width: `${obj.width}%`,
                          transform: `translate(-50%, -50%) rotate(${obj.rotation || 0}deg)`,
                          opacity: obj.opacity ?? 1,
                          cursor: "grab",
                          userSelect: "none",
                          outline: isActive ? "1.5px dashed rgba(34,211,238,0.85)" : "1px dashed rgba(34,211,238,0.2)",
                          outlineOffset: "2px",
                        }}
                      >
                        <div style={{ position: "relative", width: "100%", aspectRatio: String(aspect) }}>
                          {/* Inline the SVG markup — single source of truth shared
                              with the canvas export above. Safe because the markup
                              comes from our own controlled data file, not user input. */}
                          <div
                            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
                            dangerouslySetInnerHTML={{ __html: def.svg(obj.colors) }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Decorations — draggable image overlays (calligraphy / ornaments) */}
                  {decorations.map((d) => {
                    const aspect = d.naturalW / d.naturalH || 1;
                    const isActive = activeDecorationId === d.id;
                    const isPainting = paintingDecorationId === d.id;
                    const ct = d.cropTop || 0, cr = d.cropRight || 0, cb = d.cropBottom || 0, cl = d.cropLeft || 0;
                    const hasCrop = (ct + cr + cb + cl) > 0;
                    const clipPath = hasCrop ? `inset(${ct}% ${cr}% ${cb}% ${cl}%)` : undefined;

                    // ── Screen-fit (perspective onto a phone screen) ──
                    if (d.screenFit?.enabled && Array.isArray(d.screenFit.corners)) {
                      const corners = d.screenFit.corners;
                      const src = d.paintMap || d.url;
                      const canWarp = stageSize.w > 0 && d.naturalW > 0 && d.naturalH > 0;
                      const dstPx = corners.map((c) => ({ x: c.x * stageSize.w, y: c.y * stageSize.h }));
                      return (
                        <div key={d.id} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: isActive ? 30 : 5 }}>
                          {canWarp && (
                            <img
                              src={src}
                              alt=""
                              draggable={false}
                              style={{
                                position: "absolute", left: 0, top: 0,
                                width: `${d.naturalW}px`, height: `${d.naturalH}px`,
                                transformOrigin: "0 0",
                                transform: cssMatrix3d(d.naturalW, d.naturalH, dstPx),
                                opacity: d.opacity ?? 1,
                                pointerEvents: "none", userSelect: "none",
                              }}
                            />
                          )}
                          {/* Outline + corner handles (only when this deco is active) */}
                          {isActive && (
                            <>
                              <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}>
                                <polygon
                                  points={corners.map((c) => `${c.x * 100}%,${c.y * 100}%`).join(" ")}
                                  fill="none" stroke="rgba(16,185,129,0.9)" strokeWidth="1.5" strokeDasharray="5 4"
                                />
                              </svg>
                              {corners.map((c, idx) => (
                                <div
                                  key={idx}
                                  onMouseDown={(e) => {
                                    e.preventDefault(); e.stopPropagation();
                                    setActiveDecorationId(d.id);
                                    draggingCornerRef.current = { decoId: d.id, idx };
                                  }}
                                  title={["↖","↗","↘","↙"][idx]}
                                  style={{
                                    position: "absolute",
                                    left: `${c.x * 100}%`, top: `${c.y * 100}%`,
                                    width: 16, height: 16, marginLeft: -8, marginTop: -8,
                                    borderRadius: "50%", background: "#10b981",
                                    border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
                                    cursor: "grab", pointerEvents: "auto", zIndex: 31,
                                  }}
                                />
                              ))}
                            </>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={d.id}
                        onMouseDown={(e) => {
                          if (isPainting) {
                            // Click = flood-fill a region with the current paint colour
                            e.preventDefault(); e.stopPropagation();
                            if (!stageRef.current) return;
                            const rect = stageRef.current.getBoundingClientRect();
                            handlePaintClick(d, rect, e.clientX, e.clientY);
                            return;
                          }
                          // Normal mode → select + start dragging
                          e.preventDefault(); e.stopPropagation();
                          setActiveDecorationId(d.id);
                          draggingDecorationRef.current = d.id;
                        }}
                        style={{
                          position: "absolute",
                          left: `${d.x}%`,
                          top: `${d.y}%`,
                          width: `${d.width}%`,
                          transform: `translate(-50%, -50%) rotate(${d.rotation || 0}deg)`,
                          opacity: d.opacity ?? 1,
                          cursor: isPainting ? "crosshair" : "grab",
                          userSelect: "none",
                          outline: isPainting
                            ? "2px solid rgba(236,72,153,0.9)"
                            : isActive
                            ? "1px dashed rgba(251,191,36,0.7)"
                            : "1px dashed rgba(251,191,36,0.2)",
                          outlineOffset: "2px",
                        }}
                      >
                        <div style={{ position: "relative", width: "100%", aspectRatio: String(aspect) }}>
                          {d.paintMap ? (
                            // Paint-by-click takes priority — the paintMap *is* the new image
                            // (RGB replaced per region, original alpha preserved). Other
                            // recolor modes are overridden while paint exists.
                            <img src={d.paintMap} alt="" draggable={false}
                              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", display: "block", pointerEvents: "none", userSelect: "none", clipPath, WebkitClipPath: clipPath }} />
                          ) : (d.useMultiColor || d.useGradient || d.color) ? (
                            // Solid / gradient / multi-zone — use the original shape as the mask
                            <div style={{
                              position: "absolute", inset: 0,
                              background: d.useMultiColor
                                ? buildSteppedGradient(d.colorZones, d.multiColorAngle ?? 90)
                                : d.useGradient
                                ? `linear-gradient(${d.gradientAngle ?? 90}deg, ${d.color || "#d4af37"}, ${d.gradientColor2 || "#fde047"})`
                                : d.color,
                              WebkitMaskImage: `url(${d.url})`,
                              maskImage: `url(${d.url})`,
                              WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
                              WebkitMaskSize: "contain", maskSize: "contain",
                              WebkitMaskPosition: "center", maskPosition: "center",
                              clipPath, WebkitClipPath: clipPath,
                              pointerEvents: "none",
                            }} />
                          ) : (
                            <img src={d.url} alt="" draggable={false}
                              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", display: "block", pointerEvents: "none", userSelect: "none", clipPath, WebkitClipPath: clipPath }} />
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Static headings — draggable. The DOM is layered:
                      1. Outer wrapper  → positioning + rotation + drag handle
                      2. Bg shape       → background colour + padding + shape (pill/tag/etc.)
                      3. Ornament SVG   → absolutely positioned around the text bbox
                      4. Text node      → font, color/gradient/image fill, outline, glow */}
                  {headings.map((h) => {
                    const usingWordColors = h.useWordColors && (h.wordColors?.length || 0) > 0;
                    const fontPx = (h.fontSize / 100) * (stageHeight || 400);
                    const hasBg = h.textBgShape && h.textBgShape !== "none";
                    const bgPadPx = hasBg ? ((h.textBgPadding ?? 30) * fontPx) / 100 : 0;
                    const ornament = h.ornament && h.ornament !== "none" ? TEXT_ORNAMENTS[h.ornament] : null;

                    // ── Background-shape styles ─────────────────────────
                    let bgStyles = {};
                    if (hasBg) {
                      bgStyles = {
                        padding: `${bgPadPx}px ${bgPadPx * 1.2}px`,
                        background: h.textBgShape === "frame" ? "transparent" : (h.textBgColor || "#1e293b"),
                        opacity: h.textBgOpacity ?? 1,
                      };
                      if (h.textBgShape === "pill")    bgStyles.borderRadius = "9999px";
                      else if (h.textBgShape === "tag") bgStyles.borderRadius = `${fontPx * 0.25}px`;
                      else if (h.textBgShape === "frame") {
                        bgStyles.border = `${Math.max(2, fontPx * 0.05)}px solid ${h.textBgColor || "#d4af37"}`;
                        bgStyles.borderRadius = `${fontPx * 0.18}px`;
                      } else if (h.textBgShape === "circle") {
                        bgStyles.borderRadius = "50%";
                        bgStyles.padding = `${bgPadPx * 1.4}px ${bgPadPx * 1.6}px`;
                      } else if (h.textBgShape === "ribbon") {
                        const v = `${fontPx * 0.4}px`;
                        bgStyles.clipPath = `polygon(0 0, 100% 0, calc(100% - ${v}) 50%, 100% 100%, 0 100%, ${v} 50%)`;
                      }
                    }

                    // ── Outline (text-stroke) + glow / shadow ────────────
                    // paint-order:stroke fill ensures the outline sits UNDER
                    // the fill — same visual order as canvas drawText.
                    const glowStr = h.useGlow
                      ? `0 0 ${((h.glowSize ?? 12) / 100) * fontPx}px ${h.glowColor || "#ffd700"}`
                      : (h.shadow && !h.useGradient && !h.fillImage)
                        ? "2px 2px 6px rgba(0,0,0,0.55)"
                        : "none";

                    const textStyle = {
                      fontFamily: h.fontFamily,
                      fontSize: `${fontPx}px`,
                      fontWeight: h.bold ? "bold" : "normal",
                      fontStyle: h.italic ? "italic" : "normal",
                      textAlign: h.align,
                      textShadow: glowStr,
                      WebkitTextStroke: h.useOutline ? `${((h.outlineWidth ?? 3) / 100) * fontPx}px ${h.outlineColor || "#000000"}` : "0",
                      paintOrder: "stroke fill",
                      whiteSpace: h.textWidth > 0 ? "pre-wrap" : "pre",
                      ...(h.textWidth > 0 ? { width: `${h.textWidth}%` } : {}),
                      wordBreak: "break-word",
                      lineHeight: h.lineHeight || 1.2,
                      position: "relative",
                      zIndex: 1,
                    };
                    const fillStyle = usingWordColors
                      ? { color: h.color || "#fff" }
                      : h.fillImage
                      ? {
                          backgroundImage: `url(${h.fillImage})`,
                          backgroundSize: "cover", backgroundPosition: "center",
                          WebkitBackgroundClip: "text", backgroundClip: "text",
                          WebkitTextFillColor: "transparent", color: "transparent",
                        }
                      : h.useGradient
                      ? {
                          backgroundImage: `linear-gradient(${h.gradientAngle || 90}deg, ${h.color}, ${h.gradientColor2})`,
                          WebkitBackgroundClip: "text", backgroundClip: "text",
                          WebkitTextFillColor: "transparent", color: "transparent",
                        }
                      : { color: h.color };

                    return (
                      <div key={h.id}
                        onMouseDown={(e) => {
                          e.preventDefault(); e.stopPropagation();
                          setActiveHeadingId(h.id);
                          draggingHeadingRef.current = h.id;
                        }}
                        style={{
                          position: "absolute",
                          left: `${h.x}%`,
                          top: `${h.y}%`,
                          transform: `translate(-50%, -50%) rotate(${h.rotation || 0}deg)`,
                          cursor: "grab",
                          userSelect: "none",
                          outline: activeHeadingId === h.id ? "1px dashed rgba(251,191,36,0.7)" : "1px dashed rgba(251,191,36,0.25)",
                          outlineOffset: `${bgPadPx + 4}px`,
                          ...bgStyles,
                        }}
                      >
                        {/* Ornament SVG — extends beyond the text bbox using
                            the ornament's padTop/padBottom hints (negative
                            CSS insets translate to "stick out by this much"). */}
                        {ornament && (
                          <div
                            style={{
                              position: "absolute",
                              top:    `${-(ornament.padTop    || 0) / (40 - (ornament.padTop || 0) - (ornament.padBottom || 0)) * 100}%`,
                              bottom: `${-(ornament.padBottom || 0) / (40 - (ornament.padTop || 0) - (ornament.padBottom || 0)) * 100}%`,
                              left:   `${-(ornament.padLeft   || 0) / (100 - (ornament.padLeft || 0) - (ornament.padRight || 0)) * 100}%`,
                              right:  `${-(ornament.padRight  || 0) / (100 - (ornament.padLeft || 0) - (ornament.padRight || 0)) * 100}%`,
                              pointerEvents: "none",
                              zIndex: 0,
                            }}
                            dangerouslySetInnerHTML={{
                              __html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40" preserveAspectRatio="none" width="100%" height="100%" style="display:block">${ornament.svg(h.ornamentColor || h.color || "#d4af37")}</svg>`,
                            }}
                          />
                        )}

                        {/* Text content — render branches in priority order:
                              1. Paint brush active OR painted glyphs exist (NEW)
                              2. Per-word colours
                              3. Diacritic auto-colouring
                              4. Plain text (default)
                            For paint-brush mode we render each NFD codepoint
                            as its own <span> so it has a clickable hit target.
                            Modern browsers preserve Arabic shaping across
                            adjacent same-font spans, so the visible glyphs
                            still join correctly. */}
                        {(() => {
                          const isPaintingThis = textPaintingHeadingId === h.id;
                          const hasPaintedGlyph = h.glyphColors && Object.keys(h.glyphColors).length > 0;
                          const useGlyphMode = isPaintingThis || hasPaintedGlyph;
                          // When in glyph mode we drop background-clip:text /
                          // transparent so per-span colours render predictably.
                          const safeFillStyle = useGlyphMode || (h.useDiacriticColor && !usingWordColors)
                            ? { color: h.color || "#fff" }
                            : fillStyle;
                          return (
                            <div style={{ ...textStyle, ...safeFillStyle }}>
                              {useGlyphMode ? (() => {
                                const chars = getGlyphCodepoints(h.text || (isRtl ? "النص" : "Text"));
                                const baseColor = h.color || "#fff";
                                return chars.map((ch, i) => {
                                  const c = h.glyphColors?.[i] || baseColor;
                                  return (
                                    <span
                                      key={i}
                                      // 1.5?� hit box while painting via padding so
                                      // tiny diacritics like a kasra below the line
                                      // are still tappable.
                                      style={{
                                        color: c,
                                        cursor: isPaintingThis ? "crosshair" : "inherit",
                                        padding: isPaintingThis ? "0 1px" : 0,
                                        // Slight highlight when this glyph is painted,
                                        // so the user can see what they've touched.
                                        backgroundColor: isPaintingThis && h.glyphColors?.[i]
                                          ? "rgba(236,72,153,0.12)" : "transparent",
                                      }}
                                      onMouseDown={(e) => {
                                        if (!isPaintingThis) return;
                                        // Block drag + parent select while painting.
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const next = { ...(h.glyphColors || {}) };
                                        if (textPaintErase) delete next[i];
                                        else next[i] = textPaintColor;
                                        updateHeading(h.id, { glyphColors: next });
                                      }}
                                    >{ch}</span>
                                  );
                                });
                              })()
                              : usingWordColors ? (() => {
                                  let wi = 0;
                                  return (h.text || (isRtl ? "نص" : "Text")).split(/(\s+)/).map((part, idx) => {
                                    if (/^\s+$/.test(part) || part === "") return <React.Fragment key={idx}>{part}</React.Fragment>;
                                    const c = h.wordColors?.[wi] || h.color;
                                    wi++;
                                    return <span key={idx} style={{ color: c }}>{part}</span>;
                                  });
                                })()
                              : h.useDiacriticColor
                              ? splitByDiacriticGroup(
                                  h.text || (isRtl ? "النص" : "Text"),
                                  h.color || "#fff",
                                  h.diacriticColor || "#dc2626",
                                ).map((run, idx) => (
                                  <span key={idx} style={{ color: run.color }}>{run.text}</span>
                                ))
                              : (h.text || (isRtl ? "نص" : "Text"))}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}

                  {/* Logo overlay — draggable */}
                  {logo?.url && (
                    <div
                      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); draggingLogoRef.current = true; }}
                      style={{
                        position: "absolute",
                        left: `${logo.x}%`,
                        top: `${logo.y}%`,
                        transform: "translate(-50%, -50%)",
                        width: `${logo.width}%`,
                        opacity: logo.opacity ?? 1,
                        cursor: "grab",
                        userSelect: "none",
                        outline: "1px dashed rgba(244,114,182,0.5)",
                        outlineOffset: "2px",
                      }}
                    >
                      {logo.color ? (
                        // CSS mask = paint a colored rect through the logo's alpha channel
                        <div style={{
                          width: "100%",
                          aspectRatio: String(logo.naturalW / logo.naturalH || 1),
                          background: logo.color,
                          WebkitMaskImage: `url(${logo.url})`,
                          maskImage: `url(${logo.url})`,
                          WebkitMaskRepeat: "no-repeat",
                          maskRepeat: "no-repeat",
                          WebkitMaskSize: "contain",
                          maskSize: "contain",
                          WebkitMaskPosition: "center",
                          maskPosition: "center",
                          pointerEvents: "none",
                        }} />
                      ) : (
                        <img src={logo.url} alt="logo" draggable={false}
                          style={{ width: "100%", height: "auto", display: "block", pointerEvents: "none", userSelect: "none" }} />
                      )}
                    </div>
                  )}

                  {/* Name overlay — fontSize derived from stage height to match the exported pixel size */}
                  <div
                    onMouseDown={(e) => { e.preventDefault(); draggingRef.current = true; }}
                    style={{
                      position: "absolute",
                      left: `${style.x}%`,
                      top: `${style.y}%`,
                      transform: `translate(-50%, -50%) rotate(${style.rotation}deg)`,
                      fontFamily: style.fontFamily,
                      fontSize: `${(style.fontSize / 100) * (stageHeight || 400)}px`,
                      fontWeight: style.bold ? "bold" : "normal",
                      fontStyle: style.italic ? "italic" : "normal",
                      // Fill priority: image > gradient > solid. We use `backgroundImage`
                      // (not the `background` shorthand) — the shorthand silently resets
                      // background-clip back to border-box and paints a coloured rectangle.
                      ...(style.fillImage
                        ? {
                            backgroundImage: `url(${style.fillImage})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            WebkitBackgroundClip: "text",
                            backgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            color: "transparent",
                          }
                        : style.useGradient
                        ? {
                            backgroundImage: `linear-gradient(${style.gradientAngle || 90}deg, ${style.color}, ${style.gradientColor2})`,
                            WebkitBackgroundClip: "text",
                            backgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            color: "transparent",
                          }
                        : { color: style.color }),
                      textAlign: style.align,
                      letterSpacing: style.letterSpacing ? `${style.letterSpacing}px` : undefined,
                      // Shadow doesn't combine with background-clip:text, so drop it when image/gradient is on
                      textShadow: (style.shadow && !style.useGradient && !style.fillImage) ? "2px 2px 6px rgba(0,0,0,0.55)" : "none",
                      whiteSpace: style.textWidth > 0 ? "pre-wrap" : "pre",
                      ...(style.textWidth > 0 ? { width: `${style.textWidth}%` } : {}),
                      wordBreak: "break-word",
                      cursor: "grab",
                      userSelect: "none",
                      lineHeight: style.lineHeight || 1.2,
                      outline: "1px dashed rgba(129,140,248,0.4)",
                      outlineOffset: "4px",
                    }}
                  >
                    {previewName}
                  </div>

                  {/* ── Social contact box (draggable) ─────────────────────
                      Renders the same chips the canvas export will produce,
                      so the preview is WYSIWYG. Sizing is derived from
                      stage height (px) instead of card width (%) so the
                      layout responds to the visible preview, not the
                      eventual export resolution. */}
                  {socialBox.show && socialBox.items.length > 0 && (() => {
                    const stageW = stageRef.current?.getBoundingClientRect().width || 400;
                    const iconPxPreview = (socialBox.iconSize / 100) * stageW;
                    const fontPxPreview = iconPxPreview * 0.55;
                    const gap = (socialBox.spacing / 100) * iconPxPreview;
                    const padding = (socialBox.bgPadding / 100) * iconPxPreview;
                    const radius = (socialBox.bgRadius / 100) * iconPxPreview;
                    // Match canvas: keep a chip only if it has a handle OR
                    // the user explicitly turned labels off (icons-only).
                    const items = socialBox.items.filter((it) => it.handle.trim() || !socialBox.showLabels);
                    if (items.length === 0) return null;
                    const isHorizontal = socialBox.layout === "horizontal";
                    const isGrid = socialBox.layout === "grid";
                    return (
                      <div
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          draggingSocialRef.current = true;
                        }}
                        style={{
                          position: "absolute",
                          left: `${socialBox.x}%`,
                          top: `${socialBox.y}%`,
                          transform: `translate(-50%, -50%) rotate(${socialBox.rotation || 0}deg)`,
                          padding: `${padding}px`,
                          borderRadius: `${radius}px`,
                          background: !socialBox.bgEnabled
                            ? "transparent"
                            : socialBox.bgMode === "gradient"
                            ? `linear-gradient(${socialBox.bgGradAngle || 135}deg, ${socialBox.bgColor}, ${socialBox.bgGradColor2 || "#1e293b"})`
                            : `rgba(${parseInt(socialBox.bgColor.slice(1, 3), 16)}, ${parseInt(socialBox.bgColor.slice(3, 5), 16)}, ${parseInt(socialBox.bgColor.slice(5, 7), 16)}, ${socialBox.bgOpacity})`,
                          cursor: "grab",
                          userSelect: "none",
                          outline: "1px dashed rgba(34,211,238,0.4)",
                          outlineOffset: "2px",
                          display: isGrid ? "grid" : "flex",
                          flexDirection: isHorizontal ? "row" : "column",
                          gridTemplateColumns: isGrid ? "1fr 1fr" : undefined,
                          gap: `${gap}px`,
                          alignItems: isHorizontal ? "center" : "stretch",
                          fontFamily: socialBox.fontFamily,
                          color: socialBox.textColor,
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
                                style={{
                                  width: `${iconPxPreview}px`,
                                  height: `${iconPxPreview}px`,
                                  flexShrink: 0,
                                }}
                                dangerouslySetInnerHTML={{ __html: platform.svg(bg, fg) }}
                              />
                              {socialBox.showLabels && item.handle && (
                                // dir="ltr" forces the LTR ordering so
                                // "@hovera_sa" stays "@hovera_sa" instead
                                // of getting BiDi-reordered to "hovera_sa@"
                                // inside the RTL document.
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
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save card modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowSaveModal(false)}>
          <div className="bg-slate-800 rounded-2xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()} dir={isRtl ? "rtl" : "ltr"}>
            <h3 className="font-bold text-base mb-3 text-white">?ْ� {isRtl ? "حفظ التصميم في المكتبة" : "Save design to library"}</h3>
            <input
              type="text"
              value={saveCardName}
              onChange={(e) => setSaveCardName(e.target.value)}
              placeholder={isRtl ? "أدخل اسماً للتصميم..." : "Enter a card name..."}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveCard(); }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white mb-3"
            />
            <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
              {isRtl ? "سيُحفظ القالب واللوقو والزخارف والنصوص وتنسيق الاسم. الأسماء (قائمة Excel) لا تُحفظ." : "Template, logo, decorations, headings, and name styling are saved. The Excel name list is not."}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowSaveModal(false)}
                className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-slate-200 transition">
                {isRtl ? "إلغاء" : "Cancel"}
              </button>
              <button onClick={handleSaveCard} disabled={savingCard || !saveCardName.trim()}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white transition disabled:opacity-50 flex items-center justify-center gap-2">
                {savingCard && <Loader2 className="w-4 h-4 animate-spin" />}
                ?ْ� {isRtl ? "حفظ" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Library modal */}
      {showLibraryModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowLibraryModal(false)}>
          <div className="bg-slate-800 rounded-2xl p-5 w-full max-w-3xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} dir={isRtl ? "rtl" : "ltr"}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-white">📌 {isRtl ? `مك🎨ة البطاقات (${savedCards.length})` : `Cards library (${savedCards.length})`}</h3>
              <button onClick={() => setShowLibraryModal(false)} className="text-slate-400 hover:text-white text-xl leading-none">?�</button>
            </div>
            {savedCards.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p className="text-sm mb-1">{isRtl ? "لا توجد بطاقات محفوظة بعد." : "No saved cards yet."}</p>
                <p className="text-xs">{isRtl ? "صمّم بطاقة ثم اضغط «حفظ هذا التصميم»." : 'Design a card and click "Save current design".'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {savedCards.map((c) => (
                  <div key={c.id} className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden hover:border-emerald-500 transition group">
                    <div className="aspect-square bg-slate-700 overflow-hidden flex items-center justify-center">
                      {c.thumbnail
                        ? <img src={c.thumbnail} alt={c.name} className="w-full h-full object-cover" />
                        : <div className="text-slate-500 text-xs">🔍</div>}
                    </div>
                    <div className="p-2 space-y-1.5">
                      <p className="text-xs font-semibold text-white truncate" title={c.name}>{c.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(c.savedAt).toLocaleDateString(isRtl ? "ar" : "en")}
                      </p>
                      <div className="flex gap-1">
                        <button onClick={() => handleLoadCard(c)}
                          className="flex-1 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-[11px] font-semibold text-white transition">
                          📌 {isRtl ? "فتح" : "Open"}
                        </button>
                        <button onClick={() => {
                          if (window.confirm(isRtl ? `حذ?? "${c.name}"??` : `Delete "${c.name}"?`)) handleDeleteCard(c.id);
                        }}
                          className="px-2 py-1.5 rounded bg-slate-800 hover:bg-red-600 text-[11px] text-slate-300 hover:text-white transition">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
