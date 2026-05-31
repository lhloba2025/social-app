// calligraphicMarks.jsx — small ornamental SVG strokes that the user
// drops onto a card to mimic the floating accents you see in hand-drawn
// Arabic calligraphy (Thuluth / Diwani style).
//
// These are NOT typeable Unicode characters and they're NOT part of any
// font — they're freestanding tiny SVG shapes the user positions wherever
// the composition needs an accent.
//
// Same data shape as STOCK_ILLUSTRATIONS:
//   id, emoji, nameAr/En, aspect, regions, defaultColors, svg(colors)
// So the existing stockObjects state can store them and the gallery /
// recolour / drag / rotate / scale UI works for free.
//
// Each mark has a single colourable region called `color` — they're tiny
// enough that one fill colour reads correctly without sub-region tinting.

const TEAL = "#0d7377";   // brand teal, default for body strokes
const GOLD = "#d4af37";   // calligraphic accent gold

export const CALLIGRAPHIC_MARKS = [
  // ── Tatweel flourish — kashida-style horizontal stroke with a hook
  //    on the right. Goes UNDER or BETWEEN letters to fill horizontal gaps.
  {
    id: "mark_tatweel",
    emoji: "〰️",
    nameAr: "تطويلة",
    nameEn: "Kashida flourish",
    aspect: 3,                 // wide, low — like the stroke it imitates
    regions: [{ key: "color", ar: "اللون", en: "Color" }],
    defaultColors: { color: GOLD },
    svg: (c) => `<svg viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block">
      <path d="M 10 55 Q 80 45 200 50 Q 260 53 280 70 Q 285 80 275 88" fill="none" stroke="${c.color}" stroke-width="6" stroke-linecap="round"/>
      <circle cx="14" cy="55" r="4" fill="${c.color}"/>
    </svg>`,
  },

  // ── Small swoosh — short curved stroke that ends in a sharp tail.
  //    Reads as a single calligrapher's gesture. Goes around letters as
  //    "filler" art, not attached to any specific glyph.
  {
    id: "mark_swoosh",
    emoji: "↝",
    nameAr: "سواش",
    nameEn: "Swoosh",
    aspect: 1.5,
    regions: [{ key: "color", ar: "اللون", en: "Color" }],
    defaultColors: { color: GOLD },
    svg: (c) => `<svg viewBox="0 0 150 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block">
      <path d="M 20 60 Q 55 25 90 50 Q 115 65 140 45" fill="none" stroke="${c.color}" stroke-width="6" stroke-linecap="round"/>
      <circle cx="22" cy="60" r="3" fill="${c.color}"/>
    </svg>`,
  },

  // ── Tiny ج-like calligraphic hook. This is the shape most people see
  //    as "the little curl above the calligraphy" — it's a single sweep
  //    from upper-left down to a curl at lower-right.
  {
    id: "mark_jeem_curl",
    emoji: "ج",
    nameAr: "حلقة جيم",
    nameEn: "Jeem hook",
    aspect: 1,
    regions: [{ key: "color", ar: "اللون", en: "Color" }],
    defaultColors: { color: TEAL },
    svg: (c) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block">
      <path d="M 15 30 Q 40 25 55 50 Q 60 75 35 78 Q 18 78 18 65" fill="none" stroke="${c.color}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },

  // ── Reverse hook — mirror of jeem_curl. Use as a counter-balance on
  //    the opposite side of a composition.
  {
    id: "mark_jeem_curl_rev",
    emoji: "ج",
    nameAr: "حلقة معكوسة",
    nameEn: "Reverse hook",
    aspect: 1,
    regions: [{ key: "color", ar: "اللون", en: "Color" }],
    defaultColors: { color: TEAL },
    svg: (c) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block">
      <path d="M 85 30 Q 60 25 45 50 Q 40 75 65 78 Q 82 78 82 65" fill="none" stroke="${c.color}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },

  // ── Diamond / rhombus — the bold filled ◆ you see scattered through
  //    Diwani compositions. Drawn as a path (not <rect rotate>) so it
  //    renders consistently across renderers.
  {
    id: "mark_diamond",
    emoji: "◆",
    nameAr: "معين",
    nameEn: "Diamond",
    aspect: 1,
    regions: [{ key: "color", ar: "اللون", en: "Color" }],
    defaultColors: { color: GOLD },
    svg: (c) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block">
      <path d="M 50 18 L 82 50 L 50 82 L 18 50 Z" fill="${c.color}"/>
    </svg>`,
  },

  // ── Three-dot cluster — Arabic calligraphy "tri-dot" mark used over
  //    ث ش ذ ز letter forms but also as standalone ornament.
  {
    id: "mark_tri_dots",
    emoji: "ثلاث نقاط",
    nameAr: "ثلاث نقاط",
    nameEn: "Three dots",
    aspect: 1,
    regions: [{ key: "color", ar: "اللون", en: "Color" }],
    defaultColors: { color: GOLD },
    svg: (c) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block">
      <circle cx="30" cy="60" r="9" fill="${c.color}"/>
      <circle cx="70" cy="60" r="9" fill="${c.color}"/>
      <circle cx="50" cy="30" r="9" fill="${c.color}"/>
    </svg>`,
  },

  // ── Two-dot mark — used over ت ة ق letter forms. Compact horizontal pair.
  {
    id: "mark_two_dots",
    emoji: "نقطتان",
    nameAr: "نقطتان",
    nameEn: "Two dots",
    aspect: 2,
    regions: [{ key: "color", ar: "اللون", en: "Color" }],
    defaultColors: { color: GOLD },
    svg: (c) => `<svg viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block">
      <circle cx="30" cy="25" r="11" fill="${c.color}"/>
      <circle cx="70" cy="25" r="11" fill="${c.color}"/>
    </svg>`,
  },

  // ── Decorative spiral — small inward curl. The "sammy" loop that
  //    Diwani calligraphers tuck into corners and into the inside of
  //    big letters like ﺝ and ﻉ.
  {
    id: "mark_spiral",
    emoji: "🌀",
    nameAr: "لولب",
    nameEn: "Spiral",
    aspect: 1,
    regions: [{ key: "color", ar: "اللون", en: "Color" }],
    defaultColors: { color: TEAL },
    svg: (c) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block">
      <path d="M 50 50 m -8 0 a 8 8 0 1 1 16 0 a 14 14 0 1 1 -28 0 a 22 22 0 1 1 44 0" fill="none" stroke="${c.color}" stroke-width="5" stroke-linecap="round"/>
    </svg>`,
  },

  // ── Underline curve — a gentle ﹋ used to anchor a line of text.
  //    Sits below the baseline.
  {
    id: "mark_under_curve",
    emoji: "⌒",
    nameAr: "قوس سفلي",
    nameEn: "Under curve",
    aspect: 4,
    regions: [{ key: "color", ar: "اللون", en: "Color" }],
    defaultColors: { color: TEAL },
    svg: (c) => `<svg viewBox="0 0 400 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block">
      <path d="M 10 30 Q 200 90 390 30" fill="none" stroke="${c.color}" stroke-width="6" stroke-linecap="round"/>
    </svg>`,
  },

  // ── Rub el hizb star ۞ — the iconic 8-pointed star found in Quranic
  //    manuscripts. Premium calligraphic ornament.
  {
    id: "mark_rub_star",
    emoji: "۞",
    nameAr: "نجمة ربع الحزب",
    nameEn: "Rub el hizb",
    aspect: 1,
    regions: [{ key: "color", ar: "اللون", en: "Color" }],
    defaultColors: { color: GOLD },
    svg: (c) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block">
      <!-- Two overlapping squares rotated 45° to each other = 8-pointed star -->
      <path d="M 50 12 L 88 50 L 50 88 L 12 50 Z" fill="${c.color}"/>
      <path d="M 23 23 L 77 23 L 77 77 L 23 77 Z" fill="${c.color}"/>
      <!-- Centre dot in contrasting cut-out for that classic look -->
      <circle cx="50" cy="50" r="6" fill="#000" opacity="0.4"/>
    </svg>`,
  },

  // ── Ornate parens — the calligraphic brackets ﴾ ﴿ used in Quranic
  //    typography. Comes in left + right halves.
  {
    id: "mark_paren_open",
    emoji: "﴿",
    nameAr: "قوس مزخرف يمين",
    nameEn: "Ornate paren (right)",
    aspect: 0.5,
    regions: [{ key: "color", ar: "اللون", en: "Color" }],
    defaultColors: { color: GOLD },
    svg: (c) => `<svg viewBox="0 0 50 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block">
      <path d="M 15 10 Q 35 30 35 50 Q 35 70 15 90" fill="none" stroke="${c.color}" stroke-width="5" stroke-linecap="round"/>
      <path d="M 20 6 Q 42 28 42 50 Q 42 72 20 94" fill="none" stroke="${c.color}" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="38" cy="50" r="3.5" fill="${c.color}"/>
    </svg>`,
  },
  {
    id: "mark_paren_close",
    emoji: "﴾",
    nameAr: "قوس مزخرف يسار",
    nameEn: "Ornate paren (left)",
    aspect: 0.5,
    regions: [{ key: "color", ar: "اللون", en: "Color" }],
    defaultColors: { color: GOLD },
    svg: (c) => `<svg viewBox="0 0 50 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block">
      <path d="M 35 10 Q 15 30 15 50 Q 15 70 35 90" fill="none" stroke="${c.color}" stroke-width="5" stroke-linecap="round"/>
      <path d="M 30 6 Q 8 28 8 50 Q 8 72 30 94" fill="none" stroke="${c.color}" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="12" cy="50" r="3.5" fill="${c.color}"/>
    </svg>`,
  },
];
