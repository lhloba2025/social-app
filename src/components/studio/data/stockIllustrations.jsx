// stockIllustrations.jsx — hand-drawn SVG art with named, recolorable regions.
//
// Each entry is the single source of truth for one illustration:
//   • `regions`        — which fill slots the illustration exposes (e.g. wool /
//                        face / legs for a sheep). Used by the UI to render
//                        one colour picker per slot, with localized labels.
//   • `defaultColors`  — sane palette so a freshly-added illustration looks
//                        good immediately, no recolouring needed.
//   • `svg(colors)`    — function that builds the full SVG markup with the
//                        chosen colours interpolated. Returns a *string* so
//                        the same output drives both the React preview
//                        (`dangerouslySetInnerHTML`) and canvas export
//                        (Blob → Image → drawImage). One representation only.
//
// All illustrations use a 200×200 viewBox so they compose at consistent
// scales. Designed flat / iconic so they hold up when shrunk to gallery
// thumbnails AND when scaled up to fill a 4K card.

export const STOCK_ILLUSTRATIONS = [
  // ─── 🐑 Sheep — v2, illustration-grade ───────────────────────────────
  // Major upgrade from v1: radial gradient on the wool gives it dimensionality,
  // ~70 SVG elements (vs ~15 before) create texture & anatomical detail. The
  // light source is upper-left, so highlights live there and shadows fall to
  // the lower-right — same light direction across every region for cohesion.
  //
  // Region simplification: face & legs share a colour by default (real sheep
  // anatomy), with `hooves` carved out as a separate region for the dark
  // foot caps. Three knobs is the sweet spot — enough freedom, not paralysing.
  {
    id: "sheep",
    emoji: "🐑",
    nameAr: "خروف",
    nameEn: "Sheep",
    aspect: 1,
    regions: [
      { key: "wool",   ar: "الصوف",       en: "Wool" },
      { key: "face",   ar: "الوجه والأرجل", en: "Face & legs" },
      { key: "hooves", ar: "الحوافر",      en: "Hooves" },
    ],
    defaultColors: { wool: "#f5efe1", face: "#3d2817", hooves: "#1a0f08" },
    svg: (c) => `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block">
      <defs>
        <!-- Radial gradient on the wool — light upper-left, shadow lower-right.
             The trailing transparent stop fades into the puff circles below so
             the silhouette doesn't end in a hard ring. -->
        <radialGradient id="woolGrad" cx="35%" cy="28%" r="78%">
          <stop offset="0%" stop-color="${c.wool}"/>
          <stop offset="55%" stop-color="${c.wool}"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.22"/>
        </radialGradient>
        <!-- Subtle vertical face gradient — darker towards the chin. -->
        <linearGradient id="faceGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${c.face}" stop-opacity="0.88"/>
          <stop offset="100%" stop-color="${c.face}"/>
        </linearGradient>
      </defs>

      <!-- Soft ground shadow anchors the sheep to a surface. -->
      <ellipse cx="205" cy="350" rx="130" ry="12" fill="#000" opacity="0.18"/>

      <!-- Back legs — drawn first so front legs visually overlap them. -->
      <rect x="138" y="262" width="16" height="72" rx="6" fill="${c.face}"/>
      <rect x="240" y="262" width="16" height="72" rx="6" fill="${c.face}"/>
      <ellipse cx="146" cy="334" rx="11" ry="6" fill="${c.hooves}"/>
      <ellipse cx="248" cy="334" rx="11" ry="6" fill="${c.hooves}"/>

      <!-- Front legs (slightly forward, with a thin highlight strip). -->
      <rect x="172" y="266" width="16" height="72" rx="6" fill="${c.face}"/>
      <rect x="206" y="266" width="16" height="72" rx="6" fill="${c.face}"/>
      <ellipse cx="180" cy="338" rx="11" ry="6" fill="${c.hooves}"/>
      <ellipse cx="214" cy="338" rx="11" ry="6" fill="${c.hooves}"/>
      <rect x="181" y="266" width="3" height="68" rx="2" fill="#fff" opacity="0.15"/>
      <rect x="215" y="266" width="3" height="68" rx="2" fill="#fff" opacity="0.15"/>

      <!-- Tail puff with a tiny highlight. -->
      <circle cx="88" cy="200" r="22" fill="${c.wool}"/>
      <circle cx="82" cy="194" r="8" fill="#fff" opacity="0.32"/>

      <!-- ── Wool body ────────────────────────────────────────────────────
           1. Gradient-filled core ellipse — the underlying 3D form.
           2. A dense ring of puff circles — gives the bumpy fluffy silhouette
              that's the visual fingerprint of sheep wool.
           3. White highlights on the upper-left where light hits.
           4. Tiny curl strokes for surface texture.
           5. A soft ground-shadow under the body to plant it. -->
      <ellipse cx="205" cy="215" rx="115" ry="80" fill="url(#woolGrad)"/>

      <g fill="${c.wool}">
        <circle cx="115" cy="170" r="40"/>
        <circle cx="98"  cy="210" r="34"/>
        <circle cx="115" cy="250" r="36"/>
        <circle cx="280" cy="165" r="42"/>
        <circle cx="300" cy="208" r="36"/>
        <circle cx="285" cy="252" r="38"/>
        <circle cx="155" cy="130" r="44"/>
        <circle cx="200" cy="118" r="48"/>
        <circle cx="245" cy="125" r="46"/>
        <circle cx="170" cy="280" r="32"/>
        <circle cx="205" cy="288" r="32"/>
        <circle cx="240" cy="280" r="32"/>
      </g>

      <g fill="#fff" opacity="0.4">
        <ellipse cx="170" cy="125" rx="45" ry="20"/>
        <ellipse cx="195" cy="105" rx="35" ry="15"/>
        <circle  cx="115" cy="165" r="20"/>
        <ellipse cx="200" cy="180" rx="55" ry="22"/>
      </g>

      <g stroke="${c.face}" stroke-width="1" fill="none" opacity="0.16" stroke-linecap="round">
        <path d="M 150 155 q 5 8 0 14"/>
        <path d="M 195 140 q 5 8 0 14"/>
        <path d="M 235 145 q 5 8 0 14"/>
        <path d="M 130 200 q 5 8 0 14"/>
        <path d="M 270 200 q 5 8 0 14"/>
        <path d="M 175 240 q 5 8 0 14"/>
        <path d="M 220 240 q 5 8 0 14"/>
        <path d="M 200 270 q 5 8 0 14"/>
        <path d="M 155 215 q 5 8 0 14"/>
        <path d="M 245 215 q 5 8 0 14"/>
      </g>

      <ellipse cx="205" cy="295" rx="105" ry="15" fill="#000" opacity="0.08"/>

      <!-- ── Face (right-facing) ────────────────────────────────────────── -->
      <!-- Ears — pointed leaf shapes with inner-ear shadow detail. -->
      <path d="M 295 165 Q 282 138 288 125 Q 302 138 305 165 Z" fill="${c.face}"/>
      <path d="M 297 162 Q 293 152 296 145 Q 301 154 302 163 Z" fill="${c.face}" opacity="0.4"/>
      <path d="M 338 162 Q 350 134 343 122 Q 330 136 328 162 Z" fill="${c.face}"/>
      <path d="M 336 159 Q 339 149 336 142 Q 332 152 331 161 Z" fill="${c.face}" opacity="0.4"/>

      <!-- Face mass (gradient) + lighter snout. -->
      <ellipse cx="315" cy="195" rx="38" ry="35" fill="url(#faceGrad)"/>
      <ellipse cx="333" cy="220" rx="22" ry="16" fill="${c.face}"/>
      <ellipse cx="330" cy="215" rx="12" ry="6"  fill="#fff" opacity="0.15"/>

      <!-- Eyes — four layers: sclera, iris, pupil, catch-light. The
           catch-light is what makes the eye look "alive" vs flat. -->
      <ellipse cx="304" cy="188" rx="5"   ry="6.5" fill="#fff"/>
      <circle  cx="305" cy="190" r="4"             fill="#1a0f08"/>
      <circle  cx="306" cy="189" r="1.3"           fill="#fff"/>
      <ellipse cx="326" cy="186" rx="5"   ry="6.5" fill="#fff"/>
      <circle  cx="327" cy="188" r="4"             fill="#1a0f08"/>
      <circle  cx="328" cy="187" r="1.3"           fill="#fff"/>

      <!-- Nostrils + mouth — small but they sell the realism. -->
      <ellipse cx="328" cy="217" rx="1.6" ry="2.5" fill="#000" opacity="0.7"/>
      <ellipse cx="338" cy="217" rx="1.6" ry="2.5" fill="#000" opacity="0.7"/>
      <path d="M 325 227 Q 333 232 341 227" fill="none" stroke="#000" stroke-width="1.5" opacity="0.55" stroke-linecap="round"/>
    </svg>`,
  },

  // ─── 🌴 Palm tree ─────────────────────────────────────────────────────
  // Tall composition. Trunk runs vertically; fronds splay out top; dates
  // cluster where they meet. Three regions cover the obvious storytelling
  // beats (trunk hue, frond green, fruit colour).
  {
    id: "palm",
    emoji: "🌴",
    nameAr: "نخلة",
    nameEn: "Palm tree",
    aspect: 1,
    regions: [
      { key: "trunk", ar: "جذع", en: "Trunk" },
      { key: "leaves", ar: "سعف", en: "Leaves" },
      { key: "dates", ar: "تمر", en: "Dates" },
    ],
    defaultColors: { trunk: "#6b4423", leaves: "#3d7a3d", dates: "#7a2a1a" },
    svg: (c) => `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block">
      <!-- trunk — tapered with horizontal scoring marks for texture -->
      <path d="M 92 180 L 96 70 Q 100 65 104 70 L 108 180 Z" fill="${c.trunk}"/>
      <line x1="93" y1="160" x2="107" y2="160" stroke="${c.trunk}" stroke-width="3" filter="brightness(0.7)"/>
      <line x1="93" y1="140" x2="107" y2="140" stroke="#000" stroke-opacity="0.25" stroke-width="2"/>
      <line x1="93" y1="120" x2="107" y2="120" stroke="#000" stroke-opacity="0.25" stroke-width="2"/>
      <line x1="94" y1="100" x2="106" y2="100" stroke="#000" stroke-opacity="0.25" stroke-width="2"/>
      <line x1="94" y1="80" x2="106" y2="80" stroke="#000" stroke-opacity="0.25" stroke-width="2"/>
      <!-- dates cluster (drawn before fronds so fronds appear on top) -->
      <g fill="${c.dates}">
        <ellipse cx="92" cy="68" rx="3" ry="4"/>
        <ellipse cx="98" cy="66" rx="3" ry="4"/>
        <ellipse cx="104" cy="66" rx="3" ry="4"/>
        <ellipse cx="110" cy="68" rx="3" ry="4"/>
        <ellipse cx="95" cy="72" rx="3" ry="4"/>
        <ellipse cx="101" cy="72" rx="3" ry="4"/>
        <ellipse cx="107" cy="72" rx="3" ry="4"/>
      </g>
      <!-- fronds — 8 elongated leaf shapes radiating from the crown -->
      <g fill="${c.leaves}">
        <path d="M 100 60 Q 60 40 25 50 Q 55 55 100 65 Z"/>
        <path d="M 100 60 Q 140 40 175 50 Q 145 55 100 65 Z"/>
        <path d="M 100 60 Q 75 25 50 15 Q 75 35 100 65 Z"/>
        <path d="M 100 60 Q 125 25 150 15 Q 125 35 100 65 Z"/>
        <path d="M 100 60 Q 100 20 90 5 Q 100 30 100 65 Z"/>
        <path d="M 100 60 Q 100 20 110 5 Q 100 30 100 65 Z"/>
        <path d="M 100 60 Q 70 55 35 70 Q 70 65 100 65 Z"/>
        <path d="M 100 60 Q 130 55 165 70 Q 130 65 100 65 Z"/>
      </g>
      <!-- frond midribs (subtle dark lines so the fronds read as leaves not blobs) -->
      <g stroke="${c.leaves}" stroke-width="1.5" fill="none" opacity="0.5" filter="brightness(0.6)">
        <path d="M 100 62 L 25 50"/>
        <path d="M 100 62 L 175 50"/>
        <path d="M 100 62 L 50 15"/>
        <path d="M 100 62 L 150 15"/>
        <path d="M 100 62 L 90 5"/>
        <path d="M 100 62 L 110 5"/>
        <path d="M 100 62 L 35 70"/>
        <path d="M 100 62 L 165 70"/>
      </g>
    </svg>`,
  },

  // ─── 🏠 Traditional Najdi house ────────────────────────────────────────
  // Iconic mud-walled house with crenellated parapet and wooden door — the
  // archetype people picture when they hear "بيت تراثي" / "بيت قديم". Four
  // colour regions cover the storytelling moments: walls (mud / clay), roof
  // (parapet trim), door (heritage wood), windows (recessed shadows).
  {
    id: "heritage_house",
    emoji: "🏠",
    nameAr: "بيت تراثي",
    nameEn: "Heritage house",
    aspect: 1,
    regions: [
      { key: "walls", ar: "الجدران", en: "Walls" },
      { key: "roof", ar: "السطح", en: "Roof" },
      { key: "door", ar: "الباب الخشبي", en: "Wooden door" },
      { key: "windows", ar: "النوافذ", en: "Windows" },
    ],
    defaultColors: { walls: "#c8a87a", roof: "#8b6a3a", door: "#5a3a1a", windows: "#3d2817" },
    svg: (c) => `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block">
      <!-- walls — slightly wider at bottom for mud-brick feel -->
      <path d="M 35 60 L 165 60 L 168 180 L 32 180 Z" fill="${c.walls}"/>
      <!-- subtle wall texture lines (mud blocks) -->
      <g stroke="#000" stroke-opacity="0.07" stroke-width="1">
        <line x1="40" y1="90" x2="160" y2="90"/>
        <line x1="40" y1="120" x2="160" y2="120"/>
        <line x1="40" y1="150" x2="160" y2="150"/>
      </g>
      <!-- roof band -->
      <rect x="32" y="55" width="136" height="14" fill="${c.roof}"/>
      <!-- crenellated parapet — five triangular merlons (classic Najdi) -->
      <g fill="${c.roof}">
        <polygon points="35,55 45,40 55,55"/>
        <polygon points="62,55 72,40 82,55"/>
        <polygon points="90,55 100,40 110,55"/>
        <polygon points="118,55 128,40 138,55"/>
        <polygon points="145,55 155,40 165,55"/>
      </g>
      <!-- wooden door — centered, arched top -->
      <path d="M 85 180 L 85 115 Q 85 100 100 100 Q 115 100 115 115 L 115 180 Z" fill="${c.door}"/>
      <!-- door planks (vertical scoring) -->
      <g stroke="#000" stroke-opacity="0.35" stroke-width="1.2">
        <line x1="93" y1="105" x2="93" y2="180"/>
        <line x1="100" y1="100" x2="100" y2="180"/>
        <line x1="107" y1="105" x2="107" y2="180"/>
      </g>
      <!-- door handle / knocker -->
      <circle cx="108" cy="145" r="2.5" fill="#d4af37"/>
      <!-- windows — small square recesses, two flanking the door -->
      <rect x="50" y="90" width="22" height="22" fill="${c.windows}"/>
      <rect x="128" y="90" width="22" height="22" fill="${c.windows}"/>
      <!-- window cross-mullions -->
      <g stroke="${c.walls}" stroke-width="1.5">
        <line x1="61" y1="90" x2="61" y2="112"/>
        <line x1="50" y1="101" x2="72" y2="101"/>
        <line x1="139" y1="90" x2="139" y2="112"/>
        <line x1="128" y1="101" x2="150" y2="101"/>
      </g>
    </svg>`,
  },

  // ─── 💐 Flower bouquet ────────────────────────────────────────────────
  // Five flowers, leaves, and a wrap. Three regions so colouring is fast:
  // petals (the headline colour), leaves, and wrap paper. Each bloom is
  // built from five outer petals + a centre disc for the classic icon look.
  {
    id: "bouquet",
    emoji: "💐",
    nameAr: "باقة ورد",
    nameEn: "Flower bouquet",
    aspect: 1,
    regions: [
      { key: "petals", ar: "البتلات", en: "Petals" },
      { key: "centers", ar: "وسط الورده", en: "Centers" },
      { key: "leaves", ar: "الأوراق", en: "Leaves" },
      { key: "wrap", ar: "ورق التغليف", en: "Wrap" },
    ],
    defaultColors: { petals: "#d94a6a", centers: "#fbbf24", leaves: "#3d7a3d", wrap: "#e8dcc4" },
    svg: (c) => {
      // Helper: a single 5-petal bloom centered at (cx, cy) with given size
      const flower = (cx, cy, r) => `
        <g transform="translate(${cx} ${cy})">
          <circle cx="0" cy="-${r}" r="${r * 0.6}" fill="${c.petals}"/>
          <circle cx="${r * 0.95}" cy="-${r * 0.31}" r="${r * 0.6}" fill="${c.petals}"/>
          <circle cx="${r * 0.59}" cy="${r * 0.81}" r="${r * 0.6}" fill="${c.petals}"/>
          <circle cx="-${r * 0.59}" cy="${r * 0.81}" r="${r * 0.6}" fill="${c.petals}"/>
          <circle cx="-${r * 0.95}" cy="-${r * 0.31}" r="${r * 0.6}" fill="${c.petals}"/>
          <circle cx="0" cy="0" r="${r * 0.45}" fill="${c.centers}"/>
        </g>`;
      return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block">
        <!-- wrap (cone / paper cuff at the bottom) -->
        <path d="M 60 140 L 140 140 L 130 195 L 70 195 Z" fill="${c.wrap}"/>
        <line x1="60" y1="140" x2="130" y2="195" stroke="#000" stroke-opacity="0.15" stroke-width="1.5"/>
        <line x1="140" y1="140" x2="70" y2="195" stroke="#000" stroke-opacity="0.15" stroke-width="1.5"/>
        <!-- stems (thin lines emerging from the wrap) -->
        <g stroke="${c.leaves}" stroke-width="2.5" fill="none">
          <path d="M 100 140 L 100 90"/>
          <path d="M 100 140 L 65 80"/>
          <path d="M 100 140 L 135 75"/>
          <path d="M 100 140 L 75 105"/>
          <path d="M 100 140 L 125 105"/>
        </g>
        <!-- leaves -->
        <g fill="${c.leaves}">
          <ellipse cx="78" cy="115" rx="9" ry="5" transform="rotate(40 78 115)"/>
          <ellipse cx="122" cy="115" rx="9" ry="5" transform="rotate(-40 122 115)"/>
          <ellipse cx="90" cy="100" rx="8" ry="4" transform="rotate(60 90 100)"/>
          <ellipse cx="110" cy="100" rx="8" ry="4" transform="rotate(-60 110 100)"/>
        </g>
        <!-- 5 blooms -->
        ${flower(100, 80, 14)}
        ${flower(70, 70, 12)}
        ${flower(130, 70, 12)}
        ${flower(85, 55, 10)}
        ${flower(115, 55, 10)}
        <!-- bow / tie around the wrap -->
        <rect x="60" y="155" width="80" height="6" fill="${c.petals}" filter="brightness(0.8)"/>
      </svg>`;
    },
  },

  // ─── 🎁 Gift box ───────────────────────────────────────────────────────
  // Square box with cross-ribbon and a top bow. Three regions: box (the
  // wrapping paper), ribbon (the cross + bow), and the bow's knot accent.
  {
    id: "gift",
    emoji: "🎁",
    nameAr: "هدية",
    nameEn: "Gift box",
    aspect: 1,
    regions: [
      { key: "box", ar: "العلبة", en: "Box" },
      { key: "ribbon", ar: "الشريط", en: "Ribbon" },
      { key: "knot", ar: "العقدة", en: "Knot" },
    ],
    defaultColors: { box: "#b91c5c", ribbon: "#fbbf24", knot: "#f59e0b" },
    svg: (c) => `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block">
      <!-- box bottom -->
      <rect x="40" y="80" width="120" height="105" rx="3" fill="${c.box}"/>
      <!-- box lid (slightly overhanging) -->
      <rect x="35" y="70" width="130" height="22" rx="3" fill="${c.box}" filter="brightness(1.08)"/>
      <!-- vertical ribbon -->
      <rect x="92" y="70" width="16" height="115" fill="${c.ribbon}"/>
      <!-- horizontal ribbon on the lid -->
      <rect x="35" y="78" width="130" height="8" fill="${c.ribbon}"/>
      <!-- bow loops -->
      <ellipse cx="80" cy="55" rx="22" ry="14" fill="${c.ribbon}" transform="rotate(-20 80 55)"/>
      <ellipse cx="120" cy="55" rx="22" ry="14" fill="${c.ribbon}" transform="rotate(20 120 55)"/>
      <!-- bow inner shadows -->
      <ellipse cx="80" cy="55" rx="10" ry="6" fill="#000" opacity="0.18" transform="rotate(-20 80 55)"/>
      <ellipse cx="120" cy="55" rx="10" ry="6" fill="#000" opacity="0.18" transform="rotate(20 120 55)"/>
      <!-- knot in the middle -->
      <rect x="92" y="46" width="16" height="22" rx="3" fill="${c.knot}"/>
      <!-- ribbon tails dangling down the box -->
      <path d="M 100 68 L 95 95 L 100 90 L 105 95 Z" fill="${c.ribbon}" opacity="0.85"/>
    </svg>`,
  },

  // ─── 🏮 Ramadan / Eid lantern ──────────────────────────────────────────
  // Classic fanous shape. Top cap, body cage, glowing centre, bottom base.
  // Four regions: cap (metal trim), cage (the lantern frame), glow (the
  // inner light), base.
  {
    id: "lantern",
    emoji: "🏮",
    nameAr: "فانوس",
    nameEn: "Lantern",
    aspect: 1,
    regions: [
      { key: "cap", ar: "غطاء علوي", en: "Top cap" },
      { key: "cage", ar: "إطار", en: "Frame" },
      { key: "glow", ar: "ضوء", en: "Light" },
      { key: "base", ar: "قاعدة", en: "Base" },
    ],
    defaultColors: { cap: "#b8860b", cage: "#8b6914", glow: "#fde047", base: "#6b4423" },
    svg: (c) => `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block">
      <!-- hanger ring -->
      <circle cx="100" cy="22" r="6" fill="none" stroke="${c.cap}" stroke-width="3"/>
      <line x1="100" y1="28" x2="100" y2="38" stroke="${c.cap}" stroke-width="2.5"/>
      <!-- top cap (dome) -->
      <path d="M 70 55 Q 100 30 130 55 L 130 60 L 70 60 Z" fill="${c.cap}"/>
      <!-- decorative trim above body -->
      <rect x="65" y="58" width="70" height="6" fill="${c.cap}"/>
      <!-- glow (body interior) -->
      <path d="M 70 65 Q 60 105 70 145 L 130 145 Q 140 105 130 65 Z" fill="${c.glow}"/>
      <!-- vertical cage bars -->
      <g stroke="${c.cage}" stroke-width="3" fill="none">
        <path d="M 80 65 Q 73 105 80 145"/>
        <path d="M 100 64 L 100 146"/>
        <path d="M 120 65 Q 127 105 120 145"/>
      </g>
      <!-- horizontal cage rings -->
      <g stroke="${c.cage}" stroke-width="2.5" fill="none">
        <ellipse cx="100" cy="80" rx="34" ry="4"/>
        <ellipse cx="100" cy="105" rx="36" ry="4.5"/>
        <ellipse cx="100" cy="130" rx="34" ry="4"/>
      </g>
      <!-- bottom trim -->
      <rect x="65" y="145" width="70" height="6" fill="${c.cap}"/>
      <!-- base -->
      <path d="M 70 151 L 130 151 L 122 175 L 78 175 Z" fill="${c.base}"/>
      <rect x="78" y="175" width="44" height="5" fill="${c.base}" filter="brightness(0.85)"/>
    </svg>`,
  },
];

// Quick-pick **vintage** palette — heritage / "ألوان قديمه" — for old
// wooden doors, mud walls, faded textiles, antique brass etc. Different
// from the bright web colours users get by default in colour pickers.
export const VINTAGE_PALETTE = [
  { name: "Saffron",        ar: "زعفران",      color: "#c8842a" },
  { name: "Mud Clay",       ar: "طيني",         color: "#a87a4a" },
  { name: "Olive",          ar: "زيتوني",       color: "#6b6b3a" },
  { name: "Brick",          ar: "قرميد",        color: "#a8503a" },
  { name: "Antique Gold",   ar: "ذهبي عتيق",   color: "#a8893a" },
  { name: "Faded Teal",     ar: "تركواز باهت", color: "#5b8a8e" },
  { name: "Bone",           ar: "عظمي",         color: "#e8dcc4" },
  { name: "Old Wood",       ar: "خشب قديم",    color: "#5a3a1a" },
  { name: "Charcoal",       ar: "فحمي",         color: "#3d3733" },
  { name: "Rust",           ar: "صدأ",          color: "#9c4a2a" },
  { name: "Sage",           ar: "ميرمية",       color: "#8a9a7a" },
  { name: "Dusty Rose",     ar: "وردي معتّق",  color: "#b87a7a" },
];

// One-click "find a realistic PNG" subjects. Each opens Google Images
// filtered to transparent backgrounds (`ic:trans`) so the user only needs
// to right-click → save → upload. Bypasses the hand-coded SVG ceiling
// (which is great for icons, bad for photoreal art).
//
// Queries lean Arabic-context-aware ("najdi old", "fanous", "abaya") so
// the first page of results matches Saudi heritage aesthetics rather than
// generic Western stock images.
export const REAL_IMAGE_SUBJECTS = [
  { ar: "خروف",       en: "Sheep",          emoji: "🐑", query: "sheep png transparent realistic" },
  { ar: "نخلة",        en: "Palm tree",      emoji: "🌴", query: "palm tree png transparent realistic" },
  { ar: "بيت نجدي",    en: "Najdi house",    emoji: "🏠", query: "najdi old saudi house png transparent" },
  { ar: "باقة ورد",    en: "Bouquet",        emoji: "💐", query: "flower bouquet png transparent" },
  { ar: "سيارة قديمة", en: "Vintage car",    emoji: "🚗", query: "vintage classic car png transparent" },
  { ar: "فانوس",       en: "Fanous",         emoji: "🏮", query: "arabic ramadan fanous lantern png transparent" },
  { ar: "مسجد",        en: "Mosque",         emoji: "🕌", query: "mosque png transparent realistic" },
  { ar: "جمل",         en: "Camel",          emoji: "🐫", query: "camel png transparent realistic" },
  { ar: "هلال",        en: "Crescent",       emoji: "🌙", query: "crescent moon png transparent" },
  { ar: "ورد",          en: "Rose",           emoji: "🌹", query: "red rose png transparent realistic" },
  { ar: "شجرة زيتون",  en: "Olive tree",     emoji: "🌳", query: "olive tree png transparent" },
  { ar: "هدية",         en: "Gift box",       emoji: "🎁", query: "gift box png transparent realistic" },
  { ar: "تمر",          en: "Dates",          emoji: "🌰", query: "dates fruit png transparent realistic" },
  { ar: "قهوة عربية",   en: "Arabic coffee",  emoji: "☕", query: "arabic coffee dallah png transparent" },
  { ar: "باب خشبي",     en: "Wooden door",    emoji: "🚪", query: "old wooden door png transparent" },
  { ar: "إكليل",        en: "Wreath",         emoji: "🌿", query: "leaf wreath png transparent" },
];

// Helper — builds the Google Images URL with the transparent-only filter.
export const googleImagesUrl = (query) =>
  `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch&tbs=ic:trans`;

// Background gradient presets — quick way to start a card without a photo.
// Pairs warm Saudi / Eid hues that compose well with the stock art above.
export const BG_GRADIENT_PRESETS = [
  { name: "Desert Dawn",   ar: "فجر الصحراء",  c1: "#f4d3a8", c2: "#d99464", angle: 180 },
  { name: "Old Sand",      ar: "رمل قديم",     c1: "#e8dcc4", c2: "#c8a87a", angle: 180 },
  { name: "Eid Night",     ar: "ليلة العيد",    c1: "#1e293b", c2: "#7c3aed", angle: 180 },
  { name: "Mosque Blue",   ar: "أزرق المسجد",  c1: "#5b8a8e", c2: "#1e3a5f", angle: 180 },
  { name: "Royal Green",   ar: "أخضر ملكي",    c1: "#1a4d3a", c2: "#0a2818", angle: 180 },
  { name: "Cream",         ar: "كريمي",        c1: "#fef3e2", c2: "#e8d8c0", angle: 180 },
  { name: "Sunset",        ar: "غروب",         c1: "#fbbf24", c2: "#dc2626", angle: 180 },
  { name: "Heritage",      ar: "تراثي",        c1: "#c8a87a", c2: "#6b4423", angle: 180 },
];
