// arabicLetterShapes.jsx — calligraphic Arabic letters, digits, and
// ligatures the user can drop onto a card as big decorative shapes.
//
// Unlike stockIllustrations / calligraphicMarks (which are SVG paths),
// these are rendered as TEXT — one Unicode character displayed at a
// large size in a calligraphic font. The trade-off:
//
//   ✓ Looks like a real hand-drawn letter (uses the font's own glyph)
//   ✓ Always crisp at any size (vector text)
//   ✓ Tiny data footprint (just the codepoint + font name)
//   ✗ Needs canvas-side rendering via ctx.fillText (the SVG → Image
//     pipeline doesn't pick up web fonts loaded by the page)
//
// So entries here carry `type: "text"` and the canvas / preview code
// branches on that to use ctx.fillText / inline <div> respectively
// instead of the SVG path.
//
// Each entry: { id, type, letter, font, ...same shape as other libs }

// Default colours matching the calligraphic palette established in
// the rest of the app (brand teal + accent gold).
const TEAL = "#0d7377";
const GOLD = "#d4af37";

// Calligraphic Arabic fonts already loaded in index.html via Google
// Fonts. Picking the one that gives the most "premium" look for each
// letter — Aref Ruqaa Ink for sweeping calligraphy, Reem Kufi for
// geometric strokes, Amiri Quran for Quranic-style symbols.
const RUQAA = "'Aref Ruqaa Ink', 'Aref Ruqaa', serif";
const KUFI = "'Reem Kufi Fun', 'Reem Kufi', serif";
const AMIRI = "'Amiri Quran', 'Amiri', serif";

