export const SVG_TYPES = [
  { id: "swoosh",      nameAr: "لفحة",    nameEn: "Swoosh"   },
  { id: "arc",         nameAr: "قوس",     nameEn: "Arc"      },
  { id: "circle",      nameAr: "دائرة",   nameEn: "Circle"   },
  { id: "wave",        nameAr: "موجة",    nameEn: "Wave"     },
  { id: "diagonal",    nameAr: "قطري",    nameEn: "Diagonal" },
  { id: "corner_glow", nameAr: "توهج",    nameEn: "Glow"     },
  { id: "oval",        nameAr: "بيضوي",   nameEn: "Oval"     },
  { id: "bands",       nameAr: "شرائط",   nameEn: "Bands"    },
  { id: "bubble",      nameAr: "فقاعات",  nameEn: "Bubbles"  },
  { id: "ribbon",      nameAr: "شريط",    nameEn: "Ribbon"   },
  // ── 20 new patterns ──────────────────────────────────────
  { id: "neon_ring",   nameAr: "حلقة نيون",  nameEn: "Neon Ring"   },
  { id: "tri_corner",  nameAr: "مثلث زاوية", nameEn: "Tri Corner"  },
  { id: "double_wave", nameAr: "موجتان",     nameEn: "Double Wave" },
  { id: "rays",        nameAr: "أشعة",       nameEn: "Rays"        },
  { id: "ink",         nameAr: "حبر",        nameEn: "Ink Blob"    },
  { id: "hexgrid",     nameAr: "سداسي",      nameEn: "Hex Grid"    },
  { id: "particles",   nameAr: "جسيمات",     nameEn: "Particles"   },
  { id: "vignette",    nameAr: "ظلام أطراف", nameEn: "Vignette"    },
  { id: "mountain",    nameAr: "جبل",        nameEn: "Mountain"    },
  { id: "split_v",     nameAr: "انقسام",     nameEn: "Split V"     },
  { id: "lens",        nameAr: "عدسة ضوء",   nameEn: "Lens Flare"  },
  { id: "chevron",     nameAr: "شيفرون",     nameEn: "Chevron"     },
  { id: "liquid_blob", nameAr: "سائل",       nameEn: "Liquid Blob" },
  { id: "cross_fade",  nameAr: "تقاطع",      nameEn: "Cross Fade"  },
  { id: "star_burst",  nameAr: "نجمة",       nameEn: "Star Burst"  },
  { id: "dual_circle", nameAr: "دائرتان",    nameEn: "Dual Circle" },
  { id: "neon_bars",   nameAr: "أعمدة نيون", nameEn: "Neon Bars"   },
  { id: "halftone",    nameAr: "نقاط",       nameEn: "Halftone"    },
  { id: "grid_lines",  nameAr: "شبكة",       nameEn: "Grid Lines"  },
  { id: "aurora",      nameAr: "أورورا",     nameEn: "Aurora"      },
  // ── 50 additional attractive patterns ─────────────────────
  { id: "prism",         nameAr: "موشور",          nameEn: "Prism"           },
  { id: "circuit",       nameAr: "دارة كهربائية",   nameEn: "Circuit"         },
  { id: "silk",          nameAr: "حرير",           nameEn: "Silk"            },
  { id: "spotlight",     nameAr: "بقعة ضوء",       nameEn: "Spotlight"       },
  { id: "dots_grid",     nameAr: "نقاط شبكية",     nameEn: "Dots Grid"       },
  { id: "slash",         nameAr: "خط مائل",        nameEn: "Slash"           },
  { id: "triangles_tile",nameAr: "مثلثات",         nameEn: "Triangle Tiles"  },
  { id: "swirl",         nameAr: "دوامة",          nameEn: "Swirl"           },
  { id: "bokeh",         nameAr: "بوكيه",          nameEn: "Bokeh"           },
  { id: "stripes_diag",  nameAr: "خطوط قطرية",     nameEn: "Diagonal Stripes"},
  { id: "target",        nameAr: "هدف",            nameEn: "Target"          },
  { id: "circle_grid",   nameAr: "دوائر شبكية",    nameEn: "Circle Grid"     },
  { id: "wave_stack",    nameAr: "أمواج متراكمة",  nameEn: "Wave Stack"      },
  { id: "nebula",        nameAr: "سديم كوني",      nameEn: "Nebula"          },
  { id: "block_split",   nameAr: "كتل ملونة",      nameEn: "Block Split"     },
  { id: "arch",          nameAr: "قوس معماري",     nameEn: "Arch"            },
  { id: "lightning",     nameAr: "برق",            nameEn: "Lightning"       },
  { id: "flame",         nameAr: "لهب",            nameEn: "Flame"           },
  { id: "drop",          nameAr: "قطرة",           nameEn: "Drop"            },
  { id: "crystal",       nameAr: "بلورة",          nameEn: "Crystal"         },
  { id: "cross_x",       nameAr: "تقاطع X",        nameEn: "X Cross"         },
  { id: "arrow_band",    nameAr: "حزام سهم",       nameEn: "Arrow Band"      },
  { id: "half_circle",   nameAr: "نصف دائرة",      nameEn: "Half Circle"     },
  { id: "squares_tile",  nameAr: "مربعات",         nameEn: "Square Tiles"    },
  { id: "bricks",        nameAr: "طوب",            nameEn: "Bricks"          },
  { id: "wave_radial",   nameAr: "أمواج شعاعية",   nameEn: "Radial Waves"    },
  { id: "sunset",        nameAr: "غروب",           nameEn: "Sunset"          },
  { id: "moon",          nameAr: "قمر",            nameEn: "Moon"            },
  { id: "leaf",          nameAr: "ورقة",           nameEn: "Leaf"            },
  { id: "petals",        nameAr: "بتلات",          nameEn: "Petals"          },
  { id: "stars_field",   nameAr: "حقل نجوم",       nameEn: "Stars Field"     },
  { id: "paper_fold",    nameAr: "طي ورق",         nameEn: "Paper Fold"      },
  { id: "triangle_grid", nameAr: "شبكة مثلثات",    nameEn: "Triangle Grid"   },
  { id: "sweep",         nameAr: "كنس",            nameEn: "Sweep"           },
  { id: "glitch",        nameAr: "جليتش",          nameEn: "Glitch"          },
  { id: "scan_lines",    nameAr: "خطوط مسح",       nameEn: "Scan Lines"      },
  { id: "arrow_up",      nameAr: "سهم أعلى",       nameEn: "Up Arrow"        },
  { id: "pillar",        nameAr: "عمود",           nameEn: "Pillar"          },
  { id: "grad_blocks",   nameAr: "كتل متدرجة",     nameEn: "Gradient Blocks" },
  { id: "squiggle",      nameAr: "خط متموج",       nameEn: "Squiggle"        },
  { id: "lattice",       nameAr: "تشابك",          nameEn: "Lattice"         },
  { id: "honeycomb",     nameAr: "خلية نحل",       nameEn: "Honeycomb"       },
  { id: "wave_top",      nameAr: "موجة علوية",     nameEn: "Top Wave"        },
  { id: "wave_bottom",   nameAr: "موجة سفلية",     nameEn: "Bottom Wave"     },
  { id: "wave_side",     nameAr: "موجة جانبية",    nameEn: "Side Wave"       },
  { id: "plus_grid",     nameAr: "علامات زائد",    nameEn: "Plus Grid"       },
  { id: "cosmic",        nameAr: "غبار كوني",      nameEn: "Cosmic Dust"     },
  { id: "ripple",        nameAr: "تموج",           nameEn: "Ripple"          },
  { id: "mesh_geo",      nameAr: "شبكة هندسية",    nameEn: "Geo Mesh"        },
  { id: "shutter",       nameAr: "شريحة",          nameEn: "Shutter"         },
  // ── Notebook / paper backgrounds (writeable surfaces) ─────
  { id: "lined_paper",   nameAr: "📝 ورق مسطر",     nameEn: "Lined Paper"     },
  { id: "grid_paper",    nameAr: "📐 ورق مربعات",    nameEn: "Grid Paper"      },
  { id: "dot_paper",     nameAr: "⠿ ورق نقاط",      nameEn: "Dot Paper"       },
  { id: "legal_pad",     nameAr: "📒 دفتر قانوني",   nameEn: "Legal Pad"       },
  { id: "music_staff",   nameAr: "🎵 ورق موسيقى",    nameEn: "Music Staff"     },
  { id: "graph_paper",   nameAr: "📊 ورق رسم بياني", nameEn: "Graph Paper"     },
];

