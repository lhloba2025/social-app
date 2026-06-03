// composeBrand.js — composites the brand elements onto an AI-generated
// BACKGROUND so they are pixel-exact: the real logo (PNG), the hook text in the
// REAL Arabic font (with highlighted words), and a contact footer bar. The AI
// only paints the scene; everything brand-critical is drawn here, guaranteed.

import { siInstagram, siTiktok, siSnapchat, siWhatsapp, siFacebook, siX, siYoutube } from "simple-icons";

const ICONS = {
  instagram: siInstagram, tiktok: siTiktok, snapchat: siSnapchat, whatsapp: siWhatsapp,
  facebook: siFacebook, twitter: siX, x: siX, youtube: siYoutube,
};
function platformKey(p) {
  const s = (p || "").toLowerCase();
  if (s.includes("insta")) return "instagram";
  if (s.includes("tik")) return "tiktok";
  if (s.includes("snap")) return "snapchat";
  if (s.includes("whats")) return "whatsapp";
  if (s.includes("face")) return "facebook";
  if (s.includes("link")) return "linkedin";
  if (s.includes("you")) return "youtube";
  if (s.includes("x") || s.includes("twit")) return "twitter";
  return "website";
}
function iconSvgUrl(icon, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${color}" d="${icon.path}"/></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}
async function loadIcon(p, color) {
  const icon = ICONS[platformKey(p)];
  if (!icon) return null;
  try { return await loadImg(iconSvgUrl(icon, color)); } catch { return null; }
}

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Wrap an Arabic phrase into lines that fit maxWidth (returns array of word-arrays).
function wrapWords(ctx, words, maxWidth) {
  const lines = [];
  let cur = [];
  const space = ctx.measureText(" ").width;
  let curW = 0;
  for (const w of words) {
    const ww = ctx.measureText(w).width;
    if (cur.length && curW + space + ww > maxWidth) {
      lines.push(cur); cur = [w]; curW = ww;
    } else {
      curW += (cur.length ? space : 0) + ww; cur.push(w);
    }
  }
  if (cur.length) lines.push(cur);
  return lines;
}

// Normalize an Arabic word for matching: drop tashkeel (diacritics), tatweel,
// and surrounding punctuation. This is why a highlight like "صالونك" now matches
// "صالونكِ،" in the hook (previously it didn't, so the color wasn't applied).
function normAr(s) {
  return String(s || "")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[؟?.!،,؛:"'()«»‏‎]/g, "")
    .trim();
}

function drawHook(ctx, W, H, hook, highlights, kit, font, layout = {}) {
  const main = kit.mainColor || "#09007C";
  const hi = kit.highlightColor || "#EF43DC";
  const hlNorm = (highlights || []).map(normAr).filter(Boolean);
  const isHi = (w) => { const nw = normAr(w); return !!nw && hlNorm.some((h) => nw === h || nw.includes(h)); };
  const scale = layout.hookScale ?? 1;
  const maxWidth = W * 0.86;
  // Honor EXPLICIT line breaks (Enter) the user typed, then word-wrap each.
  const segments = hook.split(/\r?\n/);
  const nonEmptySegs = segments.filter((s) => s.trim()).length;
  const maxLines = Math.max(4, nonEmptySegs + 2);
  const allWords = segments.flatMap((s) => s.split(/\s+/).filter(Boolean));
  let size = Math.round(W * 0.075 * scale);
  ctx.textBaseline = "middle";
  const setFont = (s) => { ctx.font = `800 ${s}px "${font}", "Tajawal", sans-serif`; };
  setFont(size);
  const wrap = () => segments.flatMap((seg) => {
    const ws = seg.split(/\s+/).filter(Boolean);
    return ws.length ? wrapWords(ctx, ws, maxWidth) : [[]]; // keep blank lines for spacing
  });
  let lines = wrap();
  // Only shrink if it spills past maxLines OR a single word is wider than the
  // line — NOT to force a fixed line count (that used to cancel out enlarging).
  const overflows = () => lines.length > maxLines || allWords.some((w) => ctx.measureText(w).width > maxWidth);
  while (overflows() && size > 18) {
    size = Math.round(size * 0.92);
    setFont(size);
    lines = wrap();
  }
  // Measure the inter-word space at the FINAL size (the bug was measuring it at
  // the initial large size, so spacing grew while the glyphs did not).
  const space = ctx.measureText(" ").width;
  const lineH = size * 1.35;
  // place block starting below the logo area (adjustable)
  const startY = H * (layout.hookY ?? 0.26);
  lines.forEach((lineWords, li) => {
    const widths = lineWords.map((w) => ctx.measureText(w).width);
    const lineW = widths.reduce((a, b) => a + b, 0) + space * (lineWords.length - 1);
    const y = startY + li * lineH;
    // RTL: first word at the RIGHT. Start x at right edge of the line, centered
    // around the chosen horizontal anchor (hookX).
    const cx = W * (layout.hookX ?? 0.5);
    let x = cx + lineW / 2;
    ctx.textAlign = "right";
    ctx.direction = "rtl";
    lineWords.forEach((w, i) => {
      ctx.fillStyle = isHi(w) ? hi : main;
      // subtle shadow for legibility on light/busy backgrounds
      ctx.shadowColor = "rgba(255,255,255,0.55)"; ctx.shadowBlur = size * 0.12;
      ctx.fillText(w, x, y);
      ctx.shadowBlur = 0;
      x -= widths[i] + space;
    });
  });
}

function drawContactBar(ctx, W, H, contacts, kit, iconImgs, layout = {}) {
  const cScale = layout.contactScale ?? 1;       // resize the whole bar
  const cShift = layout.contactY ?? 0;           // move UP from the bottom (fraction of H)
  const bg = kit.contactBg || "#0F172A";
  const tx = kit.contactText || "#FFFFFF";
  const pill = kit.contactShape === "pill";
  const vertical = kit.contactLayout === "vertical";
  const fs = Math.round(W * (vertical ? 0.03 : 0.026) * cScale);
  const iconSize = Math.round(fs * 1.25);
  const iconGap = W * 0.006;
  ctx.font = `600 ${fs}px "Tajawal", sans-serif`;
  ctx.textBaseline = "middle";
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  const items = contacts.map((c, i) => {
    const tw = ctx.measureText(c.v).width;
    const hasIcon = !!iconImgs[i];
    return { img: iconImgs[i], v: c.v, w: (hasIcon ? iconSize + iconGap : 0) + tw };
  });

  if (vertical) {
    const lineH = Math.max(iconSize, fs) * 1.7;
    const maxW = Math.max(...items.map((it) => it.w));
    const padX = W * 0.035, padY = lineH * 0.35;
    const panelW = Math.min(W * 0.7, maxW + padX * 2);
    const panelH = items.length * lineH + padY * 2;
    const px = (W - panelW) / 2;
    const py = H - panelH - H * 0.02 - H * cShift;
    ctx.save(); ctx.globalAlpha = 0.82; ctx.fillStyle = bg;
    roundRect(ctx, px, py, panelW, panelH, Math.min(panelW, panelH) * 0.1); ctx.fill(); ctx.restore();
    let y = py + padY + lineH / 2;
    for (const it of items) {
      let x = px + (panelW - it.w) / 2;
      if (it.img) { ctx.drawImage(it.img, x, y - iconSize / 2, iconSize, iconSize); x += iconSize + iconGap; }
      ctx.fillStyle = tx; ctx.fillText(it.v, x, y);
      y += lineH;
    }
    return;
  }

  // horizontal
  const gap = W * 0.028;
  const totalW = items.reduce((a, b) => a + b.w, 0) + gap * (items.length - 1);
  const barH = Math.round(H * 0.075 * cScale);
  const y = H - barH - H * cShift;
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = bg;
  if (pill) {
    const padX = W * 0.03, padY = barH * 0.18;
    const bw = Math.min(W * 0.94, totalW + padX * 2);
    roundRect(ctx, (W - bw) / 2, y + padY, bw, barH - padY * 2, (barH - padY * 2) / 2);
    ctx.fill();
  } else {
    ctx.fillRect(0, y, W, barH);
  }
  ctx.restore();
  let x = (W - totalW) / 2;
  const cy = y + barH / 2;
  for (const it of items) {
    if (it.img) {
      ctx.drawImage(it.img, x, cy - iconSize / 2, iconSize, iconSize);
      x += iconSize + iconGap;
    }
    ctx.fillStyle = tx;
    ctx.fillText(it.v, x, cy);
    x += ctx.measureText(it.v).width + gap;
  }
}

// Main entry. Returns a PNG data URL of the composed image.
// When targetW/targetH are given (the REAL platform pixel size), the canvas is
// forced to that exact size and the AI background is drawn "cover" (scaled to
// fill, center-cropped). This guarantees the output truly matches the platform
// aspect/size so publishing never crops the logo or text.
export async function composeBranded({ bgUrl, logoUrl, hook, highlight, kit, contacts, layout = {}, targetW, targetH }) {
  const bg = await loadImg(bgUrl);
  const bw = bg.naturalWidth || bg.width, bh = bg.naturalHeight || bg.height;
  const W = targetW || bw, H = targetH || bh;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  // Cover-fit: scale the background to fully cover the exact target, centered.
  const scale = Math.max(W / bw, H / bh);
  const dw = bw * scale, dh = bh * scale;
  ctx.drawImage(bg, (W - dw) / 2, (H - dh) / 2, dw, dh);

  const font = kit.font || "Tajawal";
  try {
    await document.fonts.load(`800 ${Math.round(W * 0.075)}px "${font}"`);
    await document.fonts.load(`600 ${Math.round(W * 0.026)}px "Tajawal"`);
    await document.fonts.ready;
  } catch { /* fonts best-effort */ }

  if (logoUrl) {
    try {
      const lg = await loadImg(logoUrl);
      const lw = W * 0.20 * (layout.logoScale ?? 1);
      const lh = lw * ((lg.naturalHeight || 1) / (lg.naturalWidth || 1));
      const lx = W * (layout.logoX ?? 0.5) - lw / 2;
      const ly = H * (layout.logoY ?? 0.04);
      if (kit.changeLogoColor && kit.logoColor) {
        // Tint the whole logo to one color (matches the "recolor logo" option).
        const off = document.createElement("canvas");
        off.width = Math.max(1, Math.round(lw)); off.height = Math.max(1, Math.round(lh));
        const octx = off.getContext("2d");
        octx.drawImage(lg, 0, 0, off.width, off.height);
        octx.globalCompositeOperation = "source-in";
        octx.fillStyle = kit.logoColor;
        octx.fillRect(0, 0, off.width, off.height);
        ctx.drawImage(off, lx, ly, lw, lh);
      } else {
        ctx.drawImage(lg, lx, ly, lw, lh);
      }
    } catch { /* logo optional */ }
  }

  if (hook && hook.trim()) {
    const hl = (highlight || "").split(/[,،]/).map((s) => s.trim()).filter(Boolean);
    drawHook(ctx, W, H, hook.trim(), hl, kit, font, layout);
  }

  if (contacts && contacts.length) {
    const iconImgs = await Promise.all(contacts.map((cc) => loadIcon(cc.p, kit.contactText || "#FFFFFF")));
    drawContactBar(ctx, W, H, contacts, kit, iconImgs, layout);
  }

  return c.toDataURL("image/png");
}
