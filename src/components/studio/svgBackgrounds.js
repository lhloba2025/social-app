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

    default:
      shapes = "";
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1050 1050" preserveAspectRatio="xMidYMid slice" style="position:absolute;top:0;left:0;width:100%;height:100%">
  <defs>${defs}</defs>
  <rect width="1050" height="1050" fill="${bg}"/>
  <g transform="rotate(${a} 525 525)">${shapes}</g>
</svg>`;
}