export const SVG_TYPE_DEFAULTS = {
  swoosh:      { bgColor: "#09071f", color1: "#4c1d95", color2: "#7c3aed", size: 50, position: 65, angle: 0 },
  arc:         { bgColor: "#0a0520", color1: "#1e3a8a", color2: "#4c1d95", size: 55, position: 75, angle: 0 },
  circle:      { bgColor: "#09071f", color1: "#4c1d95", color2: "#7c3aed", size: 55, position: 80, angle: 0 },
  wave:        { bgColor: "#09071f", color1: "#4c1d95", color2: "#1e1b4b", size: 45, position: 60, angle: 0 },
  diagonal:    { bgColor: "#06041a", color1: "#4c1d95", color2: "#7c3aed", size: 50, position: 50, angle: 0 },
  corner_glow: { bgColor: "#09071f", color1: "#7c3aed", color2: "#4c1d95", size: 65, position: 0,  angle: 0 },
  oval:        { bgColor: "#09071f", color1: "#4c1d95", color2: "#7c3aed", size: 60, position: 45, angle: 0 },
  bands:       { bgColor: "#09071f", color1: "#4c1d95", color2: "#1e3a8a", size: 25, position: 50, angle: 0 },
  bubble:      { bgColor: "#09071f", color1: "#4c1d95", color2: "#1e3a8a", size: 65, position: 75, angle: 0 },
  ribbon:      { bgColor: "#0d0d1a", color1: "#c9a227", color2: "#4c1d95", size: 15, position: 50, angle: 0 },
  neon_ring:   { bgColor: "#09071f", color1: "#6366f1", color2: "#ec4899", size: 55, position: 50, angle: 0 },
  tri_corner:  { bgColor: "#09071f", color1: "#7c3aed", color2: "#4c1d95", size: 60, position: 0,  angle: 0 },
  double_wave: { bgColor: "#09071f", color1: "#4c1d95", color2: "#1e3a8a", size: 40, position: 25, angle: 0 },
  rays:        { bgColor: "#09071f", color1: "#7c3aed", color2: "#4c1d95", size: 50, position: 50, angle: 0 },
  ink:         { bgColor: "#09071f", color1: "#7c3aed", color2: "#ec4899", size: 55, position: 60, angle: 0 },
  hexgrid:     { bgColor: "#09071f", color1: "#1e1b4b", color2: "#312e81", size: 40, position: 30, angle: 0 },
  particles:   { bgColor: "#09071f", color1: "#6366f1", color2: "#ec4899", size: 45, position: 50, angle: 0 },
  vignette:    { bgColor: "#09071f", color1: "#09071f", color2: "#000000", size: 70, position: 50, angle: 0 },
  mountain:    { bgColor: "#09071f", color1: "#1e3a8a", color2: "#4c1d95", size: 55, position: 55, angle: 0 },
  split_v:     { bgColor: "#09071f", color1: "#4c1d95", color2: "#1e3a8a", size: 50, position: 50, angle: 0 },
  lens:        { bgColor: "#09071f", color1: "#6366f1", color2: "#ec4899", size: 60, position: 50, angle: 0 },
  chevron:     { bgColor: "#09071f", color1: "#4c1d95", color2: "#1e1b4b", size: 40, position: 40, angle: 0 },
  liquid_blob: { bgColor: "#09071f", color1: "#7c3aed", color2: "#ec4899", size: 55, position: 60, angle: 0 },
  cross_fade:  { bgColor: "#09071f", color1: "#4c1d95", color2: "#1e3a8a", size: 70, position: 50, angle: 0 },
  star_burst:  { bgColor: "#09071f", color1: "#7c3aed", color2: "#4c1d95", size: 50, position: 50, angle: 0 },
  dual_circle: { bgColor: "#09071f", color1: "#6366f1", color2: "#ec4899", size: 55, position: 35, angle: 0 },
  neon_bars:   { bgColor: "#09071f", color1: "#6366f1", color2: "#ec4899", size: 40, position: 50, angle: 0 },
  halftone:    { bgColor: "#09071f", color1: "#4c1d95", color2: "#1e3a8a", size: 40, position: 50, angle: 0 },
  grid_lines:  { bgColor: "#09071f", color1: "#6366f1", color2: "#818cf8", size: 40, position: 60, angle: 0 },
  aurora:      { bgColor: "#09071f", color1: "#6366f1", color2: "#06b6d4", size: 50, position: 40, angle: 0 },
  prism:         { bgColor: "#09071f", color1: "#7c3aed", color2: "#ec4899", size: 50, position: 30, angle: 0 },
  circuit:       { bgColor: "#020617", color1: "#06b6d4", color2: "#10b981", size: 40, position: 50, angle: 0 },
  silk:          { bgColor: "#09071f", color1: "#7c3aed", color2: "#ec4899", size: 50, position: 50, angle: 0 },
  spotlight:     { bgColor: "#020617", color1: "#fbbf24", color2: "#f97316", size: 65, position: 30, angle: 0 },
  dots_grid:     { bgColor: "#09071f", color1: "#6366f1", color2: "#a855f7", size: 35, position: 50, angle: 0 },
  slash:         { bgColor: "#09071f", color1: "#ec4899", color2: "#f97316", size: 45, position: 50, angle: 0 },
  triangles_tile:{ bgColor: "#09071f", color1: "#4c1d95", color2: "#1e3a8a", size: 35, position: 50, angle: 0 },
  swirl:         { bgColor: "#09071f", color1: "#7c3aed", color2: "#ec4899", size: 55, position: 50, angle: 0 },
  bokeh:         { bgColor: "#09071f", color1: "#a855f7", color2: "#ec4899", size: 50, position: 50, angle: 0 },
  stripes_diag:  { bgColor: "#09071f", color1: "#4c1d95", color2: "#1e1b4b", size: 35, position: 50, angle: 0 },
  target:        { bgColor: "#09071f", color1: "#ec4899", color2: "#f97316", size: 60, position: 50, angle: 0 },
  circle_grid:   { bgColor: "#09071f", color1: "#4c1d95", color2: "#7c3aed", size: 40, position: 50, angle: 0 },
  wave_stack:    { bgColor: "#09071f", color1: "#0ea5e9", color2: "#7c3aed", size: 45, position: 60, angle: 0 },
  nebula:        { bgColor: "#020617", color1: "#7c3aed", color2: "#ec4899", size: 60, position: 50, angle: 0 },
  block_split:   { bgColor: "#09071f", color1: "#7c3aed", color2: "#ec4899", size: 50, position: 50, angle: 0 },
  arch:          { bgColor: "#09071f", color1: "#7c3aed", color2: "#1e3a8a", size: 60, position: 80, angle: 0 },
  lightning:     { bgColor: "#020617", color1: "#fbbf24", color2: "#f97316", size: 50, position: 50, angle: 0 },
  flame:         { bgColor: "#020617", color1: "#f97316", color2: "#dc2626", size: 55, position: 80, angle: 0 },
  drop:          { bgColor: "#09071f", color1: "#0ea5e9", color2: "#06b6d4", size: 45, position: 40, angle: 0 },
  crystal:       { bgColor: "#020617", color1: "#06b6d4", color2: "#a855f7", size: 50, position: 50, angle: 0 },
  cross_x:       { bgColor: "#09071f", color1: "#ec4899", color2: "#7c3aed", size: 45, position: 50, angle: 0 },
  arrow_band:    { bgColor: "#09071f", color1: "#ec4899", color2: "#f97316", size: 40, position: 50, angle: 0 },
  half_circle:   { bgColor: "#09071f", color1: "#7c3aed", color2: "#ec4899", size: 70, position: 50, angle: 0 },
  squares_tile:  { bgColor: "#09071f", color1: "#1e1b4b", color2: "#312e81", size: 40, position: 50, angle: 0 },
  bricks:        { bgColor: "#09071f", color1: "#4c1d95", color2: "#1e1b4b", size: 35, position: 50, angle: 0 },
  wave_radial:   { bgColor: "#09071f", color1: "#06b6d4", color2: "#7c3aed", size: 55, position: 50, angle: 0 },
  sunset:        { bgColor: "#1a0530", color1: "#f97316", color2: "#7c3aed", size: 50, position: 60, angle: 0 },
  moon:          { bgColor: "#020617", color1: "#fef3c7", color2: "#94a3b8", size: 40, position: 30, angle: 0 },
  leaf:          { bgColor: "#09071f", color1: "#10b981", color2: "#06b6d4", size: 55, position: 50, angle: 0 },
  petals:        { bgColor: "#09071f", color1: "#ec4899", color2: "#a855f7", size: 50, position: 50, angle: 0 },
  stars_field:   { bgColor: "#020617", color1: "#fef3c7", color2: "#a855f7", size: 50, position: 50, angle: 0 },
  paper_fold:    { bgColor: "#09071f", color1: "#7c3aed", color2: "#4c1d95", size: 50, position: 50, angle: 0 },
  triangle_grid: { bgColor: "#09071f", color1: "#4c1d95", color2: "#312e81", size: 35, position: 50, angle: 0 },
  sweep:         { bgColor: "#09071f", color1: "#ec4899", color2: "#7c3aed", size: 55, position: 50, angle: 0 },
  glitch:        { bgColor: "#09071f", color1: "#ec4899", color2: "#06b6d4", size: 40, position: 50, angle: 0 },
  scan_lines:    { bgColor: "#09071f", color1: "#06b6d4", color2: "#06b6d4", size: 35, position: 50, angle: 0 },
  arrow_up:      { bgColor: "#09071f", color1: "#7c3aed", color2: "#ec4899", size: 60, position: 50, angle: 0 },
  pillar:        { bgColor: "#09071f", color1: "#7c3aed", color2: "#4c1d95", size: 30, position: 50, angle: 0 },
  grad_blocks:   { bgColor: "#09071f", color1: "#7c3aed", color2: "#ec4899", size: 50, position: 50, angle: 0 },
  squiggle:      { bgColor: "#09071f", color1: "#06b6d4", color2: "#7c3aed", size: 50, position: 50, angle: 0 },
  lattice:       { bgColor: "#09071f", color1: "#a855f7", color2: "#ec4899", size: 40, position: 50, angle: 0 },
  honeycomb:     { bgColor: "#09071f", color1: "#fbbf24", color2: "#f97316", size: 35, position: 60, angle: 0 },
  wave_top:      { bgColor: "#09071f", color1: "#7c3aed", color2: "#ec4899", size: 45, position: 30, angle: 0 },
  wave_bottom:   { bgColor: "#09071f", color1: "#7c3aed", color2: "#ec4899", size: 45, position: 70, angle: 0 },
  wave_side:     { bgColor: "#09071f", color1: "#06b6d4", color2: "#7c3aed", size: 45, position: 30, angle: 0 },
  plus_grid:     { bgColor: "#09071f", color1: "#312e81", color2: "#6366f1", size: 35, position: 50, angle: 0 },
  cosmic:        { bgColor: "#020617", color1: "#a855f7", color2: "#ec4899", size: 55, position: 50, angle: 0 },
  ripple:        { bgColor: "#09071f", color1: "#06b6d4", color2: "#7c3aed", size: 50, position: 50, angle: 0 },
  mesh_geo:      { bgColor: "#09071f", color1: "#4c1d95", color2: "#312e81", size: 35, position: 50, angle: 0 },
  shutter:       { bgColor: "#09071f", color1: "#ec4899", color2: "#7c3aed", size: 35, position: 50, angle: 0 },
  lined_paper:   { bgColor: "#fdfcf3", color1: "#bfdbfe", color2: "#fca5a5", size: 50, position: 8,  angle: 0 },
  grid_paper:    { bgColor: "#fdfcf3", color1: "#bae6fd", color2: "#bae6fd", size: 30, position: 50, angle: 0 },
  dot_paper:     { bgColor: "#fefefb", color1: "#cbd5e1", color2: "#cbd5e1", size: 30, position: 50, angle: 0 },
  legal_pad:     { bgColor: "#fef9c3", color1: "#93c5fd", color2: "#dc2626", size: 50, position: 10, angle: 0 },
  music_staff:   { bgColor: "#fdfcf3", color1: "#1e293b", color2: "#1e293b", size: 50, position: 50, angle: 0 },
  graph_paper:   { bgColor: "#fdfcf3", color1: "#cbd5e1", color2: "#94a3b8", size: 30, position: 50, angle: 0 },
};