// Helper — single source of truth for the inline SVG used by gallery
// thumbnails AND the preview overlay. Centres the glyph in the
// viewBox using SVG's `text-anchor` + `dominant-baseline`.
const textSvg = (letter, font, color) =>
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block">
    <text x="50" y="50" font-family="${font.replace(/"/g, '&quot;')}" font-size="85" font-weight="bold" text-anchor="middle" dominant-baseline="central" fill="${color}">${letter}</text>
  </svg>`;

// Build a letter entry — keeps the data DRY since most letters share
// the same structure (single colour region, default teal, etc.)
const letter = ({ id, letter: ltr, font = RUQAA, nameAr, nameEn, color = TEAL, aspect = 1 }) => ({
  id, type: "text", letter: ltr, font,
  emoji: ltr,
  nameAr, nameEn, aspect,
  regions: [{ key: "color", ar: "اللون", en: "Color" }],
  defaultColors: { color },
  // The svg() function exists so the gallery / preview can render a
  // thumbnail through the same dangerouslySetInnerHTML path used by
  // SVG-based illustrations. Canvas EXPORT does NOT use this — it
  // reads `type === "text"` and goes through ctx.fillText so the
  // page-loaded web font actually renders.
  svg: (c) => textSvg(ltr, font, c.color),
});

export const ARABIC_LETTER_SHAPES = [
  // ── Single calligraphic Arabic letters ──────────────────────────────
  // Aimed at people who want one big ornamental letter on the card
  // (the way Diwani designers anchor a composition with a giant ح or ع).
  letter({ id: "letter_haa",   letter: "ح", nameAr: "حرف الحاء",  nameEn: "Letter Haa"  }),
  letter({ id: "letter_ayn",   letter: "ع", nameAr: "حرف العين",  nameEn: "Letter Ayn"  }),
  letter({ id: "letter_meem",  letter: "م", nameAr: "حرف الميم",  nameEn: "Letter Meem" }),
  letter({ id: "letter_lam",   letter: "ل", nameAr: "حرف اللام",  nameEn: "Letter Lam"  }),
  letter({ id: "letter_kaf",   letter: "ك", nameAr: "حرف الكاف",  nameEn: "Letter Kaaf" }),
  letter({ id: "letter_waw",   letter: "و", nameAr: "حرف الواو",  nameEn: "Letter Waw"  }),
  letter({ id: "letter_noon",  letter: "ن", nameAr: "حرف النون",  nameEn: "Letter Noon" }),
  letter({ id: "letter_seen",  letter: "س", nameAr: "حرف السين",  nameEn: "Letter Seen" }),
  letter({ id: "letter_alef",  letter: "ا", nameAr: "حرف الألف",  nameEn: "Letter Alef" }),
  letter({ id: "letter_dal",   letter: "د", nameAr: "حرف الدال",  nameEn: "Letter Dal"  }),
  letter({ id: "letter_jeem",  letter: "ج", nameAr: "حرف الجيم",  nameEn: "Letter Jeem" }),
  letter({ id: "letter_qaf",   letter: "ق", nameAr: "حرف القاف",  nameEn: "Letter Qaf"  }),

  // ── Eastern-Arabic digits ───────────────────────────────────────────
  // ٠١٢٣٤٥٦٧٨٩ as decorative shapes. The user specifically asked for ٧
  // (the V-shaped seven). Use Reem Kufi for the chunky geometric look
  // that matches a "number on its own" decorative purpose.
  letter({ id: "digit_0", letter: "٠", font: KUFI, nameAr: "صفر",   nameEn: "Zero",  color: GOLD }),
  letter({ id: "digit_1", letter: "١", font: KUFI, nameAr: "واحد",  nameEn: "One",   color: GOLD }),
  letter({ id: "digit_2", letter: "٢", font: KUFI, nameAr: "اثنان", nameEn: "Two",   color: GOLD }),
  letter({ id: "digit_3", letter: "٣", font: KUFI, nameAr: "ثلاثة", nameEn: "Three", color: GOLD }),
  letter({ id: "digit_4", letter: "٤", font: KUFI, nameAr: "أربعة", nameEn: "Four",  color: GOLD }),
  letter({ id: "digit_5", letter: "٥", font: KUFI, nameAr: "خمسة",  nameEn: "Five",  color: GOLD }),
  letter({ id: "digit_6", letter: "٦", font: KUFI, nameAr: "ستة",   nameEn: "Six",   color: GOLD }),
  letter({ id: "digit_7", letter: "٧", font: KUFI, nameAr: "سبعة",  nameEn: "Seven", color: GOLD }),
  letter({ id: "digit_8", letter: "٨", font: KUFI, nameAr: "ثمانية",nameEn: "Eight", color: GOLD }),
  letter({ id: "digit_9", letter: "٩", font: KUFI, nameAr: "تسعة",  nameEn: "Nine",  color: GOLD }),

  // ── Religious / honorific ligatures ─────────────────────────────────
  // Use Amiri Quran which has the special precomposed glyphs for these
  // (so they render as the iconic compact calligraphy, not stretched).
  letter({ id: "lig_allah",    letter: "ﷲ", font: AMIRI, nameAr: "لفظ الجلالة", nameEn: "Allah",   aspect: 1.4 }),
  letter({ id: "lig_sallam",   letter: "ﷺ", font: AMIRI, nameAr: "صلى الله",   nameEn: "Sallam",   aspect: 1.4 }),
  letter({ id: "lig_basmala",  letter: "﷽", font: AMIRI, nameAr: "البسملة",    nameEn: "Basmala",  aspect: 3 }),
  letter({ id: "lig_jallajalalu", letter: "ﷻ", font: AMIRI, nameAr: "جلَّ جلاله", nameEn: "Jalla",  aspect: 1.4 }),

  // ── Short common phrases ────────────────────────────────────────────
  // Multi-char "words" that read as one calligraphic block. Vibes is
  // the showier Diwani-like font for these.
  letter({ id: "phrase_eid_mubarak",  letter: "عيد مبارك", font: RUQAA,
          nameAr: "عيد مبارك",  nameEn: "Eid Mubarak", aspect: 2.6 }),
  letter({ id: "phrase_mabrouk",      letter: "مبروك",     font: RUQAA,
          nameAr: "مبروك",      nameEn: "Mabrouk",     aspect: 1.6 }),
  letter({ id: "phrase_alhamdulillah", letter: "الحمد لله", font: RUQAA,
          nameAr: "الحمد لله",  nameEn: "Alhamdulillah", aspect: 2.6 }),
  letter({ id: "phrase_mashallah",    letter: "ما شاء الله", font: RUQAA,
          nameAr: "ما شاء الله", nameEn: "Mashallah",   aspect: 2.6 }),
];
