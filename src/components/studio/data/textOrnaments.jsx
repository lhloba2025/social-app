// textOrnaments.jsx — small SVG flourishes that wrap a piece of text.
//
// Each entry returns SVG fragments that go INSIDE a parent SVG (a single
// `<svg>` element is composed at the call site so we can size it once
// against the text's bounding box). The fragments operate in a 100×40
// reference grid where:
//   • x  = 0   → left edge of the text bounding box
//   • x  = 100 → right edge
//   • y  = 0   → top of (text + ornament) bounding box
//   • y  = 40  → bottom
// The composition layer scales this grid to actual pixels and positions
// it around the text, so individual ornaments don't have to think about
// real sizes — they just draw in 0–100 / 0–40 space.
//
// Returning a string (not JSX) keeps a single representation that works
// both for preview (dangerouslySetInnerHTML) and canvas export (serialize
// → Blob → Image).

export const TEXT_ORNAMENTS = {
  none: null,

  // ── ░ Underline swoosh ───────────────────────────────────────────────
  // Slim curved line under the text, with a tiny diamond accent at the
  // centre. Reads as a calligraphic flourish at any font size.
  underline: {
    nameAr: "خط مزخرف تحت",
    nameEn: "Decorative underline",
    // Padding above/below text — how much extra room the ornament needs.
    padTop: 0,
    padBottom: 12,
    svg: (color) => `
      <path d="M 5 32 Q 50 26 95 32" fill="none" stroke="${color}" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="50" cy="29" r="1.6" fill="${color}"/>
      <path d="M 15 34 L 25 34" stroke="${color}" stroke-width="0.8" stroke-linecap="round"/>
      <path d="M 75 34 L 85 34" stroke="${color}" stroke-width="0.8" stroke-linecap="round"/>
    `,
  },

  // ── { } Side brackets ────────────────────────────────────────────────
  // Ornate curly brackets framing the text horizontally. Classic poster
  // / certificate aesthetic.
  side_brackets: {
    nameAr: "أقواس جانبية",
    nameEn: "Side brackets",
    padTop: 4,
    padBottom: 4,
    padLeft: 12,
    padRight: 12,
    svg: (color) => `
      <!-- Left bracket -->
      <path d="M 4 8 Q -2 20 4 32" fill="none" stroke="${color}" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M 2 18 L 6 20 L 2 22" fill="none" stroke="${color}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Right bracket -->
      <path d="M 96 8 Q 102 20 96 32" fill="none" stroke="${color}" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M 98 18 L 94 20 L 98 22" fill="none" stroke="${color}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
    `,
  },

  // ── ✦ Stars above ────────────────────────────────────────────────────
  // Small star cluster above the text — celebratory, used a lot in Eid
  // and birthday designs.
  stars_above: {
    nameAr: "نجوم فوق",
    nameEn: "Stars above",
    padTop: 14,
    padBottom: 0,
    svg: (color) => `
      <g fill="${color}">
        <!-- 4-pointed stars in varying sizes -->
        <path d="M 50 2 L 51 6 L 55 7 L 51 8 L 50 12 L 49 8 L 45 7 L 49 6 Z"/>
        <path d="M 35 5 L 35.6 7 L 38 7.4 L 35.6 7.8 L 35 10 L 34.4 7.8 L 32 7.4 L 34.4 7 Z"/>
        <path d="M 65 5 L 65.6 7 L 68 7.4 L 65.6 7.8 L 65 10 L 64.4 7.8 L 62 7.4 L 64.4 7 Z"/>
        <circle cx="42" cy="9" r="0.8"/>
        <circle cx="58" cy="9" r="0.8"/>
      </g>
    `,
  },

  // ── 🌿 Wreath ─────────────────────────────────────────────────────────
  // Leafy/laurel half-wreath wrapping the bottom of the text. Premium
  // "achievement" feel.
  wreath: {
    nameAr: "إكليل أوراق",
    nameEn: "Leafy wreath",
    padTop: 0,
    padBottom: 14,
    svg: (color) => `
      <g fill="${color}" opacity="0.9">
        <!-- left side leaves -->
        <ellipse cx="22" cy="34" rx="3" ry="1.3" transform="rotate(-40 22 34)"/>
        <ellipse cx="28" cy="36" rx="3.2" ry="1.4" transform="rotate(-25 28 36)"/>
        <ellipse cx="35" cy="37.5" rx="3.4" ry="1.5" transform="rotate(-10 35 37.5)"/>
        <ellipse cx="42" cy="38.5" rx="3.4" ry="1.5" transform="rotate(0 42 38.5)"/>
        <!-- right side leaves -->
        <ellipse cx="58" cy="38.5" rx="3.4" ry="1.5" transform="rotate(0 58 38.5)"/>
        <ellipse cx="65" cy="37.5" rx="3.4" ry="1.5" transform="rotate(10 65 37.5)"/>
        <ellipse cx="72" cy="36" rx="3.2" ry="1.4" transform="rotate(25 72 36)"/>
        <ellipse cx="78" cy="34" rx="3" ry="1.3" transform="rotate(40 78 34)"/>
        <!-- centre tie -->
        <rect x="48" y="37" width="4" height="3" rx="0.5"/>
      </g>
    `,
  },

  // ── = Double line ────────────────────────────────────────────────────
  // Two thin parallel lines under the text. Tight, modern, minimalist.
  double_line: {
    nameAr: "خطين أنيقين",
    nameEn: "Double line",
    padTop: 0,
    padBottom: 8,
    svg: (color) => `
      <line x1="10" y1="32" x2="90" y2="32" stroke="${color}" stroke-width="0.8" stroke-linecap="round"/>
      <line x1="20" y1="35" x2="80" y2="35" stroke="${color}" stroke-width="0.5" stroke-linecap="round"/>
    `,
  },

  // ── ❖ Diamond frame ──────────────────────────────────────────────────
  // Tiny diamonds at each corner of the text bounding box — looks like
  // an art-deco label.
  corner_diamonds: {
    nameAr: "ماسات الأطراف",
    nameEn: "Corner diamonds",
    padTop: 6,
    padBottom: 6,
    padLeft: 6,
    padRight: 6,
    svg: (color) => `
      <g fill="${color}">
        <path d="M 3 3 L 6 6 L 3 9 L 0 6 Z"/>
        <path d="M 97 3 L 100 6 L 97 9 L 94 6 Z"/>
        <path d="M 3 31 L 6 34 L 3 37 L 0 34 Z"/>
        <path d="M 97 31 L 100 34 L 97 37 L 94 34 Z"/>
      </g>
    `,
  },
};

// List form for the picker UI — order matters for layout.
export const TEXT_ORNAMENT_LIST = [
  { id: "none",             nameAr: "بدون",            nameEn: "None" },
  { id: "underline",        nameAr: "خط مزخرف تحت",   nameEn: "Underline" },
  { id: "double_line",      nameAr: "خطين أنيقين",    nameEn: "Double line" },
  { id: "side_brackets",    nameAr: "أقواس جانبية",   nameEn: "Brackets" },
  { id: "stars_above",      nameAr: "نجوم فوق",       nameEn: "Stars" },
  { id: "wreath",           nameAr: "إكليل أوراق",    nameEn: "Wreath" },
  { id: "corner_diamonds",  nameAr: "ماسات الأطراف",  nameEn: "Diamonds" },
];