export function generateSvgBackground({
  svgType = "swoosh",
  bgColor = "#09071f",
  color1 = "#4c1d95",
  color2 = "#7c3aed",
  size = 50,
  position = 65,
  angle = 0,
  uid = "m",
  transparentBg = false,
} = {}) {
  const s = Number(size) || 50;
  const p = Number(position) || 65;
  const a = Number(angle) || 0;
  const bg = bgColor || "#09071f";
  const c1 = color1 || "#4c1d95";
  const c2 = color2 || "#7c3aed";

  let defs = "";
  let shapes = "";

  switch (svgType) {
    case "swoosh": {
      const leftX = (p / 100) * 820 + 80;
      const curveAmt = (s / 100) * 280 + 60;
      defs = `<linearGradient id="${uid}g" x1="0.4" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>`;
      shapes = `<path d="M ${leftX} -100 C ${leftX + curveAmt} 280 ${leftX + curveAmt * 1.1} 760 ${leftX - 80} 1150 L 1150 1150 L 1150 -100 Z" fill="url(#${uid}g)" opacity="0.93"/>`;
      break;
    }

    case "arc": {
      const r = (s / 100) * 800 + 300;
      const cy = 1050 - (p / 100) * 600;
      defs = `<linearGradient id="${uid}g" x1="0" y1="1" x2="0.5" y2="0">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}" stop-opacity="0.4"/>
      </linearGradient>`;
      shapes = `
        <ellipse cx="525" cy="${cy}" rx="${r}" ry="${r * 0.6}" fill="${c1}" opacity="0.7"/>
        <ellipse cx="525" cy="${cy + 30}" rx="${r * 0.72}" ry="${r * 0.42}" fill="${c2}" opacity="0.55"/>
      `;
      break;
    }

    case "circle": {
      const r = (s / 100) * 700 + 200;
      const cx = (p / 100) * 1200 - 100;
      const cy = ((100 - p) / 100) * 1200 - 100;
      defs = `<radialGradient id="${uid}g" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="65%" stop-color="${c2}"/>
        <stop offset="100%" stop-color="${c2}" stop-opacity="0"/>
      </radialGradient>`;
      shapes = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${uid}g)" opacity="0.88"/>`;
      break;
    }

    case "wave": {
      const wY = (p / 100) * 700 + 175;
      const amp = (s / 100) * 180 + 40;
      defs = `<linearGradient id="${uid}g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>`;
      shapes = `<path d="M -50 ${wY} C 180 ${wY - amp} 360 ${wY + amp} 525 ${wY} S 870 ${wY - amp} 1100 ${wY} L 1100 1150 L -50 1150 Z" fill="url(#${uid}g)" opacity="0.9"/>`;
      break;
    }

    case "diagonal": {
      const split = (p / 100) * 900 + 75;
      defs = `<linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>`;
      shapes = `<polygon points="0,0 ${split},0 ${1050 - split},1050 0,1050" fill="url(#${uid}g)" opacity="0.95"/>`;
      break;
    }

    case "corner_glow": {
      const r = (s / 100) * 900 + 400;
      const corner = Math.min(3, Math.floor((p / 101) * 4));
      const corners = [[0, 0], [1050, 0], [0, 1050], [1050, 1050]];
      const [cx, cy] = corners[corner];
      const gx = cx > 0 ? "100%" : "0%";
      const gy = cy > 0 ? "100%" : "0%";
      defs = `<radialGradient id="${uid}g" cx="${gx}" cy="${gy}" r="80%">
        <stop offset="0%" stop-color="${c1}" stop-opacity="0.9"/>
        <stop offset="45%" stop-color="${c2}" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="${c2}" stop-opacity="0"/>
      </radialGradient>`;
      shapes = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${uid}g)"/>`;
      break;
    }

    case "oval": {
      const rx = (s / 100) * 600 + 200;
      const ry = rx * 0.55;
      const rot = (p / 100) * 180 - 90;
      defs = `<linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="0.5">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>`;
      shapes = `<ellipse cx="525" cy="525" rx="${rx}" ry="${ry}" fill="url(#${uid}g)" opacity="0.85" transform="rotate(${rot} 525 525)"/>`;
      break;
    }

    case "bands": {
      const bw = (s / 100) * 120 + 20;
      const spacing = bw * 2.5;
      const rot = (p / 100) * 90 + 105;
      const bShapes = [...Array(6)].map((_, i) => {
        const x = -300 + i * spacing;
        const op = Math.max(0.15, 0.8 - i * 0.1).toFixed(2);
        const fill = i % 2 === 0 ? c1 : c2;
        return `<rect x="${x}" y="-200" width="${bw}" height="1450" fill="${fill}" opacity="${op}" transform="rotate(${rot} 525 525)"/>`;
      }).join("");
      shapes = bShapes;
      break;
    }

    case "bubble": {
      const r1 = (s / 100) * 450 + 200;
      const r2 = r1 * 0.65;
      const cx = (p / 100) * 1050;
      const cy = ((100 - p) / 100) * 1050;
      defs = `
        <radialGradient id="${uid}g1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${c1}"/>
          <stop offset="100%" stop-color="${c1}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="${uid}g2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${c2}"/>
          <stop offset="100%" stop-color="${c2}" stop-opacity="0"/>
        </radialGradient>
      `;
      shapes = `
        <circle cx="${cx}" cy="${cy}" r="${r1}" fill="url(#${uid}g1)" opacity="0.7"/>
        <circle cx="${1050 - cx}" cy="${1050 - cy}" r="${r2}" fill="url(#${uid}g2)" opacity="0.6"/>
      `;
      break;
    }

    case "ribbon": {
      const thickness = (s / 100) * 250 + 40;
      const yPos = (p / 100) * 700 + 175;
      defs = `<linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${c1}" stop-opacity="0.2"/>
        <stop offset="20%" stop-color="${c1}"/>
        <stop offset="80%" stop-color="${c2}"/>
        <stop offset="100%" stop-color="${c2}" stop-opacity="0.2"/>
      </linearGradient>`;
      shapes = `<rect x="-100" y="${yPos - thickness / 2}" width="1250" height="${thickness}" fill="url(#${uid}g)" opacity="0.9" transform="rotate(-20 525 525)"/>`;
      break;
    }

    case "neon_ring": {
      const r = (s / 100) * 550 + 150;
      const cx = (p / 100) * 1050;
      const cy = ((100 - p) / 100) * 1050;
      const sw = (s / 100) * 60 + 15;
      defs = `<filter id="${uid}bl"><feGaussianBlur stdDeviation="10"/></filter>`;
      shapes = `
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c1}" stroke-width="${sw * 1.5}" opacity="0.4" filter="url(#${uid}bl)"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c2}" stroke-width="${sw * 0.6}" opacity="0.5" filter="url(#${uid}bl)"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c1}" stroke-width="${sw * 0.2}" opacity="0.95"/>
      `;
      break;
    }

    case "tri_corner": {
      const corner = Math.min(3, Math.floor((p / 101) * 4));
      const sz = (s / 100) * 800 + 200;
      let pts;
      if (corner === 0) pts = `0,0 ${sz},0 0,${sz}`;
      else if (corner === 1) pts = `${1050 - sz},0 1050,0 1050,${sz}`;
      else if (corner === 2) pts = `0,${1050 - sz} 0,1050 ${sz},1050`;
      else pts = `${1050 - sz},1050 1050,1050 1050,${1050 - sz}`;
      defs = `<linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>`;
      shapes = `<polygon points="${pts}" fill="url(#${uid}g)" opacity="0.93"/>`;
      break;
    }

    case "double_wave": {
      const wY1 = (p / 100) * 380 + 80;
      const wY2 = 1050 - wY1;
      const amp = (s / 100) * 120 + 30;
      defs = `<linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>`;
      shapes = `
        <path d="M -50 ${wY1} C 200 ${wY1 - amp} 400 ${wY1 + amp} 525 ${wY1} S 880 ${wY1 - amp} 1100 ${wY1} L 1100 -100 L -50 -100 Z" fill="url(#${uid}g)" opacity="0.88"/>
        <path d="M -50 ${wY2} C 200 ${wY2 + amp} 400 ${wY2 - amp} 525 ${wY2} S 880 ${wY2 + amp} 1100 ${wY2} L 1100 1150 L -50 1150 Z" fill="url(#${uid}g)" opacity="0.88"/>
      `;
      break;
    }

    case "rays": {
      const rcx = (p / 100) * 1050;
      const rcy = ((100 - p) / 100) * 1050;
      const count = Math.round((s / 100) * 10 + 6);
      const rayShapes = Array.from({ length: count }, (_, i) => {
        const a1 = (i / count) * Math.PI * 2;
        const a2 = ((i + 0.5) / count) * Math.PI * 2;
        const r2 = 1500;
        const x1 = rcx + r2 * Math.cos(a1);
        const y1 = rcy + r2 * Math.sin(a1);
        const x2 = rcx + r2 * Math.cos(a2);
        const y2 = rcy + r2 * Math.sin(a2);
        const fill = i % 2 === 0 ? c1 : c2;
        const op = (0.12 + (i % 3) * 0.04).toFixed(2);
        return `<polygon points="${rcx.toFixed(1)},${rcy.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="${fill}" opacity="${op}"/>`;
      }).join("");
      shapes = rayShapes;
      break;
    }

    case "ink": {
      const icx = (p / 100) * 1050;
      const icy = ((100 - p) / 100) * 1050;
      const ir = (s / 100) * 380 + 120;
      defs = `<radialGradient id="${uid}g" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="65%" stop-color="${c2}"/>
        <stop offset="100%" stop-color="${c2}" stop-opacity="0"/>
      </radialGradient>`;
      shapes = `
        <path d="M ${icx} ${icy - ir * 1.2}
          C ${icx + ir * 0.8} ${icy - ir * 0.9} ${icx + ir * 1.3} ${icy - ir * 0.3} ${icx + ir} ${icy + ir * 0.4}
          C ${icx + ir * 0.6} ${icy + ir * 1.1} ${icx - ir * 0.4} ${icy + ir * 1.2} ${icx - ir * 0.9} ${icy + ir * 0.6}
          C ${icx - ir * 1.4} ${icy} ${icx - ir * 1.1} ${icy - ir * 0.7} ${icx} ${icy - ir * 1.2} Z"
          fill="url(#${uid}g)" opacity="0.88"/>
      `;
      break;
    }

    case "hexgrid": {
      const hSize = (s / 100) * 70 + 25;
      const hRows = Math.ceil(1050 / (hSize * 1.73)) + 2;
      const hCols = Math.ceil(1050 / (hSize * 2)) + 2;
      const hexes = [];
      for (let row = -1; row < hRows; row++) {
        for (let col = -1; col < hCols; col++) {
          const hx = col * hSize * 2 + (row % 2 === 0 ? 0 : hSize) + hSize;
          const hy = row * hSize * 1.73 + hSize;
          const pts = Array.from({ length: 6 }, (_, i) => {
            const ha = (i * 60 - 30) * Math.PI / 180;
            return `${(hx + hSize * 0.88 * Math.cos(ha)).toFixed(1)},${(hy + hSize * 0.88 * Math.sin(ha)).toFixed(1)}`;
          }).join(" ");
          const fill = (row + col) % 2 === 0 ? c1 : c2;
          const op = (p / 200 + 0.1).toFixed(2);
          hexes.push(`<polygon points="${pts}" fill="${fill}" opacity="${op}"/>`);
        }
      }
      shapes = hexes.join("");
      break;
    }

    case "particles": {
      const pcount = Math.round((s / 100) * 28 + 8);
      const seed = p * 137 + 1;
      const dots = Array.from({ length: pcount }, (_, i) => {
        const px = (seed * (i + 1) * 271 + 500) % 1050;
        const py = (seed * (i + 1) * 393 + 300) % 1050;
        const pr = (seed * (i + 1) * 47) % 20 + 4;
        const fill = i % 2 === 0 ? c1 : c2;
        const op = (0.25 + (i * 73 % 50) / 100).toFixed(2);
        return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${pr.toFixed(1)}" fill="${fill}" opacity="${op}"/>`;
      }).join("");
      shapes = dots;
      break;
    }

    case "vignette": {
      const vi = s / 100;
      defs = `<radialGradient id="${uid}g" cx="50%" cy="50%" r="75%">
        <stop offset="0%" stop-color="${c1}" stop-opacity="0"/>
        <stop offset="${40 + p * 0.4}%" stop-color="${c2}" stop-opacity="${(vi * 0.5).toFixed(2)}"/>
        <stop offset="100%" stop-color="${c2}" stop-opacity="${(vi * 0.95).toFixed(2)}"/>
      </radialGradient>`;
      shapes = `<rect width="1050" height="1050" fill="url(#${uid}g)"/>`;
      break;
    }

    case "mountain": {
      const mh1 = (p / 100) * 550 + 200;
      const mh2 = mh1 * 0.68;
      const mamp = (s / 100) * 160 + 40;
      defs = `<linearGradient id="${uid}g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>`;
      shapes = `
        <path d="M -50 1100 L 175 ${1050 - mh2} L 340 ${1050 - mh2 + mamp * 0.5} L 525 ${1050 - mh1} L 710 ${1050 - mh2 + mamp * 0.3} L 890 ${1050 - mh2 * 0.85} L 1100 1100 Z" fill="url(#${uid}g)" opacity="0.9"/>
      `;
      break;
    }

    case "split_v": {
      const svX = (p / 100) * 800 + 125;
      defs = `
        <linearGradient id="${uid}g1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${c1}"/>
          <stop offset="100%" stop-color="${c1}" stop-opacity="0.65"/>
        </linearGradient>
        <linearGradient id="${uid}g2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${c2}"/>
          <stop offset="100%" stop-color="${c2}" stop-opacity="0.65"/>
        </linearGradient>
      `;
      shapes = `
        <rect x="0" y="0" width="${svX}" height="1050" fill="url(#${uid}g1)" opacity="0.92"/>
        <rect x="${svX}" y="0" width="${1050 - svX}" height="1050" fill="url(#${uid}g2)" opacity="0.92"/>
      `;
      break;
    }

    case "lens": {
      const lcx = (p / 100) * 1050;
      const lcy = ((100 - p) / 100) * 1050;
      const llen = (s / 100) * 700 + 250;
      defs = `
        <linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${c1}" stop-opacity="0"/>
          <stop offset="35%" stop-color="${c1}" stop-opacity="0.85"/>
          <stop offset="50%" stop-color="${c2}" stop-opacity="1"/>
          <stop offset="65%" stop-color="${c2}" stop-opacity="0.85"/>
          <stop offset="100%" stop-color="${c2}" stop-opacity="0"/>
        </linearGradient>
        <filter id="${uid}bl"><feGaussianBlur stdDeviation="18"/></filter>
      `;
      shapes = `
        <line x1="${lcx - llen}" y1="${lcy}" x2="${lcx + llen}" y2="${lcy}" stroke="url(#${uid}g)" stroke-width="6" filter="url(#${uid}bl)"/>
        <line x1="${lcx - llen}" y1="${lcy}" x2="${lcx + llen}" y2="${lcy}" stroke="url(#${uid}g)" stroke-width="1.5" opacity="0.9"/>
        <ellipse cx="${lcx}" cy="${lcy}" rx="${llen * 0.06}" ry="${llen * 0.035}" fill="${c2}" opacity="0.75" filter="url(#${uid}bl)"/>
      `;
      break;
    }

    case "chevron": {
      const chCount = Math.round((s / 100) * 5 + 2);
      const chW = 1050 / chCount;
      const chDepth = (p / 100) * 140 + 30;
      const chevs = Array.from({ length: chCount + 1 }, (_, i) => {
        const x = i * chW - chW / 2;
        const fill = i % 2 === 0 ? c1 : c2;
        return `<polygon points="${x},-50 ${x + chW / 2},${chDepth} ${x + chW},-50 ${x + chW},1100 ${x + chW / 2},${1050 + chDepth} ${x},1100" fill="${fill}" opacity="0.82"/>`;
      }).join("");
      shapes = chevs;
      break;
    }

    case "liquid_blob": {
      const lbcx = (p / 100) * 1050;
      const lbcy = ((100 - p) / 100) * 1050;
      const lbr = (s / 100) * 320 + 130;
      defs = `<radialGradient id="${uid}g" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="55%" stop-color="${c2}"/>
        <stop offset="100%" stop-color="${c2}" stop-opacity="0.1"/>
      </radialGradient>`;
      shapes = `
        <path d="M ${lbcx + lbr * 0.1} ${lbcy - lbr}
          C ${lbcx + lbr * 1.1} ${lbcy - lbr * 0.7} ${lbcx + lbr * 1.2} ${lbcy + lbr * 0.2} ${lbcx + lbr * 0.5} ${lbcy + lbr * 0.9}
          C ${lbcx} ${lbcy + lbr * 1.3} ${lbcx - lbr * 0.9} ${lbcy + lbr * 1.1} ${lbcx - lbr * 1.1} ${lbcy + lbr * 0.1}
          C ${lbcx - lbr * 1.3} ${lbcy - lbr * 0.8} ${lbcx - lbr * 0.5} ${lbcy - lbr * 1.3} ${lbcx + lbr * 0.1} ${lbcy - lbr} Z"
          fill="url(#${uid}g)" opacity="0.87"/>
      `;
      break;
    }

    case "cross_fade": {
      const cfi = (s / 100).toFixed(2);
      defs = `
        <radialGradient id="${uid}g1" cx="0%" cy="0%" r="100%">
          <stop offset="0%" stop-color="${c1}" stop-opacity="0.92"/>
          <stop offset="100%" stop-color="${c1}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="${uid}g2" cx="100%" cy="100%" r="100%">
          <stop offset="0%" stop-color="${c2}" stop-opacity="0.92"/>
          <stop offset="100%" stop-color="${c2}" stop-opacity="0"/>
        </radialGradient>
      `;
      shapes = `
        <rect width="1050" height="1050" fill="url(#${uid}g1)" opacity="${cfi}"/>
        <rect width="1050" height="1050" fill="url(#${uid}g2)" opacity="${cfi}"/>
      `;
      break;
    }

    case "star_burst": {
      const sbcx = (p / 100) * 1050;
      const sbcy = ((100 - p) / 100) * 1050;
      const sbcount = Math.round((s / 100) * 14 + 8);
      const sbRays = Array.from({ length: sbcount }, (_, i) => {
        const a1 = (i / sbcount) * Math.PI * 2;
        const a2 = ((i + 0.5) / sbcount) * Math.PI * 2;
        const rr = 1500;
        const x1 = sbcx + rr * Math.cos(a1);
        const y1 = sbcy + rr * Math.sin(a1);
        const x2 = sbcx + rr * Math.cos(a2);
        const y2 = sbcy + rr * Math.sin(a2);
        const fill = i % 2 === 0 ? c1 : c2;
        return `<polygon points="${sbcx.toFixed(1)},${sbcy.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="${fill}" opacity="0.14"/>`;
      }).join("");
      shapes = sbRays;
      break;
    }

    case "dual_circle": {
      const dc1 = (s / 100) * 380 + 160;
      const dc2 = dc1 * 0.65;
      const dcx1 = (p / 100) * 550 + 100;
      const dcy1 = ((100 - p) / 100) * 550 + 100;
      defs = `
        <radialGradient id="${uid}g1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${c1}"/>
          <stop offset="100%" stop-color="${c1}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="${uid}g2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${c2}"/>
          <stop offset="100%" stop-color="${c2}" stop-opacity="0"/>
        </radialGradient>
      `;
      shapes = `
        <circle cx="${dcx1}" cy="${dcy1}" r="${dc1}" fill="url(#${uid}g1)" opacity="0.82"/>
        <circle cx="${1050 - dcx1}" cy="${1050 - dcy1}" r="${dc2}" fill="url(#${uid}g2)" opacity="0.78"/>
      `;
      break;
    }

    case "neon_bars": {
      const nbCount = Math.round((s / 100) * 4 + 2);
      const nbThick = (s / 100) * 50 + 8;
      const nbSpacing = 1050 / nbCount;
      defs = `<filter id="${uid}bl"><feGaussianBlur stdDeviation="8"/></filter>`;
      const bars = Array.from({ length: nbCount }, (_, i) => {
        const x = i * nbSpacing + nbSpacing / 2;
        const fill = i % 2 === 0 ? c1 : c2;
        return `
          <line x1="${x}" y1="-50" x2="${x}" y2="1100" stroke="${fill}" stroke-width="${nbThick}" opacity="0.22" filter="url(#${uid}bl)"/>
          <line x1="${x}" y1="-50" x2="${x}" y2="1100" stroke="${fill}" stroke-width="${nbThick * 0.18}" opacity="0.85"/>
        `;
      }).join("");
      shapes = bars;
      break;
    }

    case "halftone": {
      const hdot = (s / 100) * 25 + 5;
      const hspacing = hdot * 2.6;
      const hrows = Math.ceil(1050 / hspacing) + 2;
      const hcols = Math.ceil(1050 / hspacing) + 2;
      const hdots = [];
      for (let hr = -1; hr < hrows; hr++) {
        for (let hc = -1; hc < hcols; hc++) {
          const hx = hc * hspacing + (hr % 2 === 0 ? 0 : hspacing / 2);
          const hy = hr * hspacing;
          const dist = Math.sqrt((hx - 525) ** 2 + (hy - 525) ** 2);
          const maxD = 740;
          const sc = Math.max(0.08, 1 - dist / maxD);
          const radius = hdot * sc * (p / 100 + 0.4);
          const fill = (hr + hc) % 2 === 0 ? c1 : c2;
          hdots.push(`<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${radius.toFixed(1)}" fill="${fill}" opacity="0.72"/>`);
        }
      }
      shapes = hdots.join("");
      break;
    }

    case "grid_lines": {
      const gcell = (s / 100) * 130 + 35;
      const gsw = Math.max(0.4, (100 - p) / 28);
      const gcols = Math.ceil(1050 / gcell) + 1;
      const grows = Math.ceil(1050 / gcell) + 1;
      const glines = [];
      for (let i = 0; i < gcols; i++) glines.push(`<line x1="${i * gcell}" y1="-50" x2="${i * gcell}" y2="1100" stroke="${c1}" stroke-width="${gsw}" opacity="0.45"/>`);
      for (let i = 0; i < grows; i++) glines.push(`<line x1="-50" y1="${i * gcell}" x2="1100" y2="${i * gcell}" stroke="${c2}" stroke-width="${gsw}" opacity="0.45"/>`);
      shapes = glines.join("");
      break;
    }

    case "aurora": {
      const aY1 = (p / 100) * 550 + 80;
      const aY2 = aY1 + (s / 100) * 280 + 80;
      defs = `
        <linearGradient id="${uid}g1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${c1}" stop-opacity="0.6"/>
          <stop offset="50%" stop-color="${c2}" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="${c1}" stop-opacity="0.6"/>
        </linearGradient>
        <filter id="${uid}bl"><feGaussianBlur stdDeviation="22"/></filter>
      `;
      shapes = `
        <path d="M -100 ${aY1} C 200 ${aY1 - 75} 400 ${aY1 + 55} 525 ${aY1} S 850 ${aY1 - 45} 1150 ${aY1} L 1150 ${aY2} C 850 ${aY2 + 45} 525 ${aY2 - 40} 200 ${aY2 + 55} L -100 ${aY2} Z"
          fill="url(#${uid}g1)" opacity="0.72" filter="url(#${uid}bl)"/>
        <path d="M -100 ${aY1 + 35} C 200 ${aY1 - 35} 400 ${aY1 + 75} 525 ${aY1 + 25} S 850 ${aY1 - 15} 1150 ${aY1 + 45} L 1150 ${aY2 - 25} C 850 ${aY2 + 15} 525 ${aY2 - 55} 200 ${aY2 + 35} L -100 ${aY2 - 25} Z"
          fill="url(#${uid}g1)" opacity="0.48" filter="url(#${uid}bl)"/>
      `;
      break;
    }

    case "prism": {
      const pr = (s / 100) * 350 + 200;
      const prRot = (p / 100) * 360;
      defs = `<linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>`;
      const prPts = Array.from({length:3}, (_,i) => {
        const ang = ((i*120 + prRot) - 90) * Math.PI/180;
        return `${(525+pr*Math.cos(ang)).toFixed(1)},${(525+pr*Math.sin(ang)).toFixed(1)}`;
      }).join(" ");
      const prPts2 = Array.from({length:3}, (_,i) => {
        const ang = ((i*120 + prRot + 60) - 90) * Math.PI/180;
        return `${(525+pr*0.7*Math.cos(ang)).toFixed(1)},${(525+pr*0.7*Math.sin(ang)).toFixed(1)}`;
      }).join(" ");
      shapes = `
        <polygon points="${prPts}" fill="url(#${uid}g)" opacity="0.9"/>
        <polygon points="${prPts2}" fill="${c2}" opacity="0.45"/>
      `;
      break;
    }

    case "circuit": {
      const cell = (s / 100) * 60 + 30;
      const cw = Math.ceil(1050 / cell) + 1;
      const ch = Math.ceil(1050 / cell) + 1;
      const seed = p * 7 + 3;
      const lines = [];
      for (let r = 0; r < ch; r++) {
        for (let c = 0; c < cw; c++) {
          const x = c * cell;
          const y = r * cell;
          const v = (seed + r * 31 + c * 17) % 4;
          const col = (r + c) % 2 === 0 ? c1 : c2;
          if (v === 0) lines.push(`<line x1="${x}" y1="${y}" x2="${x + cell}" y2="${y}" stroke="${col}" stroke-width="1.5" opacity="0.65"/>`);
          if (v === 1) lines.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${y + cell}" stroke="${col}" stroke-width="1.5" opacity="0.65"/>`);
          if (v === 2) lines.push(`<path d="M ${x} ${y + cell/2} L ${x + cell/2} ${y + cell/2} L ${x + cell/2} ${y + cell}" fill="none" stroke="${col}" stroke-width="1.5" opacity="0.7"/>`);
          if (v === 3) lines.push(`<circle cx="${x + cell/2}" cy="${y + cell/2}" r="3" fill="${col}" opacity="0.85"/>`);
        }
      }
      shapes = lines.join("");
      break;
    }

    case "silk": {
      defs = `<linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="${c2}" stop-opacity="0.7"/>
      </linearGradient>`;
      const layers = Math.round((s / 100) * 5 + 4);
      const sShape = Array.from({ length: layers }, (_, i) => {
        const yOff = (i / layers) * 1050 + (p / 100) * 100;
        const amp = 80 + i * 20;
        return `<path d="M -50 ${yOff} C 200 ${yOff - amp} 400 ${yOff + amp} 525 ${yOff} S 880 ${yOff - amp} 1100 ${yOff} L 1100 ${yOff + 100} C 880 ${yOff + 100 + amp} 525 ${yOff + 100 - amp} 200 ${yOff + 100 + amp} L -50 ${yOff + 100} Z" fill="url(#${uid}g)" opacity="${(0.18 + i * 0.04).toFixed(2)}"/>`;
      }).join("");
      shapes = sShape;
      break;
    }

    case "spotlight": {
      const spcx = (p / 100) * 1050;
      const spcy = ((100 - p) / 100) * 1050;
      const spr = (s / 100) * 800 + 200;
      defs = `<radialGradient id="${uid}g" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${c1}" stop-opacity="0.95"/>
        <stop offset="40%" stop-color="${c2}" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="${c2}" stop-opacity="0"/>
      </radialGradient>`;
      shapes = `<circle cx="${spcx}" cy="${spcy}" r="${spr}" fill="url(#${uid}g)"/>`;
      break;
    }

    case "dots_grid": {
      const dgsp = (s / 100) * 60 + 30;
      const dgr = dgsp * 0.18 * (p / 100 + 0.5);
      const dgRows = Math.ceil(1050 / dgsp) + 1;
      const dgCols = Math.ceil(1050 / dgsp) + 1;
      const dg = [];
      for (let r = 0; r < dgRows; r++) {
        for (let cc = 0; cc < dgCols; cc++) {
          const fill = (r + cc) % 2 === 0 ? c1 : c2;
          dg.push(`<circle cx="${cc * dgsp + dgsp/2}" cy="${r * dgsp + dgsp/2}" r="${dgr.toFixed(1)}" fill="${fill}" opacity="0.7"/>`);
        }
      }
      shapes = dg.join("");
      break;
    }

    case "slash": {
      const slThick = (s / 100) * 220 + 60;
      const slAng = (p / 100) * 60 + 60;
      defs = `<linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${c1}" stop-opacity="0"/>
        <stop offset="20%" stop-color="${c1}"/>
        <stop offset="80%" stop-color="${c2}"/>
        <stop offset="100%" stop-color="${c2}" stop-opacity="0"/>
      </linearGradient>`;
      shapes = `<rect x="-200" y="${525 - slThick/2}" width="1450" height="${slThick}" fill="url(#${uid}g)" opacity="0.92" transform="rotate(-${slAng} 525 525)"/>`;
      break;
    }

    case "triangles_tile": {
      const tt = (s / 100) * 80 + 40;
      const ttRows = Math.ceil(1050 / (tt * 0.866)) + 1;
      const ttCols = Math.ceil(1050 / tt) + 1;
      const tris = [];
      for (let r = 0; r < ttRows; r++) {
        for (let cc = -1; cc < ttCols; cc++) {
          const xOff = (r % 2) * (tt / 2);
          const x = cc * tt + xOff;
          const y = r * tt * 0.866;
          const fill1 = (r + cc) % 2 === 0 ? c1 : c2;
          const fill2 = (r + cc) % 2 === 0 ? c2 : c1;
          tris.push(`<polygon points="${x},${y} ${x + tt},${y} ${x + tt/2},${y + tt * 0.866}" fill="${fill1}" opacity="0.6"/>`);
          tris.push(`<polygon points="${x + tt/2},${y + tt * 0.866} ${x + tt * 1.5},${y + tt * 0.866} ${x + tt},${y}" fill="${fill2}" opacity="0.45"/>`);
        }
      }
      shapes = tris.join("");
      break;
    }

    case "swirl": {
      const swCount = Math.round((s / 100) * 8 + 4);
      defs = `<linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>`;
      const arms = Array.from({ length: swCount }, (_, i) => {
        const baseRot = (i / swCount) * 360 + (p / 100) * 90;
        const r1 = 50 + i * 15;
        const r2 = 200 + i * 60;
        return `<path d="M 525 525 Q ${525 + r1} ${525} ${525 + r2 * Math.cos(0.6)} ${525 + r2 * Math.sin(0.6)}" stroke="url(#${uid}g)" stroke-width="${30 + i * 5}" fill="none" opacity="${(0.4 - i * 0.03).toFixed(2)}" transform="rotate(${baseRot} 525 525)" stroke-linecap="round"/>`;
      }).join("");
      shapes = arms;
      break;
    }

    case "bokeh": {
      const bcount = Math.round((s / 100) * 20 + 8);
      const seed = p * 31 + 7;
      defs = `<filter id="${uid}bl"><feGaussianBlur stdDeviation="6"/></filter>`;
      const dots = Array.from({ length: bcount }, (_, i) => {
        const x = (seed * (i + 1) * 271 + 200) % 1050;
        const y = (seed * (i + 1) * 393 + 100) % 1050;
        const r = (seed * (i + 1) * 47) % 50 + 30;
        const fill = i % 2 === 0 ? c1 : c2;
        const op = (0.25 + (i * 13 % 50) / 100).toFixed(2);
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${fill}" opacity="${op}" filter="url(#${uid}bl)"/>`;
      }).join("");
      shapes = dots;
      break;
    }

    case "stripes_diag": {
      const stW = (s / 100) * 80 + 20;
      const stRot = (p / 100) * 90 + 30;
      const stCount = Math.ceil(1500 / stW) + 2;
      const stShapes = Array.from({ length: stCount }, (_, i) => {
        const x = -300 + i * stW;
        const fill = i % 2 === 0 ? c1 : c2;
        const op = i % 2 === 0 ? 0.85 : 0.4;
        return `<rect x="${x}" y="-300" width="${stW * 0.7}" height="1650" fill="${fill}" opacity="${op}" transform="rotate(${stRot} 525 525)"/>`;
      }).join("");
      shapes = stShapes;
      break;
    }

    case "target": {
      const tcx = 525, tcy = 525;
      const trCount = Math.round((s / 100) * 6 + 4);
      const tMax = (s / 100) * 400 + 250;
      const rings = Array.from({ length: trCount }, (_, i) => {
        const rr = ((trCount - i) / trCount) * tMax;
        const fill = i % 2 === 0 ? c1 : c2;
        return `<circle cx="${tcx}" cy="${tcy}" r="${rr}" fill="${fill}" opacity="${(0.85 - i * 0.05).toFixed(2)}"/>`;
      }).join("");
      shapes = rings;
      break;
    }

    case "circle_grid": {
      const cgsp = (s / 100) * 100 + 60;
      const cgr = cgsp * 0.4;
      const cgRows = Math.ceil(1050 / cgsp) + 1;
      const cgCols = Math.ceil(1050 / cgsp) + 1;
      const cg = [];
      for (let r = 0; r < cgRows; r++) {
        for (let cc = 0; cc < cgCols; cc++) {
          const fill = (r + cc) % 2 === 0 ? c1 : c2;
          cg.push(`<circle cx="${cc * cgsp + cgsp/2}" cy="${r * cgsp + cgsp/2}" r="${cgr}" fill="none" stroke="${fill}" stroke-width="1.5" opacity="${(p / 200 + 0.3).toFixed(2)}"/>`);
        }
      }
      shapes = cg.join("");
      break;
    }

    case "wave_stack": {
      const wsCount = Math.round((s / 100) * 5 + 3);
      defs = `<linearGradient id="${uid}g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>`;
      const wsShapes = Array.from({ length: wsCount }, (_, i) => {
        const yBase = (p / 100) * 600 + 200 + i * 80;
        const amp = 60 + i * 10;
        return `<path d="M -50 ${yBase} C 200 ${yBase - amp} 400 ${yBase + amp} 525 ${yBase} S 880 ${yBase - amp} 1100 ${yBase} L 1100 1150 L -50 1150 Z" fill="url(#${uid}g)" opacity="${(0.7 - i * 0.1).toFixed(2)}"/>`;
      }).join("");
      shapes = wsShapes;
      break;
    }

    case "nebula": {
      const ncx = (p / 100) * 1050;
      const ncy = ((100 - p) / 100) * 1050;
      const nr = (s / 100) * 500 + 200;
      defs = `
        <radialGradient id="${uid}g1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${c1}" stop-opacity="0.8"/>
          <stop offset="60%" stop-color="${c2}" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="${c2}" stop-opacity="0"/>
        </radialGradient>
        <filter id="${uid}bl"><feGaussianBlur stdDeviation="20"/></filter>
      `;
      const stars = Array.from({ length: 30 }, (_, i) => {
        const sx = (i * 271 + p * 7) % 1050;
        const sy = (i * 393 + p * 11) % 1050;
        const sr = (i % 3) + 1;
        return `<circle cx="${sx}" cy="${sy}" r="${sr}" fill="#ffffff" opacity="0.7"/>`;
      }).join("");
      shapes = `
        <ellipse cx="${ncx}" cy="${ncy}" rx="${nr}" ry="${nr * 0.7}" fill="url(#${uid}g1)" filter="url(#${uid}bl)"/>
        <ellipse cx="${1050 - ncx}" cy="${1050 - ncy}" rx="${nr * 0.6}" ry="${nr * 0.4}" fill="url(#${uid}g1)" filter="url(#${uid}bl)" opacity="0.6"/>
        ${stars}
      `;
      break;
    }

    case "block_split": {
      const bsX = (p / 100) * 800 + 125;
      const bsY = ((100 - p) / 100) * 800 + 125;
      shapes = `
        <rect x="0" y="0" width="${bsX}" height="${bsY}" fill="${c1}" opacity="0.92"/>
        <rect x="${bsX}" y="0" width="${1050 - bsX}" height="${bsY}" fill="${c2}" opacity="0.92"/>
        <rect x="0" y="${bsY}" width="${bsX}" height="${1050 - bsY}" fill="${c2}" opacity="0.7"/>
        <rect x="${bsX}" y="${bsY}" width="${1050 - bsX}" height="${1050 - bsY}" fill="${c1}" opacity="0.7"/>
      `;
      break;
    }

    case "arch": {
      const archW = (s / 100) * 700 + 250;
      const archH = (p / 100) * 700 + 200;
      defs = `<linearGradient id="${uid}g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>`;
      shapes = `<path d="M ${525 - archW/2} 1050 L ${525 - archW/2} ${1050 - archH * 0.5} A ${archW/2} ${archH * 0.5} 0 0 1 ${525 + archW/2} ${1050 - archH * 0.5} L ${525 + archW/2} 1050 Z" fill="url(#${uid}g)" opacity="0.9"/>`;
      break;
    }

    case "lightning": {
      defs = `<filter id="${uid}bl"><feGaussianBlur stdDeviation="6"/></filter>`;
      const lShift = (p / 100) * 500;
      const path = `M ${300 + lShift} 0 L ${250 + lShift} 350 L ${380 + lShift} 380 L ${280 + lShift} 700 L ${430 + lShift} 720 L ${330 + lShift} 1050`;
      shapes = `
        <path d="${path}" fill="none" stroke="${c2}" stroke-width="60" opacity="0.4" stroke-linecap="round" filter="url(#${uid}bl)"/>
        <path d="${path}" fill="none" stroke="${c1}" stroke-width="20" opacity="0.85" stroke-linecap="round" filter="url(#${uid}bl)"/>
        <path d="${path}" fill="none" stroke="#ffffff" stroke-width="6" opacity="0.95" stroke-linecap="round"/>
      `;
      break;
    }

    case "flame": {
      const fcx = (p / 100) * 1050;
      const fH = (s / 100) * 700 + 250;
      defs = `<linearGradient id="${uid}g" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="60%" stop-color="${c2}"/>
        <stop offset="100%" stop-color="${c2}" stop-opacity="0"/>
      </linearGradient>`;
      shapes = `
        <path d="M ${fcx} 1050 C ${fcx + fH * 0.4} ${1050 - fH * 0.3} ${fcx + fH * 0.2} ${1050 - fH * 0.6} ${fcx + fH * 0.1} ${1050 - fH * 0.85} C ${fcx} ${1050 - fH} ${fcx - fH * 0.2} ${1050 - fH * 0.7} ${fcx - fH * 0.3} ${1050 - fH * 0.5} C ${fcx - fH * 0.4} ${1050 - fH * 0.25} ${fcx - fH * 0.4} 1050 ${fcx} 1050 Z" fill="url(#${uid}g)" opacity="0.9"/>
        <path d="M ${fcx} 1050 C ${fcx + fH * 0.25} ${1050 - fH * 0.4} ${fcx + fH * 0.1} ${1050 - fH * 0.6} ${fcx} ${1050 - fH * 0.7} C ${fcx - fH * 0.15} ${1050 - fH * 0.55} ${fcx - fH * 0.2} ${1050 - fH * 0.3} ${fcx} 1050 Z" fill="${c1}" opacity="0.7"/>
      `;
      break;
    }

    case "drop": {
      const dcx = (p / 100) * 1050;
      const dcy = ((100 - p) / 100) * 1050;
      const dr = (s / 100) * 350 + 150;
      defs = `<radialGradient id="${uid}g" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </radialGradient>`;
      shapes = `<path d="M ${dcx} ${dcy - dr * 1.4} C ${dcx + dr * 0.9} ${dcy - dr * 0.3} ${dcx + dr * 0.9} ${dcy + dr * 0.7} ${dcx} ${dcy + dr} C ${dcx - dr * 0.9} ${dcy + dr * 0.7} ${dcx - dr * 0.9} ${dcy - dr * 0.3} ${dcx} ${dcy - dr * 1.4} Z" fill="url(#${uid}g)" opacity="0.92"/>`;
      break;
    }

    case "crystal": {
      const crCx = 525, crCy = 525;
      const crR = (s / 100) * 300 + 200;
      const crRot = (p / 100) * 60;
      defs = `
        <linearGradient id="${uid}g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${c1}" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="${c2}" stop-opacity="0.4"/>
        </linearGradient>
        <linearGradient id="${uid}g2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${c2}"/>
          <stop offset="100%" stop-color="${c1}"/>
        </linearGradient>
      `;
      const facets = [];
      for (let i = 0; i < 6; i++) {
        const a1 = (i * 60 + crRot) * Math.PI / 180;
        const a2 = ((i + 1) * 60 + crRot) * Math.PI / 180;
        const x1 = crCx + crR * Math.cos(a1);
        const y1 = crCy + crR * Math.sin(a1);
        const x2 = crCx + crR * Math.cos(a2);
        const y2 = crCy + crR * Math.sin(a2);
        const fill = i % 2 === 0 ? `url(#${uid}g1)` : `url(#${uid}g2)`;
        facets.push(`<polygon points="${crCx},${crCy} ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="${fill}" opacity="${i % 2 === 0 ? 0.85 : 0.55}"/>`);
      }
      shapes = facets.join("");
      break;
    }

    case "cross_x": {
      const cxThick = (s / 100) * 200 + 80;
      const cxRot = (p / 100) * 30;
      defs = `<linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${c1}" stop-opacity="0"/>
        <stop offset="50%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c1}" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="${uid}g2" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${c2}" stop-opacity="0"/>
        <stop offset="50%" stop-color="${c2}"/>
        <stop offset="100%" stop-color="${c2}" stop-opacity="0"/>
      </linearGradient>`;
      shapes = `
        <rect x="-200" y="${525 - cxThick/2}" width="1450" height="${cxThick}" fill="url(#${uid}g)" opacity="0.8" transform="rotate(${45 + cxRot} 525 525)"/>
        <rect x="-200" y="${525 - cxThick/2}" width="1450" height="${cxThick}" fill="url(#${uid}g2)" opacity="0.8" transform="rotate(${-45 + cxRot} 525 525)"/>
      `;
      break;
    }

    case "arrow_band": {
      const abY = (p / 100) * 700 + 175;
      const abThick = (s / 100) * 200 + 60;
      const abPt = abThick * 0.6;
      defs = `<linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>`;
      shapes = `<polygon points="-100,${abY - abThick/2} 850,${abY - abThick/2} 950,${abY} 850,${abY + abThick/2} -100,${abY + abThick/2} 0,${abY}" fill="url(#${uid}g)" opacity="0.92"/>`;
      break;
    }

    case "half_circle": {
      const hcr = (s / 100) * 600 + 300;
      const hcp = Math.min(3, Math.floor((p / 101) * 4));
      defs = `<linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>`;
      let hcPath;
      if (hcp === 0) hcPath = `M 0 0 A ${hcr} ${hcr} 0 0 1 0 ${hcr * 2} L 0 0 Z`;
      else if (hcp === 1) hcPath = `M 1050 0 A ${hcr} ${hcr} 0 0 0 1050 ${hcr * 2} L 1050 0 Z`;
      else if (hcp === 2) hcPath = `M 0 1050 A ${hcr} ${hcr} 0 0 0 ${hcr * 2} 1050 Z`;
      else hcPath = `M 0 0 A ${hcr} ${hcr} 0 0 1 ${hcr * 2} 0 Z`;
      shapes = `<path d="${hcPath}" fill="url(#${uid}g)" opacity="0.92"/>`;
      break;
    }

    case "squares_tile": {
      const sqSp = (s / 100) * 100 + 50;
      const sqRows = Math.ceil(1050 / sqSp) + 1;
      const sqCols = Math.ceil(1050 / sqSp) + 1;
      const sqs = [];
      for (let r = 0; r < sqRows; r++) {
        for (let cc = 0; cc < sqCols; cc++) {
          const fill = (r + cc) % 2 === 0 ? c1 : c2;
          const op = ((r * cc + p) % 5 / 10 + 0.3).toFixed(2);
          sqs.push(`<rect x="${cc * sqSp}" y="${r * sqSp}" width="${sqSp - 2}" height="${sqSp - 2}" fill="${fill}" opacity="${op}"/>`);
        }
      }
      shapes = sqs.join("");
      break;
    }

    case "bricks": {
      const bkW = (s / 100) * 100 + 80;
      const bkH = bkW * 0.45;
      const bkRows = Math.ceil(1050 / bkH) + 1;
      const bkCols = Math.ceil(1050 / bkW) + 2;
      const bks = [];
      for (let r = 0; r < bkRows; r++) {
        const offset = (r % 2) * (bkW / 2);
        for (let cc = -1; cc < bkCols; cc++) {
          const fill = (r + cc) % 3 === 0 ? c1 : c2;
          bks.push(`<rect x="${cc * bkW + offset}" y="${r * bkH}" width="${bkW - 4}" height="${bkH - 4}" fill="${fill}" opacity="${(p / 200 + 0.3).toFixed(2)}" rx="2"/>`);
        }
      }
      shapes = bks.join("");
      break;
    }

    case "wave_radial": {
      const wrCx = 525, wrCy = 525;
      const wrCount = Math.round((s / 100) * 8 + 4);
      defs = `<radialGradient id="${uid}g" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${c1}" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="${c2}" stop-opacity="0"/>
      </radialGradient>`;
      const wrings = Array.from({ length: wrCount }, (_, i) => {
        const rr = (i + 1) * (s / 100 * 80 + 40);
        const fill = i % 2 === 0 ? c1 : c2;
        return `<circle cx="${wrCx}" cy="${wrCy}" r="${rr}" fill="none" stroke="${fill}" stroke-width="${(s / 100) * 6 + 2}" opacity="${(0.6 - i * 0.06).toFixed(2)}"/>`;
      }).join("");
      shapes = wrings;
      break;
    }

    case "sunset": {
      const ssY = (p / 100) * 500 + 300;
      defs = `
        <linearGradient id="${uid}sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${c2}"/>
          <stop offset="100%" stop-color="${c1}"/>
        </linearGradient>
        <radialGradient id="${uid}sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
          <stop offset="40%" stop-color="${c1}" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="${c1}" stop-opacity="0"/>
        </radialGradient>
      `;
      const sunR = (s / 100) * 200 + 100;
      shapes = `
        <rect x="0" y="0" width="1050" height="${ssY}" fill="url(#${uid}sky)" opacity="0.95"/>
        <circle cx="525" cy="${ssY}" r="${sunR}" fill="url(#${uid}sun)"/>
        <rect x="0" y="${ssY}" width="1050" height="${1050 - ssY}" fill="${c1}" opacity="0.4"/>
      `;
      break;
    }

    case "moon": {
      const mcx = (p / 100) * 700 + 175;
      const mcy = ((100 - p) / 100) * 600 + 150;
      const mr = (s / 100) * 200 + 100;
      defs = `
        <radialGradient id="${uid}m" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stop-color="${c1}"/>
          <stop offset="100%" stop-color="${c2}"/>
        </radialGradient>
        <filter id="${uid}gl"><feGaussianBlur stdDeviation="20"/></filter>
      `;
      const stars = Array.from({ length: 25 }, (_, i) => {
        const sx = (i * 271 + p * 11) % 1050;
        const sy = (i * 393 + p * 7) % 1050;
        return `<circle cx="${sx}" cy="${sy}" r="${(i % 3) + 1}" fill="#ffffff" opacity="${(0.5 + (i % 5) / 10).toFixed(2)}"/>`;
      }).join("");
      shapes = `
        <circle cx="${mcx}" cy="${mcy}" r="${mr * 1.3}" fill="${c1}" opacity="0.3" filter="url(#${uid}gl)"/>
        <circle cx="${mcx}" cy="${mcy}" r="${mr}" fill="url(#${uid}m)" opacity="0.95"/>
        <circle cx="${mcx + mr * 0.3}" cy="${mcy - mr * 0.2}" r="${mr * 0.15}" fill="${c2}" opacity="0.3"/>
        <circle cx="${mcx - mr * 0.2}" cy="${mcy + mr * 0.3}" r="${mr * 0.1}" fill="${c2}" opacity="0.3"/>
        ${stars}
      `;
      break;
    }

    case "leaf": {
      const lcx = (p / 100) * 1050;
      const lcy = ((100 - p) / 100) * 1050;
      const lr = (s / 100) * 500 + 200;
      defs = `<linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>`;
      shapes = `<path d="M ${lcx} ${lcy - lr} C ${lcx + lr * 0.7} ${lcy - lr * 0.5} ${lcx + lr * 0.7} ${lcy + lr * 0.5} ${lcx} ${lcy + lr} C ${lcx - lr * 0.7} ${lcy + lr * 0.5} ${lcx - lr * 0.7} ${lcy - lr * 0.5} ${lcx} ${lcy - lr} Z" fill="url(#${uid}g)" opacity="0.92" transform="rotate(${(p/100)*45} ${lcx} ${lcy})"/>`;
      break;
    }

    case "petals": {
      const pcx = 525, pcy = 525;
      const pcount = Math.round((s / 100) * 8 + 5);
      defs = `<linearGradient id="${uid}g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>`;
      const pl = (s / 100) * 350 + 150;
      const petals = Array.from({ length: pcount }, (_, i) => {
        const ang = (i / pcount) * 360 + (p / 100) * 30;
        return `<ellipse cx="${pcx}" cy="${pcy - pl/2}" rx="${pl * 0.25}" ry="${pl/2}" fill="url(#${uid}g)" opacity="0.65" transform="rotate(${ang} ${pcx} ${pcy})"/>`;
      }).join("");
      shapes = `${petals}<circle cx="${pcx}" cy="${pcy}" r="${pl * 0.18}" fill="${c1}" opacity="0.95"/>`;
      break;
    }

    case "stars_field": {
      const sfCount = Math.round((s / 100) * 50 + 20);
      const seed = p * 13 + 5;
      const stars = Array.from({ length: sfCount }, (_, i) => {
        const sx = (seed * (i + 1) * 271) % 1050;
        const sy = (seed * (i + 1) * 393) % 1050;
        const sr = ((seed * (i + 1) * 47) % 5) + 1;
        const fill = i % 4 === 0 ? c2 : (i % 3 === 0 ? c1 : "#ffffff");
        const op = (0.4 + (i * 7 % 50) / 100).toFixed(2);
        return `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${sr}" fill="${fill}" opacity="${op}"/>`;
      }).join("");
      shapes = stars;
      break;
    }

    case "paper_fold": {
      const pfX = (p / 100) * 1050;
      defs = `<linearGradient id="${uid}g1" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c1}" stop-opacity="0.5"/>
      </linearGradient>
      <linearGradient id="${uid}g2" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${c2}" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>`;
      shapes = `
        <polygon points="0,0 ${pfX},0 0,1050" fill="url(#${uid}g1)" opacity="0.88"/>
        <polygon points="${pfX},0 1050,0 1050,1050 0,1050" fill="url(#${uid}g2)" opacity="0.55"/>
        <line x1="${pfX}" y1="0" x2="0" y2="1050" stroke="${c2}" stroke-width="2" opacity="0.7"/>
      `;
      break;
    }

    case "triangle_grid": {
      const tg = (s / 100) * 80 + 40;
      const tgRows = Math.ceil(1050 / (tg * 0.866)) + 2;
      const tgCols = Math.ceil(1050 / tg) + 2;
      const tgs = [];
      for (let r = -1; r < tgRows; r++) {
        for (let cc = -1; cc < tgCols; cc++) {
          const xOff = (r % 2) * (tg / 2);
          const x = cc * tg + xOff;
          const y = r * tg * 0.866;
          const fill = (r + cc) % 2 === 0 ? c1 : c2;
          tgs.push(`<polygon points="${x},${y} ${x + tg},${y} ${x + tg/2},${y + tg * 0.866}" fill="none" stroke="${fill}" stroke-width="1" opacity="${(p / 200 + 0.3).toFixed(2)}"/>`);
        }
      }
      shapes = tgs.join("");
      break;
    }

    case "sweep": {
      const swR = (s / 100) * 800 + 300;
      const swStart = (p / 100) * 360;
      defs = `<linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${c1}" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="${c2}" stop-opacity="0"/>
      </linearGradient>`;
      const a1Rad = swStart * Math.PI / 180;
      const a2Rad = (swStart + 90) * Math.PI / 180;
      const x1 = 525 + swR * Math.cos(a1Rad);
      const y1 = 525 + swR * Math.sin(a1Rad);
      const x2 = 525 + swR * Math.cos(a2Rad);
      const y2 = 525 + swR * Math.sin(a2Rad);
      shapes = `<path d="M 525 525 L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${swR} ${swR} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="url(#${uid}g)" opacity="0.85"/>`;
      break;
    }

    case "glitch": {
      const gCount = Math.round((s / 100) * 12 + 6);
      const seed = p * 17 + 3;
      const blocks = Array.from({ length: gCount }, (_, i) => {
        const y = (seed * (i + 1) * 271) % 1050;
        const w = ((seed * (i + 1) * 47) % 800) + 100;
        const x = ((seed * (i + 1) * 393) % 600);
        const h = ((seed * (i + 1) * 17) % 30) + 5;
        const fill = i % 2 === 0 ? c1 : c2;
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" opacity="${(0.4 + (i % 5) / 10).toFixed(2)}"/>`;
      }).join("");
      shapes = blocks;
      break;
    }

    case "scan_lines": {
      const slSp = (s / 100) * 8 + 4;
      const slCount = Math.ceil(1050 / slSp);
      const lines = Array.from({ length: slCount }, (_, i) => {
        return `<line x1="0" y1="${i * slSp}" x2="1050" y2="${i * slSp}" stroke="${c1}" stroke-width="1.5" opacity="${(p / 200 + 0.15).toFixed(2)}"/>`;
      }).join("");
      shapes = lines;
      break;
    }

    case "arrow_up": {
      const aupW = (s / 100) * 600 + 300;
      const aupH = (s / 100) * 700 + 300;
      const aupCx = (p / 100) * 1050;
      defs = `<linearGradient id="${uid}g" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stop-color="${c2}"/>
        <stop offset="100%" stop-color="${c1}"/>
      </linearGradient>`;
      shapes = `<polygon points="${aupCx},${1050 - aupH} ${aupCx + aupW/2},${1050 - aupH * 0.5} ${aupCx + aupW * 0.18},${1050 - aupH * 0.5} ${aupCx + aupW * 0.18},1050 ${aupCx - aupW * 0.18},1050 ${aupCx - aupW * 0.18},${1050 - aupH * 0.5} ${aupCx - aupW/2},${1050 - aupH * 0.5}" fill="url(#${uid}g)" opacity="0.9"/>`;
      break;
    }

    case "pillar": {
      const plCount = Math.round((s / 100) * 5 + 2);
      const plW = 1050 / (plCount * 2 + 1);
      defs = `<linearGradient id="${uid}g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>`;
      const pls = Array.from({ length: plCount }, (_, i) => {
        const x = (i * 2 + 1) * plW + (p / 100 - 0.5) * 30;
        const op = (0.85 - i * 0.1).toFixed(2);
        return `<rect x="${x}" y="0" width="${plW}" height="1050" fill="url(#${uid}g)" opacity="${op}" rx="${plW * 0.1}"/>`;
      }).join("");
      shapes = pls;
      break;
    }

    case "grad_blocks": {
      const gbCount = Math.round((s / 100) * 4 + 3);
      const gbW = 1050 / gbCount;
      const gbBlocks = Array.from({ length: gbCount }, (_, i) => {
        const t = i / (gbCount - 1);
        const r1 = parseInt(c1.slice(1, 3), 16);
        const g1 = parseInt(c1.slice(3, 5), 16);
        const b1 = parseInt(c1.slice(5, 7), 16);
        const r2 = parseInt(c2.slice(1, 3), 16);
        const g2 = parseInt(c2.slice(3, 5), 16);
        const b2 = parseInt(c2.slice(5, 7), 16);
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
        const yOff = (p / 100 - 0.5) * 100;
        return `<rect x="${i * gbW}" y="${yOff}" width="${gbW + 1}" height="1050" fill="rgb(${r},${g},${b})" opacity="0.92"/>`;
      }).join("");
      shapes = gbBlocks;
      break;
    }

    case "squiggle": {
      const sqCount = Math.round((s / 100) * 5 + 3);
      defs = `<linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>`;
      const sqls = Array.from({ length: sqCount }, (_, i) => {
        const yBase = ((i + 0.5) / sqCount) * 1050 + (p / 100 - 0.5) * 50;
        const amp = (s / 100) * 60 + 20;
        return `<path d="M -50 ${yBase} Q 130 ${yBase - amp} 260 ${yBase} T 525 ${yBase} T 790 ${yBase} T 1100 ${yBase}" fill="none" stroke="url(#${uid}g)" stroke-width="${(s / 100) * 12 + 4}" stroke-linecap="round" opacity="0.75"/>`;
      }).join("");
      shapes = sqls;
      break;
    }

    case "lattice": {
      const ltSp = (s / 100) * 100 + 50;
      const ltSw = (p / 100) * 4 + 1;
      const lts = [];
      const cols = Math.ceil(1050 / ltSp) + 1;
      for (let i = 0; i <= cols; i++) {
        lts.push(`<line x1="${i * ltSp}" y1="-100" x2="${i * ltSp - 600}" y2="1150" stroke="${c1}" stroke-width="${ltSw}" opacity="0.55"/>`);
        lts.push(`<line x1="${i * ltSp}" y1="-100" x2="${i * ltSp + 600}" y2="1150" stroke="${c2}" stroke-width="${ltSw}" opacity="0.55"/>`);
      }
      shapes = lts.join("");
      break;
    }

    case "honeycomb": {
      const hcSize = (s / 100) * 50 + 25;
      const hcRows = Math.ceil(1050 / (hcSize * 1.5)) + 2;
      const hcCols = Math.ceil(1050 / (hcSize * 1.73)) + 2;
      const hcs = [];
      for (let r = -1; r < hcRows; r++) {
        for (let cc = -1; cc < hcCols; cc++) {
          const x = cc * hcSize * 1.73 + (r % 2) * (hcSize * 0.866);
          const y = r * hcSize * 1.5;
          const pts = Array.from({ length: 6 }, (_, i) => {
            const a = (i * 60 - 30) * Math.PI / 180;
            return `${(x + hcSize * Math.cos(a)).toFixed(1)},${(y + hcSize * Math.sin(a)).toFixed(1)}`;
          }).join(" ");
          const fill = (r + cc) % 2 === 0 ? c1 : c2;
          hcs.push(`<polygon points="${pts}" fill="${fill}" opacity="${(p / 200 + 0.4).toFixed(2)}" stroke="${c2}" stroke-width="1"/>`);
        }
      }
      shapes = hcs.join("");
      break;
    }

    case "wave_top": {
      const wtY = (p / 100) * 500 + 100;
      const wtAmp = (s / 100) * 200 + 50;
      defs = `<linearGradient id="${uid}g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>`;
      shapes = `<path d="M -50 ${wtY} C 200 ${wtY - wtAmp} 400 ${wtY + wtAmp} 525 ${wtY} S 880 ${wtY - wtAmp} 1100 ${wtY} L 1100 -100 L -50 -100 Z" fill="url(#${uid}g)" opacity="0.92"/>`;
      break;
    }

    case "wave_bottom": {
      const wbY = (p / 100) * 500 + 400;
      const wbAmp = (s / 100) * 200 + 50;
      defs = `<linearGradient id="${uid}g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>`;
      shapes = `<path d="M -50 ${wbY} C 200 ${wbY + wbAmp} 400 ${wbY - wbAmp} 525 ${wbY} S 880 ${wbY + wbAmp} 1100 ${wbY} L 1100 1150 L -50 1150 Z" fill="url(#${uid}g)" opacity="0.92"/>`;
      break;
    }

    case "wave_side": {
      const wsX = (p / 100) * 500 + 100;
      const wsAmp = (s / 100) * 200 + 50;
      defs = `<linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>`;
      shapes = `<path d="M ${wsX} -50 C ${wsX - wsAmp} 200 ${wsX + wsAmp} 400 ${wsX} 525 S ${wsX - wsAmp} 880 ${wsX} 1100 L -100 1100 L -100 -50 Z" fill="url(#${uid}g)" opacity="0.92"/>`;
      break;
    }

    case "plus_grid": {
      const pgSp = (s / 100) * 80 + 60;
      const pgSize = pgSp * 0.3;
      const pgSw = (p / 100) * 4 + 2;
      const pgRows = Math.ceil(1050 / pgSp) + 1;
      const pgCols = Math.ceil(1050 / pgSp) + 1;
      const pgs = [];
      for (let r = 0; r < pgRows; r++) {
        for (let cc = 0; cc < pgCols; cc++) {
          const x = cc * pgSp + pgSp/2;
          const y = r * pgSp + pgSp/2;
          const fill = (r + cc) % 2 === 0 ? c1 : c2;
          pgs.push(`<line x1="${x - pgSize}" y1="${y}" x2="${x + pgSize}" y2="${y}" stroke="${fill}" stroke-width="${pgSw}" opacity="0.7"/>`);
          pgs.push(`<line x1="${x}" y1="${y - pgSize}" x2="${x}" y2="${y + pgSize}" stroke="${fill}" stroke-width="${pgSw}" opacity="0.7"/>`);
        }
      }
      shapes = pgs.join("");
      break;
    }

    case "cosmic": {
      const cdCount = Math.round((s / 100) * 60 + 30);
      const seed = p * 23 + 7;
      defs = `<filter id="${uid}bl"><feGaussianBlur stdDeviation="2"/></filter>`;
      const cds = Array.from({ length: cdCount }, (_, i) => {
        const sx = (seed * (i + 1) * 271) % 1050;
        const sy = (seed * (i + 1) * 393) % 1050;
        const sr = ((seed * (i + 1) * 47) % 30) + 5;
        const fill = i % 3 === 0 ? c1 : c2;
        return `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${sr}" fill="${fill}" opacity="${(0.15 + (i * 7 % 30) / 100).toFixed(2)}" filter="url(#${uid}bl)"/>`;
      }).join("");
      shapes = cds;
      break;
    }

    case "ripple": {
      const rpCx = (p / 100) * 1050;
      const rpCy = ((100 - p) / 100) * 1050;
      const rpCount = Math.round((s / 100) * 12 + 6);
      const rpStep = (s / 100) * 50 + 30;
      const rps = Array.from({ length: rpCount }, (_, i) => {
        const fill = i % 2 === 0 ? c1 : c2;
        return `<circle cx="${rpCx}" cy="${rpCy}" r="${(i + 1) * rpStep}" fill="none" stroke="${fill}" stroke-width="${(s / 100) * 4 + 1.5}" opacity="${(0.7 - i * 0.05).toFixed(2)}"/>`;
      }).join("");
      shapes = rps;
      break;
    }

    case "mesh_geo": {
      const mgSp = (s / 100) * 100 + 60;
      const mgRows = Math.ceil(1050 / mgSp) + 1;
      const mgCols = Math.ceil(1050 / mgSp) + 1;
      const mgs = [];
      const seed = p * 13;
      for (let r = 0; r <= mgRows; r++) {
        for (let cc = 0; cc <= mgCols; cc++) {
          const x = cc * mgSp + ((seed + r * 31 + cc * 17) % 30 - 15);
          const y = r * mgSp + ((seed + r * 47 + cc * 7) % 30 - 15);
          if (cc < mgCols) {
            const x2 = (cc + 1) * mgSp + ((seed + r * 31 + (cc + 1) * 17) % 30 - 15);
            const y2 = r * mgSp + ((seed + r * 47 + (cc + 1) * 7) % 30 - 15);
            mgs.push(`<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="${c1}" stroke-width="1" opacity="0.5"/>`);
          }
          if (r < mgRows) {
            const x2 = cc * mgSp + ((seed + (r + 1) * 31 + cc * 17) % 30 - 15);
            const y2 = (r + 1) * mgSp + ((seed + (r + 1) * 47 + cc * 7) % 30 - 15);
            mgs.push(`<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="${c2}" stroke-width="1" opacity="0.5"/>`);
          }
          mgs.push(`<circle cx="${x}" cy="${y}" r="2" fill="${(r + cc) % 2 === 0 ? c1 : c2}" opacity="0.85"/>`);
        }
      }
      shapes = mgs.join("");
      break;
    }

    case "shutter": {
      const shCount = Math.round((s / 100) * 8 + 4);
      const shH = 1050 / shCount;
      const shTilt = (p / 100) * 30 - 15;
      const shs = Array.from({ length: shCount }, (_, i) => {
        const y = i * shH;
        const fill = i % 2 === 0 ? c1 : c2;
        return `<rect x="-100" y="${y + 2}" width="1250" height="${shH - 4}" fill="${fill}" opacity="${(0.85 - i * 0.04).toFixed(2)}" transform="skewX(${shTilt})"/>`;
      }).join("");
      shapes = shs;
      break;
    }

    case "lined_paper": {
      const lpSp = (s / 100) * 50 + 30;
      const lpRows = Math.ceil(1050 / lpSp) + 1;
      const lpMarginX = (p / 100) * 200 + 60;
      const lpLines = Array.from({ length: lpRows }, (_, i) =>
        `<line x1="0" y1="${i * lpSp}" x2="1050" y2="${i * lpSp}" stroke="${c1}" stroke-width="1.5" opacity="0.85"/>`
      ).join("");
      shapes = `
        ${lpLines}
        <line x1="${lpMarginX}" y1="0" x2="${lpMarginX}" y2="1050" stroke="${c2}" stroke-width="2.5" opacity="0.6"/>
        <circle cx="${lpMarginX * 0.4}" cy="120" r="20" fill="none" stroke="${c1}" stroke-width="3" opacity="0.7"/>
        <circle cx="${lpMarginX * 0.4}" cy="525" r="20" fill="none" stroke="${c1}" stroke-width="3" opacity="0.7"/>
        <circle cx="${lpMarginX * 0.4}" cy="930" r="20" fill="none" stroke="${c1}" stroke-width="3" opacity="0.7"/>
      `;
      break;
    }

    case "grid_paper": {
      const gpSp = (s / 100) * 60 + 25;
      const gpCount = Math.ceil(1050 / gpSp) + 1;
      const gpLines = [];
      for (let i = 0; i <= gpCount; i++) {
        gpLines.push(`<line x1="${i * gpSp}" y1="0" x2="${i * gpSp}" y2="1050" stroke="${c1}" stroke-width="1" opacity="${(p / 200 + 0.4).toFixed(2)}"/>`);
        gpLines.push(`<line x1="0" y1="${i * gpSp}" x2="1050" y2="${i * gpSp}" stroke="${c1}" stroke-width="1" opacity="${(p / 200 + 0.4).toFixed(2)}"/>`);
      }
      shapes = gpLines.join("");
      break;
    }

    case "dot_paper": {
      const dpSp = (s / 100) * 60 + 25;
      const dpRadius = 2 + (p / 100) * 2;
      const dpCount = Math.ceil(1050 / dpSp) + 1;
      const dots = [];
      for (let r = 0; r <= dpCount; r++) {
        for (let cc = 0; cc <= dpCount; cc++) {
          dots.push(`<circle cx="${cc * dpSp}" cy="${r * dpSp}" r="${dpRadius}" fill="${c1}" opacity="0.7"/>`);
        }
      }
      shapes = dots.join("");
      break;
    }

    case "legal_pad": {
      const lgSp = (s / 100) * 45 + 30;
      const lgRows = Math.ceil(1050 / lgSp) + 1;
      const lgMargin = (p / 100) * 180 + 70;
      const lgLines = Array.from({ length: lgRows }, (_, i) =>
        `<line x1="0" y1="${i * lgSp}" x2="1050" y2="${i * lgSp}" stroke="${c1}" stroke-width="1.5" opacity="0.85"/>`
      ).join("");
      shapes = `
        ${lgLines}
        <line x1="${lgMargin}" y1="0" x2="${lgMargin}" y2="1050" stroke="${c2}" stroke-width="2" opacity="0.7"/>
        <line x1="${lgMargin + 8}" y1="0" x2="${lgMargin + 8}" y2="1050" stroke="${c2}" stroke-width="2" opacity="0.7"/>
        <rect x="0" y="0" width="1050" height="40" fill="${c2}" opacity="0.15"/>
      `;
      break;
    }

    case "music_staff": {
      const msSets = Math.round((s / 100) * 4 + 3);
      const msSetH = 1050 / msSets;
      const msLines = [];
      for (let g = 0; g < msSets; g++) {
        const yBase = g * msSetH + msSetH * 0.3;
        const lineSp = msSetH * 0.07;
        for (let i = 0; i < 5; i++) {
          msLines.push(`<line x1="60" y1="${yBase + i * lineSp}" x2="990" y2="${yBase + i * lineSp}" stroke="${c1}" stroke-width="1.8" opacity="0.85"/>`);
        }
        msLines.push(`<path d="M 80 ${yBase - lineSp * 0.5} Q 70 ${yBase + lineSp * 2} 95 ${yBase + lineSp * 4.5} Q 75 ${yBase + lineSp * 6} 90 ${yBase + lineSp * 4} Q 105 ${yBase + lineSp * 2} 90 ${yBase} Q 75 ${yBase - lineSp} 80 ${yBase - lineSp * 0.5}" fill="none" stroke="${c1}" stroke-width="3" opacity="0.7"/>`);
      }
      shapes = msLines.join("");
      break;
    }

    case "graph_paper": {
      const gphMinor = (s / 100) * 30 + 15;
      const gphMajor = gphMinor * 5;
      const gphLines = [];
      const gphCountMinor = Math.ceil(1050 / gphMinor) + 1;
      for (let i = 0; i <= gphCountMinor; i++) {
        gphLines.push(`<line x1="${i * gphMinor}" y1="0" x2="${i * gphMinor}" y2="1050" stroke="${c1}" stroke-width="0.5" opacity="${(p / 200 + 0.3).toFixed(2)}"/>`);
        gphLines.push(`<line x1="0" y1="${i * gphMinor}" x2="1050" y2="${i * gphMinor}" stroke="${c1}" stroke-width="0.5" opacity="${(p / 200 + 0.3).toFixed(2)}"/>`);
      }
      const gphCountMajor = Math.ceil(1050 / gphMajor) + 1;
      for (let i = 0; i <= gphCountMajor; i++) {
        gphLines.push(`<line x1="${i * gphMajor}" y1="0" x2="${i * gphMajor}" y2="1050" stroke="${c2}" stroke-width="1.5" opacity="0.7"/>`);
        gphLines.push(`<line x1="0" y1="${i * gphMajor}" x2="1050" y2="${i * gphMajor}" stroke="${c2}" stroke-width="1.5" opacity="0.7"/>`);
      }
      shapes = gphLines.join("");
      break;
    }

    default:
      shapes = "";
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1050 1050" preserveAspectRatio="xMidYMid slice" style="position:absolute;top:0;left:0;width:100%;height:100%">
  <defs>${defs}</defs>
  ${transparentBg ? "" : `<rect width="1050" height="1050" fill="${bg}"/>`}
  <g transform="rotate(${a} 525 525)">${shapes}</g>
</svg>`;
}
